import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { handleCommand } from './commands.js';
import { BOT_NAME, MESSAGES } from './config.js';

const logger = pino({ level: 'silent' });

const AUTH_FOLDER = './auth_info_baileys';

let connectionSuccessMessageSent = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  
  const phoneNumber = process.env.PHONE_NUMBER;
  
  if (!phoneNumber) {
    console.log('╔════════════════════════════════════════╗');
    console.log('║         MSAI Whats Bot Setup           ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  ⚠️  PHONE_NUMBER not set in env       ║');
    console.log('║                                        ║');
    console.log('║  Please set PHONE_NUMBER environment   ║');
    console.log('║  variable with your WhatsApp number    ║');
    console.log('║  Format: countrycode + number          ║');
    console.log('║  Example: 1234567890                   ║');
    console.log('╚════════════════════════════════════════╝');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════╗');
  console.log('║         MSAI Whats Bot Starting        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Phone: ${phoneNumber.padEnd(28)}║`);
  console.log('╚════════════════════════════════════════╝');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    logger,
    browser: ['MSAI Whats', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: true,
    markOnlineOnConnect: true
  });

  if (!state.creds.registered) {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    console.log('\n📱 Requesting pairing code...\n');
    
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(cleanNumber);
        console.log('╔════════════════════════════════════════╗');
        console.log('║         📲 PAIRING CODE                ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║                                        ║`);
        console.log(`║          ${code}                   ║`);
        console.log(`║                                        ║`);
        console.log('╠════════════════════════════════════════╣');
        console.log('║  Steps to connect:                     ║');
        console.log('║  1. Open WhatsApp on your phone        ║');
        console.log('║  2. Go to Settings > Linked Devices    ║');
        console.log('║  3. Tap "Link a Device"                ║');
        console.log('║  4. Select "Link with phone number"    ║');
        console.log('║  5. Enter the code shown above         ║');
        console.log('╚════════════════════════════════════════╝');
      } catch (err) {
        console.error('Failed to request pairing code:', err.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      
      console.log(`\n⚠️ Connection closed. Reason: ${DisconnectReason[reason] || reason}`);
      
      switch (reason) {
        case DisconnectReason.badSession:
          console.log('Bad session, please delete auth folder and restart');
          break;
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.timedOut:
          console.log('Reconnecting...');
          setTimeout(() => startBot(), 5000);
          break;
        case DisconnectReason.connectionReplaced:
          console.log('Connection replaced, another session opened');
          break;
        case DisconnectReason.loggedOut:
          console.log('Logged out, please delete auth folder and restart');
          break;
        case DisconnectReason.restartRequired:
          console.log('Restart required, restarting...');
          startBot();
          break;
        default:
          console.log('Unknown disconnect reason, reconnecting...');
          setTimeout(() => startBot(), 5000);
      }
    }

    if (connection === 'open') {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║      ✅ CONNECTION SUCCESSFUL          ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║  ${BOT_NAME} is now online!             ║`);
      console.log('║  Ready to receive commands             ║');
      console.log('╚════════════════════════════════════════╝\n');

      if (!connectionSuccessMessageSent) {
        connectionSuccessMessageSent = true;
        try {
          const userJid = sock.user.id;
          await sock.sendMessage(userJid, { 
            text: MESSAGES.CONNECTION_SUCCESS 
          });
          console.log('📤 Deployment success message sent to your inbox!');
        } catch (err) {
          console.log('Could not send success message:', err.message);
        }
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const startTime = Date.now();
      
      const messageContent = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            '';
      
      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant : remoteJid;
      
      console.log(`📩 Message from ${sender}: ${messageContent}`);

      const response = handleCommand(messageContent, startTime);
      
      if (response) {
        try {
          await sock.sendMessage(remoteJid, { text: response }, { quoted: msg });
          console.log(`📤 Response sent in ${Date.now() - startTime}ms`);
        } catch (err) {
          console.error('Error sending message:', err.message);
        }
      }
    }
  });

  return sock;
}

console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║        🤖 MSAI Whats Bot v1.0.0          ║
║        WhatsApp Bot with Baileys          ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

startBot().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
