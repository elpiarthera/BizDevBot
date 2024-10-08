import firebase_admin
from firebase_admin import credentials, firestore
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Firebase
try:
    # Indent this line and the following lines properly
    cred = credentials.Certificate("functions/firebase-key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logging.info("Firebase initialized successfully.")
except Exception as e:
    logging.error(f"Failed to initialize Firebase: {e}")
    exit(1)

# Define the formatted welcome message with actual newlines
formatted_welcome_message = (
    "👋 Hello and Welcome! \n"
    "I'm the Arthera Biz Dev Bot, here to assist Arthera's team members with business development tasks. \n"
    "While I work behind the scenes, our team is here to support your projects, share updates, and help drive collaboration forward. \n"
    "Rest assured, the Arthera team is committed to making your journey with us as smooth and successful as possible. \n"
    "If you have any questions or need support, our team is always ready to help!"
)

# Update the specific document in Firestore
try:
    # Adjust this path according to your Firestore structure
    doc_ref = db.collection('categories').document('Template MSG').collection('functions').document('Welcome message')
    doc_ref.update({'response': formatted_welcome_message})
    logging.info("Welcome message updated successfully!")
except Exception as e:
    logging.error(f"Failed to update the welcome message: {e}")
    exit(1)
