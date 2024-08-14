import firebase_admin
from firebase_admin import credentials, firestore
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Load environment variables from .env file
load_dotenv()

# Get the Telegram API token and Firebase key path from the environment
TELEGRAM_API_TOKEN = os.getenv("TELEGRAM_API_TOKEN")
FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH")

# Initialize Firebase using the path from the environment variable
cred = credentials.Certificate(FIREBASE_KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

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
    logging.info("Received /start command")
    logging.info("Fetching categories from Firestore...")
    
    # Fetch categories from Firestore
    categories_ref = db.collection('categories')
    categories = [cat.id for cat in categories_ref.stream()]
    
    logging.info(f"Fetched categories: {categories}")
    
    if categories:
        keyboard = []
        for i in range(0, len(categories), 2):  # Create rows with 2 buttons each
            row = [InlineKeyboardButton(categories[i], callback_data=categories[i])]
            if i + 1 < len(categories):
                row.append(InlineKeyboardButton(categories[i + 1], callback_data=categories[i + 1]))
            keyboard.append(row)
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text('Please choose a category:', reply_markup=reply_markup)
    else:
        await update.message.reply_text('No categories found.')

# Function to handle category selection and show submenu
async def menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    logging.info(f"Fetching functions for category: {query.data}")

    # Fetch the selected category's functions
    category_ref = db.collection('categories').document(query.data)
    functions_ref = category_ref.collection('functions')
    functions = [func.id for func in functions_ref.stream()]

    logging.info(f"Functions fetched for category {query.data}: {functions}")

    # Show the submenu
    if functions:
        keyboard = []
        for i in range(0, len(functions), 2):  # Create rows with 2 buttons each
            row = [InlineKeyboardButton(functions[i], callback_data=query.data + '|' + functions[i])]
            if i + 1 < len(functions):
                row.append(InlineKeyboardButton(functions[i + 1], callback_data=query.data + '|' + functions[i + 1]))
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("🔙 Back", callback_data="back")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text="Select a function:", reply_markup=reply_markup)
    else:
        await query.edit_message_text(text="No functions found for this category.")

# Function to handle "Back" button
async def back_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await start(query, context)  # Pass the query instead of update to maintain context

# Function to handle function selection and respond with preconfigured answer
async def function_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    try:
        logging.info(f"Callback data: {query.data}")

        # Split the callback data into category and function
        category, function = query.data.split('|')
        logging.info(f"Category: {category}, Function: {function}")

        # Fetch the document from Firestore
        function_ref = db.collection('categories').document(category).collection('functions').document(function)
        function_doc = function_ref.get()

        # Check if the document exists and has the response field
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
        logging.error(f"An error occurred: {e}")
        await query.edit_message_text(text=f"An error occurred: {e}")

# Register the handlers
application = Application.builder().token(TELEGRAM_API_TOKEN).build()

application.add_handler(CommandHandler('start', start))
application.add_handler(CommandHandler('testdb', test_firestore_connection))
application.add_handler(CallbackQueryHandler(back_handler, pattern="^back$"))  # Handles "Back" button
application.add_handler(CallbackQueryHandler(menu_handler, pattern="^[^|]+$"))  # Handles category selection
application.add_handler(CallbackQueryHandler(function_handler, pattern="^[^|]+\|.+$"))  # Handles function selection

# Start the bot
application.run_polling()
