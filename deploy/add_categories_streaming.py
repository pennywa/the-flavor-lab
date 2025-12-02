#!/usr/bin/env python3
import json
import sys

print("Reading network_data_hub.json...", file=sys.stderr)
with open('network_data_hub.json', 'r') as f:
    network_data = json.load(f)

categories = network_data.get('categories', {})
print(f"Found {len(categories)} categories", file=sys.stderr)

print("Reading ingr_ingr_hub.json...", file=sys.stderr)
with open('ingr_ingr_hub.json', 'r') as f:
    ingr_hub = json.load(f)

print(f"Processing {len(ingr_hub['nodes'])} nodes...", file=sys.stderr)
matched = 0
unmatched = 0

for node in ingr_hub['nodes']:
    node_name = node.get('name')
    if node_name in categories:
        node['category'] = categories[node_name].get('category', 'Unknown')
        matched += 1
    else:
        if 'category' not in node:
            node['category'] = 'Unknown'
            unmatched += 1

print(f"Writing file... Matched: {matched}, Unmatched: {unmatched}", file=sys.stderr)
with open('ingr_ingr_hub.json', 'w') as f:
    json.dump(ingr_hub, f, indent=2)

print(f"SUCCESS: {matched} matched, {unmatched} unmatched", file=sys.stderr)


