/* eslint-disable max-len, require-jsdoc */
const Queue = require("better-queue");
const config = require("./config");
const {sendMessageWithRetry} = require("./messageService");

const dynamicRateLimit = {
  lastMessageTime: Date.now(),
  consecutiveErrors: 0,
  currentDelay: config.broadcast.rateLimitDelay,
};

function updateRateLimit(success) {
  const now = Date.now();
  if (success) {
    dynamicRateLimit.consecutiveErrors = 0;
    dynamicRateLimit.currentDelay = Math.max(
        config.broadcast.rateLimitDelay,
        dynamicRateLimit.currentDelay * 0.9,
    );
  } else {
    dynamicRateLimit.consecutiveErrors++;
    dynamicRateLimit.currentDelay = Math.min(
        30000, // Max delay of 30 seconds
        dynamicRateLimit.currentDelay * 2,
    );
  }
  dynamicRateLimit.lastMessageTime = now;
}

const messageQueue = new Queue(async (task, cb) => {
  const {groupId, message, bot} = task;

  try {
    const result = await sendMessageWithRetry(bot, groupId, message);

    if (result.success) {
      console.log(`Message sent successfully to group: ${groupId}`);
      updateRateLimit(true);
      cb(null, {success: true, groupId});
    } else {
      console.error(`Failed to send message to group ${groupId}:`, result.error);
      updateRateLimit(false);
      cb(null, {success: false, groupId, error: result.error});
    }
  } catch (error) {
    console.error(`Unexpected error sending message to group ${groupId}:`, error);
    updateRateLimit(false);
    cb(null, {success: false, groupId, error: {description: error.message}});
  }
}, {
  concurrent: 1,
  maxRetries: 0, // We handle retries in sendMessageWithRetry
  retryDelay: 0,
  afterProcessDelay: () => dynamicRateLimit.currentDelay,
});

messageQueue.on("task_finish", (taskId, result) => {
  if (result.success) {
    console.log(`Task ${taskId} completed successfully for group ${result.groupId}`);
  } else {
    console.error(`Task ${taskId} failed for group ${result.groupId}:`, result.error);
  }
});

messageQueue.on("task_failed", (taskId, err) => {
  console.error(`Task ${taskId} failed unexpectedly:`, err);
});

module.exports = {messageQueue};
