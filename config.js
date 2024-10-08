// config.js
/* eslint-disable max-len, require-jsdoc */
const functions = require("firebase-functions");

module.exports = {
  telegram: {
    token: functions.config().telegram.token,
  },
  firebase: {
    keyPath: functions.config().service.key_path,
  },
  broadcast: {
    rateLimitDelay: 1000, // 1 second
    retryDelay: 5000, // 5 seconds
    messageFrequencyWindow: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
  },
};
