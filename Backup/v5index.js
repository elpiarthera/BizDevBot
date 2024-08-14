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

// Middleware to check if the user is allowed to interact with the bot
bot.use(async (ctx, next) => {
  if (ctx.updateType === 'message' || ctx.updateType === 'callback_query') {
    const userId = ctx.from.id.toString();
    console.log(`Checking access for user ID: ${userId}`);

    try {
      const userDoc = await db.collection('allowedusers').doc(userId).get();
      if (userDoc.exists) {
        console.log(`User ID: ${userId} is authorized.`);
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

// Function to update the user's broadcast state in Firestore
async function setUserBroadcastState(userId, state) {
  await db.collection('userstates').doc(userId).set({ waitingForBroadcastMessage: state });
}

// Function to get the user's broadcast state from Firestore
async function getUserBroadcastState(userId) {
  const userStateDoc = await db.collection('userstates').doc(userId).get();
  return userStateDoc.exists ? userStateDoc.data().waitingForBroadcastMessage : false;
}

// Track groups where the bot is installed and has admin rights
bot.on('my_chat_member', async (ctx) => {
  const chat = ctx.chat;
  const status = ctx.myChatMember.new_chat_member.status;

  if (status === 'administrator' || status === 'member') {
    const groupId = chat.id.toString();
    console.log(`Bot added to group: ${groupId}`);
    
    // Add or update the group in Firestore
    await db.collection('groups').doc(groupId).set({
      name: chat.title || 'Unnamed Group',
      is_admin: (status === 'administrator'),
    });
  } else if (status === 'kicked' || status === 'left') {
    const groupId = chat.id.toString();
    console.log(`Bot removed from group: ${groupId}`);
    
    // Remove the group from Firestore
    await db.collection('groups').doc(groupId).delete();
  }
});

// Function to send a message to all groups where the bot is an admin
async function broadcastMessageToGroups(message) {
  console.log("Starting broadcast process");
  
  const groupsSnapshot = await db.collection('groups').where('is_admin', '==', true).get();
  
  if (groupsSnapshot.empty) {
    console.log('No groups found where the bot is an admin.');
    return;
  }

  groupsSnapshot.forEach(async (doc) => {
    const groupId = doc.id;
    console.log(`Attempting to send message to group: ${groupId}`);  // Debugging log
    try {
      await bot.telegram.sendMessage(groupId, message);
      console.log(`Message sent successfully to group: ${groupId}`);
    } catch (error) {
      console.error(`Failed to send message to group: ${groupId}`, error);
    }
  });
}

// Function to display the main menu with categories in 2 columns
async function showMainMenu(ctx) {
  try {
    console.log("Showing main menu");

    const categoriesRef = db.collection('categories');
    const categoriesSnapshot = await categoriesRef.get();
    const categories = categoriesSnapshot.docs.map(doc => doc.id);

    if (categories.length > 0) {
      const buttons = [];
      for (let i = 0; i < categories.length; i += 2) {
        buttons.push([
          { text: categories[i], callback_data: `category|${categories[i]}` },
          categories[i + 1] ? { text: categories[i + 1], callback_data: `category|${categories[i + 1]}` } : null
        ].filter(Boolean));
      }
      buttons.push([{ text: 'Broadcast Message', callback_data: 'broadcast_message' }]); // Add broadcast option
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

      // Other logic...

    } else if (callbackData === 'broadcast_message') {
      console.log("Setting waitingForBroadcastMessage flag to true in Firestore");
      await setUserBroadcastState(ctx.from.id.toString(), true); // Persist flag in Firestore
      console.log("Broadcast flag set to true, awaiting message from user."); // Debug log
      await ctx.reply('Please type the message you want to broadcast:');
    } else if (callbackData === 'back_to_main') {
      console.log("Handling 'Back' button, returning to main menu");
      await ctx.answerCbQuery();
      await showMainMenu(ctx);
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCbQuery('An error occurred while processing your request.');
  }
});

// Catch-all message handler
bot.on('message', async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Ignored message from unauthorized user");
    return;
  }

  const userId = ctx.from.id.toString();
  const waitingForBroadcastMessage = await getUserBroadcastState(userId);

  if (waitingForBroadcastMessage) {
    console.log("Received a message to broadcast:", ctx.message.text);
    await broadcastMessageToGroups(ctx.message.text);
    await ctx.reply('Broadcast message sent to all groups.');
    await setUserBroadcastState(userId, false); // Reset flag in Firestore
    console.log("Broadcast flag reset to false after sending message."); // Debug log
  } else {
    console.log("Received regular message from authorized user:", ctx.message.text);
    // Handle other types of messages...
  }
});

// Export the bot as a Firebase function
exports.bot = functions.https.onRequest(async (req, res) => {
  console.log('Bot function triggered');
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling update:", error);
    res.sendStatus(500); // Ensure the function returns a response even in case of error
  }
});
