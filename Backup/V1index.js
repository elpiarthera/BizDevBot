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

admin.initializeApp({
  credential: admin.credential.cert(require("./" + firebaseKeyPath))
});

const db = admin.firestore();

// Initialize the Telegram bot with the token from Firebase functions config
const bot = new Telegraf(telegramToken);

// Function to display the main menu
async function showMainMenu(ctx) {
  try {
    console.log("Showing main menu");

    const categoriesRef = db.collection('categories');
    const categoriesSnapshot = await categoriesRef.get();
    const categories = categoriesSnapshot.docs.map(doc => doc.id);

    if (categories.length > 0) {
      const buttons = categories.map(cat => [{ text: cat, callback_data: `category|${cat}` }]);
      await ctx.reply('Please choose a category:', {
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await ctx.reply('No categories available.');
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    await ctx.reply('An error occurred while fetching categories.');
  }
}

// Handle the /start command
bot.command('start', async (ctx) => {
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
  try {
    const callbackData = ctx.callbackQuery.data;
    console.log("Received callback_query with data:", callbackData);

    if (callbackData.startsWith("category|")) {
      const category = callbackData.split("|")[1];
      console.log("Handling category selection:", category);

      const functionsRef = db.collection('categories').doc(category).collection('functions');
      const functionsSnapshot = await functionsRef.get();
      const functions = functionsSnapshot.docs.map(doc => doc.id);

      if (functions.length > 0) {
        const buttons = functions.map(func => [{ text: func, callback_data: `function|${category}|${func}` }]);
        buttons.push([{ text: 'Back', callback_data: 'back_to_main' }]);
        await ctx.editMessageText(`Select a function from ${category}:`, {
          reply_markup: { inline_keyboard: buttons }
        });
      } else {
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
        await ctx.answerCbQuery();
        await ctx.reply(responseText);
      } else {
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

// Export the bot as a Firebase function
exports.bot = functions.https.onRequest(async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
  } catch (e) {
    console.error("Error handling update:", e);
    res.sendStatus(500); // Return 500 if an error occurs
    return;
  }
  res.sendStatus(200);
});