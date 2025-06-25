function cmd(info, handler) {
  events.commands.push({ ...info, handler });
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
const os = require('os');
const fse = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require("cheerio");
const { igdl } = require("ruhend-scraper");
const FormData = require("form-data");
const ffmpeg = require('fluent-ffmpeg');
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const googleTTS = require('google-tts-api')
const dl = require('@bochilteam/scraper')  
const l = console.log
const ytdl = require('yt-search');
var videotime = 60000 // 1000 min
//====================== AI API ================
const config = require('./config');
const GEMINI_API_KEY = config.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const API_URL = "https://api.skymansion.site/movies-dl/search";
const DOWNLOAD_URL = "https://api.skymansion.site/movies-dl/download";
const API_KEY = config.MOVIE_API_KEY;
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

// Command: song
if (cmd === 'song') {
  try {
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
            body: "MANISHA-MD SONG DOWNLOAD",
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
} else if (cmd === 'video') {
  try {
        if (!q) return reply("❓ What video do you want to download? Please provide a search term.");

        await reply("🔍 *Searching for your video, please wait...*");

        const search = await ytsearch(q);
        if (!search.results.length) return reply("❌ No results found for your query.");

        const { title, thumbnail, timestamp, url } = search.results[0];
        const videoUrl = encodeURIComponent(url);

        // Try primary API
        const api1 = `https://apis-keith.vercel.app/download/dlmp4?url=${videoUrl}`;
        const api2 = `https://apis.davidcyriltech.my.id/download/ytmp4?url=${videoUrl}`;

        let data;

        try {
            const res1 = await fetch(api1);
            data = await res1.json();
            if (!data?.status || !data?.result?.downloadUrl) throw new Error("Primary API failed");
        } catch {
            const res2 = await fetch(api2);
            data = await res2.json();
            if (!data?.success || !data?.result?.download_url) throw new Error("Both APIs failed");
        }

        const downloadUrl = data.result.downloadUrl || data.result.download_url;

        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `╔══╣❍ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅ❍╠═══⫸\n╠➢📌 *ᴛɪᴛʟᴇ:* ${title}\n╠➢⏱️ *ᴅᴜʀᴀᴛɪᴏɴ:* ${timestamp}\n╚════════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
        }, { quoted: mek });
}
} else if (cmd === 'mp4') {
  try { 
        if (!q) return await reply("PROVIDE URL OR NAME");
        
        const yt = await ytsearch(q);
        if (yt.results.length < 1) return reply("No results found!");
        
        let yts = yt.results[0];  
        let apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(yts.url)}`;
        
        let response = await fetch(apiUrl);
        let data = await response.json();
        
        if (data.status !== 200 || !data.success || !data.result.download_url) {
            return reply("Failed to fetch the video. Please try again later.");
        }

        let ytmsg = `╔══╣❍ᴍᴘ4 ᴅᴏᴡɴʟᴏᴀᴅ❍╠═══⫸\n╠➢ *ᴛɪᴛʟᴇ:* ${yts.title}\n╠➢ *ᴅᴜʀᴀᴛɪᴏɴ:* ${yts.timestamp}\n╠➢ *ᴠɪᴡᴇꜱ:* ${yts.views}\n╠➢ *ᴀᴜᴛʜᴏʀ:* ${yts.author.name}\n╠➢ *ʟɪɴᴋ:* ${yts.url}\n╚═════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

        // Send video directly with caption
        await conn.sendMessage(
            from, 
            { 
                video: { url: data.result.download_url }, 
                caption: ytmsg,
                mimetype: "video/mp4"
            }, 
            { quoted: mek
}
}
}//=== command add






}//=========💓



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

// === Media Downloader Utility from msg.js ===
const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const fs = require('fs')

const downloadMediaMessage = async(m, filename) => {
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type
    }
    if (m.type === 'imageMessage') {
        var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
        const stream = await downloadContentFromMessage(m.msg, 'image')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameJpg, buffer)
        return fs.readFileSync(nameJpg)
    } else if (m.type === 'videoMessage') {
        var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
        const stream = await downloadContentFromMessage(m.msg, 'video')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp4, buffer)
        return fs.readFileSync(nameMp4)
    } else if (m.type === 'audioMessage') {
        var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
        const stream = await downloadContentFromMessage(m.msg, 'audio')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp3, buffer)
        return fs.readFileSync(nameMp3)
    } else if (m.type === 'stickerMessage') {
        var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
        const stream = await downloadContentFromMessage(m.msg, 'sticker')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameWebp, buffer)
        return fs.readFileSync(nameWebp)
    } else if (m.type === 'documentMessage') {
        var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
        var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
        const stream = await downloadContentFromMessage(m.msg, 'document')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameDoc, buffer)
        return fs.readFileSync(nameDoc)
    }
}

const sms = (conn, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBot = m.id.startsWith('BAES') && m.id.length === 16
	m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? conn.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
        //m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        //if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        try {
            m.body = (m.mtype === 'conversation') ? m.message.conversation : 
                     (m.mtype == 'imageMessage' && m.message.imageMessage.caption != undefined) ? m.message.imageMessage.caption : 
                     (m.mtype == 'videoMessage' && m.message.videoMessage.caption != undefined) ? m.message.videoMessage.caption : 
                     (m.mtype == 'extendedTextMessage' && m.message.extendedTextMessage.text != undefined) ? m.message.extendedTextMessage.text : 
                     (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                     (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                     (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';
        } catch {
            m.body = false
        }
        let quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null);
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
       
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted	}
		
		
          if(quoted.viewOnceMessageV2)
          { 
            console.log("entered ==================================== ")
            //console.log ("m Is : ",m,"\nm Quoted is :",m.quoted ,"\n Quoted is : ",quoted,"\nviewOnce :  ", quoted.viewOnceMessageV2.message)
           
          } else 
          {
		    
		    
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBot = m.quoted.id ? m.quoted.id.startsWith('BAES') && m.quoted.id.length === 16 : false
	    m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
			if (!m.quoted.id) return false
			let q = await store.loadMessage(m.chat, m.quoted.id, conn)
 			return exports.sms(conn, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            /**
             * 
             * @returns 
             */
             let { chat, fromMe, id } = m.quoted;
			const key = {
				remoteJid: m.chat,
				fromMe: false,
				id: m.quoted.id,
				participant: m.quoted.sender
			}
            m.quoted.delete = async() => await conn.sendMessage(m.chat, { delete: key })

	   /**
		* 
		* @param {*} jid 
		* @param {*} forceForward 
		* @param {*} options 
		* @returns 
	   */
            m.forwardMessage = (jid, forceForward = true, options = {}) => conn.copyNForward(jid, vM, forceForward,{contextInfo: {isForwarded: false}}, options)

            /**
              *
              * @returns
            */
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
	  }
        }
    }
    if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
	* Reply to this message
	* @param {String|Object} text 
	* @param {String|false} chatId 
	* @param {Object} options 
	*/

       /**
	* Copy this message
	*/
	m.copy = () => exports.sms(conn, M.fromObject(M.toObject(m)))
	/**
	 * 
	 * @param {*} jid 
	 * @param {*} forceForward 
	 * @param {*} options 
	 * @returns 
	 */
	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
	m.sticker = (stik, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyimg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
        m.imgurl = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: {url: img }, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.reply = async (content,opt = { packname: "Secktor", author: "SamPandey001" }, type = "text")  => {
      switch (type.toLowerCase()) {
        case "text":{
          return await conn.sendMessage( m.chat, {  text: content }, { quoted:m });
                     }
        break;
      case "image": {
          if (Buffer.isBuffer(content)) {
            return await conn.sendMessage(m.chat, { image: content, ...opt },  { ...opt } );
          } else if (isUrl(content)) {
            return conn.sendMessage( m.chat, { image: { url: content }, ...opt },{ ...opt }  );
          }
        }
        break;
      case "video": {
        if (Buffer.isBuffer(content)) {
          return await conn.sendMessage(m.chat,  { video: content, ...opt },  { ...opt }   );
        } else if (isUrl(content)) {
          return await conn.sendMessage( m.chat,  { video: { url: content }, ...opt },  { ...opt }  );
        }
      }
      case "audio": {
          if (Buffer.isBuffer(content)) {
            return await conn.sendMessage( m.chat, { audio: content, ...opt }, { ...opt } );
          } else if (isUrl(content)) {
            return await conn.sendMessage( m.chat, { audio: { url: content }, ...opt }, { ...opt });
          }
        }
        break;
      case "template":
        let optional = await generateWAMessage(m.chat, content, opt);
        let message = { viewOnceMessage: { message: { ...optional.message,},   },};
        await conn.relayMessage(m.chat, message, { messageId: optional.key.id,});
        break;
      case "sticker":{
	  let { data, mime } = await conn.getFile(content);
          if (mime == "image/webp") {
          let buff = await writeExifWebp(data, opt);
            await conn.sendMessage(m.chat, { sticker: { url: buff }, ...opt }, opt );
          } else {
            mime = await mime.split("/")[0];
            if (mime === "video") {
              await conn.sendImageAsSticker(m.chat, content, opt);
            } else if (mime === "image") {
              await conn.sendImageAsSticker(m.chat, content, opt);
            }
          }
        }
        break;
    }
  }
	m.senddoc = (doc,type, id = m.chat, option = { mentions: [m.sender], filename: Config.ownername, mimetype: type,
	externalAdRepl: {
							title: Config.ownername,
							body: ' ',
							thumbnailUrl: ``,
							thumbnail: log0,
							mediaType: 1,
							mediaUrl: '',
							sourceUrl: gurl,
						} }) => conn.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: {
	  externalAdReply: option.externalAdRepl,
	  mentionedJid: option.mentions } }, { quoted: m })
	
  	m.sendcontact = (name, info, number) => {
		var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
		conn.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
	}
	m.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })

    return m
}
