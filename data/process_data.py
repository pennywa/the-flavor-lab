import pandas as pd
from pymongo import MongoClient
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
import os
import pickle
from tqdm import tqdm
import time
import numpy as np

# --- Configuration ---
EMBEDDINGS_FILE = 'data/raw/node_embeddings_300D.pickle'
MONGO_DATABASE = os.getenv("MONGO_DATABASE")
MONGO_COLLECTION_NAME = 'ingredients'

# Neo4j details from environment variables
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# --- Database Connections ---

def connect_to_neo4j(retries=5, delay=5):
    """Attempt to connect to Neo4j with retries."""
    for i in range(retries):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            print("🟢 Successfully connected to Neo4j.")
            return driver
        except ServiceUnavailable as e:
            print(f"⚠️ Neo4j connection failed (Attempt {i+1}/{retries}). Retrying in {delay}s...")
            time.sleep(delay)
        except Exception as e:
            print(f"🔴 An unexpected error occurred during Neo4j connection: {e}")
            return None
    return None

def connect_to_mongodb():
    """Attempt to connect to MongoDB."""
    try:
        # Check if the MONGO_URI is set before attempting connection
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            print("🔴 ERROR: MONGO_URI environment variable is not set.")
            return None
            
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("🟢 Successfully connected to MongoDB.")
        return client
    except Exception as e:
        print(f"🔴 Failed to connect to MongoDB: {e}")
        return None

# --- Filtering Logic (Minimally Restrictive Heuristic) ---

def is_food_ingredient(name):
    """A minimally restrictive heuristic to filter out only clear chemical compounds."""
    name = name.lower()
    
    # 1. Chemical Indicators: Check for numbers, brackets, and specific chemical punctuation
    # This filters out structures like '2-methyl-butanol' or 'l-(+)-eriodictyol'
    if any(char.isdigit() or char in '()[]' for char in name):
        return False

    # 2. Highly specific chemical prefixes and suffixes (keep short list)
    chemical_starters = ['methyl', 'ethyl', 'amino', 'oxo', 'hydro']
    chemical_enders = ['ol', 'one', 'ate', 'al', 'oate', 'amine', 'diol']
    
    # Check if the name starts or ends with a highly specific chemical marker 
    # This filter is intentionally loose to avoid cutting real ingredients.
    if any(name.startswith(p) and len(name) > len(p) for p in chemical_starters) or \
       any(name.endswith(s) and len(name) > len(s) for s in chemical_enders):
        return False
    
    # 3. Final check for common non-food terms
    if name in ['compound', 'mixture', 'component', 'acid', 'fat', 'wax', 'alcohol']:
        return False
        
    return True

# --- Neo4j Data Loading Functions ---

def create_constraint(tx):
    """Ensures ingredient names are unique in Neo4j (Updated Syntax)."""
    query = "CREATE CONSTRAINT IF NOT EXISTS FOR (i:Ingredient) REQUIRE i.name IS UNIQUE"
    tx.run(query)

def load_ingredient_node(tx, ingredient_name, vector):
    """Creates an Ingredient node with its 300D vector array property."""
    query = (
        "MERGE (i:Ingredient {name: $name}) "
        "SET i.vector = $vector"
    )
    # Convert numpy array to list for Neo4j array property storage
    tx.run(query, name=ingredient_name, vector=vector.tolist())

# --- Main Processing Logic ---

def process_and_load_data():
    """Loads data from pickle and pushes to Neo4j and MongoDB."""
    
    # 1. Load Data from Pickle
    print(f"\n--- 1. Loading data from {EMBEDDINGS_FILE}...")
    try:
        with open(EMBEDDINGS_FILE, 'rb') as f:
            embeddings_dict = pickle.load(f)
        print(f"✅ Loaded {len(embeddings_dict)} total items from pickle.")
    except FileNotFoundError:
        print(f"❌ ERROR: Embeddings file not found at {EMBEDDINGS_FILE}. Did you place the 10MB file in data/raw?")
        return
    except Exception as e:
        print(f"❌ ERROR reading pickle file: {e}")
        return

    # 2. Filter and Decode Ingredient Names
    filtered_data = {}
    for key, vector in embeddings_dict.items():
        # Fix: Safely decode key if it is a byte string, otherwise treat as a string.
        if isinstance(key, bytes):
            ingredient_name = key.decode('utf-8')
        else:
            ingredient_name = key
        
        # Apply the heuristic filter
        if is_food_ingredient(ingredient_name):
            filtered_data[ingredient_name] = vector
    
    print(f"✅ Filtered down to {len(filtered_data)} food ingredients.")


    # 3. Connect to Databases
    neo4j_driver = connect_to_neo4j()
    mongo_client = connect_to_mongodb()
    
    if neo4j_driver is None or mongo_client is None:
        print("❌ ERROR: Database connections failed. Aborting data load.")
        return

    # 4. Load into Neo4j
    print("\n--- 2. Loading data into Neo4j...")
    with neo4j_driver.session() as session:
        # Create constraint first
        session.execute_write(create_constraint)

        # Use tqdm for a progress bar while iterating
        for ingredient_name, vector in tqdm(filtered_data.items(), desc="Neo4j Loading"):
            # Ensure the vector is a numpy array before calling tolist()
            vector_array = np.array(vector)
            session.execute_write(load_ingredient_node, ingredient_name, vector_array)
    print("✅ Neo4j data loading complete.")
    neo4j_driver.close()

    # 5. Load into MongoDB
    print("\n--- 3. Loading data into MongoDB...")
    mongo_db = mongo_client[MONGO_DATABASE]
    mongo_collection = mongo_db[MONGO_COLLECTION_NAME]
    
    # Clear collection before loading to ensure clean start
    mongo_collection.delete_many({})

    # Prepare data for MongoDB (only need name for lookup/dropdowns)
    mongo_data = [{"name": name} for name in filtered_data.keys()]
    
    # Check if the list is not empty before inserting (to avoid the last error)
    if mongo_data:
        mongo_collection.insert_many(mongo_data)
        print(f"✅ MongoDB loading complete. Inserted {len(mongo_data)} documents.")
    else:
        print("⚠️ MongoDB insertion skipped: No food ingredients found after filtering.")
        
    mongo_client.close()

if __name__ == "__main__":
    process_and_load_data()