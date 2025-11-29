"""
Simple HTTP server to run the interactive network visualization.
Run this script and open http://localhost:8000/index.html in your browser.
"""
#API key managment start
from google import genai
import json
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv() 

# Access the API key
API_KEY = os.environ.get("GEMINI_API_KEY")
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY")

import http.server
import socketserver
import webbrowser
import os
import requests
#API key managment end

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    # ... NEW do_POST and handle_api_request methods go here ...
    def do_POST(self):
        # Existing Gemini route
        if self.path == '/api/generate_recipe':
            self.handle_api_request()
        # --- NEW Pexels route ---
        elif self.path == '/api/search_image':
            self.handle_image_request()
        else:
            self.send_error(404, "Not Found: %s" % self.path)

    # --- NEW METHOD: handle_image_request ---
    def handle_image_request(self):
        global PEXELS_API_KEY

        if not PEXELS_API_KEY:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"image_url": None, "error": "Server-side PEXELS_API_KEY not configured."}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        try:
            # 1. Read client payload (the search query)
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            
            query = payload.get('query', 'food')
            
            # 2. Call Pexels API securely using the server-side key
            pexels_url = f"https://api.pexels.com/v1/search?query={query}&per_page=1"
            headers = {
                "Authorization": PEXELS_API_KEY
            }
            
            pexels_response = requests.get(pexels_url, headers=headers)
            pexels_response.raise_for_status() # Raise exception for bad status codes
            
            pexels_data = pexels_response.json()
            
            image_url = None
            if pexels_data.get('photos'):
                # Get the URL of the medium-sized image
                image_url = pexels_data['photos'][0]['src']['medium'] 

            # 3. Send the image URL back to the client
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {"image_url": image_url}
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except requests.exceptions.HTTPError as errh:
            print(f"Pexels API HTTP Error: {errh}")
            error_msg = f"External API error: {errh}"
            status_code = errh.response.status_code
        except Exception as e:
            print(f"Server Error during Image API call: {e}")
            error_msg = f"Internal server error: {str(e)}"
            status_code = 500
        
        # Error handling response
        if status_code >= 400:
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"image_url": None, "error": error_msg}
            self.wfile.write(json.dumps(response).encode('utf-8'))
    # ... NEW do_POST and handle_api_request methods end here ...

def main():
    deploy_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deploy")
    os.chdir(deploy_path)
    
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Open http://localhost:{PORT}/index.html in your browser")
        print("Press Ctrl+C to stop the server")
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}/index.html')
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()

