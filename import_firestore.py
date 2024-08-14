import firebase_admin
from firebase_admin import credentials, firestore
import csv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Firebase
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logging.info("Firebase initialized successfully.")
except Exception as e:
    logging.error(f"Failed to initialize Firebase: {e}")
    exit(1)

# Function to import CSV data into Firestore
def import_csv_to_firestore(csv_file):
    with open(csv_file, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            category = row['category']
            function = row['function']
            response = row['response']

            # Set document path
            doc_ref = db.collection('categories').document(category).collection('functions').document(function)

            # Add data to Firestore
            doc_ref.set({
                'response': response
            })
            logging.info(f'Imported {function} under {category} category.')

# Specify the path to your CSV file
csv_file_path = 'collections firebase import.csv'  # Ensure this file is in the same directory as import_firestore.py

# Import CSV data
import_csv_to_firestore(csv_file_path)
