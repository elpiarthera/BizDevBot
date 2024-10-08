const functions = require("firebase-functions");
const {Telegraf} = require("telegraf");
const admin = require("firebase-admin");
const config = require("./config");
const {broadcastMessageToGroups} = require("./broadcastService");

console.log("Using Telegram API Token:", config.telegram.token);
console.log("Using Firebase Key Path:", config.firebase.keyPath);

if (!config.firebase.keyPath) {
  console.error("Firebase Key Path is not set.");
  process.exit(1);
}

try {
  const serviceAccount = require("./" + config.firebase.keyPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  console.log(
      "Firebase app initialized with project ID:",
      admin.app().options.projectId,
  );
  console.log("Service account file loaded successfully");
} catch (error) {
  console.error("Error initializing Firebase app:", error);
  process.exit(1);
}

const db = admin.firestore();
const bot = new Telegraf(config.telegram.token);

/**
 * Middleware to check if the user is allowed to interact with the bot
 * @param {Object} ctx - The context object from Telegraf
 * @param {Function} next - The next middleware function
 */
bot.use(async (ctx, next) => {
  if (ctx.updateType === "message" || ctx.updateType === "callback_query") {
    const userId = ctx.from.id.toString();
    console.log(`Checking access for user ID: ${userId}`);

    try {
      const userDoc = await db.collection("allowedusers").doc(userId).get();
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

/**
 * Track groups where the bot is installed and has admin rights
 */
bot.on("my_chat_member", async (ctx) => {
  const chat = ctx.chat;
  const status = ctx.myChatMember.new_chat_member.status;

  if (status === "administrator" || status === "member") {
    const groupId = chat.id.toString();
    console.log(`Bot added to group: ${groupId}`);

    await db.collection("groups").doc(groupId).set({
      name: chat.title || "Unnamed Group",
      is_admin: (status === "administrator"),
    });
  } else if (status === "kicked" || status === "left") {
    const groupId = chat.id.toString();
    console.log(`Bot removed from group: ${groupId}`);

    await db.collection("groups").doc(groupId).delete();
  }
});

/**
 * Display the main menu with categories in 2 columns
 * @param {Object} ctx - The context object from Telegraf
 */
async function showMainMenu(ctx) {
  try {
    console.log("Showing main menu");

    const categoriesRef = db.collection("categories");
    const categoriesSnapshot = await categoriesRef.get();
    const categories = categoriesSnapshot.docs.map((doc) => doc.id);

    if (categories.length > 0) {
      const buttons = [];
      for (let i = 0; i < categories.length; i += 2) {
        buttons.push([
          {text: categories[i], callback_data: `category|${categories[i]}`},
          categories[i + 1] ? {
            text: categories[i + 1],
            callback_data: `category|${categories[i + 1]}`,
          } : null,
        ].filter(Boolean));
      }

      if (ctx.chat.type === "private") {
        buttons.push([{
          text: "Broadcast Message",
          callback_data: "broadcast_message",
        }]);
      }

      buttons.push([{text: "Close Menu", callback_data: "close_menu"}]);

      await ctx.reply("Please choose a category:", {
        reply_markup: {inline_keyboard: buttons},
      });
    } else {
      console.log("No categories found");
      await ctx.reply("No categories available.");
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    await ctx.reply("An error occurred while fetching categories.");
  }
}

/**
 * Handle the /start command
 */
bot.command("start", async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Unauthorized user attempted to start the bot");
    return;
  }

  try {
    console.log("Handling /start command");
    await showMainMenu(ctx);

    if (ctx.message) {
      await ctx.deleteMessage(ctx.message.message_id);
      console.log("Deleted /start message");
    }
  } catch (error) {
    console.error("Error handling /start command:", error);
    await ctx.reply("An error occurred while starting the bot.");
  }
});

/**
 * Handle callback queries
 */
bot.on("callback_query", async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Unauthorized user attempted to use callback query");
    await ctx.answerCbQuery("You are not authorized to use this bot.");
    return;
  }

  try {
    const callbackData = ctx.callbackQuery.data;
    console.log("Received callback_query with data:", callbackData);

    if (callbackData.startsWith("category|")) {
      const category = callbackData.split("|")[1];
      console.log("Handling category selection:", category);

      const functionsRef = db.collection("categories")
          .doc(category).collection("functions");
      const functionsSnapshot = await functionsRef.get();
      const functions = functionsSnapshot.docs.map((doc) => doc.id);

      if (functions.length > 0) {
        const buttons = [];
        for (let i = 0; i < functions.length; i += 2) {
          buttons.push([
            {
              text: functions[i],
              callback_data: `function|${category}|${functions[i]}`,
            },
            functions[i + 1] ? {
              text: functions[i + 1],
              callback_data: `function|${category}|${functions[i + 1]}`,
            } : null,
          ].filter(Boolean));
        }
        buttons.push([
          {text: "Back", callback_data: "back_to_main"},
          {text: "Close Menu", callback_data: "close_menu"},
        ]);
        await ctx.editMessageText(
            `Select a function from ${category}:`,
            {reply_markup: {inline_keyboard: buttons}},
        );
      } else {
        console.log("No functions found for category:", category);
        await ctx.answerCbQuery(
            "No functions available in this category.",
        );
      }
    } else if (callbackData.startsWith("function|")) {
      const [, category, func] = callbackData.split("|");
      console.log(
          "Handling function selection:",
          func,
          "in category:",
          category,
      );

      const functionDoc = await db.collection("categories")
          .doc(category).collection("functions").doc(func).get();

      if (functionDoc.exists) {
        const responseText = functionDoc.data().response;
        await ctx.answerCbQuery();
        await ctx.reply(responseText);
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      } else {
        console.log(
            "No response found for function:",
            func,
            "in category:",
            category,
        );
        await ctx.answerCbQuery(
            "No response available for this function.",
        );
      }
    } else if (callbackData === "broadcast_message") {
      if (ctx.chat.type !== "private") {
        await ctx.answerCbQuery(
            "Broadcast messages can only be sent in direct messages.",
        );
        return;
      }

      console.log(
          "Setting waitingForBroadcastMessage flag to true in Firestore",
      );
      await db.collection("userstates").doc(ctx.from.id.toString())
          .set({waitingForBroadcastMessage: true}, {merge: true});
      console.log("Broadcast flag set to true, awaiting message from user.");
      await ctx.reply("Please type the message you want to broadcast:");
    } else if (callbackData === "back_to_main") {
      console.log("Handling 'Back' button, returning to main menu");
      await ctx.answerCbQuery();
      await showMainMenu(ctx);
    } else if (callbackData === "close_menu") {
      console.log("Handling 'Close Menu' button, deleting the menu message");
      await ctx.deleteMessage();
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCbQuery(
        "An error occurred while processing your request.",
    );
  }
});

/**
 * Handle regular messages
 */
bot.on("text", async (ctx) => {
  if (!ctx.state.isAuthorized) {
    console.log("Ignored message from unauthorized user");
    return;
  }

  const userId = ctx.from.id.toString();
  console.log(
      `Received regular message from authorized user: ${ctx.message.text}`,
  );

  if (ctx.chat.type === "private") {
    const userStateDoc = await db.collection("userstates").doc(userId).get();
    const userState = userStateDoc.exists ? userStateDoc.data() : null;

    if (userState && userState.waitingForBroadcastMessage) {
      console.log(
          `Broadcasting message from user ${userId} to all groups: ` +
          `${ctx.message.text}`,
      );
      await broadcastMessageToGroups(db, bot, ctx.message.text, ctx);
      await db.collection("userstates").doc(userId)
          .set({waitingForBroadcastMessage: false}, {merge: true});
      await ctx.reply("Broadcast message sent to all groups.");
    } else {
      console.log(
          `Processing regular message from user ${userId}: ` +
          `${ctx.message.text}`,
      );
      await ctx.reply(
          "Use /start to see the main menu or /broadcast to send a message.",
      );
    }
  } else {
    console.log(
        `Message from user ${userId} in group ${ctx.chat.id} ignored.`,
    );
  }
});

exports.bot = functions.https.onRequest(async (req, res) => {
  try {
    console.log("Bot function triggered");
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error("Error in bot function:", error);
    res.status(500).send("Internal Server Error");
  }
});
