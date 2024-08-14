import firebase_admin
from firebase_admin import credentials, firestore
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)

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
        logging.info("Manual Test: Document found")
        logging.info("Manual Test Response: %s", test_doc.to_dict().get('response'))
    else:
        logging.error("Manual Test: Document not found")
except Exception as e:
    logging.error(f"Manual Test: An error occurred: {e}")

# Initialize the bot with your API token using Application
application = Application.builder().token(TELEGRAM_API_TOKEN).build()

# Function to test Firestore connection
async def test_firestore_connection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        collections = db.collections()
        collection_names = [collection.id for collection in collections]
        await update.message.reply_text(f"Connected to Firestore! Collections: {', '.join(collection_names)}")
    except Exception as e:
        await update.message.reply_text(f"Error connecting to Firestore: {e}")

# Function to display the main menu
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logging.debug("Received /start command")

    try:
        # Fetch categories from Firestore
        logging.debug("Fetching categories from Firestore...")
        categories_ref = db.collection('categories')
        categories = [cat.id for cat in categories_ref.stream()]

        logging.debug(f"Fetched categories: {categories}")
        
        if not categories:
            logging.debug("No categories found in Firestore.")
            await update.message.reply_text('No categories found.')
            return

        # Create keyboard with categories
        keyboard = [[InlineKeyboardButton(cat, callback_data=cat)] for cat in categories]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text('Please choose a category:', reply_markup=reply_markup)

    except Exception as e:
        logging.error(f"Error in start() function: {e}")
        await update.message.reply_text(f"An error occurred: {e}")

# Function to handle category selection and show submenu
async def menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    logging.debug(f"Fetching functions for category: {query.data}")

    try:
        category_ref = db.collection('categories').document(query.data)
        functions_ref = category_ref.collection('functions')
        functions = [func.id for func in functions_ref.stream()]

        logging.debug(f"Functions fetched for category {query.data}: {functions}")

        if functions:
            keyboard = [[InlineKeyboardButton(func, callback_data=query.data + '|' + func)] for func in functions]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text="Select a function:", reply_markup=reply_markup)
        else:
            await query.edit_message_text(text="No functions found for this category.")

    except Exception as e:
        logging.error(f"Error in menu_handler() function: {e}")
        await query.edit_message_text(f"An error occurred: {e}")

# Function to handle function selection and respond with preconfigured answer
async def function_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    logging.debug(f"Callback data: {query.data}")

    try:
        category, function = query.data.split('|')
        logging.debug(f"Category: {category}, Function: {function}")

        function_ref = db.collection('categories').document(category).collection('functions').document(function)
        function_doc = function_ref.get()

        if function_doc.exists:
            response = function_doc.to_dict().get('response')
            if response:
                logging.info(f"Response found: {response}")
                await query.edit_message_text(text=response)
            else:
                logging.error("No response field found.")
                await query.edit_message_text(text="No response field found.")
        else:
            logging.error("Function document not found.")
            await query.edit_message_text(text="Function document not found.")

    except Exception as e:
        logging.error(f"Error in function_handler() function: {e}")
        await query.edit_message_text(f"An error occurred: {e}")

# Register the handlers
application.add_handler(CommandHandler('start', start))
application.add_handler(CommandHandler('testdb', test_firestore_connection))
application.add_handler(CallbackQueryHandler(menu_handler, pattern="^[^|]+$"))
application.add_handler(CallbackQueryHandler(function_handler, pattern="^[^|]+\|.+$"))

# Start the bot
application.run_polling()
