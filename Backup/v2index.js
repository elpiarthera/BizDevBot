const functions = require("firebase-functions");
const { Telegraf } = require("telegraf");
const admin = require("firebase-admin");

// Retrieve the environment variables from Firebase Functions config
const telegramToken = functions.config().telegram.token;
const firebaseKeyPath = functions.config().service.key_path;

// Log the environment variables to ensure they are loaded
console.log("Using Telegram API Token:", telegramToken);
console.log("Using Firebase Key Path:", firebaseKeyPath);

// Initialize Firebase Admin SDK with the key from Firebase functions config
if (!firebaseKeyPath) {
  console.error("Firebase Key Path is not set.");
  process.exit(1);
}

try {
  const serviceAccount = require("./" + firebaseKeyPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  console.log("Firebase app initialized with project ID:", admin.app().options.projectId);
  console.log("Service account file loaded successfully");
} catch (error) {
  console.error("Error initializing Firebase app:", error);
  process.exit(1);
}

const db = admin.firestore();

// Initialize the Telegram bot with the token from Firebase functions config
const bot = new Telegraf(telegramToken);

async function testFirestoreConnection() {
  try {
    console.log('Attempting to connect to Firestore...');
    const snapshot = await db.collection('allowedusers').get();
    console.log('Connected to Firestore successfully');
    console.log('Number of documents in allowedusers:', snapshot.size);
    if (snapshot.size === 0) {
      console.log('The allowedusers collection is empty. Checking if the collection exists...');
      const collections = await db.listCollections();
      collections.forEach(collection => {
        console.log('Found collection:', collection.id);
      });
    } else {
      snapshot.forEach(doc => {
        console.log('User ID:', doc.id, 'Data:', doc.data());
      });
    }
  } catch (error) {
    console.error('Error connecting to Firestore:', error);
    throw error; // Rethrow the error to be caught by the main error handler
  }
}

// Middleware to check if the user is allowed to interact with the bot
bot.use(async (ctx, next) => {
  if (ctx.updateType === 'message' || ctx.updateType === 'callback_query') {
    const userId = ctx.from.id.toString();
    console.log(`Checking access for user ID: ${userId}`);

    try {
      const userDoc = await db.collection('allowedusers').doc(userId).get();
      console.log(`User document exists: ${userDoc.exists}`);
      if (userDoc.exists) {
        console.log(`User ID: ${userId} is authorized. Data:`, userDoc.data());
        ctx.state.isAuthorized = true;
      } else {
        console.log(`User ID: ${userId} is not authorized.`);
        ctx.state.isAuthorized = false;
      }
    } catch (error) {
      console.error("Error checking user authorization:", error);
      ctx.state.isAuthorized = false;
    }
  }
  return next();
});

// Function to display the main menu
async function showMainMenu(ctx) {
  try {
    console.log("Showing main menu");

    const categoriesRef = db.collection('categories'); // This collection is for menu categories
    const categoriesSnapshot = await categoriesRef.get();
    const categories = categoriesSnapshot.docs.map(doc => doc.id);

    console.log("Retrieved categories:", categories);

    if (categories.length > 0) {
      const buttons = categories.map(cat => [{ text: cat, callback_data: `category|${cat}` }]);
      await ctx.reply('Please choose a category:', {
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      console.log("No categories found");
      await ctx.reply('No categories available.');
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    await ctx.reply('An error occurred while fetching categories.');
  }
}

// Handle the /start command
bot.command('start', async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Unauthorized user attempted to start the bot");
    return; // Don't respond to unauthorized users
  }

  try {
    console.log("Handling /start command");
    await showMainMenu(ctx);
  } catch (error) {
    console.error("Error handling /start command:", error);
    await ctx.reply('An error occurred while starting the bot.');
  }
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Unauthorized user attempted to use callback query");
    await ctx.answerCbQuery('You are not authorized to use this bot.');
    return;
  }

  try {
    const callbackData = ctx.callbackQuery.data;
    console.log("Received callback_query with data:", callbackData);

    if (callbackData.startsWith("category|")) {
      const category = callbackData.split("|")[1];
      console.log("Handling category selection:", category);

      const functionsRef = db.collection('categories').doc(category).collection('functions'); // This is for category functions
      const functionsSnapshot = await functionsRef.get();
      const functions = functionsSnapshot.docs.map(doc => doc.id);

      console.log("Retrieved functions for category:", category, "Functions:", functions);

      if (functions.length > 0) {
        const buttons = functions.map(func => [{ text: func, callback_data: `function|${category}|${func}` }]);
        buttons.push([{ text: 'Back', callback_data: 'back_to_main' }]);
        await ctx.editMessageText(`Select a function from ${category}:`, {
          reply_markup: { inline_keyboard: buttons }
        });
      } else {
        console.log("No functions found for category:", category);
        await ctx.answerCbQuery('No functions available in this category.');
      }
      return;
    }

    if (callbackData.startsWith("function|")) {
      const [_, category, func] = callbackData.split("|");
      console.log("Handling function selection:", func, "in category:", category);

      const functionDoc = await db.collection('categories').doc(category).collection('functions').doc(func).get();

      if (functionDoc.exists) {
        const responseText = functionDoc.data().response;
        console.log("Function response:", responseText);
        await ctx.answerCbQuery();
        await ctx.reply(responseText);
      } else {
        console.log("No response found for function:", func, "in category:", category);
        await ctx.answerCbQuery('No response available for this function.');
      }
      return;
    }

    if (callbackData === 'back_to_main') {
      console.log("Handling 'Back' button, returning to main menu");
      await ctx.answerCbQuery();
      await showMainMenu(ctx);
      return;
    }

  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCbQuery('An error occurred while processing your request.');
  }
});

// Catch-all message handler
bot.on('message', (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Ignored message from unauthorized user");
    return;
  }
  console.log("Received message from authorized user:", ctx.message.text);
  // Handle other types of messages if needed
});

// Export the bot as a Firebase function
exports.bot = functions.https.onRequest(async (req, res) => {
  console.log('Bot function triggered');
  try {
    await testFirestoreConnection();
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling update:", error);
    res.sendStatus(500);
  }
});
