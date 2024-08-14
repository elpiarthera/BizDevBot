import firebase_admin
from firebase_admin import credentials, firestore
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Firebase
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Fetch and display all categories and their functions
categories_ref = db.collection('categories')
categories = categories_ref.stream()

for category in categories:
    category_id = category.id
    logging.info(f"Category: {category_id}")
    
    functions_ref = db.collection('categories').document(category_id).collection('functions')
    functions = functions_ref.stream()
    
    for func in functions:
        func_id = func.id
        func_data = func.to_dict()
        response = func_data.get('response', 'No response found')
        logging.info(f" - Function: {func_id} | Response: {response}")

