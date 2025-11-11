# Interactive Ingredient Network Visualization

An interactive web-based network visualization for exploring ingredient flavor pairings.

## Features

- **Search Bar**: Type to search for any ingredient and see its pairings
- **Interactive Network**: Click on any ingredient node to explore its connections
- **Smart Fading**: Previously displayed ingredients (that weren't clicked) gradually fade away
- **Exploration Trail**: Track your exploration path with a list of clicked ingredients
- **Top Pairings**: Each ingredient shows up to 3 best pairings based on flavor compatibility scores

## Setup

1. **Prepare the data** (if you haven't already):
   ```bash
   python prepare_network_data.py
   ```
   This will create `network_data.json` with ingredient pairing data.

2. **Start the web server**:
   ```bash
   python run_server.py
   ```

3. **Open in browser**:
   The server will automatically open your browser to `http://localhost:8000/interactive_network.html`
   
   If it doesn't open automatically, manually navigate to:
   `http://localhost:8000/interactive_network.html`

## Usage

1. **Search for an ingredient**: Type in the search bar and select an ingredient from the dropdown
2. **Explore pairings**: Click on any ingredient node to see its top 3 pairings
3. **Navigate the network**: Click on different ingredients to explore flavor relationships
4. **Track your path**: Your exploration path is shown in the "Explored Ingredients" section

## Technical Details

- Uses [vis-network](https://visjs.github.io/vis-network/) for network visualization
- Data is prepared from ingredient-ingredient edges, filtered to top 3 pairings per ingredient
- Network physics simulation provides smooth, interactive node positioning
- Automatic fade-out of unclicked nodes after 2 seconds

## Files

- `prepare_network_data.py`: Prepares ingredient data into JSON format
- `interactive_network.html`: The main visualization interface
- `run_server.py`: Simple HTTP server to serve the visualization
- `network_data.json`: Generated data file (created by prepare_network_data.py)

## Requirements

- Python 3.6+
- pandas
- The data files in the `input/` directory (nodes.csv, edges.csv)

