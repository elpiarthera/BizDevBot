import firebase_admin
from firebase_admin import credentials, firestore
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv
import os
import csv

# Load environment variables from .env file
load_dotenv()

# Get the Telegram API token and Firebase key path from the environment
TELEGRAM_API_TOKEN = os.getenv("TELEGRAM_API_TOKEN")
FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH")

# Initialize Firebase using the path from the environment variable
cred = credentials.Certificate(FIREBASE_KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Manual Firestore Query Test
try:
    test_category = "Share a link"
    test_function = "Arthera Dashboard"
    test_ref = db.collection('categories').document(test_category).collection('functions').document(test_function)
    test_doc = test_ref.get()

    if test_doc.exists:
        print("Manual Test: Document found")
        print("Manual Test Response:", test_doc.to_dict().get('response'))
    else:
        print("Manual Test: Document not found")
except Exception as e:
    print(f"Manual Test: An error occurred: {e}")

# Initialize the bot with your API token using Application
application = Application.builder().token(TELEGRAM_API_TOKEN).build()

# Function to test Firestore connection
async def test_firestore_connection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        # Try fetching a collection (even if it's empty, this will confirm the connection)
        collections = db.collections()
        collection_names = [collection.id for collection in collections]
        await update.message.reply_text(f"Connected to Firestore! Collections: {', '.join(collection_names)}")
    except Exception as e:
        await update.message.reply_text(f"Error connecting to Firestore: {e}")

# Function to display the main menu
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Fetch categories from Firestore
    categories_ref = db.collection('categories')
    categories = [cat.id for cat in categories_ref.stream()]

    # Create a keyboard with categories
    keyboard = [[InlineKeyboardButton(cat, callback_data=cat)] for cat in categories]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text('Please choose a category:', reply_markup=reply_markup)

# Function to handle category selection and show submenu
async def menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    # Fetch the selected category's functions
    category_ref = db.collection('categories').document(query.data)
    functions_ref = category_ref.collection('functions')
    functions = [func.id for func in functions_ref.stream()]

    # Show the submenu
    keyboard = [[InlineKeyboardButton(func, callback_data=query.data + '|' + func)] for func in functions]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(text="Select a function:", reply_markup=reply_markup)

# Function to handle function selection and respond with preconfigured answer
async def function_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    try:
        # Print the raw callback data for debugging
        print(f"Callback data: {query.data}")

        # Split the callback data into category and function
        category, function = query.data.split('|')
        print(f"Category: {category}, Function: {function}")

        # Fetch the document from Firestore
        function_ref = db.collection('categories').document(category).collection('functions').document(function)
        function_doc = function_ref.get()

        # Check if the document exists and has the response field
        if function_doc.exists:
            response = function_doc.to_dict().get('response')
            if response:
                print(f"Response found: {response}")
                await query.edit_message_text(text=response)
            else:
                print("No response field found.")
                await query.edit_message_text(text="No response field found.")
        else:
            print("Function document not found.")
            await query.edit_message_text(text="Function document not found.")

    except Exception as e:
        # Handle any exceptions and display the error message
        print(f"An error occurred: {e}")
        await query.edit_message_text(text=f"An error occurred: {e}")

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
            print(f'Imported {function} under {category} category.')

# Import CSV data when the script is run
csv_file_path = 'collections firebase import.csv'  # Ensure this file is in the same directory as bot.py
import_csv_to_firestore(csv_file_path)

# Register the handlers
application.add_handler(CommandHandler('start', start))
application.add_handler(CommandHandler('testdb', test_firestore_connection))
application.add_handler(CallbackQueryHandler(menu_handler, pattern="^[^|]+$"))  # Handles category selection
application.add_handler(CallbackQueryHandler(function_handler, pattern="^[^|]+\|.+$"))  # Handles function selection

# Start the bot
application.run_polling()
