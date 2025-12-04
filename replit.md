# MSAI Whats - WhatsApp Bot

## Overview
MSAI Whats is a WhatsApp bot built with Node.js and the Baileys library. It uses phone number pairing for authentication and responds to commands with professional formatting. Includes contact management with fuzzy search and vCard support.

## Project Structure
```
├── src/
│   ├── index.js      # Main bot entry point with connection logic
│   ├── commands.js   # Command handler with case statement structure
│   ├── config.js     # Bot configuration and message templates
│   └── data/
│       ├── db.js     # SQLite database connection
│       └── contacts.js # Contact management (search, parse, store)
├── auth_info_baileys/ # Stored credentials (auto-generated)
├── contacts.db       # SQLite database for contacts
├── package.json      # Project dependencies
└── .gitignore        # Git ignore rules
```

## Environment Variables
- `PHONE_NUMBER` - Your WhatsApp phone number (format: countrycode + number, e.g., 1234567890)

## Commands
All commands start with `.` prefix:

### General Commands
- `.help` - Show all available commands
- `.ping` - Check bot response time
- `.info` - Get bot information
- `.menu` - Display the main menu
- `.about` - Learn about this bot
- `.owner` - Get owner contact information
- `.time` - Get current date and time
- `.quote` - Get a random inspirational quote
- `.sticker` - Sticker creation info

### Contact Commands
- `.contact [name]` - Find and send a contact by name (uses fuzzy matching)
- `.addcontact` - Add contacts from vCard (.vcf) or CSV file (attach file with caption)
- `.contacts` - Show contact database statistics

### Group Commands
- `.tagall [message]` - Tag all members in group
- `.groupinfo` - Get group information
- `.admins` - List all group admins

### Owner Commands
- `.broadcast [message]` - Broadcast message (Owner only)
- `.status` - Check bot status (Owner only)

## Contact Management

### Adding Contacts
1. Attach a `.vcf` (vCard) or `.csv` file
2. Add caption: `.addcontact`
3. Contacts are parsed and stored in the database

### Finding Contacts
- Use `.contact mum` to find contacts matching "mum", "Mum", "Mother", etc.
- Fuzzy matching finds close matches even with typos
- Returns vCard that can be saved directly to phone

### Supported File Formats
- **vCard (.vcf)**: Standard contact file format
- **CSV**: Must have columns like `name`, `phone`, `email`

## How It Works
1. Bot starts and requests pairing code using PHONE_NUMBER
2. User enters the 8-digit pairing code in WhatsApp
3. Credentials are saved to `auth_info_baileys/` folder
4. Bot sends success message to user's inbox
5. Bot listens for messages and responds to commands

## Running the Bot
```bash
npm start
```

## Recent Changes
- December 2024: Added contact management commands
  - `.contact [name]` - Find and send contacts with fuzzy matching
  - `.addcontact` - Parse and store vCard/CSV files
  - `.contacts` - View contact database stats
- SQLite database for persistent contact storage
- vCard generation and sending via WhatsApp
- December 2024: Initial bot setup with Baileys integration
- Implemented pairing code authentication
- Added command handler with case statement structure
- Added professional response formatting

## Technical Details
- Runtime: Node.js 20
- WhatsApp Library: @whiskeysockets/baileys
- Database: SQLite (better-sqlite3)
- Fuzzy Search: Fuse.js
- Phone Parsing: libphonenumber-js
- Logging: pino (silent mode for clean output)
- Authentication: Multi-file auth state persistence
