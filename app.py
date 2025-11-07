import dash
from dash import html, dcc, Output, Input, State
import dash_cytoscape as cyto
import pandas as pd
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ----------------------------
# Load embeddings and nodes
# ----------------------------
with open("flavor_embeddings.pickle", "rb") as f:
    embeddings = pickle.load(f)  # keys are strings of node IDs

nodes_df = pd.read_csv("nodes.csv")
ingredients_df = nodes_df[nodes_df['node_type'] == 'ingredient']

# Map node_id -> name
id_to_name = dict(zip(nodes_df['node_id'], nodes_df['name']))

# Build embeddings keyed by ingredient name
embeddings_by_name = {}
for node_id_str, vec in embeddings.items():
    node_id = int(node_id_str)
    if node_id in ingredients_df['node_id'].values:
        name = id_to_name[node_id]
        embeddings_by_name[name] = np.array(vec)

ingredient_names = [str(name) for name in embeddings_by_name.keys() if pd.notna(name)]
all_vecs = np.array([embeddings_by_name[name] for name in ingredient_names])

# ----------------------------
# Compatibility function
# ----------------------------
def find_compatible_ingredients(query, top_n=10):
    if query not in embeddings_by_name:
        return []
    query_vec = embeddings_by_name[query].reshape(1, -1)
    sims = cosine_similarity(query_vec, all_vecs)[0]
    comp_df = pd.DataFrame({
        "ingredient": ingredient_names,
        "compatibility_score": sims
    }).sort_values("compatibility_score", ascending=False)
    comp_df = comp_df[comp_df['ingredient'] != query]
    return comp_df.iloc[:top_n].to_dict('records')

# ----------------------------
# Initialize Dash app
# ----------------------------
app = dash.Dash(__name__)
server = app.server

app.layout = html.Div([
    html.H1("🍽️ Interactive Ingredient Compatibility Graph"),
    dcc.Dropdown(
        id='ingredient-dropdown',
        options=[{'label': name, 'value': name} for name in ingredient_names],
        value=ingredient_names[0]
    ),
    cyto.Cytoscape(
        id='cytoscape-graph',
        layout={'name': 'cose'},
        style={'width': '100%', 'height': '600px'},
        elements=[],
        stylesheet=[
            {'selector': 'node', 'style': {
                'content': 'data(label)',
                'background-color': '#BFD7B5',
                'width': '40px', 'height': '40px',
                'text-valign': 'center', 'text-halign': 'center',
                'font-size': '12px'
            }},
            {'selector': '.selected', 'style': {
                'background-color': '#FF5733',
                'width': '50px', 'height': '50px',
                'font-size': '14px'
            }},
            {'selector': 'edge', 'style': {
                'line-color': '#A3C4BC', 'width': 2
            }}
        ]
    ),
    dcc.Store(id='selected-nodes', data=[]),
    dcc.Store(id='node-edges', data={}),
    dcc.Store(id='node-generated-nodes', data={})
])

# ----------------------------
# Graph callback
# ----------------------------
@app.callback(
    Output('cytoscape-graph', 'elements'),
    Output('selected-nodes', 'data'),
    Output('node-edges', 'data'),
    Output('node-generated-nodes', 'data'),
    Input('ingredient-dropdown', 'value'),
    Input('cytoscape-graph', 'tapNodeData'),
    State('cytoscape-graph', 'elements'),
    State('selected-nodes', 'data'),
    State('node-edges', 'data'),
    State('node-generated-nodes', 'data')
)
def update_graph(selected_ingredient, clicked_node, elements, selected_nodes, node_edges, node_generated_nodes):
    ctx = dash.callback_context
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0] if ctx.triggered else None

    # Reset graph for new dropdown selection
    if triggered_id == 'ingredient-dropdown':
        elements = []
        selected_nodes = []
        node_edges = {}
        node_generated_nodes = {}

        # Add the input node
        elements.append({'data': {'id': selected_ingredient, 'label': selected_ingredient}})
        selected_nodes.append(selected_ingredient)

        # Add top compatible ingredients
        top_matches = find_compatible_ingredients(selected_ingredient, top_n=8)
        added_edges = []
        generated_nodes = []
        existing_nodes = {selected_ingredient}
        existing_edges = set()
        for rec in top_matches:
            node_id = rec['ingredient']
            if node_id not in existing_nodes:
                elements.append({'data': {'id': node_id, 'label': node_id}})
                existing_nodes.add(node_id)
                generated_nodes.append(node_id)
            elements.append({'data': {'source': selected_ingredient, 'target': node_id}})
            added_edges.append((selected_ingredient, node_id))
        node_edges[selected_ingredient] = added_edges
        node_generated_nodes[selected_ingredient] = generated_nodes

        # Highlight nodes
        for el in elements:
            if 'id' in el.get('data', {}):
                el['classes'] = 'selected' if el['data']['id'] in selected_nodes else ''
        return elements, selected_nodes, node_edges, node_generated_nodes

    # Otherwise handle node clicks (select/unselect)
    if elements is None:
        elements = []

    trigger = clicked_node['label'] if clicked_node else selected_ingredient

    if clicked_node and trigger in selected_nodes:
        # Unselect logic
        selected_nodes.remove(trigger)
        edges_to_remove = node_edges.get(trigger, [])
        elements = [el for el in elements if not ('source' in el.get('data', {}) and 'target' in el.get('data', {}) and ((el['data']['source'], el['data']['target']) in edges_to_remove or (el['data']['target'], el['data']['source']) in edges_to_remove))]
        node_edges.pop(trigger, None)
        nodes_to_check = node_generated_nodes.get(trigger, [])
        for n in nodes_to_check:
            connected = False
            for el in elements:
                data = el.get('data', {})
                if 'source' in data and 'target' in data:
                    if n in (data['source'], data['target']) and (data['source'] in selected_nodes or data['target'] in selected_nodes):
                        connected = True
                        break
            if not connected and n not in selected_nodes:
                elements = [el for el in elements if not ('id' in el.get('data', {}) and el['data']['id'] == n)]
        node_generated_nodes.pop(trigger, None)
    else:
        # Select logic
        if trigger not in selected_nodes:
            selected_nodes.append(trigger)

        existing_nodes = {el['data']['id'] for el in elements if 'id' in el.get('data', {})}
        existing_edges = {(el['data']['source'], el['data']['target']) for el in elements if 'source' in el.get('data', {}) and 'target' in el.get('data', {})}

        if trigger not in existing_nodes:
            elements.append({'data': {'id': trigger, 'label': trigger}})
            existing_nodes.add(trigger)

        top_matches = find_compatible_ingredients(trigger, top_n=8)
        added_edges = []
        generated_nodes = []

        for rec in top_matches:
            node_id = rec['ingredient']
            if node_id not in existing_nodes:
                elements.append({'data': {'id': node_id, 'label': node_id}})
                existing_nodes.add(node_id)
                generated_nodes.append(node_id)
            if (trigger, node_id) not in existing_edges and (node_id, trigger) not in existing_edges:
                elements.append({'data': {'source': trigger, 'target': node_id}})
                added_edges.append((trigger, node_id))
                existing_edges.add((trigger, node_id))

        node_edges[trigger] = added_edges
        node_generated_nodes[trigger] = generated_nodes

    # Update highlight classes
    for el in elements:
        if 'id' in el.get('data', {}):
            el['classes'] = 'selected' if el['data']['id'] in selected_nodes else ''

    return elements, selected_nodes, node_edges, node_generated_nodes

# ----------------------------
if __name__ == '__main__':
    app.run(debug=True)
