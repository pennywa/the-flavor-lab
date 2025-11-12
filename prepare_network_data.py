"""
Prepare ingredient pairing data for interactive network visualization.
Creates a JSON file with ingredient relationships, limited to top 3 pairings per ingredient.
Only includes hub ingredients (filters to ingredients where is_hub == 'hub').

All output files are saved to the deploy/ folder for easy deployment.
"""

import pandas as pd
import json
import os
import shutil
from datetime import datetime

# Load the data
print("Loading data...")
nodes = pd.read_csv("input/nodes.csv")
edges = pd.read_csv("input/edges.csv")

# Focus on ingredient-ingredient relationships
ingr_ingr_edges = edges[edges["edge_type"] == "ingr-ingr"]

# Merge with node information
merged = (
    ingr_ingr_edges
    .merge(nodes, left_on="id_1", right_on="node_id", how="left")
    .rename(columns={"node_type": "node_type_1", "is_hub": "is_hub_1", "name": "name_1"})
    .drop(columns=["node_id", "id"])
    .merge(nodes, left_on="id_2", right_on="node_id", how="left")
    .rename(columns={"node_type": "node_type_2", "is_hub": "is_hub_2", "name": "name_2"})
    .drop(columns=["node_id", "id"])
)

# Clean data and filter to only hub ingredients
merged_clean = merged.dropna(subset=["name_1", "name_2"]).reset_index(drop=True)

# Filter to only include edges where both ingredients are hubs
merged_clean = merged_clean[
    (merged_clean["is_hub_1"] == "hub") & (merged_clean["is_hub_2"] == "hub")
].reset_index(drop=True)

print(f"Total ingredient pairs (hub ingredients only): {len(merged_clean)}")

# Create a dictionary to store top 3 pairings for each ingredient
# We'll store both directions (ingredient A -> B and B -> A)
ingredient_graph = {}

# Process each ingredient and get its top 3 pairings
for _, row in merged_clean.iterrows():
    ingr1 = row["name_1"]
    ingr2 = row["name_2"]
    score = row["score"]
    
    # Add pairing for ingredient 1
    if ingr1 not in ingredient_graph:
        ingredient_graph[ingr1] = []
    ingredient_graph[ingr1].append({
        "name": ingr2,
        "score": float(score)
    })
    
    # Add pairing for ingredient 2 (bidirectional)
    if ingr2 not in ingredient_graph:
        ingredient_graph[ingr2] = []
    ingredient_graph[ingr2].append({
        "name": ingr1,
        "score": float(score)
    })

# Sort by score and keep only top 3 for each ingredient
print("Filtering to top 3 pairings per ingredient...")
filtered_graph = {}
for ingredient, pairings in ingredient_graph.items():
    # Sort by score (descending) and take top 3
    sorted_pairings = sorted(pairings, key=lambda x: x["score"], reverse=True)[:3]
    filtered_graph[ingredient] = sorted_pairings

# Create a list of all unique ingredients for search
all_ingredients = sorted(list(filtered_graph.keys()))

# Create the final data structure
network_data = {
    "ingredients": all_ingredients,
    "graph": filtered_graph
}

# Ensure deploy directory exists
deploy_dir = "deploy"
os.makedirs(deploy_dir, exist_ok=True)

# Save to JSON file in deploy folder (matching what HTML expects)
output_file = os.path.join(deploy_dir, "network_data_hub.json")
with open(output_file, "w") as f:
    json.dump(network_data, f, indent=2)

# Get file size and timestamp
file_size = os.path.getsize(output_file)
file_size_kb = file_size / 1024
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

print(f"\n{'='*60}")
print(f"Data prepared successfully!")
print(f"{'='*60}")
print(f"✓ Filtered to hub ingredients only")
print(f"✓ Total hub ingredients in network: {len(all_ingredients)}")
print(f"✓ File saved to: {output_file}")
print(f"✓ File size: {file_size_kb:.1f} KB")
print(f"✓ Updated: {timestamp}")
print(f"{'='*60}")

'''# Copy interactive_network.html to deploy folder
html_source = "interactive_network.html"
html_dest = os.path.join(deploy_dir, "interactive_network.html")
html_index_dest = os.path.join(deploy_dir, "index.html")

# Try to copy from root, or use existing deploy version if root doesn't exist
if os.path.exists(html_source):
    shutil.copy2(html_source, html_dest)
    shutil.copy2(html_source, html_index_dest)
    html_size = os.path.getsize(html_dest) / 1024
    print(f"✓ Copied {html_source} to deploy folder")
    print(f"  → {html_dest} ({html_size:.1f} KB)")
    print(f"  → {html_index_dest} ({html_size:.1f} KB)")
    print(f"  → Updated: {timestamp}")
elif os.path.exists(html_dest):
    # If root doesn't exist but deploy version does, update index.html to match
    shutil.copy2(html_dest, html_index_dest)
    html_size = os.path.getsize(html_dest) / 1024
    print(f"✓ Using existing HTML in deploy folder")
    print(f"  → {html_dest} ({html_size:.1f} KB)")
    print(f"  → {html_index_dest} ({html_size:.1f} KB) - synced")
    print(f"  → Updated: {timestamp}")
else:
    print(f"⚠ {html_source} not found in root or deploy directory")
    print(f"  (Please ensure HTML file exists for deployment)")

print(f"{'='*60}")
print(f"\nDeploy folder ready for GitHub push and Netlify deployment!")
print(f"Sample hub ingredients: {all_ingredients[:10]}")
print(f"{'='*60}\n")'''


