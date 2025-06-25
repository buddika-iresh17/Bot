// ====================== FUNCTIONS ==========================
function isOwner(sender) {
    return config.OWNER_NUMBER.includes(sender.split('@')[0]);
}

function isGroup(jid) {
    return jid.endsWith('@g.us');
}

function checkBotMode(m) {
    const sender = m.key.participant || m.key.remoteJid;
    if (config.BOT_MODE === 'self' && !isOwner(sender)) return false;
    if (config.BOT_MODE === 'private' && !isOwner(sender)) return false;
    if (config.BOT_MODE === 'group' && !isGroup(m.key.remoteJid)) return false;
    return true;
}

// ========== EXISTING CODE STARTS BELOW ==========
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

      
        // Bot mode change command
        if (command === 'setmode' && isOwner(sender)) {
            if (!args[0]) return sms.reply('Please provide mode: public, private, self, group');
            const newMode = args[0].toLowerCase();
            if (!['public', 'private', 'self', 'group'].includes(newMode)) {
                return sms.reply('Invalid mode. Use: public, private, self, group');
            }
            config.BOT_MODE = newMode;
            return sms.reply(`Bot mode updated to: *${newMode}*`);
        }

        if (!checkBotMode(m)) return;

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