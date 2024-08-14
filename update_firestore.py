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
    "Arthera Chain details:\n\n"
    "Arthera is an EVM blockchain, but not just that. We have also introduced the concept of 'Gas Pass' in Web3.\n\n"
    "Specifically, in addition to being able to cover transaction fees like on any other blockchain (pay as you go, one transaction = one 'transaction fee'), users can purchase a Gas Pass at a fixed price, which will cover their transaction fees. Projects can also acquire 'contracts gas pass' to cover their users' transaction fees.\n\n"
    "Thanks to our dedicated platform, called the Subscription Management Platform, these projects will be able to create and manage their own subscription system, offering their users coverage for transaction fees (and possibly other benefits) for a fixed amount in crypto or fiat.\n\n"
    "Additionally, we are introducing a revenue redistribution model for the blockchain. In simple terms, the more a dapp generates transactions, the more the project generates revenue by receiving a portion of the transaction fees/revenue from Gas Pass sales.\n\n"
    "🔑 Key components:\n"
    "✅ DAG (Direct Acyclic Graph) structures to achieve high TPS.\n"
    "✅ One click wallet creation\n"
    "✅ Gas-less Experience with a Gas Pass\n"
    "✅ Account Abstraction Next Gen for dApps (offer a no Gas Fees experience to end user at a predictable and fixed price)\n"
    "✅ Early Bird Welcoming Package for qualified projects to reduce their users acquisition costs and to engage a long term partnership with Arthera’s core team\n\n"
    "🌐 Links:\n"
    "🧰 Website: https://www.arthera.net\n"
    "📃 Dashboard: https://dashboard.arthera.net\n"
    "📚 Documentation: https://docs.arthera.net\n"
    "📈 Explorer: https://explorer.arthera.net\n"
    "🐦 Twitter: https://x.com/artherachain\n"
    "ℹ️ Telegram: https://t.me/artherachain\n"
    "📜 Quest platform: https://quest.arthera.net\n\n"
    "📊 Some key numbers:\n"
    "Arthera’s Progressive Grand Opening start on 19/02 marked the beginning of a 12 weeks major campaign offering the possibility for users to win prizes while enjoying a gasless experience AND for onboarded projects to be early capturing a new audience while benefiting from our revenue sharing model:\n"
    "- 134,000+ subscriptions claimed\n"
    "- 42,000,000+ transactions performed\n"
    "- Up to 603,000 24-hours transactions so far\n"
    "- block validation time as low as 0.3 second\n"
)

# Update the specific document in Firestore
try:
    doc_ref = db.collection('categories').document('Share a blurb').collection('functions').document('Ecosystem Blurb')
    doc_ref.update({'response': formatted_response})
    logging.info("Document updated successfully!")
except Exception as e:
    logging.error(f"Failed to update the document: {e}")
    exit(1)
