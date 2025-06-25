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
const os = require('os');
const config = require('./config')
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const axios = require('axios')
const cheerio = require("cheerio");
const { File } = require('megajs')
const express = require("express")
const app = express()
const port = process.env.PORT || 8000
const events = require('./command')

const prefix = config.PREFIX
const ownerNumber = ['94721551183']

// ========== UTILS ==========
const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
      ...options,
      responseType: 'arraybuffer'
    })
    return res.data
  } catch (e) {
    console.log(e)
  }
}

const getGroupAdmins = (participants) =>
  participants.filter(p => p.admin).map(p => p.id)

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

const h2k = (eco) => {
  const lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
  const ma = Math.log10(Math.abs(eco)) / 3 | 0
  if (ma === 0) return eco
  const ppo = lyrik[ma]
  const scale = Math.pow(10, ma * 3)
  let formatt = (eco / scale).toFixed(1)
  if (/.0$/.test(formatt)) formatt = formatt.slice(0, -2)
  return formatt + ppo
}

const isUrl = (url) => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, 'gi'))
}

const Json = (string) => JSON.stringify(string, null, 2)

const runtime = (seconds) => {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor(seconds % (3600 * 24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 60)
  return `${d > 0 ? d + ' days, ' : ''}${h > 0 ? h + ' hours, ' : ''}${m > 0 ? m + ' minutes, ' : ''}${s > 0 ? s + ' seconds' : ''}`
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fetchJson = async (url, options = {}) => {
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      ...options
    })
    return res.data
  } catch (err) {
    return err
  }
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const extractBody = (message) => {
  const type = Object.keys(message)[0]
  return type === 'conversation' ? message.conversation
    : type === 'extendedTextMessage' ? message.extendedTextMessage.text
      : type === 'imageMessage' && message.imageMessage.caption ? message.imageMessage.caption
        : type === 'videoMessage' && message.videoMessage.caption ? message.videoMessage.caption
          : ''
}

const sendFileUrl = (conn) => async (jid, url, caption = '', quoted = {}, options = {}) => {
  const res = await axios.head(url)
  const mime = res.headers['content-type']
  const data = await axios.get(url, { responseType: 'arraybuffer' }).then(res => res.data)
  if (mime.includes('gif')) return conn.sendMessage(jid, { video: data, caption, gifPlayback: true, ...options }, { quoted })
  if (mime.includes('pdf')) return conn.sendMessage(jid, { document: data, mimetype: mime, caption, ...options }, { quoted })
  if (mime.startsWith('image/')) return conn.sendMessage(jid, { image: data, caption, ...options }, { quoted })
  if (mime.startsWith('video/')) return conn.sendMessage(jid, { video: data, caption, mimetype: 'video/mp4', ...options }, { quoted })
  if (mime.startsWith('audio/')) return conn.sendMessage(jid, { audio: data, caption, mimetype: 'audio/mpeg', ...options }, { quoted })
}

