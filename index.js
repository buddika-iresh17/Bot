const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const P = require('pino');
const config = require('./config');
const os = require('os');
const util = require('util');
const express = require("express");
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { File } = require('megajs');

const prefix = config.PREFIX;
const ownerNumber = ['94721551183'];
const commands = [];

//====================
const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
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

//=============

//================ SESSION RESTORE ====================
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("Please add your session id ! ...");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => {
      console.log("session id scanning ...");
    });
  });
}

//================ EXPRESS SERVER =====================
const app = express();
const port = process.env.PORT || 8000;
app.get("/", (req, res) => res.send("hey, bot started"));
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

//================ COMMAND REGISTRATION ===============
function cmd(info, func) {
  try {
    info.function = func;
    if (!info.desc) info.desc = '';
    if (!info.alias) info.alias = [];
    if (!info.category) info.category = 'misc';
    if (!info.filename) info.filename = 'Not Provided';
    commands.push(info);
    return info;
  } catch (e) {
    console.error("[PLUGIN ERROR] " + e);
  }
}

//================ BASIC sms() FUNCTION ===============
function sms(conn, mek) {
  return {
    react: async (emoji) => {
      await conn.sendMessage(mek.key.remoteJid, {
        react: {
          text: emoji,
          key: mek.key
        }
      });
    }
  };
}

//================ MAIN BOT FUNCTION ==================
async function connectToWA() {
  console.log("Connecting wa bot ...");
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

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("Plugins Installing ...");
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `https://files.catbox.moe/vbi10j.png` },
        caption: `Bot Connected Successfully!`
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('messages.upsert', async (msg) => {
    try {
      const mek = msg.messages[0];
      if (!mek.message) return;
      mek.message = (getContentType(mek.message) === 'ephemeralMessage')
        ? mek.message.ephemeralMessage.message
        : mek.message;

      const m = sms(conn, mek);
      const type = getContentType(mek.message);
      const body = type === 'conversation'
        ? mek.message.conversation
        : type === 'extendedTextMessage'
        ? mek.message.extendedTextMessage.text
        : '';
      const isCmd = body.startsWith(prefix);
      const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const from = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      const isOwner = ownerNumber.includes(senderNumber);
      const pushname = mek.pushName || 'Bot User';
      const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

      if (isCmd) {
        const cmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
        if (cmd) {
          if (cmd.react) {
            await conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
          }
          await cmd.function(conn, mek, m, {
            from, quoted: mek, body, isCmd, command: cmdName, args, q,
            isGroup, sender, senderNumber, isOwner, pushname, reply
          });
        }
      }
    } catch (err) {
      console.error("Message handler error:", err.message);
    }
  });
}

//================ BASIC COMMANDS =====================

// .ping
cmd({
  pattern: "ping",
  alias: ["pong"],
  react: "🏓",
  desc: "Ping test",
  category: "general"
}, async (conn, mek, m, { reply }) => {
  reply("🏓 Pong!\nBot is active.");
});

// .runtime
cmd({
  pattern: "runtime",
  react: "⏱️",
  desc: "Show bot uptime",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const runtime = (s) => {
    const d = Math.floor(s / (3600 * 24));
    const h = Math.floor(s % (3600 * 24) / 3600);
    const m = Math.floor(s % 3600 / 60);
    const sec = Math.floor(s % 60);
    return `${d}d ${h}h ${m}m ${sec}s`;
  };
  reply(`⏱️ Bot Runtime: *${runtime(process.uptime())}*`);
});

// .system
cmd({
  pattern: "system",
  react: "🖥️",
  desc: "System info",
  category: "system"
}, async (conn, mek, m, { reply }) => {
  const mem = process.memoryUsage();
  const cpu = os.cpus()[0];
  reply(`🖥 *System Info*\n\n🔋 Platform: ${os.platform()}\n🧠 RAM: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n🧰 CPU: ${cpu.model}\n📦 Node: ${process.version}`);
});


