// ========== MODULE IMPORTS ==========
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
const qrcode = require('qrcode-terminal')
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

const getGroupAdmins = (participants) => {
  return participants.filter(p => p.admin).map(p => p.id)
}

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

const h2k = (eco) => {
  const lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
  const ma = Math.log10(Math.abs(eco)) / 3 | 0
  if (ma === 0) return eco
  const ppo = lyrik[ma]
  const scale = Math.pow(10, ma * 3)
  let formatt = (eco / scale).toFixed(1)
  if (/\.0$/.test(formatt)) formatt = formatt.slice(0, -2)
  return formatt + ppo
}

const isUrl = (url) => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      },
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
  if (!config.SESSION_ID) return console.log("Please add your session id !");
  const sessdata = config.SESSION_ID
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`)
  filer.download((err, data) => {
    if (err) throw err
    fs.writeFile('./creds.json', data, () => {
      console.log("Session id scanning 🔄.")
    })
  })
}

// ========== EXPRESS SERVER ==========
app.get("/", (req, res) => res.send("hey, bot started✅"))
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))

// ========== CONNECT TO WA ==========
async function connectToWA() {
  console.log("Connecting wa bot 🧬...")

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
      console.log("🟢 Bot connected successfully!")
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: "💓💓💓"
      })
    }
  })

  conn.ev.on('creds.update', saveCreds)

  conn.sendFileUrl = sendFileUrl(conn)

  // ========== MESSAGE HANDLER ==========
  conn.ev.on('messages.upsert', async ({ messages }) => {
    const mek = messages[0]
    if (!mek.message) return

    mek.message = getContentType(mek.message) === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message

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
    const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(() => {}) : ''
    const participants = isGroup ? groupMetadata.participants : []
    const groupAdmins = getGroupAdmins(participants)
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false

    const reply = (teks) => conn.sendMessage(from, { text: teks }, { quoted: mek })
    const isReact = !!(mek.message?.reactionMessage)

    // ========== OWNER REACT ==========
    if (senderNumber === "94721551183" && !isReact) {
      const random = pickRandom(["👑", "💀", "📊", "⚙️", "🔥", "🌼"])
      await conn.sendMessage(from, { react: { text: random, key: mek.key } })
    }

    // ========== PUBLIC AUTO REACT ==========
    if (!isReact && config.AUTO_REACT === 'true') {
      const random = pickRandom(["🌼", "❤️", "💐", "🔥", "🏵️", "🥀"])
      await conn.sendMessage(from, { react: { text: random, key: mek.key } })
    }

    //========== PLUGINS COMMAND =====================
   if (isCmd) {
   
  const up = runtime(process.uptime())
  const commands = {
    // ========== PING ==========
    ping: async () => {
      const start = Date.now()
      await conn.sendMessage(from, { text: '⏳ *Please wait...*' }, { quoted: mek })
      const end = Date.now()
      const pingTime = end - start
      await conn.sendMessage(from, {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: `╭──❍ *Bot Status* ❍──◆\n│\n│  ⏱ *Response:* ${pingTime}ms\n│  ⏳ *Uptime:* ${up}\n│  👑 *Owner:* @94721551183\n╰──────────────◆`,
      }, { quoted: mek })
    },
    
    // ========== ALIVE ==========
    alive: async () => {
      return conn.sendMessage(from, {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: `╭──❍ *Bot is Alive!* ❍──◆\n│\n│  ✅ Bot is up and running.\n│  ⏳ *Uptime:* ${up}\n│  👑 *Owner:* @94721551183\n╰──────────────◆`,
      }, { quoted: mek })
    },

    // ========== SYSTEM ==========
    system: async () => {
      const os = require('os')
      const mem = `${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB`
      const cpu = os.cpus()[0].model
      const plat = os.platform()
      return conn.sendMessage(from, {
        text: `🖥 *System Info*\n\n• 🧠 *CPU:* ${cpu}\n• 💾 *Memory:* ${mem}\n• 💻 *Platform:* ${plat}\n• ⏳ *Uptime:* ${up}`
      }, { quoted: mek })
    },

    // ========== RUNTIME ==========
    runtime: async () => {
      return conn.sendMessage(from, {
        text: `⏳ *Bot Uptime:* ${up}`
      }, { quoted: mek })
    },

    // ========== MENU ==========
    menu: async () => {
      return conn.sendMessage(from, {
        text: `╭─────『 *Bot Menu* 』─────◆\n│\n│ 🔴 .ping\n│ 🟢 .alive\n│ ⚙️ .system\n│ ⏱ .runtime\n│ 👤 .owner\n│ 📁 .repo\n│ 🖼️ .image [url]\n╰─────────────────────────◆`
      }, { quoted: mek })
    },

    // ========== OWNER ==========
    owner: async () => {
      return conn.sendMessage(from, {
        text: `👑 *Owner Info*\n\n• 📛 Name: Manisha\n• 📞 Number: wa.me/94721551183\n• 💻 GitHub: github.com/manisha-sasmitha`,
      }, { quoted: mek })
    },

    // ========== REPO ==========
    repo: async () => {
      return conn.sendMessage(from, {
        text: `📁 *Bot Repository*\n\n• 🔗 GitHub:\nhttps://github.com/manisha-sasmitha/whatsapp-bot\n\n⭐ Don't forget to star the project!`
      }, { quoted: mek })
    },

    // ========== IMAGE ==========
    image: async () => {
      if (!q || !isUrl(q)) return reply("⚠️ Please provide a valid image URL!\nUsage: *.image https://example.com/image.jpg*")
      await conn.sendMessage(from, {
        image: { url: q },
        caption: "🖼️ Here is your requested image!"
      }, { quoted: mek })
    }
  }

  if (commands[command]) {
    try {
      await commands[command]()
    } catch (err) {
      console.log(`[❌ CMD ERROR]:`, err)
      reply("⚠️ Internal command error.")
    }
  }
  
  
}
//==================================
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

    // ========== BODY EVENTS ==========
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