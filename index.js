const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidDecode,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const os = require('os');
const config = require('./config');
const axios = require('axios');
const { File } = require('megajs');
const express = require("express");
const { exec } = require("child_process");
const app = express();
const port = process.env.PORT || 8000;
const prefix = '.';

const ownerNumber = ['94721551183'];

//=================== SESSION AUTH ==========================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 Please provide your SESSION ID...");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => console.log("✅ Session ID downloaded and saved."));
  });
}

//=================== COMMAND SETUP =========================
var commands = [];
function cmd(info, func) {
  commands.push({ ...info, function: func });
}

//=================== CONNECT TO WHATSAPP ===================
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
        caption: `╔═══╣❍ᴍᴀɴɪꜱʜᴀ-ᴍᴅ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠════════════➢
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version   : v1.0.0
╠➢ 👑 Owner  : [94721551183]
╠➢ 🛠️ Created By: Manisha Sasmitha
╠➢ 🧠 Framework : Node.js + Baileys
╠═══════════════════➢
║ 📜 Bot Description:  
╠════════════➢
║ MANISHA-MD is a powerful, multipurpose WhatsApp bot
║ built for automation, moderation, entertainment,
║ AI integration, and much more. It supports modular
║ plugins, auto-replies, media tools, group protection
║ features, and developer APIs.
╚═════════════════════⫸`
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

    const sender = mek.key.participant || mek.key.remoteJid;
    const isGroup = mek.key.remoteJid.endsWith('@g.us');
    const isOwner = ownerNumber.includes(sender.split('@')[0]);
    const isReact = !!(mek.message?.reactionMessage);
    const senderNumber = sender.split('@')[0];

    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
    }

    if (mek.key.remoteJid === 'status@broadcast') {
      if (config.AUTO_READ_STATUS === "true") await conn.readMessages([mek.key]);
      if (config.AUTO_STATUS_REPLY === "true") {
        const user = mek.key.participant;
        await conn.sendMessage(user, {
          text: `_STATUS seen just now by bot_`,
          react: { text: '💜', key: mek.key }
        }, { quoted: mek });
      }
  const type = getContentType(mek.message)
  const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
  const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
  const isCmd = body.startsWith(prefix)
    const command = isCmd ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(" ");
    const from = mek.key.remoteJid;

    const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });
    const m = { ...mek, conn, from, body, args, command, q, reply, sender };

    if (!isOwner) {
      if (config.MODE === "private") return;
      if (config.MODE === "inbox" && isGroup) return;
      if (config.MODE === "groups" && !isGroup) return;
    }

    if (!isReact && ownerNumber.includes(senderNumber)) {
      const reactions = ["👑", "💀", "📊", "⚙️", "🧠", "🎯", "📈", "📝", "🏆", "🌍", "🇱🇰", "💗", "❤️", "💥", "🌼"];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      await conn.sendMessage(from, { react: { text: randomReaction, key: mek.key } });
    }

    if (!isReact && config.AUTO_REACT === 'true') {
      const reactions = ['🔥', '❤️', '💐', '💓', '✅'];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      await conn.sendMessage(from, { react: { text: randomReaction, key: mek.key } });
    }

    if (isCmd) {
      const cmd = commands.find(c => c.pattern === command);
      if (cmd) {
        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          await cmd.function(conn, mek, m, { reply });
        } catch (err) {
          console.error("[COMMAND ERROR]", err);
        }
      }
    }
  });
}

//=================== COMMANDS ==============================
cmd({
  pattern: "ping",
  desc: "Check bot speed with image",
  react: "🏓",
  category: "general"
}, async (conn, m, { reply }) => {
  const start = Date.now();
  await reply("📡 Pinging...");
  const end = Date.now();
  const ping = end - start;

  const imageUrl = "https://files.catbox.moe/vbi10j.png";
  await conn.sendMessage(m.from, {
    image: { url: imageUrl },
    caption: `🏓 Pong!\n📶 Speed: *${ping}ms*`
  }, { quoted: m });
});

cmd({
  pattern: "system",
  desc: "Show system info",
  react: "💻",
  category: "owner"
}, async (conn, m, { reply }) => {
  const uptime = os.uptime();
  const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
  const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
  const usedMem = (totalMem - freeMem).toFixed(2);
  const platform = os.platform();
  const cpuModel = os.cpus()[0].model;
  const coreCount = os.cpus().length;
  const host = os.hostname();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  const caption = `🖥️ *System Info*
👤 Host: ${host}
🧠 CPU: ${cpuModel} (${coreCount} cores)
📀 RAM: ${usedMem}MB / ${totalMem}MB
⏱️ Uptime: ${uptimeStr}
🛠️ Platform: ${platform}`;

  await conn.sendMessage(m.from, {
    image: { url: "https://files.catbox.moe/vbi10j.png" },
    caption
  }, { quoted: m });
});

cmd({
  pattern: "restart",
  desc: "Restart the bot (owner only)",
  react: "♻️",
  category: "owner"
}, async (conn, m, { sender, reply }) => {
  if (!ownerNumber.includes(sender.split('@')[0]))
    return reply("❌ Only the *owner* can restart the bot!");

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

//=================== HTTP SERVER ===========================
app.get("/", (req, res) => res.send("✅ Bot is running"));
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

//=================== START BOT =============================
setTimeout(() => connectToWA(), 4000);