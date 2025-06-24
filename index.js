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
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const axios = require('axios');
const { File } = require('megajs');
const path = require('path');
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;
const prefix =config.PREFIX;

const ownerNumber = ['94721551183'];

//=============== UTIL FUNCTIONS =================
const getBuffer = async (url, options) => {
  try {
    options ? options : {};
    const res = await axios({
      method: 'get',
      url,
      headers: {
        'DNT': 1,
        'Upgrade-Insecure-Request': 1
      },
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
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${d ? d + 'd ' : ''}${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s}s`;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

//=============== SESSION RESTORE =================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 Please add your session id !");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => {
      console.log("Session id scanning 🔄.");
    });
  });
}

//=============== COMMAND SYSTEM =================
let commands = [];
const events = { commands };
function cmd(info, func) {
  const data = info;
  data.function = func;
  data.fromMe ??= false;
  data.dontAddCommandList ??= false;
  data.desc ??= '';
  data.category ??= 'misc';
  data.filename ??= 'Not Provided';
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
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("🟢 Bot connected successfully!");
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `https://files.catbox.moe/vbi10j.png` },
        caption: `💓`
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('messages.upsert', async ({ messages }) => {
    let mek = messages[0];
    if (!mek.message) return;

    mek.message = getContentType(mek.message) === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message;

    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
    }

    if (mek.message.viewOnceMessageV2) {
      mek.message = mek.message.viewOnceMessageV2.message;
    }

    if (mek.key.remoteJid === 'status@broadcast') {
      if (config.AUTO_READ_STATUS === 'true') {
        await conn.readMessages([mek.key]);
      }
      if (config.AUTO_STATUS_REPLY === 'true') {
        await conn.sendMessage(mek.key.participant, {
          text: '_AUTO STATUS SEEN JUST NOW BY MANISHA MD_',
          react: { text: '💜', key: mek.key }
        }, { quoted: mek });
      }
    }

    const type = getContentType(mek.message);
    const from = mek.key.remoteJid;
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

    let groupMetadata = {}, participants = [], groupAdmins = [], isAdmins = false, isBotAdmins = false;
    if (isGroup) {
      groupMetadata = await conn.groupMetadata(from).catch(_ => ({}));
      participants = groupMetadata.participants || [];
      groupAdmins = participants.filter(p => p.admin).map(p => p.id);
      isAdmins = groupAdmins.includes(sender);
      isBotAdmins = groupAdmins.includes(await jidNormalizedUser(conn.user.id));
    }

    const reply = text => conn.sendMessage(from, { text }, { quoted: mek });

    const m = {
      ...mek, conn, id: mek.key.id, isGroup, sender, from, type, pushName: pushname,
      body, args, command, q, quoted: mek.message.extendedTextMessage?.contextInfo?.quotedMessage,
      reply: text => conn.sendMessage(from, { text }, { quoted: mek }),
      react: emoji => conn.sendMessage(from, { react: { text: emoji, key: mek.key } })
    };

    //================ OWNER AUTO REACT ================
    if (senderNumber === "94721551183" && !mek.message.reactionMessage) {
      const ownerReacts = ["👑", "💀", "📊", "⚙️", "🧠", "🎯"];
      m.react(ownerReacts[Math.floor(Math.random() * ownerReacts.length)]);
    }

    //================ PUBLIC AUTO REACT ===============
    if (!mek.message.reactionMessage && config.AUTO_REACT === 'true') {
      const publicReacts = ['🌼', '❤️', '🔥', '💐', '🧊', '💖', '🥀', '🫶'];
      m.react(publicReacts[Math.floor(Math.random() * publicReacts.length)]);
    }
//=============work type =========================
    if (!isOwner && config.MODE === "private") return;
    if (!isOwner && isGroup && config.MODE === "inbox") return;
    if (!isOwner && !isGroup && config.MODE === "groups") return;
    //================ COMMAND HANDLING ================
    const found = isCmd && events.commands.find(c => c.pattern === command || c.alias?.includes(command));
    if (found) {
      if (found.react) await m.react(found.react);
      try {
        await found.function(conn, mek, m, { from, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, pushname, isMe, isOwner, groupMetadata, participants, groupAdmins, isAdmins, isBotAdmins, reply });
      } catch (e) {
        console.error("[PLUGIN ERROR]", e);
      }
    }
  });
}
//================ EXAMPLE COMMANDS =================
cmd({
  pattern: "alive",
  desc: "Check bot status",
  react: "💡"
}, async (conn, m) => {
  const imageUrl = "https://files.catbox.moe/vbi10j.png"; // Optional banner/image
  const uptime = runtime(process.uptime());
  const mode = config.BOT_MODE;

  const caption = `
💡 *I'm alive and running!*
━━━━━━━━━━━━━━━━━━━━━
👤 *Owner:* @${ownerNumber[0]}
⚙️ *Mode:* ${mode}
⏱️ *Uptime:* ${uptime}
🌀 *Powered by:* Manisha-MD
━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  await conn.sendMessage(m.from, {
    image: { url: imageUrl },
    caption,
    mentions: [ownerNumber[0] + "@s.whatsapp.net"]
  }, { quoted: m });
});

cmd({
  pattern: "menu",
  desc: "Display all available commands",
  react: "📜",
}, async (conn, m) => {
  const mode = config.BOT_MODE;
  const uptime = runtime(process.uptime());

  const text = `
╭───『 🤖 Bot Command Menu 』───╮
│
│ 👑 Owner: @${ownerNumber[0]}
│ ⚙️ Mode : ${mode}
│ ⏱️ Uptime : ${uptime}
│ 🔰 Prefix : ${prefix}
│
├──『 📌 Main Commands 』
│
│ ✅ .alive      – Check if bot is alive
│ ✅ .ping       – Check response speed
│ ✅ .menu       – Show this menu
│ 🛠️ .mode [public/private/self/group]
│               – Change bot mode (owner only)
│
╰────────────────────────────╯
  `.trim();

  await conn.sendMessage(m.from, {
    text,
    mentions: [ownerNumber[0] + "@s.whatsapp.net"]
  }, { quoted: m });
});

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

//================ HTTP SERVER =================
app.get("/", (req, res) => {
  res.send("✅ Hey, bot is running!");
});
app.listen(port, () => console.log(`🌐 HTTP Server running on http://localhost:${port}`));

//================ RUN BOT =================
setTimeout(connectToWA, 4000);