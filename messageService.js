/* eslint-disable max-len, require-jsdoc */
const config = require("./config");

/**
 * Sends a message to a group with retry logic for rate limiting
 * @param {Object} bot - The Telegraf bot instance
 * @param {string} groupId - The ID of the group to send the message to
 * @param {string} message - The message to send
 * @param {number} [attempts=config.broadcast.maxRetries] - The number of retry attempts
 * @return {Promise<Object>} - A promise that resolves to an object indicating success or failure
 */
async function sendMessageWithRetry(bot, groupId, message, attempts = config.broadcast.maxRetries) {
  try {
    await bot.telegram.sendMessage(groupId, message);
    return {success: true};
  } catch (error) {
    if (attempts > 1 && error.code === 429) { // Too Many Requests error
      console.log(`Rate limit hit for group ${groupId}. Retrying in ${config.broadcast.retryDelay / 1000} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, config.broadcast.retryDelay));
      return sendMessageWithRetry(bot, groupId, message, attempts - 1);
    } else {
      return {
        success: false,
        error: {
          code: error.code,
          description: error.description || error.message,
        },
      };
    }
  }
}

module.exports = {
  sendMessageWithRetry,
};
