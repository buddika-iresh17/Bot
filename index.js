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
const fetch = require("node-fetch");
const ffmpeg = require('fluent-ffmpeg');
const P = require('pino');
const cheerio = require("cheerio");
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

const { ytsearch } = require('@dark-yasiya/yt-dl.js');

//=================== FOUNSON ==============
const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		console.log(e)
	}
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt))
		formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
			'gi'
		)
	)
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

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
//================
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
  
//
conn.ev.on('messages.upsert', async (msg) => {
  try {
    const mek = msg.messages[0];
    if (!mek.message) return;

    // ✅ ViewOnce bypass
    if (mek.message.viewOnceMessageV2) {
      mek.message = mek.message.viewOnceMessageV2.message;
    }

    // ✅ Mark message as read (inbox)
    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
      console.log(`Marked message from ${mek.key.remoteJid} as read.`);
    }

    // ✅ Read status
    if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
      await conn.readMessages([mek.key]);
    }

    // ✅ Auto Status Reply
    if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
      const user = mek.key.participant;
      const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`;
      await conn.sendMessage(user, {
        text: text,
        react: { text: '💜', key: mek.key }
      }, { quoted: mek });
    }

    // 🧠 Your other logic continues from here...
    mek.message = (getContentType(mek.message) === 'ephemeralMessage')
      ? mek.message.ephemeralMessage.message
      : mek.message;
//==============
      const m = sms(conn, mek);
      const type = getContentType(mek.message);
      const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
      const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
      const isCmd = body.startsWith(prefix);
      const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      const isOwner = ownerNumber.includes(senderNumber);
      const pushname = mek.pushName || 'Bot User';
      const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });
//================================
    // ========== 🧠 MAIN CMD =============
    if (isCmd) {
      if (config.MODE === "private" && !isOwner) return;
      if (config.MODE === "group" && !isGroup) return;
      if (config.MODE === "inbox" && isGroup && !isOwner) return;

      const cmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
let groupMetadata = {};
let groupName = '', participants = [], groupAdmins = [], isBotAdmins = false, isAdmins = false;

if (m.isGroup) {
  try {
    groupMetadata = await conn.groupMetadata(m.chat);
    groupName = groupMetadata.subject;
    participants = groupMetadata.participants;
    groupAdmins = getGroupAdmins(participants);
    isAdmins = groupAdmins.includes(m.sender);
    isBotAdmins = groupAdmins.includes(conn.user.id.split(":")[0] + "@s.whatsapp.net");
  } catch (e) {
    console.log('Failed to fetch group metadata:', e);
  }
}

      if (cmd) {
        try {
          if (cmd.react) {
            await conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
          }
          await cmd.function(conn, mek, m, {
            from, quoted: mek, body, isCmd, command: cmdName, args, q, text: body,
            isGroup, sender, senderNumber, pushname, isOwner, isCreator: isOwner, reply,
            groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins,
            botNumber: conn.user.id,
            botNumber2: conn.user.id.split(':')[0] + '@s.whatsapp.net',
            isMe: mek.key.fromMe
          });
        } catch (e) {
          console.error("[PLUGIN ERROR] " + e);
        }
      }
    }

    // ========== ✅ PLUGIN EVENTS ============
    if (global.events?.commands) {
      global.events.commands.map(async (command) => {
        const input = {
          from, quoted: mek, body, isCmd, command: cmdName, args, q, text: body,
          isGroup, sender, senderNumber, pushname, isOwner, isCreator: isOwner, reply,
          groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins,
          botNumber: conn.user.id,
          botNumber2: conn.user.id.split(':')[0] + '@s.whatsapp.net',
          isMe: mek.key.fromMe
        };

        try {
          if (body && command.on === "body") {
            await command.function(conn, mek, m, input);
          } else if (q && command.on === "text") {
            await command.function(conn, mek, m, input);
          } else if ((command.on === "image" || command.on === "photo") && type === "imageMessage") {
            await command.function(conn, mek, m, input);
          } else if (command.on === "sticker" && type === "stickerMessage") {
            await command.function(conn, mek, m, input);
          }
        } catch (e) {
          console.error("[EVENTCMD RUNTIME ERROR]", e);
        }
      });
    }

  } catch (err) {
    console.error("Message handler error:", err.message);
  }
});
}
//================ BASIC COMMANDS =====================
//================MAIN COMMAND================

cmd({
      pattern: "owner",
      alias: ["owner"],
      desc: "Bot owner",
      category: "main",
      react: "👨‍💻",
      filename: __filename
    },
    
    async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try{
          
          // Status message to be sent
          let desc = `╔══╣❍ᴏᴡɴᴇʀ❍╠═══⫸
╠➢ *ᴏᴡɴᴇʀ :* *94721551183 ...*
╠➢ *ᴡʜᴀᴛꜱᴀᴘᴘ ᴄʜᴀɴɴᴇʟ :* *https://whatsapp.com/channel/0029VbAdMtMGk1G1R9Yg2L3x*
╚═════════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`

          // Sending the image with caption
await conn.sendMessage(from,{image: {url: config.ALIVE_IMG},caption: desc},{quoted: mek });

      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });

cmd({
      pattern: "repo",
      alias: ["repo"],
      desc: "Bot github repo",
      category: "main",
      react: "🧨",
      filename: __filename
    },
    
    async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try{
          
          // Status message to be sent
          let desc = `╔══╣❍ʀᴇᴘᴏ❍╠═══⫸
╠➢ *ʀᴇᴘᴏ:* *https://github.com/manisha-Official18/MANISHA-MD*
╠➢ *ᴏᴡɴᴇʀ :* *94721551183 ...*
╠➢ *ᴠᴇʀꜱɪᴏɴ :* *1.0 ...*
╠➢ *ᴡʜᴀᴛꜱᴀᴘᴘ ᴄʜᴀɴɴᴇʟ : https://whatsapp.com/channel/0029VbAdMtMGk1G1R9Yg2L3x*
╚════════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`

          // Sending the image with caption
await conn.sendMessage(from,{image: {url: config.ALIVE_IMG},caption: desc},{quoted: mek });

      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });

cmd({
      pattern: "alive",
      alias: ["online"],
      desc: "Chek Bot Alive",
      category: "main",
      react: "👋",
      filename: __filename
    },
    
    async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try{
          
          // Status message to be sent
          let desc = `╔══╣❍ᴀʟɪᴠᴇ❍╠═══⫸
╠➢ *ᴘᴏᴡᴇʀꜰᴜʟʟ ᴊᴀᴠᴀꜱᴄʀɪᴘᴛ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ...*
╠➢ *ᴏᴡɴᴇʀ : 94721551183 ...*
╠➢ *ᴠᴇʀꜱɪᴏɴ :* *1.0 ...*
╠➢ *ᴡʜᴀᴛꜱᴀᴘᴘ ᴄʜᴀɴɴᴇʟ : https://whatsapp.com/channel/0029VbAdMtMGk1G1R9Yg2L3x*
╚═════════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`

          // Sending the image with caption
await conn.sendMessage(from,{image: {url: config.ALIVE_IMG},caption: desc},{quoted: mek });

      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });



//==========ALL MENU=================
cmd({
      pattern: "allmenu",
      alias: ["panel"],
      desc: "Get Bot Menu",
      category: "main",
      react: "📁",
      filename: __filename
}, async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
    
let menu = {
download: '',
ai: '',
main: '',
owner: '',
fun: '',
search: '',
Convert: '',
other: '',
tool: '',
movie: '',
settings: ''
};

for (let i = 0; i < commands.length; i++) {
if (commands[i].pattern && !commands[i].dontAddCommandList) {
menu[commands[i].category] += `.${commands[i].pattern}\n`;
 }
}
   

let desc = `╔══╣❍ᴀʟʟ ᴍᴇɴᴜ❍╠═══⫸
╠➢ *ʀᴜɴᴛɪᴍᴇ : ${runtime(process.uptime())}*
╠➢ *ʀᴀᴍ ᴜꜱᴀɢᴇ : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB*
╠➢ *ᴘʟᴀᴛꜰᴏʀᴍ : ${os.hostname()}*
╠➢ *ᴠᴇʀꜱɪᴏɴ : 1.0*
╚══════════════⫸
╔════════════════⫸
 📥 *Download Menu*
 ──────
 ${menu.download}
 
 👑 *Owner Menu*
 ──────
 ${menu.owner}
 
 🤖 *AI Menu*
 ──────
 ${menu.ai}
 
 🏠 *Main Menu*
 ──────
 ${menu.main}
 
 😄 *Fun Menu*
 ──────
 ${menu.fun}
 
 🔍 *Search Menu*
 ──────
 ${menu.search}
 
 🔄 *Convert Menu*
 ──────
 ${menu.convert}
 
 📌 *Other Menu*
 ──────
 ${menu.other}
 
 🛠️ *Tool Menu*
 ──────
 ${menu.tool}
 
 🎬 *movie Menu*
 ──────
 ${menu.movie}
 
 ⚙️ *settings menu*
 ──────
 ${menu.settings}
╚═════════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`

await conn.sendMessage(from,{image: {url: `https://files.catbox.moe/vbi10j.png`},caption: desc},{quoted: mek});

 } catch (e) {
      console.log(e);
      reply(`${e}`);
    }
  }
);

