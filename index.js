//=============== IMPORT MODULES =================
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
const path = require('path');
const axios = require('axios');
const express = require("express");
const { File } = require('megajs');
const config = require('./config');

//=============== INIT VARS =================
const app = express();
const port = process.env.PORT || 8000;
const prefix = config.PREFIX;
const ownerNumber = ['94721551183'];
let commands = [];
const events = { commands };

//=============== UTIL FUNCTIONS =================
const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
      ...options,
      responseType: 'arraybuffer'
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

const getRandom = ext => `${Math.floor(Math.random() * 10000)}${ext}`;
const runtime = seconds => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d ? d + 'd ' : ''}${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s}s`;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

//=============== SESSION RESTORE =================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 Please add your session id !");
  const filer = File.fromURL(`https://mega.nz/file/${config.SESSION_ID}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => {
      console.log("Session id scanning 🔄.");
    });
  });
}

//=============== COMMAND SYSTEM =================
function cmd(info, func) {
  const data = {
    fromMe: false,
    dontAddCommandList: false,
    desc: '',
    category: 'misc',
    filename: 'Not Provided',
    ...info,
    function: func,
  };
  commands.push(data);
  return data;
}

//=============== START BOT =================
async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./');
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    browser: Browsers.macOS("Firefox"),
    printQRInTerminal: false,
    syncFullHistory: true,
    auth: state,
    version
  });

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      connectToWA();
    } else if (connection === 'open') {
      console.log("🟢 Bot connected successfully!");
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `https://files.catbox.moe/vbi10j.png` },
        caption: `💓 `
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('messages.upsert', async ({ messages }) => {
    let mek = messages[0];
    if (!mek.message) return;

    if (getContentType(mek.message) === 'ephemeralMessage' && mek.message.ephemeralMessage?.message) {
      mek.message = mek.message.ephemeralMessage.message;
    }
    if (config.READ_MESSAGE === 'true') await conn.readMessages([mek.key]);
    if (mek.message.viewOnceMessageV2?.message) {
      mek.message = mek.message.viewOnceMessageV2.message;
    }

    // Auto-read & status handling
    if (mek.key.remoteJid === 'status@broadcast') {
      if (config.AUTO_READ_STATUS === 'true') await conn.readMessages([mek.key]);
      if (config.AUTO_STATUS_REPLY === 'true') {
        await conn.sendMessage(mek.key.participant, {
          text: '_AUTO STATUS SEEN JUST NOW BY MANISHA MD_',
          react: { text: '💜', key: mek.key }
        }, { quoted: mek });
      }
    }

    // Message metadata
    const from = mek.key.remoteJid;
    const type = getContentType(mek.message);
    const body = mek.message.conversation || mek.message.extendedTextMessage?.text || mek.message.imageMessage?.caption || mek.message.videoMessage?.caption || '';
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const args = body.trim().split(/\s+/).slice(1);
    const q = args.join(' ');
    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : mek.key.participant || mek.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    const pushname = mek.pushName || 'No Name';
    const botNumber = conn.user.id.split(':')[0];
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;

    // Group metadata
    let groupMetadata = {}, participants = [], groupAdmins = [], isAdmins = false, isBotAdmins = false;
    if (isGroup) {
      try {
        groupMetadata = await conn.groupMetadata(from);
        participants = groupMetadata.participants || [];
        groupAdmins = participants.filter(p => p.admin).map(p => p.id);
        isAdmins = groupAdmins.includes(sender);
        isBotAdmins = groupAdmins.includes(await jidNormalizedUser(conn.user?.id || ""));
      } catch (err) {
        console.log("Group metadata error:", err);
      }
    }

    // Wrapped message
    const m = {
      ...mek,
      conn,
      id: mek.key.id,
      isGroup,
      sender,
      from,
      type,
      pushName: pushname,
      body,
      args,
      command,
      q,
      quoted: mek.message.extendedTextMessage?.contextInfo?.quotedMessage,
      reply: async (text) => await conn.sendMessage(from, { text }, { quoted: mek }),
      react: async (emoji) => await conn.sendMessage(from, { react: { text: emoji, key: mek.key } })
    };

    // Auto react owner
    if (senderNumber === "94721551183" && !mek.message.reactionMessage) {
      const ownerReacts = ["👑", "💀", "📊", "⚙️", "🧠", "🎯"];
      m.react(ownerReacts[Math.floor(Math.random() * ownerReacts.length)]);
    }

    // Auto react public
    if (!mek.message.reactionMessage && config.AUTO_REACT === 'true') {
      const publicReacts = ['🌼', '❤️', '🔥', '💐', '🧊', '💖', '🥀', '🫶'];
      m.react(publicReacts[Math.floor(Math.random() * publicReacts.length)]);
    }

    // MODE filters
    if (!isOwner && config.MODE === "private") return;
    if (!isOwner && isGroup && config.MODE === "inbox") return;
    if (!isOwner && !isGroup && config.MODE === "groups") return;

    // Command run
    const found = isCmd && events.commands.find(c => c.pattern === command || (Array.isArray(c.alias) && c.alias.includes(command)));
    if (found) {
      if (found.react) await m.react(found.react);
      try {
        await found.function(conn, mek, m);
      } catch (e) {
        console.error("[PLUGIN ERROR]", e);
      }
    }
  });

  //=============== COMMANDS =================
  cmd({ 
      pattern: "ping", 
  desc: "Test bot latency", 
  react: "🏓" 
  }, async (conn, m) => {
    const start = new Date().getTime();
    const msg = await m.reply("🏓 Pong...");
    const end = new Date().getTime();
    const speed = end - start;
    await conn.sendMessage(m.from, {
      text: `🏓 Pong!\n⏱️ Speed: *${speed}ms*`
    }, { quoted: msg });
  });
}

//=============== HTTP SERVER =================
app.get("/", (req, res) => {
  res.send("✅ Hey, bot is running!");
});
app.listen(port, () => console.log(`🌐 HTTP Server running on http://localhost:${port}`));

//=============== RUN BOT =================
setTimeout(connectToWA, 4000);