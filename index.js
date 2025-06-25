
const fetch = require('node-fetch');
const apilink = "https://www.dark-yasiya-api.site"; // <-- Change to your preferred API

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return await res.json();
};



const { File } = require('megajs');

if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) {
    return console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Please add your session id ! 😥...");
  }

  console.log("🔐 No session found locally. Downloading from MEGA...");

  const sessdata = config.SESSION_ID;
  const file = File.fromURL(`https://mega.nz/file/${sessdata}`);

  file.download((err, data) => {
    if (err) {
      console.error("❌ Failed to download session from MEGA:", err);
    } else {
      fs.writeFile('./creds.json', data, () => {
        console.log("✅ Session file downloaded successfully.");
      });
    }
  });
}



const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys')
const fs = require('fs')
const P = require('pino')
const path = require('path')
const axios = require('axios')
const ytdl = require('yt-search')
const config = require('./config')
const prefix = config.PREFIX
const ownerNumber = ['94721551183']

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./')
  const { version } = await fetchLatestBaileysVersion()
  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    auth: state,
    version
  })

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const mek = messages[0]
    

    // ========== AUTO READ, VIEW ONCE, STATUS HANDLING ==========
    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);  // Mark message as read
      console.log(`Marked message from ${mek.key.remoteJid} as read.`);
    }

    if (mek.message?.viewOnceMessageV2) {
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
      await conn.readMessages([mek.key])
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
      const user = mek.key.participant
      const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`
      await conn.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek })
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTOLIKESTATUS === "true") {
      const user = await conn.decodeJid(conn.user.id);
      await conn.sendMessage(mek.key.remoteJid,
        { react: { key: mek.key, text: '💚' } },
        { statusJidList: [mek.key.participant, user] }
      )
    }

    await Promise.all([
      saveMessage(mek),
    ]);

if (!mek.message) return

    mek.message = getContentType(mek.message) === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message

    const from = mek.key.remoteJid
    const type = getContentType(mek.message)
    const body = (type === 'conversation') ? mek.message.conversation :
                (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : ''
    const isCmd = body.startsWith(prefix)
    const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : ''
    const args = body.trim().split(/ +/).slice(1)
    const q = args.join(" ")
    const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek })

if (isCmd) {
  // ==== ping ====
  if (command === 'ping') {
    reply('pong!');
  }

  // ==== owner ====
  else if (command === 'owner') {
    reply("👑 Owner: wa.me/94721551183");
  }

  // ==== group ====
  else if (command === 'group') {
    reply("👥 Group Command Placeholder: Add your group logic here.");
  }

  // ==== xvideos ====
  else if (command === 'xvideos') {
    try {
      if (!q) return reply("🔍 Please provide a search term!");
      const xv_list = await fetchJson(`${apilink}/search/xvideo?q=${encodeURIComponent(q)}`);
      if (!xv_list?.result || xv_list.result.length === 0) return reply("❌ No results found!");
      // ... rest of xvideos logic
    } catch (e) {
      reply("❌ Error fetching xvideos!");
    }
  }
}







  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      connectToWA()
}    } else if (connection === 'open') {
      console.log("Bot connected.")
    
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: `╔═══╣❍ᴍᴀɴɪꜱʜᴀ-ᴍᴅ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠════════════➢
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version   : v1.0.0
╠➢ 👑 Owner  : [${ownerNumber[0]}]
╠➢ 🛠️ Created By: Manisha Sasmitha
╠➢ 🧠 Framework : Node.js + Baileys
╚═════════════════════⫸`
      });

}
  })

  conn.ev.on('creds.update', saveCreds)
}

connectToWA()

    // ========== WORKTYPE RESTRICTION ==========
    if (!isOwner) {
      if (config.MODE === "private") return;
      if (config.MODE === "inbox" && isGroup) return;
      if (config.MODE === "groups" && !isGroup) return;
    }


    
// ========== VARIABLE SAFETY PATCH ==========
const isGroup = m.key.remoteJid.endsWith('@g.us');
const sender = m.key.participant || m.key.remoteJid;
const from = m.key.remoteJid;
const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
const isCmd = body.startsWith('.') || body.startsWith('!'); // Adjust prefix as needed
const isOwner = config.OWNER_NUMBER.includes(sender?.split('@')[0]);

let isAdmins = false;
try {
  const metadata = await conn.groupMetadata(from);
  isAdmins = metadata.participants.some(p => p.id === sender && p.admin);
} catch (e) {
  isAdmins = false;
}

// ========== ANTILINK ==========
    if (config.ANTILINK === 'true' && isGroup && !isAdmins && !isOwner) {
      const urlRegex = /(https?:\/\/)?(www\.)?(chat\.whatsapp\.com)\/[\w\d]{20,}/gi;
      if (urlRegex.test(body)) {
        await conn.sendMessage(from, { text: "🔗 Group link detected! Removing..." });
        try {
        await conn.groupParticipantsUpdate(from, [sender], "remove");
      } catch (e) {
        console.error('Failed to remove participant:', e);
      }
      }
    }

    // ========== ANTIDELETE ==========
    conn.ev.on("messages.delete", async ({ messages }) => {
      if (config.ANTIDELETE !== 'true') return;
      for (const msg of messages) {
        if (msg?.key?.fromMe) return;
        const chat = msg.key.remoteJid;
        const sender = msg.key.participant;
        await conn.sendMessage(chat, {
          text: `🗑️ Message deleted by @${sender?.split("@")[0]}`,
          mentions: [sender],
          contextInfo: { isForwarded: true }
        });
      }
    });

