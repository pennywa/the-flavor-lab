const fs = require('fs');

console.log('Reading files...');
const ingrHub = JSON.parse(fs.readFileSync('ingr_ingr_hub.json', 'utf8'));
const networkData = JSON.parse(fs.readFileSync('network_data_hub.json', 'utf8'));

const categories = networkData.categories || {};
console.log(`Found ${Object.keys(categories).length} categories`);

let matched = 0;
ingrHub.nodes.forEach(node => {
    const name = node.name;
    if (categories[name]) {
        node.category = categories[name].category || 'Unknown';
        matched++;
    } else if (!node.category) {
        node.category = 'Unknown';
    }
});

fs.writeFileSync('ingr_ingr_hub.json', JSON.stringify(ingrHub, null, 2));
console.log(`✓ Categories added: ${matched} matched`);


