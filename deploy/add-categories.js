/**
 * Script to add category information to ingr_ingr_hub.json nodes
 * by matching with network_data_hub.json categories
 */

const fs = require('fs');
const path = require('path');

// Read both JSON files
const ingrHubPath = path.join(__dirname, 'ingr_ingr_hub.json');
const networkDataPath = path.join(__dirname, 'network_data_hub.json');

console.log('Reading files...');
const ingrHub = JSON.parse(fs.readFileSync(ingrHubPath, 'utf8'));
const networkData = JSON.parse(fs.readFileSync(networkDataPath, 'utf8'));

const categories = networkData.categories || {};
let matched = 0;
let unmatched = 0;

// Add category to each node
console.log('Adding categories to nodes...');
ingrHub.nodes.forEach(node => {
    const nodeName = node.name;
    const categoryInfo = categories[nodeName];
    
    if (categoryInfo) {
        node.category = categoryInfo.category;
        node.categoryColor = categoryInfo.color;
        matched++;
    } else {
        node.category = 'Unknown';
        node.categoryColor = '#95a5a6';
        unmatched++;
    }
});

// Write updated JSON
console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
console.log('Writing updated file...');
fs.writeFileSync(ingrHubPath, JSON.stringify(ingrHub, null, 2));
console.log('✓ Categories added successfully!');


