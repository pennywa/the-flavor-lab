#!/usr/bin/env python3
import json

print("Reading ingr_ingr_hub.json...")
with open('ingr_ingr_hub.json', 'r') as f:
    ingr_hub = json.load(f)

print("Reading network_data_hub.json...")
with open('network_data_hub.json', 'r') as f:
    network_data = json.load(f)

categories = network_data.get('categories', {})
print(f"Found {len(categories)} categories in network_data_hub.json")

matched = 0
unmatched = 0

print("Adding categories to nodes...")
for node in ingr_hub['nodes']:
    node_name = node.get('name')
    if node_name and node_name in categories:
        category_info = categories[node_name]
        node['category'] = category_info.get('category', 'Unknown')
        matched += 1
    else:
        node['category'] = 'Unknown'
        unmatched += 1

print(f"Writing updated file... Matched: {matched}, Unmatched: {unmatched}")
with open('ingr_ingr_hub.json', 'w') as f:
    json.dump(ingr_hub, f, indent=2)

print(f"✓ Success! {matched} nodes matched, {unmatched} unmatched")


