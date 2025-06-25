// ====================== IMPORTS ==========================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys')
const fs = require('fs')
const P = require('pino')
const config = require('./config')
const os = require('os')
const util = require('util')
const express = require("express")
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const { File } = require('megajs')

const prefix = config.PREFIX;
const ownerNumber = ['94721551183']
const commands = []

// ====================== SESSION RESTORE ==========================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("Please add your session id ! ...")
  const sessdata = config.SESSION_ID
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`)
  filer.download((err, data) => {
    if (err) throw err
    fs.writeFile('./creds.json', data, () => {
      console.log("session id scanning ...")
    })
  })
}

// ====================== EXPRESS SERVER ==========================
const app = express();
const port = process.env.PORT || 8000;
app.get("/", (req, res) => {
  res.send("hey, bot started");
});
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

// ====================== CMD REGISTER ==========================
function cmd(info, func) {
  var data = info;
  try {
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!info.category) data.category = 'misc';
    if (!info.filename) data.filename = "Not Provided";
    commands.push(data);
    return data;
  } catch (e) {
    console.error("[PLUGIN ERROR] " + e);
  }
}

// ====================== MAIN FUNCTION ==========================
async function connectToWA() {
  console.log("Connecting wa bot ...");
  const { state, saveCreds } = await useMultiFileAuthState('./')
  var { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version
  })

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("Plugins Installing ...")
      let up = `Bot Connected Successfully!`;
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", { image: { url: `https://files.catbox.moe/vbi10j.png` }, caption: up });
    }
  });

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('messages.upsert', async (msg) => {
    try {
      const mek = msg.messages[0]
      if (!mek.message) return
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
      const m = sms(conn, mek)
      const type = getContentType(mek.message)
      const body = type === 'conversation' ? mek.message.conversation : type === 'extendedTextMessage' ? mek.message.extendedTextMessage.text : ''
      const isCmd = body.startsWith(prefix)
      const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : ''
      const args = body.trim().split(/ +/).slice(1)
      const q = args.join(" ")
      const from = mek.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid
      const senderNumber = sender.split('@')[0]
      const isOwner = ownerNumber.includes(senderNumber)
      const pushname = mek.pushName || 'Bot User'
      const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek })

      for (let commandObj of commands) {
        if (commandObj.pattern === command) {
          await commandObj.function(conn, mek, m, { from, quoted: mek, body, isCmd, command, args, q, isGroup, sender, senderNumber, isOwner, pushname, reply })
        }
      }
    } catch (err) {
      console.error("Message handler error:", err)
    }
  })
}

// ====================== COMMANDS ==========================
cmd({
  pattern: "ping",
  desc: "Reply with pong!",
  category: "general"
}, async (conn, mek, m, { reply }) => {
  await m.react("🏓")
  reply("*🏓 Pong!*\n\nBot is active.")
})

cmd({
  pattern: "runtime",
  desc: "Show bot uptime",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const runtime = (seconds) => {
    seconds = Number(seconds)
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor(seconds % (3600 * 24) / 3600)
    const m = Math.floor(seconds % 3600 / 60)
    const s = Math.floor(seconds % 60)
    return `${d}d ${h}h ${m}m ${s}s`
  }
  const uptime = process.uptime()
  reply(`⏱️ Bot Runtime: *${runtime(uptime)}*`)
})

cmd({
  pattern: "system",
  desc: "Show system information",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const used = process.memoryUsage()
  const cpu = os.cpus()[0]
  let txt = `
🖥 *System Info*

🧠 RAM: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB
🔋 Platform: ${os.platform()}
🧰 CPU: ${cpu.model}
⚙️ Uptime: ${os.uptime()}s
📦 Node: ${process.version}
`
  reply(txt)
})

// ====================== START ==========================
setTimeout(() => {
  connectToWA()
}, 4000);
