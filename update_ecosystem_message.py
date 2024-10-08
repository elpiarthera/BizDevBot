import firebase_admin
from firebase_admin import credentials, firestore
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Firebase
try:
    cred = credentials.Certificate("functions/firebase-key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logging.info("Firebase initialized successfully.")
except Exception as e:
    logging.error(f"Failed to initialize Firebase: {e}")
    exit(1)

# Define the formatted ecosystem message with actual newlines
formatted_ecosystem_message = (
    "Don’t hesitate to join our Ecosystem group!\n"
    "This is the place to be for projects building on Arthera to meet and start collaborations.\n"
    "Join, bring your team in and introduce the project to the community of builders 🤝\n"
    "Link: https://t.me/+T-Ckv4tPgxlkN2I0"
)

# Create or update the document in Firestore
try:
    # Check if the document exists
    doc_ref = db.collection('categories').document('Template MSG').collection('functions').document('Join Eco group')
    
    # Use .set() to ensure the document is created if it doesn't exist
    doc_ref.set({'response': formatted_ecosystem_message}, merge=True)
    
    logging.info("Ecosystem message updated successfully!")
except Exception as e:
    logging.error(f"Failed to update the ecosystem message: {e}")
    exit(1)
