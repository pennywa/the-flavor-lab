"""
Simple HTTP server to run the interactive network visualization.
Run this script and open http://localhost:8000/index.html in your browser.

Features:
- Serves static files from the deploy directory
- Provides /api/config endpoint that returns API keys from .env file
- API keys are never exposed in client-side code
"""

import http.server
import socketserver
import webbrowser
import os
import json
import urllib.parse

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, env_path=None, **kwargs):
        self.env_path = env_path
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Handle /api/config endpoint
        if parsed_path.path == '/api/config':
            self.handle_config_endpoint()
            return
        
        # Default: serve static files
        super().do_GET()
    
    def handle_config_endpoint(self):
        """Serve API keys from .env file"""
        try:
            # Read .env file from project root
            env_vars = {}
            if self.env_path and os.path.exists(self.env_path):
                with open(self.env_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        # Skip comments and empty lines
                        if line and not line.startswith('#'):
                            if '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip()
                                # Remove quotes if present
                                if (value.startswith('"') and value.endswith('"')) or \
                                   (value.startswith("'") and value.endswith("'")):
                                    value = value[1:-1]
                                env_vars[key] = value
            
            # Return only the API keys (not all env vars for security)
            config = {
                'GEMINI_API_KEY': env_vars.get('GEMINI_API_KEY', ''),
                'PEXELS_API_KEY': env_vars.get('PEXELS_API_KEY', ''),
                'GEMINI_MODEL': env_vars.get('GEMINI_MODEL', 'gemini-2.5-flash')
            }
            
            # Send JSON response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(config).encode('utf-8'))
            
        except Exception as e:
            # Error reading config
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {'error': 'Failed to load configuration', 'message': str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def end_headers(self):
        # Add CORS headers to allow loading JSON
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    deploy_path = os.path.join(project_root, "deploy")
    env_path = os.path.join(project_root, ".env")
    
    # Change to deploy directory for serving static files
    os.chdir(deploy_path)
    
    # Create handler with env_path
    def handler(*args, **kwargs):
        return MyHTTPRequestHandler(*args, env_path=env_path, **kwargs)
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Open http://localhost:{PORT}/index.html in your browser")
        print(f"API config endpoint: http://localhost:{PORT}/api/config")
        if os.path.exists(env_path):
            print(f"✅ Loading API keys from: {env_path}")
        else:
            print(f"⚠️  Warning: .env file not found at {env_path}")
            print(f"   Create .env file with GEMINI_API_KEY and PEXELS_API_KEY")
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

