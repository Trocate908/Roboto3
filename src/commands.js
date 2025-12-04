import { BOT_NAME, BOT_PREFIX, BOT_VERSION, MESSAGES } from './config.js';

const commands = {
  help: {
    description: 'Show all available commands',
    usage: `${BOT_PREFIX}help`,
    execute: () => {
      let helpText = MESSAGES.HELP_HEADER;
      helpText += `*Available Commands:*\n\n`;
      
      Object.entries(commands).forEach(([name, cmd]) => {
        helpText += `▸ *${BOT_PREFIX}${name}*\n`;
        helpText += `   ${cmd.description}\n`;
        helpText += `   Usage: \`${cmd.usage}\`\n\n`;
      });
      
      helpText += `\n_Powered by ${BOT_NAME} v${BOT_VERSION}_`;
      return helpText;
    }
  },
  
  ping: {
    description: 'Check bot response time',
    usage: `${BOT_PREFIX}ping`,
    execute: (startTime) => {
      const responseTime = Date.now() - startTime;
      return `🏓 *Pong!*\n\n⚡ Response time: *${responseTime}ms*`;
    }
  },
  
  info: {
    description: 'Get bot information',
    usage: `${BOT_PREFIX}info`,
    execute: () => {
      return `╔════════════════════════╗\n║      *Bot Information*      ║\n╚════════════════════════╝\n\n` +
        `▸ *Name:* ${BOT_NAME}\n` +
        `▸ *Version:* ${BOT_VERSION}\n` +
        `▸ *Platform:* WhatsApp\n` +
        `▸ *Library:* Baileys\n` +
        `▸ *Runtime:* Node.js\n\n` +
        `_Use ${BOT_PREFIX}help for available commands_`;
    }
  },
  
  menu: {
    description: 'Display the main menu',
    usage: `${BOT_PREFIX}menu`,
    execute: () => {
      return `╔════════════════════════╗\n║      *${BOT_NAME}* Menu      ║\n╚════════════════════════╝\n\n` +
        `Welcome to ${BOT_NAME}!\n\n` +
        `*📋 Commands*\n` +
        `▸ ${BOT_PREFIX}help - Show all commands\n` +
        `▸ ${BOT_PREFIX}ping - Check response time\n` +
        `▸ ${BOT_PREFIX}info - Bot information\n` +
        `▸ ${BOT_PREFIX}about - About this bot\n` +
        `▸ ${BOT_PREFIX}owner - Contact owner\n\n` +
        `*💡 Tip:* All commands start with *${BOT_PREFIX}*`;
    }
  },
  
  about: {
    description: 'Learn about this bot',
    usage: `${BOT_PREFIX}about`,
    execute: () => {
      return `*About ${BOT_NAME}*\n\n` +
        `${BOT_NAME} is a fast and reliable WhatsApp bot designed to provide quick responses and useful features.\n\n` +
        `Built with modern technology to ensure speed and reliability.\n\n` +
        `_Version ${BOT_VERSION}_`;
    }
  },
  
  owner: {
    description: 'Get owner contact information',
    usage: `${BOT_PREFIX}owner`,
    execute: () => {
      return `*👤 Bot Owner*\n\n` +
        `This bot is managed by the MSAI team.\n\n` +
        `For support or inquiries, please contact the administrator.`;
    }
  },
  
  time: {
    description: 'Get current date and time',
    usage: `${BOT_PREFIX}time`,
    execute: () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
      return `🕐 *Current Date & Time*\n\n` +
        `📅 *Date:* ${dateStr}\n` +
        `⏰ *Time:* ${timeStr}`;
    }
  },
  
  sticker: {
    description: 'Convert image to sticker (reply to image)',
    usage: `${BOT_PREFIX}sticker`,
    execute: () => {
      return `📌 *Sticker Command*\n\n` +
        `To create a sticker:\n` +
        `1. Send or reply to an image\n` +
        `2. Add caption: ${BOT_PREFIX}sticker\n\n` +
        `_Feature coming soon!_`;
    }
  }
};

export function handleCommand(text, startTime) {
  if (!text || !text.startsWith(BOT_PREFIX)) {
    return null;
  }
  
  const args = text.slice(BOT_PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  
  switch (commandName) {
    case 'help':
      return commands.help.execute();
    
    case 'ping':
      return commands.ping.execute(startTime);
    
    case 'info':
      return commands.info.execute();
    
    case 'menu':
      return commands.menu.execute();
    
    case 'about':
      return commands.about.execute();
    
    case 'owner':
      return commands.owner.execute();
    
    case 'time':
      return commands.time.execute();
    
    case 'sticker':
      return commands.sticker.execute();
    
    default:
      return MESSAGES.COMMAND_NOT_FOUND;
  }
}

export { commands };
