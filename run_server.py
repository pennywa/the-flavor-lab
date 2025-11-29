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
    
    def end_headers(self):
        # Add CORS headers to allow loading JSON
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    # --- POST Handler: Routes requests to the correct handler ---
    def do_POST(self):
        # Existing Gemini route
        if self.path == '/api/generate_recipe':
            self.handle_api_request()
        # NEW Pexels route
        elif self.path == '/api/search_image':
            self.handle_image_request()
        else:
            self.send_error(404, "Not Found: %s" % self.path)

    # --- NEW METHOD: handle_api_request (Gemini Logic) ---
    def handle_api_request(self):
        global API_KEY # Reference the globally loaded API key

        if not API_KEY:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"recipe": None, "error": "Server-side API Key not configured."}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return
            
        try:
            # 1. Read and parse the JSON payload from the client
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            
            # Extract the custom prompt the client built
            prompt = payload.get('prompt_text', 'Generate a simple recipe.')
            model_name = payload.get('model', 'gemini-2.5-flash')

            # 2. Call the Gemini API securely on the server
            client = genai.Client(api_key=API_KEY)
            
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            
            # 3. Send the successful response back to the client
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Send the raw text output back for the client to parse
            response_data = {"recipe": response.text} 
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            print(f"Server Error during API call: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"recipe": None, "error": f"Internal server error: {str(e)}"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    # --- NEW METHOD: handle_image_request (Pexels Logic) ---
    def handle_image_request(self):
        global PEXELS_API_KEY # Reference the globally loaded Pexels key
        status_code = 200 # Default to 200

        if not PEXELS_API_KEY:
            status_code = 500
            error_msg = "Server-side PEXELS_API_KEY not configured."
            
        try:
            # 1. Read client payload (the search query and page)
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            
            query = payload.get('query', 'food')
            page = payload.get('page', 1) # Get the page number for variation
            
            # 2. Call Pexels API securely using the server-side key
            pexels_url = f"https://api.pexels.com/v1/search?query={query}&per_page=1&page={page}&orientation=landscape"
            headers = {
                "Authorization": PEXELS_API_KEY
            }
            
            pexels_response = requests.get(pexels_url, headers=headers)
            pexels_response.raise_for_status() # Raise exception for bad status codes
            
            pexels_data = pexels_response.json()
            
            image_url = None
            if pexels_data.get('photos'):
                # Prefer large or original for better quality
                image_url = pexels_data['photos'][0]['src'].get('large') or pexels_data['photos'][0]['src'].get('original')
                if not image_url:
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
        
        # Error handling response (only runs if an exception occurred)
        if status_code >= 400:
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"image_url": None, "error": error_msg}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
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

