(async () => {
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const os = require('os');
const util = require('util');
const express = require("express");
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { File } = require('megajs');

const prefix = config.PREFIX;
const ownerNumber = ['94721551183'];
const commands = [];

//================ SESSION RESTORE ====================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("Please add your session id ! ...");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => {
      console.log("session id scanning ...");
    });
  });
}

//================ EXPRESS SERVER =====================
const app = express();
const port = process.env.PORT || 8000;
app.get("/", (req, res) => res.send("hey, bot started"));
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

//================ COMMAND REGISTRATION ===============
function cmd(info, func) {
  try {
    info.function = func;
    if (!info.desc) info.desc = '';
    if (!info.alias) info.alias = [];
    if (!info.category) info.category = 'misc';
    if (!info.filename) info.filename = 'Not Provided';
    commands.push(info);
    return info;
  } catch (e) {
    console.error("[PLUGIN ERROR] " + e);
  }
}

//================ BASIC sms() FUNCTION ===============
function sms(conn, mek) {
  return {
    react: async (emoji) => {
      await conn.sendMessage(mek.key.remoteJid, {
        react: {
          text: emoji,
          key: mek.key
        }
      });
    }
  };
}

//================ MAIN BOT FUNCTION ==================
async function connectToWA() {
  console.log("Connecting wa bot ...");
  const { state, saveCreds } = await useMultiFileAuthState('./');
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version
  });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("Plugins Installing ...");
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `https://files.catbox.moe/vbi10j.png` },
        caption: `Bot Connected Successfully!`
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('messages.upsert', async (msg) => {
if (config.ANTILINK && m.message && m.key.remoteJid.endsWith('@g.us')) {
  const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if (text.match(/(https?:\/\/)?(chat\.whatsapp\.com)/gi)) {
    await conn.sendMessage(m.key.remoteJid, {
  text: `*⛔ ANTILINK*\n\n@${m.key.participant.split('@')[0]} posted a group link!`,
  mentions: [m.key.participant]
});
    await conn.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], 'remove');
  }
}

  const m = msg.messages[0];
  if (!m.message) return;
const sender = m.key.fromMe ? conn.user.id : (m.key.participant || m.key.remoteJid);
const isGroup = m.key.remoteJid.endsWith('@g.us');
const isOwner = ownerNumber.includes(sender.split('@')[0]);

// BOT MODE HANDLING
if (config.BOT_MODE === 'private' && !isOwner) return;
if (config.BOT_MODE === 'self' && !m.key.fromMe) return;
if (config.BOT_MODE === 'group' && !isGroup) return;

  const type = msg.type;
  if (config.READ_MESSAGE && m.key && m.key.remoteJid) {
    try {
      await conn.readMessages([m.key]);
    } catch (e) {
      console.error('Auto Read Error:', e);
    }
  }

  if (type === 'notify' && m.key.remoteJid && m.key.remoteJid.endsWith('@status')) {
    if (config.AUTO_READ_STATUS) {
      try {
        await conn.readMessages([m.key]);
      } catch (e) {
        console.error('Auto Read Status Error:', e);
      }
    }

    if (config.AUTO_STATUS_REPLY) {
      try {
        await conn.sendMessage(m.key.remoteJid, {
  text: "I saw your status! 😊"
}, { quoted: m });
      } catch (e) {
        console.error('Auto Status Reply Error:', e);
      }
    }
  }

    try {
      const mek = msg.messages[0];
      if (!mek.message) return;
      mek.message = (getContentType(mek.message) === 'ephemeralMessage')
        ? mek.message.ephemeralMessage.message
        : mek.message;

      const m = sms(conn, mek);
      const type = getContentType(mek.message);
      const body = type === 'conversation'
        ? mek.message.conversation
        : type === 'extendedTextMessage'
        ? mek.message.extendedTextMessage.text
        : '';
      const isCmd = body.startsWith(prefix);
      const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const from = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      const isOwner = ownerNumber.includes(senderNumber);
      const pushname = mek.pushName || 'Bot User';
      const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

      if (isCmd) {
        const cmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
        if (cmd) {
          if (cmd.react) {
            await conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
          }
          await cmd.function(conn, mek, m, {
            from, quoted: mek, body, isCmd, command: cmdName, args, q,
            isGroup, sender, senderNumber, isOwner, pushname, reply
          });
        }
      }
    } catch (err) {
      console.error("Message handler error:", err.message);
    }
  });
}

//================ BASIC COMMANDS =====================

// .ping
cmd({
  pattern: "ping",
  alias: ["pong"],
  react: "🏓",
  desc: "Ping test",
  category: "general"
}, async (conn, mek, m, { reply }) => {
  reply("🏓 Pong!\nBot is active.");
});

// .runtime
cmd({
  pattern: "runtime",
  react: "⏱️",
  desc: "Show bot uptime",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const runtime = (s) => {
    const d = Math.floor(s / (3600 * 24));
    const h = Math.floor(s % (3600 * 24) / 3600);
    const m = Math.floor(s % 3600 / 60);
    const sec = Math.floor(s % 60);
    return `${d}d ${h}h ${m}m ${sec}s`;
  };
  reply(`⏱️ Bot Runtime: *${runtime(process.uptime())}*`);
});

// .system
cmd({
  pattern: "system",
  react: "🖥️",
  desc: "System info",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const mem = process.memoryUsage();
  const cpu = os.cpus()[0];
  reply(`🖥 *System Info*\n\n🔋 Platform: ${os.platform()}\n🧠 RAM: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n🧰 CPU: ${cpu.model}\n📦 Node: ${process.version}`);
});

//================ BOT START ==========================
setTimeout(() => {
  connectToWA();
}, 4000);
//======================
conn.ev.on('messages.delete', async (item) => {
  try {
    const message = item?.messages[0];
    if (!message || message?.key?.remoteJid?.includes('status')) return;

    if (config.ANTIDELETE && message.message) {
      const chat = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;
      await conn.sendMessage(chat, {
  text: `*⛔ ANTIDELETE*\n\n*@${sender.split('@')[0]}* deleted a message.\nRecovered Message:`,
  mentions: [sender]
});
      await conn.sendMessage(chat, { forward: message });
    }
  } catch (e) {
    console.error('AntiDelete Error:', e);
  }
});

})();