cmd({
pattern: "xvideos",
react: "🔞",
desc: "Download xvideos.com porn video",
category: "download",
},
async (conn, mek, m, { from, quoted, reply, q }) => {
try {
if (!q) return reply("🔍 Please provide a search term!");

// Search for videos  
    const xv_list = await fetchJson(`https://www.dark-yasiya-api.site/search/xvideo?q=${encodeURIComponent(q)}`);  
    if (!xv_list?.result || xv_list.result.length === 0) {  
        return reply("❌ No results found!");  
    }  

    const video_url = xv_list.result[0].url;  
    if (!video_url) return reply("❗ Failed to retrieve video URL.");  

    // Get video details  
    const xv_info = await fetchJson(`https://www.dark-yasiya-api.site/download/xvideo?url=${video_url}`);  
    if (!xv_info?.result?.dl_link) return reply("❌ Failed to get download link.");  

    const msg = `╔══╣❍xᴠɪᴅᴇᴏꜱ❍╠═══⫸\n╠➢ *ᴛɪᴛʟᴇ* : ${xv_info.result.title}\n╠➢ *ᴠɪᴇᴡꜱ* : ${xv_info.result.views}\n╠➢ *ʟɪᴋᴇꜱ* : ${xv_info.result.like}\n╠➢ *ᴅɪꜱʟɪᴋᴇ* : ${xv_info.result.deslike}\n╚═════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;  

    // Send video info with thumbnail  
    await conn.sendMessage(from, {  
        text: msg,  
        contextInfo: {  
            externalAdReply: {  
                title: "XVIDEOS DOWNLOADER",  
                body: "XVIDEOS DOWNLOADER",  
                thumbnailUrl: xv_info.result.image,  
                sourceUrl: video_url,  
                mediaType: 1,  
                renderLargerThumbnail: true  
            }  
        }  
    }, { quoted: mek });  

    // Send actual video as document  
    const fileName = xv_info.result.title.endsWith('.mp4') ? xv_info.result.title : xv_info.result.title + '.mp4';  
    await conn.sendMessage(from, {  
        document: { url: xv_info.result.dl_link },  
        mimetype: 'video/mp4',  
        fileName: fileName  
    }, { quoted: mek });  

} catch (error) {  
    console.error("🚨 Error in xvideos command:", error);  
    await reply("❌ Unable to download.\n\n🧾 Error: " + error.message);  
}

});


const API_URL = "https://api.skymansion.site/movies-dl/search";
const DOWNLOAD_URL = "https://api.skymansion.site/movies-dl/download";
const API_KEY = config.MOVIE_API_KEY;
cmd({
    pattern: "sinhalasub",
    alias: ["moviedl", "films"],
    react: '🎬',
    category: "movie",
    desc: "Search and download movies from PixelDrain",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q || q.trim() === '') return await reply('❌ Please provide a movie name! (e.g., Deadpool)');

        // Fetch movie search results
        const searchUrl = `${API_URL}?q=${encodeURIComponent(q)}&api_key=${API_KEY}`;
        let response = await fetchJson(searchUrl);

        if (!response || !response.SearchResult || !response.SearchResult.result.length) {
            return await reply(`❌ No results found for: *${q}*`);
        }

        const selectedMovie = response.SearchResult.result[0]; // Select first result
        const detailsUrl = `${DOWNLOAD_URL}/?id=${selectedMovie.id}&api_key=${API_KEY}`;
        let detailsResponse = await fetchJson(detailsUrl);

        if (!detailsResponse || !detailsResponse.downloadLinks || !detailsResponse.downloadLinks.result.links.driveLinks.length) {
            return await reply('❌ No PixelDrain download links found.');
        }

        // Select the 720p PixelDrain link
        const pixelDrainLinks = detailsResponse.downloadLinks.result.links.driveLinks;
        const selectedDownload = pixelDrainLinks.find(link => link.quality === "SD 480p");
        
        if (!selectedDownload || !selectedDownload.link.startsWith('http')) {
            return await reply('❌ No valid 480p PixelDrain link available.');
        }

        // Convert to direct download link
        const fileId = selectedDownload.link.split('/').pop();
        const directDownloadLink = `https://pixeldrain.com/api/file/${fileId}?download`;
        
        
        // Download movie
        const filePath = path.join(__dirname, `${selectedMovie.title}-480p.mp4`);
        const writer = fs.createWriteStream(filePath);
        
        const { data } = await axios({
            url: directDownloadLink,
            method: 'GET',
            responseType: 'stream'
        });

        data.pipe(writer);

        writer.on('finish', async () => {
            await conn.sendMessage(from, {
                document: fs.readFileSync(filePath),
                mimetype: 'video/mp4',
                fileName: `${selectedMovie.title}-480p.mp4`,
                caption: `📌 Quality: 480p\n✅ *Download Complete!*\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`,
                quoted: mek 
            });
            fs.unlinkSync(filePath);
        });

        writer.on('error', async (err) => {
            console.error('Download Error:', err);
            await reply('❌ Failed to download movie. Please try again.');
        });
    } catch (error) {
        console.error('Error in movie command:', error);
        await reply('❌ Sorry, something went wrong. Please try again later.');
    }
});

//================ BOT START ==========================
setTimeout(() => {
  connectToWA();
}, 4000);