// ========== MEGA SESSION RESTORE ==========
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Please add your session id ! 😥...")
  const sessdata = config.SESSION_ID
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`)
  filer.download((err, data) => {
    if (err) throw err
    fs.writeFile('./creds.json', data, () => {
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 session id scaning 🔄...")
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Session Downloaded without folder 📥...")
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Session Downloading 📥...")
    })
  })
}

// ========== EXPRESS SERVER ==========
app.get("/", (req, res) => res.send("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 bot start 🚩..."))
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))

// ========== CONNECT TO WA ==========
async function connectToWA() {
  console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Connecting to WhatsApp 🪀...")
  const { state, saveCreds } = await useMultiFileAuthState('./')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version
  })

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      connectToWA()
    } else if (connection === 'open') {
       console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Plugins Installing 🧬...")
       console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 bot internet connected 🌐...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 plugins .js file Connect 🔗...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Fetching MANISHA-MD data 📚...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Plugins installed successful 🔌...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Downloading and extracting files 📁...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Downloading Files 📥...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Connected Successfully ✅...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Executing ✅...")
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 creatad by manisha coder 👨‍💻...")
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
  image: { url: 'https://files.catbox.moe/vbi10j.png' },
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
})
    }
  })

  conn.ev.on('creds.update', saveCreds)
  conn.sendFileUrl = sendFileUrl(conn)

  conn.ev.on('messages.upsert', async ({ messages }) => {
  const mek = messages[0]
  if (!mek.message) return

  mek.message = getContentType(mek.message) === 'ephemeralMessage'
    ? mek.message.ephemeralMessage.message
    : mek.message

  // ✅ ADD FROM HERE
  // ========== READ MESSAGE ==========
  if (config.READ_MESSAGE === 'true') {
    await conn.readMessages([mek.key]);  // Mark message as read
    console.log(`Marked message from ${mek.key.remoteJid} as read.`);
  }

  // ========== VIEW ONCE MESSAGE BYPASS ==========
  if (mek.message?.viewOnceMessageV2) {
    const type = getContentType(mek.message)
    mek.message = type === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message
    mek.message = mek.message?.viewOnceMessageV2.message
  }

  // ========== AUTO READ STATUS ==========
  if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
    await conn.readMessages([mek.key])
  }

  // ========== AUTO STATUS REPLY ==========
  if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
    const user = mek.key.participant
    const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`
    await conn.sendMessage(user, {
      text,
      react: { text: '💜', key: mek.key }
    }, { quoted: mek })
  }
  // ✅ STOP HERE
  if (mek.key.remoteJid === 'status@broadcast') return

    const from = mek.key.remoteJid
    const type = getContentType(mek.message)
    const body = extractBody(mek.message)
    const isCmd = body.startsWith(prefix)
    const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : ''
    const args = body.trim().split(/ +/).slice(1)
    const q = args.join(' ')
    const isGroup = from.endsWith('@g.us')
    const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : (mek.key.participant || mek.key.remoteJid)
    const senderNumber = sender.split('@')[0]
    const botNumber = conn.user.id.split(':')[0]
    const botNumber2 = await jidNormalizedUser(conn.user.id)
    const pushname = mek.pushName || 'Sin Nombre'
    const isMe = botNumber.includes(senderNumber)
    const isOwner = ownerNumber.includes(senderNumber) || isMe
    const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(() => { }) : ''
    const participants = isGroup ? groupMetadata.participants : []
    const groupAdmins = getGroupAdmins(participants)
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false
    const isReact = mek.message?.reactionMessage ? true : false
    const reply = (teks) => conn.sendMessage(from, { text: teks }, { quoted: mek })

    // ========== WORKTYPE RESTRICTION ==========
    if (!isOwner) {
      if (config.MODE === "private") return
      if (config.MODE === "inbox" && isGroup) return
      if (config.MODE === "groups" && !isGroup) return
    }


// ========== OWNER AUTO REACT ==========
if (senderNumber.includes("94721551183") && !isReact) {
  const reactions = [
    "👑", "💀", "📊", "⚙️", "🧠", "🎯", "📈", "📝", "🏆",
    "🌍", "🇱🇰", "💗", "❤️", "💥", "🌼", "🏵️", "💐", "🔥",
    "❄️", "🌝", "🌚", "🐥", "🧊"
  ];
  const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
  await conn.sendMessage(from, { react: { text: randomReaction, key: mek.key } });
}

