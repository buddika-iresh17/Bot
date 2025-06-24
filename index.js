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
const config = require('./config')
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const axios = require('axios')
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
      const start = Date.now()
      if (command === 'ping') {
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
//=========== VIDEO ==============
      }else if (command === 'mp4' || command === 'video') {
    if (!q) return reply("PROVIDE URL OR NAME");

    const yt = await ytsearch(q);
    if (yt.results.length < 1) return reply("No results found!");

    let yts = yt.results[0];
    let apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(yts.url)}`;

    let response = await fetch(apiUrl);
    let data = await response.json();

    if (data.status !== 200 || !data.success || !data.result.download_url) {
      return reply("Failed to fetch the video. Please try again later.");
    }

    let ytmsg = `╔══╣❍ᴠɪᴅᴇᴏ/ᴍᴘ4 ᴅᴏᴡɴʟᴏᴀᴅ❍╠═══⫸\n╠➢ *ᴛɪᴛʟᴇ:* ${yts.title}\n╠➢ *ᴅᴜʀᴀᴛɪᴏɴ:* ${yts.timestamp}\n╠➢ *ᴠɪᴡᴇꜱ:* ${yts.views}\n╠➢ *ᴀᴜᴛʜᴏʀ:* ${yts.author.name}\n╠➢ *ʟɪɴᴋ:* ${yts.url}\n╚═════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

    await conn.sendMessage(from, {
      video: { url: data.result.download_url },
      caption: ytmsg,
      mimetype: "video/mp4"
    }, { quoted: mek });
//=========== SONG ==============
  } else if (command === 'song' || command === 'mp3') {
    if (!q) return reply("Please provide a song name or YouTube link.");

    const yt = await ytsearch(q);
    if (!yt.results.length) return reply("No results found!");

    const song = yt.results[0];
    const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(song.url)}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data?.result?.downloadUrl) return reply("Download failed. Try again later.");

    await conn.sendMessage(from, {
      audio: { url: data.result.downloadUrl },
      mimetype: "audio/mpeg",
      fileName: `${song.title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: song.title.length > 25 ? `${song.title.substring(0, 22)}...` : song.title,
          body: "SONG/MP3",
          mediaType: 1,
          thumbnailUrl: song.thumbnail.replace('default.jpg', 'hqdefault.jpg'),
          sourceUrl: '',
          mediaUrl: '',
          showAdAttribution: true,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: mek });
  }
}
      
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