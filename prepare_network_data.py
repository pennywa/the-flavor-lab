"""
Prepare ingredient pairing data for interactive network visualization.
Creates a JSON file with ingredient relationships, limited to top 3 pairings per ingredient.
Only includes hub ingredients (filters to ingredients where is_hub == 'hub').
"""

import pandas as pd
import json

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

# Save to JSON file
output_file = "network_data.json"
with open(output_file, "w") as f:
    json.dump(network_data, f, indent=2)

print(f"\nData prepared successfully!")
print(f"✓ Filtered to hub ingredients only")
print(f"✓ Total hub ingredients in network: {len(all_ingredients)}")
print(f"✓ Data saved to: {output_file}")
print(f"\nSample hub ingredients: {all_ingredients[:10]}")