cmd({
    pattern: "system",
    react: "♠️",
    alias: ["uptime","status","runtime"],
    desc: "cheack uptime",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
let status = `╔══╣❍ꜱʏꜱᴛᴇᴍ❍╠═══⫸
╠➢ *ᴜᴘᴛɪᴍᴇ :* ${runtime(process.uptime())}
╠➢ *ʀᴀᴍ ᴜꜱᴀɢᴇ :* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
╠➢ *ʜᴏꜱᴛɴᴀᴍᴇ :* ${os.hostname()}
╚════════════════⫸
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
await conn.sendMessage(from,{image:{url:config.ALIVE_IMG},caption:`${status}`},{quoted:mek})

}catch(e){
console.log(e)
reply(`${e}`)
}
})



cmd({
      pattern: "runtime",
      desc: "Chek Bot Runtime",
      category: "main",
      react: "⏰",
      filename: __filename
    }, async (conn, mek, m, { from, reply }) => {
      try {
      
      let desc = `╔══╣❍ʀᴜɴᴛɪᴍᴇ❍╠═══⫸\n╠➢ *🚀 ʀᴜɴᴛɪᴍᴇ :* ${runtime(process.uptime())}\n╚═════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`

          // Sending the image with caption
          await conn.sendMessage(from,{image: {url: config.ALIVE_IMG},caption: desc},{quoted: mek});
          
      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });
    
cmd({ 
    pattern: "song", 
    react: "🎶", 
    desc: "Download YouTube song", 
    category: "download", 
}, async (conn, mek, m, { from, sender, reply, q }) => { 
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

    } catch (error) {
        console.error(error);
        reply("An error occurred. Please try again.");
    }
});

//video download
cmd({
    pattern: "video",
    react: "📽",
    desc: "Download YouTube video (MP4)",
    category: "download",
}, async (conn, mek, m, { from, reply, q }) => {
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

        await conn.sendMessage(from, {
            video: { url: downloadUrl },
            mimetype: "video/mp4",
            caption: `🎬 *Video Downloaded Successfully!*\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
        }, { quoted: mek });

    } catch (error) {
        reply(`❌ An error occurred: ${error.message}`);
    }
});


