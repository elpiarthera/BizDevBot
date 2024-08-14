import firebase_admin
from firebase_admin import credentials, firestore
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

# Define the formatted response with actual newlines
formatted_response = (
    "You will find here under all Arthera useful links 👇\n"
    "Website: https://arthera.net\n"
    "Documentation: https://docs.arthera.net\n"
    "Explorer: https://explorer.arthera.net\n"
    "Testnet Explorer: https://explorer-test.arthera.net\n"
    "Mainnet Faucet: https://gaspass.arthera.net\n"
    "Testnet Faucet: https://gaspass-test.arthera.net\n"
    "Dashboard: https://dashboard.arthera.net\n"
    "Quest platform: https://quest.arthera.net\n"
    "Media Kit/Branding: https://docs.arthera.net/build/branding/\n"
    "TG Public Group: https://t.me/artherachain\n"
    "TG Ecosystem Group: https://t.me/+T-Ckv4tPgxlkN2I0\n"
    "Twitter: https://x.com/artherachain"
)

# Update the specific document in Firestore
try:
    doc_ref = db.collection('categories').document('Share a link').collection('functions').document('All useful links')
    doc_ref.update({'response': formatted_response})
    logging.info("Document updated successfully!")
except Exception as e:
    logging.error(f"Failed to update the document: {e}")
    exit(1)
