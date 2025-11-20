"""
Classify ingredients from nodes.csv using a trained model.
Uses node_classification_hub.csv as training data.
Creates a deduplicated CSV with name, is_hub, and category columns.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.base import BaseEstimator, TransformerMixin
import re
from collections import defaultdict

# Categories in order (matching the CSV column names exactly)
CATEGORIES = [
    "Snacks and Dessert",
    "Alcoholic Drinks",
    "Grains and Legumes",
    "Dairy",
    "Fruit",
    "Meat and Poultry",
    "Vegetables and Herbs",
    "Seafood",
    "Conditments and Seasonings"  # Note: typo in CSV ("Conditments" instead of "Condiments")
]

def map_category_to_target(old_category):
    """Map categories from ingr_category.csv to target categories"""
    mapping = {
        # Direct matches
        'Dairy': 'Dairy',
        'Fruit': 'Fruit',
        'Seafood': 'Seafood',
        
        # Bakery/Dessert/Snack -> Snacks and Dessert
        'Bakery/Dessert/Snack': 'Snacks and Dessert',
        
        # Beverage Alcoholic -> Alcoholic Drinks
        'Beverage Alcoholic': 'Alcoholic Drinks',
        
        # Cereal/Crop/Bean -> Grains and Legumes
        'Cereal/Crop/Bean': 'Grains and Legumes',
        
        # Meat/Animal Product -> Meat and Poultry
        'Meat/Animal Product': 'Meat and Poultry',
        
        # Plant/Vegetable, Spice, Flower -> Vegetables and Herbs
        'Plant/Vegetable': 'Vegetables and Herbs',
        'Spice': 'Conditments and Seasonings',
        'Flower': 'Vegetables and Herbs',
        
        # Sauce/Powder/Dressing -> Conditments and Seasonings
        'Sauce/Powder/Dressing': 'Conditments and Seasonings',
        
        # Nut/Seed -> Grains and Legumes (or could be Vegetables and Herbs)
        'Nut/Seed': 'Grains and Legumes',
        
        # Essential Oil/Fat -> Conditments and Seasonings
        'Essential Oil/Fat': 'Conditments and Seasonings',
        
        # Fungus -> Vegetables and Herbs
        'Fungus': 'Vegetables and Herbs',
    }
    return mapping.get(old_category, None)

def map_food_group_to_target(food_group):
    """Map food_group from Food.csv to target categories"""
    if pd.isna(food_group):
        return None
    
    food_group = str(food_group).strip()
    
    mapping = {
        # Direct matches
        'Fruits': 'Fruit',
        'Vegetables': 'Vegetables and Herbs',
        'Herbs and Spices': 'Conditments and Seasonings',
        'Herbs and spices': 'Conditments and Seasonings',  # Handle lowercase variant
        
        # Seafood
        'Aquatic foods': 'Seafood',
        
        # Dairy
        'Milk and milk products': 'Dairy',
        
        # Grains and Legumes
        'Nuts': 'Grains and Legumes',
        'Cereals and cereal products': 'Grains and Legumes',
        'Pulses': 'Grains and Legumes',
        'Soy': 'Grains and Legumes',
        
        # Vegetables and Herbs
        'Gourds': 'Vegetables and Herbs',
        
        # Snacks and Dessert
        'Baking goods': 'Snacks and Dessert',
        'Confectioneries': 'Snacks and Dessert',
        'Cocoa and cocoa products': 'Snacks and Dessert',
        'Snack foods': 'Snacks and Dessert',
        
        # Meat and Poultry
        'Animal foods': 'Meat and Poultry',
        'Eggs': 'Meat and Poultry',
        
        # Conditments and Seasonings
        'Fats and oils': 'Conditments and Seasonings',
        
        # Alcoholic Drinks (from beverages, need to check if alcoholic)
        'Beverages': None,  # Skip general beverages (could be alcoholic or non-alcoholic)
        
        # Skip these (not ingredients or don't fit categories)
        'Teas': None,
        'Coffee and coffee products': None,
        'Dishes': None,  # Prepared dishes, not ingredients
        'Baby foods': None,
        'Unclassified': None,
    }
    return mapping.get(food_group, None)

def load_training_data_hub(csv_path):
    """Load training data from node_classification_hub.csv"""
    df = pd.read_csv(csv_path)
    
    # The CSV has categories as columns, ingredients as rows
    # Each row has one ingredient per category column
    training_data = []
    
    # Strip whitespace from column names to match
    df.columns = df.columns.str.strip()
    
    for category in CATEGORIES:
        category_stripped = category.strip()
        if category_stripped in df.columns:
            ingredients = df[category_stripped].dropna().tolist()
            for ingredient in ingredients:
                # Handle NaN values
                if pd.isna(ingredient):
                    continue
                # Remove underscores and clean
                clean_name = str(ingredient).replace("_", " ").strip()
                if clean_name:
                    training_data.append({
                        'name': clean_name,
                        'category': category_stripped
                    })
        else:
            print(f"Warning: Category '{category_stripped}' not found in training data")
    
    return pd.DataFrame(training_data)

def load_training_data_ingr_category(csv_path):
    """Load and map training data from ingr_category.csv"""
    df = pd.read_csv(csv_path)
    training_data = []
    
    for idx, row in df.iterrows():
        ingredient = row.get('ingredient', '')
        old_category = row.get('category', '')
        
        if pd.isna(ingredient) or pd.isna(old_category):
            continue
        
        # Map to target category
        target_category = map_category_to_target(old_category)
        if target_category:
            # Normalize ingredient name
            clean_name = str(ingredient).replace("_", " ").strip()
            if clean_name:
                training_data.append({
                    'name': clean_name,
                    'category': target_category
                })
    
    return pd.DataFrame(training_data)

def load_training_data_food(csv_path):
    """Load and map training data from Food.csv"""
    df = pd.read_csv(csv_path)
    training_data = []
    
    for idx, row in df.iterrows():
        name = row.get('name', '')
        food_group = row.get('food_group', '')
        
        if pd.isna(name) or pd.isna(food_group):
            continue
        
        # Map to target category
        target_category = map_food_group_to_target(food_group)
        if target_category:
            # Normalize ingredient name
            clean_name = str(name).replace("_", " ").strip()
            if clean_name:
                training_data.append({
                    'name': clean_name,
                    'category': target_category
                })
    
    return pd.DataFrame(training_data)

def load_all_training_data(hub_csv, ingr_category_csv, food_csv):
    """Load and combine all training data from multiple sources"""
    print("Loading training data from node_classification_hub.csv...")
    hub_df = load_training_data_hub(hub_csv)
    print(f"Loaded {len(hub_df)} examples from hub data")
    
    print("Loading training data from ingr_category.csv...")
    ingr_df = load_training_data_ingr_category(ingr_category_csv)
    print(f"Loaded {len(ingr_df)} examples from ingr_category data")
    
    print("Loading training data from Food.csv...")
    food_df = load_training_data_food(food_csv)
    print(f"Loaded {len(food_df)} examples from Food data")
    
    # Combine all datasets
    combined_df = pd.concat([hub_df, ingr_df, food_df], ignore_index=True)
    
    # Remove duplicates (same name and category)
    combined_df = combined_df.drop_duplicates(subset=['name', 'category'], keep='first')
    
    print(f"\nTotal unique training examples: {len(combined_df)}")
    print(f"Category distribution:")
    print(combined_df['category'].value_counts().to_dict())
    
    return combined_df

def normalize_ingredient_name(name):
    """Normalize ingredient name by removing underscores and cleaning"""
    # Handle NaN/None values
    if pd.isna(name) or name is None:
        return ""
    
    # Convert to string if not already
    name = str(name)
    
    # Remove underscores
    normalized = name.replace("_", " ").strip()
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.lower()

def extract_base_ingredient(name):
    """
    Extract base ingredient from variations.
    e.g., "ground_beef" -> "beef", "beef_liver" -> "beef", "80%_lean_ground_beef" -> "beef"
    Strategy: Remove modifiers and keep the core ingredient name
    """
    normalized = normalize_ingredient_name(name)
    words = normalized.split()
    
    # Common modifiers to remove (prefixes and suffixes)
    modifiers = {
        'ground', 'lean', 'fat', 'free', 'low', 'high', 'whole', 'skim', 'full',
        'powder', 'extract', 'juice', 'sauce', 'paste', 'oil', 'flour', 'meal',
        'base', 'bone', 'bones', 'bouillon', 'cube', 'granule', 'chop', 'belly',
        'liver', 'tenderloin', 'marrow', 'cream', 'milk', 'cheese', 'bread',
        'inch', 'baked', 'unbaked', 'pastry', 'pie', 'shell', 'crust', 'tortilla',
        'evaporated', 'condensed', 'whipping', 'table', 'cottage', 'mozzarella',
        'cheddar', 'swiss', 'feta', 'parmesan', 'ricotta', 'goat', 'gruyere'
    }
    
    # Remove numbers and percentages
    words = [w for w in words if not re.match(r'^\d+%?$', w)]
    
    # Remove modifiers
    base_words = [w for w in words if w not in modifiers]
    
    # If we have base words, return the main one (usually the longest or most specific)
    if base_words:
        # Return the longest word (usually the main ingredient)
        return max(base_words, key=len)
    
    # If all words were modifiers, try to find the most important one
    # Usually the last word before common suffixes
    if words:
        # Return the last word (often the main ingredient)
        return words[-1]
    
    return normalized

def deduplicate_ingredients(df):
    """
    Deduplicate ingredients by keeping only the base ingredient.
    Groups similar ingredients and keeps the shortest/most basic name.
    For example: "beef", "ground_beef", "beef_liver" -> keep only "beef"
    """
    # Group by base ingredient
    base_groups = defaultdict(list)
    
    for idx, row in df.iterrows():
        name = row['name']
        base = extract_base_ingredient(name)
        base_groups[base].append((idx, name, row))
    
    # For each group, keep the shortest name (usually the base ingredient)
    deduplicated = []
    seen_bases = set()
    
    for base, items in base_groups.items():
        # Sort by: 1) name length (shortest first), 2) prefer hub ingredients
        items.sort(key=lambda x: (len(x[1]), x[2]['is_hub'] != 'hub'))
        
        # Check if we've already seen this base
        if base in seen_bases:
            continue
        
        # Keep the first (shortest) item, prefer hub if available
        idx, name, row = items[0]
        deduplicated.append({
            'name': name,
            'is_hub': row['is_hub'],
            'category': row['category']
        })
        seen_bases.add(base)
    
    return pd.DataFrame(deduplicated)

class TextLengthTransformer(BaseEstimator, TransformerMixin):
    """Extract text length features"""
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        lengths = np.array([[len(str(x))] for x in X])
        return lengths

def train_classifier(training_df):
    """Train an improved classifier using the training data"""
    print("Training classifier...")
    
    # Prepare training data
    X = training_df['name'].values
    y = training_df['category'].values
    
    # Split for validation
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {len(X_train)} examples")
    print(f"Validation set: {len(X_val)} examples")
    
    # Create multiple feature extractors
    # TF-IDF with word n-grams
    tfidf_word = TfidfVectorizer(
        max_features=15000,
        ngram_range=(1, 3),
        min_df=1,
        max_df=0.9,
        sublinear_tf=True,
        analyzer='word'
    )
    
    # Character n-grams for better pattern matching
    tfidf_char = TfidfVectorizer(
        max_features=5000,
        ngram_range=(3, 5),
        min_df=1,
        max_df=0.95,
        analyzer='char',
        lowercase=True
    )
    
    # Combine features
    feature_union = FeatureUnion([
        ('word_tfidf', tfidf_word),
        ('char_tfidf', tfidf_char),
        ('length', TextLengthTransformer())
    ])
    
    # Try multiple models and select the best
    print("\nTesting different models...")
    
    models = {
        'GradientBoosting': GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.1,
            max_depth=10,
            random_state=42,
            subsample=0.8
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=300,
            max_depth=25,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        ),
        'SVM': SVC(
            kernel='rbf',
            C=10.0,
            gamma='scale',
            probability=True,
            random_state=42,
            class_weight='balanced'
        ),
        'LogisticRegression': LogisticRegression(
            max_iter=3000,
            C=10.0,
            random_state=42,
            solver='lbfgs',
            multi_class='multinomial',
            class_weight='balanced'
        )
    }
    
    best_model = None
    best_score = 0
    best_name = None
    
    for name, model in models.items():
        # Some models work better without scaler for sparse matrices
        if name == 'SVM':
            pipeline = Pipeline([
                ('features', feature_union),
                ('clf', model)
            ])
        else:
            pipeline = Pipeline([
                ('features', feature_union),
                ('clf', model)
            ])
        
        try:
            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_val)
            score = f1_score(y_val, y_pred, average='weighted')
            print(f"  {name}: F1-score = {score:.4f}")
            
            if score > best_score:
                best_score = score
                best_model = pipeline
                best_name = name
        except Exception as e:
            print(f"  {name}: Failed - {e}")
            continue
    
    print(f"\nBest model: {best_name} (F1-score: {best_score:.4f})")
    
    # Evaluate best model
    y_pred_train = best_model.predict(X_train)
    y_pred_val = best_model.predict(X_val)
    
    train_accuracy = accuracy_score(y_train, y_pred_train)
    val_accuracy = accuracy_score(y_val, y_pred_val)
    val_f1 = f1_score(y_val, y_pred_val, average='weighted')
    
    print(f"\nTraining accuracy: {train_accuracy:.2%}")
    print(f"Validation accuracy: {val_accuracy:.2%}")
    print(f"Validation F1-score: {val_f1:.4f}")
    
    # Show per-category performance
    print("\nPer-category validation performance:")
    print(classification_report(y_val, y_pred_val, target_names=CATEGORIES, zero_division=0))
    
    # Use the best model directly (ensemble causes issues with pipelines)
    # The best model already performs well
    print("\nUsing best model for final training...")
    final_pipeline = best_model
    
    # Retrain on full dataset
    print("\nRetraining on full dataset...")
    final_pipeline.fit(X, y)
    
    return final_pipeline

def classify_ingredients(input_csv, hub_csv, ingr_category_csv, food_csv, output_csv):
    """Main function to classify ingredients"""
    
    # Load all training data
    print("="*60)
    print("Loading training data from multiple sources...")
    print("="*60)
    training_df = load_all_training_data(hub_csv, ingr_category_csv, food_csv)
    
    # Train classifier
    print("\n" + "="*60)
    classifier = train_classifier(training_df)
    
    # Load input data
    print("\nLoading input data...")
    nodes_df = pd.read_csv(input_csv)
    
    # Filter only ingredients
    ingredients_df = nodes_df[nodes_df['node_type'] == 'ingredient'].copy()
    print(f"Found {len(ingredients_df)} ingredient entries")
    
    # Remove rows with missing names
    ingredients_df = ingredients_df[ingredients_df['name'].notna()].copy()
    print(f"After removing entries with missing names: {len(ingredients_df)} ingredient entries")
    
    # Normalize names (remove underscores)
    ingredients_df['normalized_name'] = ingredients_df['name'].apply(normalize_ingredient_name)
    
    # Remove rows with empty normalized names
    ingredients_df = ingredients_df[ingredients_df['normalized_name'] != ''].copy()
    print(f"After removing entries with empty names: {len(ingredients_df)} ingredient entries")
    
    # Classify ingredients
    print("\nClassifying ingredients...")
    normalized_names = ingredients_df['normalized_name'].values
    categories = classifier.predict(normalized_names)
    
    # Create result dataframe
    result_df = pd.DataFrame({
        'name': ingredients_df['normalized_name'].values,
        'is_hub': ingredients_df['is_hub'].values,
        'category': categories
    })
    
    print(f"\nClassification distribution:")
    print(result_df['category'].value_counts())
    
    # Deduplicate ingredients
    print("\nDeduplicating ingredients...")
    print(f"Before deduplication: {len(result_df)} ingredients")
    final_df = deduplicate_ingredients(result_df)
    print(f"After deduplication: {len(final_df)} ingredients")
    
    # Save to CSV
    final_df.to_csv(output_csv, index=False)
    print(f"\n✅ Saved classified ingredients to: {output_csv}")
    print(f"   Total unique ingredients: {len(final_df)}")
    print(f"   Categories: {final_df['category'].value_counts().to_dict()}")
    
    return final_df

if __name__ == "__main__":
    input_csv = "input/nodes.csv"
    hub_csv = "input/node_classification_hub.csv"
    ingr_category_csv = "input/ingr_category.csv"
    food_csv = "input/Food.csv"
    output_csv = "ingredients_classified.csv"
    
    classify_ingredients(input_csv, hub_csv, ingr_category_csv, food_csv, output_csv)

