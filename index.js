const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const axios = require('axios');
const { File } = require('megajs');
const express = require("express");
const { exec } = require("child_process");
const app = express();
const port = process.env.PORT || 8000;
const prefix = '.';

const ownerNumber = ['94779415698'];

//===================SESSION-AUTH============================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 Please add your session id ! 😥...");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => console.log("session id scanning 🔄."));
  });
}

//====================COMMAND SETUP==========================
var commands = [];
const events = { commands };

function cmd(info, func) {
  commands.push({ ...info, function: func });
}

//====================CONNECT TO WA==========================
async function connectToWA() {
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

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      connectToWA();
    } else if (connection === 'open') {
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: "✅ Bot Connected Successfully!"
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('messages.upsert', async (msgUpsert) => {
    const mek = msgUpsert.messages[0];
    if (!mek?.message) return;

    mek.message = getContentType(mek.message) === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message;

    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
    }

    if (mek.key.remoteJid === 'status@broadcast') {
      if (config.AUTO_READ_STATUS === "true") await conn.readMessages([mek.key]);
      if (config.AUTO_STATUS_REPLY === "true") {
        const user = mek.key.participant;
        await conn.sendMessage(user, {
          text: `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`,
          react: { text: '💜', key: mek.key }
        }, { quoted: mek });
      }
      if (config.AUTOLIKESTATUS === "true") {
        const user = await conn.decodeJid(conn.user.id);
        await conn.sendMessage(mek.key.remoteJid, {
          react: { key: mek.key, text: '💚' }
        }, { statusJidList: [mek.key.participant, user] });
      }
    }

    const type = getContentType(mek.message);
    const body = mek.message.conversation || mek.message?.extendedTextMessage?.text || mek.message?.imageMessage?.caption || mek.message?.videoMessage?.caption || "";
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(" ");
    const from = mek.key.remoteJid;

    const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });
    const m = { ...mek, conn, from, body, args, command, q, reply };

    if (isCmd) {
      const cmd = commands.find(c => c.pattern === command);
      if (cmd) {
        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          await cmd.function(conn, mek, m, { reply });
        } catch (err) {
          console.error("[PLUGIN ERROR]", err);
        }
      }
    }
  });
}

//====================COMMANDS===============================
cmd({
  pattern: "ping",
  desc: "Check bot response speed with image",
  react: "🏓",
  category: "misc"
}, async (conn, m, { reply }) => {
  const start = new Date().getTime();
  const sent = await reply("🏓 Pinging...");
  const end = new Date().getTime();
  const speed = end - start;

  const uptime = process.uptime();
  const formatUptime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  const caption = `🏓 *Pong!*
📶 Speed: *${speed}ms*
⏱️ Uptime: *${formatUptime(uptime)}*
👤 Owner: @${global.ownerNumber[0] || '0000000000'}`;

  await conn.sendMessage(m.from, {
    image: { url: "https://files.catbox.moe/vbi10j.png" }, // You can change this image URL
    caption,
    mentions: [global.ownerNumber[0] + "@s.whatsapp.net"]
  }, { quoted: m });
});

cmd({
  pattern: "alive",
  desc: "Alive message",
  react: "💡"
}, async (conn, m, { reply }) => {
  const image = 'https://files.catbox.moe/vbi10j.png';
  const caption = "👋 I'm alive!\n\n🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕";
  await conn.sendMessage(m.from, { image: { url: image }, caption }, { quoted: m });
});

buttons: [
  { buttonId: ".ping", buttonText: { displayText: "Ping 🏓" }, type: 1 },
  { buttonId: ".alive", buttonText: { displayText: "Alive 💡" }, type: 1 },
  { buttonId: ".settings", buttonText: { displayText: "Settings ⚙️" }, type: 1 },
  { buttonId: ".restart", buttonText: { displayText: "Restart ♻️" }, type: 1 }
]

cmd({
  pattern: "restart",
  desc: "Restart the bot (owner only)",
  react: "♻️",
  category: "owner"
}, async (conn, m, { sender, isOwner, reply }) => {
  if (!isOwner) return reply("❌ Only the *owner* can restart the bot!");

  await conn.sendMessage(m.from, {
    text: "♻️ Restarting bot via PM2...",
  }, { quoted: m });

  exec("pm2 restart all", (err, stdout, stderr) => {
    if (err) {
      console.error("Restart error:", err);
      return;
    }
    console.log("PM2 Restarted:\n", stdout || stderr);
  });
});

cmd({
  pattern: "settings",
  desc: "Toggle bot features via buttons",
  react: "⚙️",
  category: "settings"
}, async (conn, m, { from, sender, reply }) => {
  const botOwner = conn.user.id.split(':')[0] + '@s.whatsapp.net';
  if (sender !== botOwner) return reply("❌ Only the *bot owner* can use this command.");

  const status = (v) => v === "true" ? "✅ ON" : "❌ OFF";
  const caption = `⚙️ *Bot Settings Panel*\n\n` +
    `🌀 Auto React: ${status(config.AUTO_REACT)}\n` +
    `👀 Auto Status Seen: ${status(config.AUTO_READ_STATUS)}\n` +
    `💬 Auto Status Reply: ${status(config.AUTO_STATUS_REPLY)}\n` +
    `📖 Read Messages: ${status(config.READ_MESSAGE)}\n` +
    `💚 Auto Like Status: ${status(config.AUTOLIKESTATUS)}\n\n` +
    `Press a button to toggle any setting.`;

  const buttons = [
    { buttonId: '.toggle autoreact', buttonText: { displayText: '🌀 Auto React' }, type: 1 },
    { buttonId: '.toggle statusseen', buttonText: { displayText: '👀 Status Seen' }, type: 1 },
    { buttonId: '.toggle statusreply', buttonText: { displayText: '💬 Status Reply' }, type: 1 },
    { buttonId: '.toggle read', buttonText: { displayText: '📖 Read Msg' }, type: 1 },
    { buttonId: '.toggle autolike', buttonText: { displayText: '💚 Auto Like' }, type: 1 }
  ];

  await conn.sendMessage(from, {
    text: caption,
    footer: "Manisha-MD Settings",
    buttons,
    headerType: 1
  }, { quoted: m });
});
//====================HTTP SERVER============================
app.get("/", (req, res) => res.send("✅ Bot is running"));
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

//====================START BOT==============================
setTimeout(() => connectToWA(), 4000);

//====================UTILS==================================
const getBuffer = async (url) => (await axios.get(url, { responseType: 'arraybuffer' })).data;

const saveMessage = async (msg) => {
  try {
    fs.appendFileSync('./messages.log', `${new Date().toISOString()}:\n${JSON.stringify(msg, null, 2)}\n\n`);
  } catch (err) {
    console.error("❌ Failed to save message:", err);
  }
};