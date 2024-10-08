/* eslint-disable max-len, require-jsdoc */
const config = require("./config");
const {messageQueue} = require("./queueService");

async function broadcastMessageToGroups(db, bot, message, ctx) {
  try {
    const lastBroadcastDoc = await db.collection("botState").doc("broadcastState").get();
    const lastBroadcastTime = lastBroadcastDoc.exists ? lastBroadcastDoc.data().lastBroadcastTime : 0;
    const currentTime = Date.now();

    if (currentTime - lastBroadcastTime < config.broadcast.messageFrequencyWindow) {
      await ctx.reply("Broadcast message blocked: Message frequency limit exceeded. Try again later.");
      console.log("Broadcast message blocked: Message frequency limit exceeded.");
      return;
    }

    const groupsSnapshot = await db.collection("groups").where("is_admin", "==", true).get();

    if (groupsSnapshot.empty) {
      await ctx.reply("No groups found where the bot is an admin.");
      console.log("No groups found where the bot is an admin.");
      return;
    }

    const failedGroups = [];
    let successfulGroups = 0;
    const totalGroups = groupsSnapshot.size;

    for (const doc of groupsSnapshot.docs) {
      const groupId = doc.id;
      messageQueue.push({
        groupId: groupId,
        message: message,
        bot: bot,
      });
    }

    await new Promise((resolve) => {
      const taskFailedHandler = (taskId, err) => {
        console.error(`Task ${taskId} failed:`, err);
        failedGroups.push({id: err.groupId, reason: err.message});
        checkCompletion();
      };

      const taskFinishHandler = (taskId, result) => {
        if (result.success) {
          successfulGroups++;
        } else {
          failedGroups.push({id: result.groupId, reason: result.error.description});
        }
        checkCompletion();
      };

      const drainHandler = async () => {
        await updateBroadcastState();
        sendFinalReport();
        cleanup();
        resolve();
      };

      const checkCompletion = () => {
        if (successfulGroups + failedGroups.length === totalGroups) {
          messageQueue.emit("drain");
        }
      };

      const updateBroadcastState = async () => {
        await db.collection("botState").doc("broadcastState").set({lastBroadcastTime: Date.now()});
      };

      const sendFinalReport = async () => {
        if (failedGroups.length > 0) {
          const failedMessage = failedGroups.map((group) =>
            `Group ${group.id}: ${group.reason}`,
          ).join("\n");
          await ctx.reply(`Broadcast completed.\nSuccessful: ${successfulGroups}\nFailed: ${failedGroups.length}\n\nFailed groups:\n${failedMessage}`);
        } else {
          await ctx.reply(`Broadcast successfully sent to all ${successfulGroups} groups.`);
        }
      };

      const cleanup = () => {
        messageQueue.removeListener("task_failed", taskFailedHandler);
        messageQueue.removeListener("task_finish", taskFinishHandler);
        messageQueue.removeListener("drain", drainHandler);
      };

      messageQueue.on("task_failed", taskFailedHandler);
      messageQueue.on("task_finish", taskFinishHandler);
      messageQueue.on("drain", drainHandler);
    });
  } catch (error) {
    console.error("Error in broadcast operation:", error);
    await ctx.reply("An error occurred during the broadcast operation.");
  }
}

module.exports = {
  broadcastMessageToGroups,
};