//mp4 download

cmd({ 
    pattern: "mp4", 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "download", 
}, async (conn, mek, m, { from, prefix, quoted, q, reply }) => { 
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
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply("An error occurred. Please try again later.");
    }
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
    react: '🎬',
    category: "movie",
    desc: "Search and download movies from PixelDrain",
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


//APK
cmd({
  pattern: "apk",
  desc: "Download APK from Aptoide.",
  category: "download",
}, async (conn, m, store, {
  from,
  quoted,
  q,
  reply
}) => {
  try {
    if (!q) {
      return reply("❌ Please provide an app name to search.");
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${q}/limit=1`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data || !data.datalist || !data.datalist.list.length) {
      return reply("⚠️ No results found for the given app name.");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2); // Convert bytes to MB

    const caption = `╔══╣❍ᴀᴘᴋ❍╠═══⫸\n*ɴᴀᴍᴇ:* ${app.name}\n╠➢ *ꜱɪᴢᴇ:* ${appSize}ᴍʙ\n╠➢ *ᴘᴀᴄᴋᴀɢᴇ:* ${app.package}\n╠➢ *ᴜᴘᴅᴀᴛᴇᴅ:* ${app.updated}\n╠➢ *ᴅᴇᴠᴇᴘʟᴏᴘᴇʀ:* ${app.developer.name}\n╚═════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

    await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

    await conn.sendMessage(from, {
      document: { url: app.file.path_alt },
      fileName: `${app.name}.apk`,
      mimetype: "application/vnd.android.package-archive",
      caption: caption
    }, { quoted: m });

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while fetching the APK. Please try again.");
  }
});

cmd({
  pattern: "v",
  alias: ["viewonce", 'retrive'],
  react: '🐳',
  desc: "Owner Only - retrieve quoted message back to user",
  category: "owner",
  filename: __filename
}, async (conn, message, match, { from, isCreator }) => {
  try {
    if (!isCreator) {
      return await conn.sendMessage(from, {
        text: "*📛 This is an owner command.*"
      }, { quoted: message });
    }

    if (!match.quoted) {
      return await conn.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    const buffer = await match.quoted.download();
    const mtype = match.quoted.mtype;
    const options = { quoted: message };

    let messageContent = {};
    switch (mtype) {
      case "imageMessage":
        messageContent = {
          image: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "image/jpeg"
        };
        break;
      case "videoMessage":
        messageContent = {
          video: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "video/mp4"
        };
        break;
      case "audioMessage":
        messageContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: match.quoted.ptt || false
        };
        break;
      default:
        return await conn.sendMessage(from, {
          text: "❌ Only image, video, and audio messages are supported"
        }, { quoted: message });
    }

    await conn.sendMessage(from, messageContent, options);
  } catch (error) {
    console.error("vv Error:", error);
    await conn.sendMessage(from, {
      text: "❌ Error fetching vv message:\n" + error.message
    }, { quoted: message });
  }
});

// ✅ Number-based Menu Command
cmd({
  pattern: "menu",
  desc: "Show number-based interactive menu",
  category: "main",
  react: "🧾",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const menuText = `╭━━━〔 *MANISHA-MD BOT MENU* 〕━━━┈⊷
┃ 👤 Owner: *Manisha Coder*
┃ ⚙️ Mode: *${config.MODE}*
┃ 🔣 Prefix: *${config.PREFIX}*
┃ 🏷️ Version: *1.0*
╰━━━━━━━━━━━━━━━━━━━━━

📑 *Main Menu List:*
1. 📥 Download Menu
2. 😄 Fun Menu
3. 👑 Owner Menu
4. 🤖 AI Menu
5. 🔄 Convert Menu
6. 📌 Other Menu
7. 🏠 Main Menu
8. 🎬 Movie Menu
9. 🛠️ Tool Menu
10. 🔍 Search Menu
11. ⚙️ Settings Menu
12. 👥 Group Menu

➡️ *Reply with a number (e.g., 1)*`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: config.ALIVE_IMG },
      caption: menuText
    }, { quoted: m });

    const messageID = sentMsg.key.id;

    // 🟡 Reply listener for number selection
    conn.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const senderID = msg.key.remoteJid;
      const isReplyToMenu = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (isReplyToMenu) {
        await conn.sendMessage(senderID, {
          react: { text: '⬇️', key: msg.key }
        });

        switch (text.trim()) {
          case "1":
            return await conn.sendMessage(senderID, { text: `📥 *Download Menu*\n• song [name]\n• video [name]\n• ig [url]\n• mediafire [url]\n• twitter [url]\n...` }, { quoted: msg });

          case "2":
            return await conn.sendMessage(senderID, { text: `😄 *Fun Menu*\n• hack\n• joke\n• animegirl\n• spam\n...` }, { quoted: msg });

          case "3":
            return await conn.sendMessage(senderID, { text: `👑 *Owner Menu*\n• restart\n• block\n• unblock\n• blocklist\n...` }, { quoted: msg });

          case "4":
            return await conn.sendMessage(senderID, { text: `🤖 *AI Menu*\n• ai [query]\n• gemini [query]\n• deepseek [query]` }, { quoted: msg });

          case "5":
            return await conn.sendMessage(senderID, { text: `🔄 *Convert Menu*\n• sticker [image]\n• img2url` }, { quoted: msg });

          case "6":
            return await conn.sendMessage(senderID, { text: `📌 *Other Menu*\n• githubstalk [username]\n• weather [city]\n• tts [text]` }, { quoted: msg });

          case "7":
            return await conn.sendMessage(senderID, { text: `🏠 *Main Menu*\n• alive\n• ping\n• repo\n• system\n• runtime` }, { quoted: msg });

          case "8":
            return await conn.sendMessage(senderID, { text: `🎬 *Movie Menu*\n• sinhalasub [name]` }, { quoted: msg });

          case "9":
            return await conn.sendMessage(senderID, { text: `🛠️ *Tool Menu*\n• gitclone [repo url]` }, { quoted: msg });

          case "10":
            return await conn.sendMessage(senderID, { text: `🔍 *Search Menu*\n• yts [movie]\n• mvs [song]` }, { quoted: msg });

          case "11":
            return await conn.sendMessage(senderID, { text: `⚙️ *Settings Menu*\n• settings` }, { quoted: msg });

          case "12":
            return await conn.sendMessage(senderID, { text: `👥 *Group Menu*\n• kick\n• promote\n• demote\n• mute\n• unmute\n...` }, { quoted: msg });

          default:
            return await conn.sendMessage(senderID, {
              text: "❌ Invalid number. Please reply with a number between *1 and 12*."
            }, { quoted: msg });
        }
      }
    });

  } catch (err) {
    console.error("Menu error:", err);
    reply("⚠️ Error while processing your menu request.");
  }
});

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