// ========== PUBLIC AUTO REACT ==========
if (config.AUTO_REACT === 'true' && !mek.message?.reactionMessage) {
  const publicReactions = ["🌼", "❤️", "💐", "🔥", "🏵️", "🥀"];
  const random = publicReactions[Math.floor(Math.random() * publicReactions.length)];
  await conn.sendMessage(from, { react: { text: random, key: mek.key } });
}

    // ========== BASIC COMMANDS ==========
    if (isCmd) {
    
    
    
    const getBotOwner = (conn) => conn.user.id.split(":")[0];

const settingsMap = {
  "1": { key: "MODE", trueVal: "private", falseVal: "public", label: "Bot Mode" },
  "2": { key: "AUTO_REACT", trueVal: "true", falseVal: "false", label: "Auto-React" },
  "3": { key: "AUTO_READ_STATUS", trueVal: "true", falseVal: "false", label: "Auto-Read-Status" },
  "4": { key: "AUTO_STATUS_REPLY", trueVal: "true", falseVal: "false", label: "Auto-Status-Reply" },
  "5": { key: "AUTOLIKESTATUS", trueVal: "true", falseVal: "false", label: "Auto-like-status" },
  "6": { key: "READ_MESSAGE", trueVal: "true", falseVal: "false", label: "Read-message" },
  "7": { key: "ANTI_LINK", trueVal: "true", falseVal: "false", label: "Anti-link" },
  "8": { key: "ANTI_LINK_KICK", trueVal: "true", falseVal: "false", label: "Anti-link-kick" },
  "9": { key: "ANTI_DEL_PATH", label: "Anti-delete Path", customOptions: ["log", "chat", "inbox"] },
  "10": { key: "ANTIDELETE", trueVal: "true", falseVal: "false", label: "Anti-Delete" }
};

if (command === "settings" || command === "config") {
  try {
    const senderNumber = m.sender.split("@")[0];
    const botOwner = getBotOwner(conn);

    if (senderNumber !== botOwner) {
      return reply("*📛 Only the bot owner can use this command!*");
    }

    const sentMsg = await conn.sendMessage(from, {
      image: { url: config.ALIVE_IMG },
      caption:
        `╔═══╣❍*ꜱᴇᴛᴛɪɴɢ*❍╠═══⫸\n` +
        `╠➢ 1️⃣. ʙᴏᴛ ᴍᴏᴅᴇ (ᴘʀɪᴠᴀᴛᴇ / ᴘᴜʙʟɪᴄ)\n` +
        `╠➢ 2️⃣. ᴀᴜᴛᴏ-ʀᴇᴀᴄᴛ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 3️⃣. ᴀᴜᴛᴏ-ʀᴇᴀᴅ-ꜱᴛᴀᴛᴜꜱ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 4️⃣. ᴀᴜᴛᴏ-ꜱᴛᴀᴛᴜꜱ-ʀᴇᴘʟʏ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 5️⃣. ᴀᴜᴛᴏ-ꜱᴛᴀᴛᴜꜱ-ʟɪᴋᴇ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 6️⃣. ʀᴇᴀᴅ-ᴍᴇꜱꜱᴀɢᴇ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 7️⃣. ᴀɴᴛɪ-ʟɪɴᴋ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 8️⃣. ᴀɴᴛɪ-ʟɪɴᴋ-ᴋɪᴄᴋ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 9️⃣. ᴀɴᴛɪ-ᴅᴇʟᴇᴛ-ᴘᴀᴛʜ (ʟᴏɢ / ᴄʜᴀᴛ / ɪɴʙᴏx)\n` +
        `╠➢ 🔟. ᴀɴᴛɪ-ᴅᴇʟᴇᴛᴇ (ᴏɴ / ᴏꜰꜰ)\n` +
        `╠➢ 🔢. ʀᴇᴘʟʏ ᴡɪᴛʜ ɴᴜᴍʙᴇʀ\n` +
        `╚════════════════════⫸\n\n` +
        `> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
    });

    const menuMessageID = sentMsg.key.id;

    const menuListener = async (msgData) => {
      try {
        const received = msgData.messages[0];
        if (!received || received.key.remoteJid !== from) return;

        const message = received.message;
        if (!message) return;

        const sender = (received.key.participant || received.key.remoteJid).split("@")[0];
        const isReply = message.extendedTextMessage?.contextInfo?.stanzaId === menuMessageID;
        const text = message.conversation || message.extendedTextMessage?.text;

        if (!isReply || sender !== botOwner || !text) return;

        const settingOption = text.trim();
        const setting = settingsMap[settingOption];

        if (!setting) {
          await reply("❌ Invalid option. Please reply with a number from 1 to 10.");
          return;
        }

        const settingMsg = await conn.sendMessage(from, {
          text: setting.customOptions
            ? `╔═════⫸\n╠➢*${setting.label}:*\n╠➢${setting.customOptions.map((opt, i) => `${i + 1}. ${opt.toUpperCase()}`).join("\n")}\n╠➢ _Reply with number._\n╚═══════⫸`
            : `╔═════⫸\n╠➢*${setting.label}:*\n\n╠➢1. ${setting.trueVal.toUpperCase()}\n╠➢2. ${setting.falseVal.toUpperCase()}\n╠➢ _Reply with number._\n╚════⫸`
        });

        const toggleID = settingMsg.key.id;

        const toggleListener = async (msgData2) => {
          try {
            const received2 = msgData2.messages[0];
            if (!received2 || received2.key.remoteJid !== from) return;

            const message2 = received2.message;
            if (!message2) return;

            const sender2 = (received2.key.participant || received2.key.remoteJid).split("@")[0];
            const isReplyToToggle = message2.extendedTextMessage?.contextInfo?.stanzaId === toggleID;
            const text2 = message2.conversation || message2.extendedTextMessage?.text;

            if (!isReplyToToggle || sender2 !== botOwner || !text2) return;

            const response = text2.trim();

            if (setting.customOptions) {
              const index = parseInt(response) - 1;
              if (index >= 0 && index < setting.customOptions.length) {
                config[setting.key] = setting.customOptions[index];
                await reply(`✅ *${setting.label} set to ${setting.customOptions[index].toUpperCase()}.*`);
                conn.ev.off("messages.upsert", toggleListener);
              } else {
                await reply("❌ Invalid option. Please choose a valid number.");
              }
            } else {
              if (setting.key === "ANTIDELETE") {
                const enable = response === "1";
                await setAnti(enable);
                await reply(`✅ *${setting.label} set to ${enable ? "ON" : "OFF"}.*`);
                conn.ev.off("messages.upsert", toggleListener);
              } else {
                if (response === "1") {
                  config[setting.key] = setting.trueVal;
                  await reply(`✅ *${setting.label} set to ${setting.trueVal.toUpperCase()}.*`);
                  conn.ev.off("messages.upsert", toggleListener);
                } else if (response === "2") {
                  config[setting.key] = setting.falseVal;
                  await reply(`✅ *${setting.label} set to ${setting.falseVal.toUpperCase()}.*`);
                  conn.ev.off("messages.upsert", toggleListener);
                } else {
                  await reply("❌ Invalid option. Please reply with 1 or 2.");
                }
              }
            }
          } catch (err2) {
            console.error("Toggle Error:", err2);
          }
        };

        conn.ev.on("messages.upsert", toggleListener);
        conn.ev.off("messages.upsert", menuListener);

      } catch (err) {
        console.error("Settings Menu Error:", err);
      }
    };

    conn.ev.on("messages.upsert", menuListener);

  } catch (err) {
    console.error("Settings Command Error:", err);
  }
    
      const start = Date.now()
      } else if (command === 'ping') {
        await conn.sendMessage(from, { text: 'Pinging...' }, { quoted: mek })
        const end = Date.now()
        const responseTime = end - start
        await conn.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/vbi10j.png' },
          caption: `⏱️ Response: ${responseTime}ms\n⏳ Uptime: ${runtime(process.uptime())}\n👑 Owner: @94721551183`
        }, { quoted: mek })
        
      } else if (command === 'runtime') {
        await conn.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/vbi10j.png' },
          caption: `⏳ *Bot Uptime:* ${runtime(process.uptime())}`
        }, { quoted: mek })
        
      } else if (command === 'system') {
        const mem = `${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB`
        const cpu = os.cpus()[0].model
        const plat = os.platform()
        const up = runtime(os.uptime())
        const caption = `🖥 *System Info*\n\n• 🧠 *CPU:* ${cpu}\n• 💾 *Memory:* ${mem}\n• 💻 *Platform:* ${plat}\n• ⏳ *Uptime:* ${up}`
        await conn.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/vbi10j.png' },
          caption
        }, { quoted: mek })
        
      } else if (command === 'alive') {
        await conn.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/vbi10j.png' },
          caption: `✅ *Bot is Alive!*\n⏳ Uptime: ${runtime(process.uptime())}\n👑 Owner: @94721551183`
        }, { quoted: mek })
        
      } else if (command === 'menu') {
        await conn.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/vbi10j.png' },
          caption: `╭───❍ *Bot Menu* ❍───◆\n│\n│ 🔴 *.ping* — Speed test\n│ 🟢 *.alive* — Bot status\n│ ⚙️ *.system* — System info\n│ ⏱ *.runtime* — Bot uptime\n╰───────────────────────◆`
        }, { quoted: mek })     
        
//=========== APK ==============
} else if (command === 'apk') {
  if (!q) return reply("📥 Please provide the app name to download.");

  await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

  const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${q}/limit=1`;
  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data || !data.datalist || !data.datalist.list.length) {
      return reply("⚠️ No results found for your search.");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2); // bytes → MB

    const caption =
      `╔═══❍ 𝗔𝗣𝗞 𝗗𝗲𝘁𝗮𝗶𝗹𝘀 ❍═══⫸\n` +
      `╠➤ *Name:* ${app.name}\n` +
      `╠➤ *Size:* ${appSize} MB\n` +
      `╠➤ *Package:* ${app.package}\n` +
      `╠➤ *Updated:* ${app.updated}\n` +
      `╠➤ *Developer:* ${app.developer.name}\n` +
      `╚════════════════════⫸\n\n` +
      `> _*Created by Manisha Coder*_`;

    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    await conn.sendMessage(from, {
      document: { url: app.file.path_alt },
      fileName: `${app.name}.apk`,
      mimetype: "application/vnd.android.package-archive",
      caption: caption
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (error) {
    console.error("APK Error:", error);
    reply("❌ An error occurred while fetching the APK. Please try again.");
  }
  //======== SONG ==================
} else if (command === 'song' || command === 'mp3') {
  if (!q) return reply("🎵 Please provide a song name or YouTube link.");

  const yt = await ytsearch(q);
  if (!yt.results.length) return reply("❌ No results found!");

  const song = yt.results[0];
  const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(song.url)}`;

  let res, text, data;

  try {
    res = await fetch(apiUrl);

    // Check if the response is JSON
    const contentType = res.headers.get("content-type");
    text = await res.text();

    if (!contentType || !contentType.includes("application/json")) {
      console.error("⚠️ Invalid content-type from API:", contentType);
      console.error("📄 Response Body:", text);
      return reply("⚠️ Server returned an unexpected format. Please try again later.");
    }

    data = JSON.parse(text);
  } catch (err) {
    console.error("❌ Fetch/Parse Error:", err.message);
    console.error("📄 Raw Response:", text || "No response body received");
    return reply("⚠️ Failed to fetch the song. Please try again later.");
  }

  if (!data?.result?.downloadUrl) {
    return reply("❌ Failed to get the download link. Please try a different song.");
  }

  await conn.sendMessage(from, {
    audio: { url: data.result.downloadUrl },
    mimetype: "audio/mpeg",
    fileName: `${song.title}.mp3`,
    contextInfo: {
      externalAdReply: {
        title: song.title.length > 25 ? `${song.title.substring(0, 22)}...` : song.title,
        body: "🎧 MP3 Downloader",
        mediaType: 1,
        thumbnailUrl: song.thumbnail.replace('default.jpg', 'hqdefault.jpg'),
        sourceUrl: song.url,
        mediaUrl: song.url,
        showAdAttribution: true,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: mek });
  // RESTART
} else if (command === 'restart') {
  if (senderNumber !== conn.user.id.split(":")[0]) {
    return reply("Only the bot owner can use this command.");
  }

  reply("🔄 Restarting bot...");
  await sleep(1500);

  const { exec } = require("child_process");
  exec("pm2 restart all", (err, stdout, stderr) => {
    if (err) return reply("❌ Failed to restart bot.");
  });
}




} //add command
      
 
 // ========== COMMAND HANDLER ==========
    const cmd = events.commands.find(c => c.pattern === command) || events.commands.find(c => c.alias && c.alias.includes(command))
    if (cmd) {
      if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } })
      try {
        cmd.function(conn, mek, {}, {
          from, body, isCmd, command, args, q, isGroup, sender, senderNumber,
          botNumber2, botNumber, pushname, isMe, isOwner,
          groupMetadata, participants, groupAdmins, isBotAdmins, isAdmins, reply
        })
      } catch (e) {
        console.error("[PLUGIN ERROR]", e)
      }
    }

    events.commands.forEach(cmd => {
      if (cmd.on === 'body') {
        cmd.function(conn, mek, {}, {
          from, body, isCmd, command, args, q, isGroup, sender, senderNumber,
          botNumber2, botNumber, pushname, isMe, isOwner,
          groupMetadata, participants, groupAdmins, isBotAdmins, isAdmins, reply
        })
      }
    })
  })
}

setTimeout(connectToWA, 4000)