import streamlit as st
import pandas as pd
from pymongo import MongoClient
from neo4j import GraphDatabase
import os

# --- Configuration and Database Setup ---

# Get connection details from environment variables set in docker-compose.yml
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DATABASE = os.getenv("MONGO_DATABASE")

@st.cache_resource
def init_neo4j_driver():
    """Initializes and returns the Neo4j Driver."""
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        st.success("Connected to Neo4j successfully!")
        return driver
    except Exception as e:
        st.error(f"Failed to connect to Neo4j: {e}")
        return None

@st.cache_resource
def init_mongo_client():
    """Initializes and returns the MongoDB Client."""
    try:
        client = MongoClient(MONGO_URI)
        client.admin.command('ping') # Test connection
        db = client[MONGO_DATABASE]
        st.success("Connected to MongoDB successfully!")
        return db
    except Exception as e:
        st.error(f"Failed to connect to MongoDB: {e}")
        return None

neo4j_driver = init_neo4j_driver()
mongo_db = init_mongo_client()

# --- Core Flavor Pairing Logic (To be implemented next) ---

def find_ingredient_vector(tx, ingredient_name):
    """Retrieves the 300D embedding vector for a given ingredient from Neo4j."""
    # Note: We use WHERE to match the name and RETURN the vector property.
    query = (
        "MATCH (i:Ingredient {name: }) "
        "RETURN i.vector as vector"
    )
    result = tx.run(query, name=ingredient_name).single()
    if result:
        return result['vector']
    return None

def find_best_pairings(tx, input_vector, limit=10):
    """
    Calculates the Cosine Similarity between the input vector and all other vectors 
    in the database and returns the top pairings.
    
    This query uses the APOC plugin's 'apoc.cypher.run' to perform the calculation.
    """
    # NOTE: Neo4j requires the 'apoc' plugin and the 'apoc.cypher.run' 
    # function to run the vector similarity logic efficiently.
    query = """
    MATCH (input:Ingredient) WHERE input.name <> 
    RETURN input.name AS ingredient, 
           gds.similarity.cosine(input.vector, ) AS score
    ORDER BY score DESC 
    LIMIT 
    """
    
    # We will need to slightly adjust this query if GDS (Graph Data Science) 
    # library is not automatically available, but this is the ideal syntax.
    
    # A simplified query structure for proof-of-concept without GDS:
    query = """
    MATCH (i:Ingredient) WHERE i.name <> 
    RETURN i.name AS ingredient, i.vector AS vector
    LIMIT 
    """
    
    # In a real setup, we would perform the similarity calculation here or via GDS
    
    results = tx.run(query, name="DUMMY", input_vector=input_vector, limit=limit)
    return [{"ingredient": record["ingredient"], "score": 0.0} for record in results]


# --- Streamlit UI ---

st.set_page_config(layout="wide", page_title="The Flavor Lab")

st.markdown("""
# 🧪 The Flavor Lab
## The Science of Deliciousness
""")

if not neo4j_driver or not mongo_db:
    st.warning("Database connections failed. Please check your Docker services.")
else:
    # 1. Get List of Ingredients for the Selector (from MongoDB for speed)
    # NOTE: The data must have been loaded by data/process_data.py first!
    try:
        ingredients_cursor = mongo_db['ingredients'].find({}, {'_id': 0, 'name': 1})
        all_ingredients = sorted([doc['name'] for doc in ingredients_cursor])
    except Exception as e:
        st.error(f"Error fetching ingredients from MongoDB: {e}")
        all_ingredients = ["No data loaded"]

    # 2. Ingredient Selector
    selected_ingredient = st.selectbox(
        "Select an Ingredient to Find its Best Partners:",
        options=all_ingredients,
        index=None,
        placeholder="Type an ingredient (e.g., 'Cinnamon', 'Cheese')"
    )

    if selected_ingredient and selected_ingredient != "No data loaded":
        st.subheader(f"Best Flavor Pairings for: {selected_ingredient.title()}")
        
        # 3. Core Pairing Calculation
        with neo4j_driver.session() as session:
            # Step 3a: Get the input ingredient's vector
            input_vector = session.execute_read(find_ingredient_vector, selected_ingredient)

            if input_vector is None:
                st.warning(f"Embedding vector not found for {selected_ingredient.title()}. Please check data integrity.")
            else:
                # Step 3b: Find pairings based on vector similarity (Cosine Similarity)
                # NOTE: For the live code, you would use GDS for real calculation.
                # For this proof of concept, we return dummy results.
                
                # We will implement the real calculation next. For now, a placeholder:
                results_data = [
                    {"ingredient": "Placeholder 1: Vanilla", "score": 0.95},
                    {"ingredient": "Placeholder 2: Apple", "score": 0.92},
                    {"ingredient": "Placeholder 3: Coffee", "score": 0.88},
                ]
                
                df = pd.DataFrame(results_data)
                
                # Display results using st-aggrid for a professional, searchable table
                from st_aggrid import AgGrid, GridOptionsBuilder

                gb = GridOptionsBuilder.from_dataframe(df)
                gb.configure_column("score", headerName="Flavor Match Score (Cosine Similarity)", precision=4)
                gb.configure_column("ingredient", headerName="Pairing Ingredient")
                gridOptions = gb.build()

                AgGrid(df, 
                       gridOptions=gridOptions, 
                       data_return_mode='AS_INPUT', 
                       update_mode='MODEL_CHANGED', 
                       fit_columns_on_grid_load=True, 
                       allow_unsafe_jscode=True, 
                       enable_enterprise_modules=False,
                       height=300, 
                       width='100%')

                st.info("The scores shown are currently placeholders. The next step is to implement the real vector calculation in Neo4j.")

# Footer/Info
st.sidebar.markdown("---")
st.sidebar.markdown(f"""
**System Status:**
- Neo4j URI: 
- MongoDB URI: 
- Processor Container: 
""")
