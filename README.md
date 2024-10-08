# Arthera Biz Dev Bot

Arthera Biz Dev Bot is a Telegram bot designed to assist Arthera's team members with business development tasks. The bot is built using Node.js, Firebase, and Telegraf.

## Table of Contents

- [Arthera Biz Dev Bot](#arthera-biz-dev-bot)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Steps](#steps)
  - [Usage](#usage)
    - [Starting the Bot](#starting-the-bot)
  - [Project Structure](#project-structure)
  - [Firebase Integration](#firebase-integration)
  - [Telegram Bot](#telegram-bot)
  - [Environment Configuration](#environment-configuration)
  - [Dependencies](#dependencies)
  - [Backup Files](#backup-files)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact Information](#contact-information)

## Features

- **Business Development Assistance**: The bot helps Arthera's team members with various business development tasks.
- **Node.js and Firebase**: Built using Node.js for server-side logic and Firebase for backend services.
- **Telegraf Library**: Utilizes the Telegraf library to interact with the Telegram Bot API.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (version 18 or higher)
- Firebase CLI
- A Firebase project with Firestore enabled
- A Telegram bot token

## Installation

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/elpiarthera/BizDevBot.git
   cd BizDevBot/functions
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Create a `.env` file in the `functions` directory with the following content:
     ```plaintext
     TELEGRAM_API_TOKEN=your-telegram-bot-token
     FIREBASE_KEY_PATH=path-to-your-firebase-key.json
     ```

4. **Deploy to Firebase**:
   ```bash
   firebase deploy --only functions
   ```

## Usage

### Starting the Bot

To start the bot locally for testing, use the Firebase emulator:

1. **Start the Firebase emulator**:
   ```bash
   firebase emulators:start
   ```

2. **Run the bot**:
   ```bash
   npm run start
   ```

## Project Structure

```
BizDevBot/
├── functions/
│   ├── src/
│   │   ├── index.js
│   │   ├── bot.py
│   │   ├── import_firestore.py
│   │   ├── update_welcome_message.py
│   │   ├── update_firestore.py
│   │   ├── update_ecosystem_message.py
│   │   └── ...
│   ├── .env
│   ├── package.json
│   └── ...
├── .firebaserc
├── firebase.json
└── ...
```

## Firebase Integration

The bot uses Firebase for backend services. Ensure you have a Firebase project set up with Firestore enabled. The Firebase functions are deployed using the Firebase CLI.

## Telegram Bot

The bot interacts with Telegram using the Telegraf library. You need a Telegram bot token, which you can obtain by creating a bot on Telegram through the BotFather.

## Environment Configuration

The environment variables required for the bot are stored in a `.env` file in the `functions` directory. The required variables are:

- `TELEGRAM_API_TOKEN`: Your Telegram bot token.
- `FIREBASE_KEY_PATH`: Path to your Firebase service account key JSON file.

## Dependencies

The project relies on the following main dependencies:

- `node.js`: JavaScript runtime.
- `firebase-admin`: Firebase Admin SDK.
- `firebase-functions`: Firebase Functions SDK.
- `telegraf`: Telegram Bot API library.

## Backup Files

To back up your Firebase Firestore data, you can use the Firebase CLI:

```bash
firebase firestore:export gs://your-bucket-name
```

## Contributing

Contributions are welcome. Please follow the contributing guidelines.

## License

The bot is licensed under the MIT License.

## Contact Information

Contact information for the bot's developers and maintainers.
