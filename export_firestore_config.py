import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import csv

# Initialize Firebase app (use your production credentials)
cred = credentials.Certificate("path/to/your/production-firebase-key.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def export_to_csv(filename):
    with open(filename, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['collection', 'document', 'field', 'value'])

        # Get all collections
        collections = db.collections()
        for collection in collections:
            collection_name = collection.id
            # Get all documents in the collection
            for doc in collection.get():
                doc_id = doc.id
                doc_dict = doc.to_dict()
                if not doc_dict:
                    # If document is empty, just write the collection and document
                    writer.writerow([collection_name, doc_id, '', ''])
                else:
                    # Write each field in the document
                    for field, value in doc_dict.items():
                        writer.writerow([collection_name, doc_id, field, value])

    print(f"Firestore configuration exported to {filename}")

# Run the export
export_to_csv('firestore_export.csv')