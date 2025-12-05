"""
Simple HTTP server to run the interactive network visualization.
Run this script and open http://localhost:8000/index.html in your browser.

Features:
- Serves static files from the deploy directory
- Provides secure backend endpoints for OpenAI and Pexels API calls
- API keys are kept secure in backend and never exposed to client-side code
"""
from dotenv import load_dotenv
import os
load_dotenv() 

OPENAI_KEY = os.environ.get("OPENAI_API_KEY") 
PEXELS_KEY = os.environ.get("PEXELS_API_KEY")

if not OPENAI_KEY:
    raise ValueError("OPENAI_API_KEY not found. Check your .env file.")

if not PEXELS_KEY:
    raise ValueError("PEXELS_API_KEY not found. Check your .env file.")

import http.server
import socketserver
import webbrowser
import json
import urllib.parse
import urllib.request

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, env_path=None, **kwargs):
        self.env_path = env_path
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Handle /api/fetch-image endpoint (GET for Pexels)
        if parsed_path.path == '/api/fetch-image':
            self.handle_fetch_image()
            return
        
        # Default: serve static files
        super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Handle /api/generate-recipes endpoint
        if parsed_path.path == '/api/generate-recipes':
            self.handle_generate_recipes()
            return
        
        # Default: 404 for unknown POST endpoints
        self.send_response(404)
        self.end_headers()
    
    def load_env_vars(self):
        """Load environment variables from .env file"""
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
        return env_vars
    
    def handle_generate_recipes(self):
        """Handle recipe generation requests using OpenAI API (keys stay in backend)"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, 'Request body is empty')
                return
            
            body = self.rfile.read(content_length)
            request_data = json.loads(body.decode('utf-8'))
            
            print(f"📥 Received recipe generation request:")
            print(f"   Ingredients: {request_data.get('selectedIngredients', [])}")
            print(f"   Prompt length: {len(request_data.get('prompt', ''))}")
            
            selected_ingredients = request_data.get('selectedIngredients', [])
            flavor_preferences = request_data.get('flavorPreferences', {})
            dietary_restrictions = request_data.get('dietaryRestrictions', [])
            prompt = request_data.get('prompt', '')
            
            # Load API keys from environment variables (loaded by dotenv)
            openai_api_key = os.environ.get('OPENAI_API_KEY', '')
            
            if not openai_api_key:
                print("❌ ERROR: OpenAI API key not found in environment variables")
                self.send_error_response(500, 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env file.')
                return
            
            print(f"✅ OpenAI API key loaded (length: {len(openai_api_key)})")
            
            # Build OpenAI API request
            openai_url = 'https://api.openai.com/v1/chat/completions'
            openai_model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
            
            # For GPT-4 models with JSON mode, we need to request an object with a "recipes" key
            # For other models, we can request the array directly
            use_json_mode = 'gpt-4' in openai_model.lower() and 'o' not in openai_model.lower()
            
            if use_json_mode:
                # JSON mode requires an object, so modify the prompt
                system_prompt = 'You are a helpful recipe generator. Always return ONLY valid JSON objects with a "recipes" key containing an array. No text before or after the JSON. No markdown code blocks. Format: {"recipes": [...]}'
            else:
                system_prompt = 'You are a helpful recipe generator. Always return ONLY valid JSON arrays. No text before or after the JSON. No markdown code blocks. Just the JSON array.'
            
            openai_payload = {
                'model': openai_model,
                'messages': [
                    {
                        'role': 'system',
                        'content': system_prompt
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 6000
            }
            
            # Add JSON mode only for GPT-4 models (not GPT-4o which handles arrays better)
            if use_json_mode:
                openai_payload['response_format'] = {'type': 'json_object'}
            
            # Make request to OpenAI
            req = urllib.request.Request(openai_url, data=json.dumps(openai_payload).encode('utf-8'))
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', f'Bearer {openai_api_key}')
            
            try:
                with urllib.request.urlopen(req, timeout=60) as response:
                    response_data = json.loads(response.read().decode('utf-8'))
                    
                    # Extract content from OpenAI response
                    if 'choices' in response_data and len(response_data['choices']) > 0:
                        content = response_data['choices'][0]['message']['content']
                        
                        # Parse JSON from response
                        content = content.strip()
                        # Remove markdown code blocks if present
                        if content.startswith('```'):
                            content = content.replace('```json', '').replace('```', '').strip()
                        
                        # Try to parse as JSON
                        try:
                            recipes = json.loads(content)
                            # Handle different response formats
                            if isinstance(recipes, list):
                                # Already an array, use as-is
                                pass
                            elif isinstance(recipes, dict) and 'recipes' in recipes:
                                # Object with "recipes" key (from JSON mode)
                                recipes = recipes['recipes']
                            elif isinstance(recipes, dict):
                                # Single recipe object, wrap in array
                                recipes = [recipes]
                            else:
                                raise ValueError(f'Unexpected recipe format: {type(recipes)}')
                            
                            # Ensure recipes is a list
                            if not isinstance(recipes, list):
                                recipes = [recipes] if recipes else []
                            
                            print(f"✅ Successfully generated {len(recipes)} recipes")
                            self.send_json_response(200, {'recipes': recipes})
                        except json.JSONDecodeError as e:
                            print(f"⚠️ JSON parse error, trying to extract array: {str(e)}")
                            print(f"⚠️ Content preview (first 500 chars): {content[:500]}")
                            # Try to extract JSON array from text
                            first_bracket = content.find('[')
                            last_bracket = content.rfind(']')
                            if first_bracket >= 0 and last_bracket > first_bracket:
                                json_str = content[first_bracket:last_bracket + 1]
                                try:
                                    recipes = json.loads(json_str)
                                    if isinstance(recipes, list):
                                        print(f"✅ Extracted {len(recipes)} recipes from text")
                                        self.send_json_response(200, {'recipes': recipes})
                                    else:
                                        self.send_error_response(500, f'Extracted content is not an array: {type(recipes)}')
                                except json.JSONDecodeError as e2:
                                    print(f"❌ Failed to parse extracted JSON: {str(e2)}")
                                    self.send_error_response(500, f'Failed to parse JSON from OpenAI response: {str(e)}')
                            else:
                                print(f"❌ No JSON array brackets found in response")
                                self.send_error_response(500, f'Failed to parse JSON from OpenAI response. No array brackets found. Error: {str(e)}')
                    else:
                        self.send_error_response(500, 'Unexpected response format from OpenAI API')
                        
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                print(f"❌ OpenAI HTTP Error {e.code}: {error_body}")
                try:
                    error_data = json.loads(error_body)
                    error_msg = error_data.get('error', {}).get('message', str(e))
                except:
                    error_msg = error_body[:200] if error_body else str(e)
                self.send_error_response(e.code, f'OpenAI API error: {error_msg}')
            except Exception as e:
                print(f"❌ Exception calling OpenAI API: {str(e)}")
                import traceback
                traceback.print_exc()
                self.send_error_response(500, f'Error calling OpenAI API: {str(e)}')
                
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON in request body')
        except Exception as e:
            self.send_error_response(500, f'Server error: {str(e)}')
    
    def handle_fetch_image(self):
            """Handle image fetch requests using Pexels API (keys stay in backend)"""
            
            # NOTE: Using the global PEXELS_KEY variable defined at the top of the script
            global PEXELS_KEY 

            try:
                # Check for key existence early (relies on the top-level script check)
                if not PEXELS_KEY:
                    print("❌ PEXELS_KEY not found when requested.")
                    # Return a 500 server error, not a false 200 success.
                    self.send_error_response(500, 'Pexels API key not configured on server.')
                    return

                # Parse query parameters
                parsed_path = urllib.parse.urlparse(self.path)
                query_params = urllib.parse.parse_qs(parsed_path.query)
                
                query = query_params.get('query', [''])[0]
                page = int(query_params.get('page', ['1'])[0])
                
                if not query:
                    self.send_error_response(400, 'Missing query parameter')
                    return
                
                # Build Pexels API request
                pexels_url = f'https://api.pexels.com/v1/search?query={urllib.parse.quote(query)}&per_page=1&orientation=landscape&page={page}'
                
                req = urllib.request.Request(pexels_url)
                # Use the global PEXELS_KEY
                req.add_header('Authorization', PEXELS_KEY) 
                
                req.add_header('User-Agent', 'Mozilla/5.0 (Custom Application)')
                
                try:
                    with urllib.request.urlopen(req, timeout=10) as response:
                        data = json.loads(response.read().decode('utf-8'))
                        
                        total_results = data.get('total_results', 0)
                        photo_count = len(data.get('photos', []))
                        
                        # DEBUGGING LINE - This will now run if the Pexels call succeeds
                        print(f"PEXELS DEBUG: Query='{query}' -> Total results: {total_results}, Photos returned: {photo_count}")
                        
                        if data.get('photos') and photo_count > 0:
                            image_url = data['photos'][0]['src'].get('large') or \
                                        data['photos'][0]['src'].get('original') or \
                                        data['photos'][0]['src'].get('medium')
                            self.send_json_response(200, {'imageUrl': image_url})
                        else:
                            # Pexels found no images for the query (expected behavior)
                            self.send_json_response(200, {'imageUrl': None, 'message': 'No images found for query.'})
                            
                except urllib.error.HTTPError as e:
                    error_body = e.read().decode('utf-8')
                    print(f"❌ Pexels HTTP Error {e.code}: {error_body}")
                    # 401/403 errors are common here if the key is invalid
                    self.send_json_response(200, {'imageUrl': None, 'message': f'Pexels API error: {e.code}'})
                
                except Exception as e:
                    print(f"❌ Exception calling Pexels API: {str(e)}")
                    self.send_json_response(200, {'imageUrl': None, 'message': f'Error calling Pexels API: {str(e)}'})
                    
            except Exception as e:
                # Catching parsing errors or general server failures
                print(f"❌ Server error in handle_fetch_image: {str(e)}")
                self.send_error_response(500, f'Server error: {str(e)}')
    
    def send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def send_error_response(self, status_code, message):
        """Send error JSON response with CORS headers"""
        self.send_json_response(status_code, {'error': message})
    
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
        print(f"API endpoints:")
        print(f"  - POST /api/generate-recipes (OpenAI - secure)")
        print(f"  - GET /api/fetch-image (Pexels - secure)")
        if os.path.exists(env_path):
            print(f"✅ Loading API keys from: {env_path}")
        else:
            print(f"⚠️  Warning: .env file not found at {env_path}")
            print(f"   Create .env file with OPENAI_API_KEY and PEXELS_API_KEY")
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