cmd({
  pattern: "settings",
  alias: ["config"],
  react: "⚙️",
  desc: "Change bot settings via reply (owner only).",
  category: "settings",
  filename: __filename,
}, async (conn, mek, m, { from }) => {
  try {
    const senderNumber = m.sender.split("@")[0];
    const botOwner = getBotOwner(conn);

    if (senderNumber !== botOwner) {
      return conn.sendMessage(from, { text: "*📛 Only the bot owner can use this command!*" });
    }

    const sentMsg = await conn.sendMessage(from, {
      image: { url: config.ALIVE_IMG },
      caption:
        `╔═══╣❍ *SETTINGS MENU* ❍╠═══⫸\n` +
        `╠➢ 1️⃣. Bot Mode (private/public)\n` +
        `╠➢ 2️⃣. Auto-React (on/off)\n` +
        `╠➢ 3️⃣. Auto-Read-Status (on/off)\n` +
        `╠➢ 4️⃣. Auto-Status-Reply (on/off)\n` +
        `╠➢ 5️⃣. Auto-like-status (on/off)\n` +
        `╠➢ 6️⃣. Read-message (on/off)\n` +
        `╠➢ 7️⃣. Anti-link (on/off)\n` +
        `╠➢ 8️⃣. Anti-link-kick (on/off)\n` +
        `╠➢ 9️⃣. Anti-delete path (log/chat/inbox)\n` +
        `╠➢ 🔟. Anti-delete (on/off)\n` +
        `╠➢ 🧾 Reply with number to configure.\n` +
        `╚════════════════════⫸`
    });

    const menuMessageID = sentMsg.key.id;

    const menuListener = async (msgData) => {
      try {
        const received = msgData.messages[0];
        if (!received || received.key.remoteJid !== from) return;
        const text = received.message?.conversation || received.message?.extendedTextMessage?.text;
        const isReply = received.message?.extendedTextMessage?.contextInfo?.stanzaId === menuMessageID;
        const sender = (received.key.participant || received.key.remoteJid).split("@")[0];

        if (!text || sender !== botOwner || !isReply) return;

        const selected = settingsMap[text.trim()];
        if (!selected) return conn.sendMessage(from, { text: "❌ Invalid number. Use 1–10." });

        const configMsg = await conn.sendMessage(from, {
          text: selected.customOptions
            ? `╔═══⫸\n╠➢ *${selected.label}:*\n╠➢ ${selected.customOptions.map((v, i) => `${i + 1}. ${v.toUpperCase()}`).join("\n")}\n╠➢ _Reply with number._\n╚════⫸`
            : `╔═══⫸\n╠➢ *${selected.label}:*\n╠➢ 1. ${selected.trueVal.toUpperCase()}\n╠➢ 2. ${selected.falseVal.toUpperCase()}\n╠➢ _Reply with 1 or 2._\n╚════⫸`
        });

        const toggleID = configMsg.key.id;

        const toggleListener = async (msgData2) => {
          try {
            const received2 = msgData2.messages[0];
            if (!received2 || received2.key.remoteJid !== from) return;
            const sender2 = (received2.key.participant || received2.key.remoteJid).split("@")[0];
            const isReplyToggle = received2.message?.extendedTextMessage?.contextInfo?.stanzaId === toggleID;
            const text2 = received2.message?.conversation || received2.message?.extendedTextMessage?.text;
            if (!text2 || sender2 !== botOwner || !isReplyToggle) return;

            const response = text2.trim();

            if (selected.customOptions) {
              const index = parseInt(response) - 1;
              if (index >= 0 && index < selected.customOptions.length) {
                config[selected.key] = selected.customOptions[index];
                await conn.sendMessage(from, { text: `✅ *${selected.label} set to ${selected.customOptions[index].toUpperCase()}.*` });
                conn.ev.off("messages.upsert", toggleListener);
              } else {
                await conn.sendMessage(from, { text: "❌ Invalid number. Try again." });
              }
            } else {
              if (response === "1" || response === "2") {
                const value = response === "1" ? selected.trueVal : selected.falseVal;
                config[selected.key] = value;
                if (selected.key === "ANTIDELETE" && typeof setAnti === "function") {
                  await setAnti(response === "1");
                }
                await conn.sendMessage(from, { text: `✅ *${selected.label} set to ${value.toUpperCase()}.*` });
                conn.ev.off("messages.upsert", toggleListener);
              } else {
                await conn.sendMessage(from, { text: "❌ Reply with 1 or 2 only." });
              }
            }
          } catch (err) {
            console.error("Toggle Error:", err);
          }
        };

        conn.ev.on("messages.upsert", toggleListener);
        conn.ev.off("messages.upsert", menuListener);

      } catch (err) {
        console.error("Menu Selection Error:", err);
      }
    };

    conn.ev.on("messages.upsert", menuListener);
  } catch (err) {
    console.error("Settings Command Error:", err);
  }
});
//================ BOT START ==========================
setTimeout(() => {
  connectToWA();
}, 4000);