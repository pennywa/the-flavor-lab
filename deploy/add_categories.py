#!/usr/bin/env python3
import json
import sys

# Read files
print("Reading files...")
with open('ingr_ingr_hub.json', 'r') as f:
    ingr_hub = json.load(f)

with open('network_data_hub.json', 'r') as f:
    network_data = json.load(f)

categories = network_data.get('categories', {})
matched = 0
unmatched = 0

# Add category to each node
print("Adding categories to nodes...")
for node in ingr_hub['nodes']:
    node_name = node.get('name')
    category_info = categories.get(node_name)
    
    if category_info:
        node['category'] = category_info.get('category', 'Unknown')
        node['categoryColor'] = category_info.get('color', '#95a5a6')
        matched += 1
    else:
        node['category'] = 'Unknown'
        node['categoryColor'] = '#95a5a6'
        unmatched += 1

# Write updated JSON
print(f"Writing updated file... Matched: {matched}, Unmatched: {unmatched}")
with open('ingr_ingr_hub.json', 'w') as f:
    json.dump(ingr_hub, f, indent=2)

print(f'✓ Categories added successfully! {matched} matched, {unmatched} unmatched')


