const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
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
  const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
  return {
    sender,
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
//==================================
conn.ev.on('messages.upsert', async (msg) => {
  try {
    const mek = msg.messages[0];
    if (!mek.message) return;

    // ViewOnce bypass
    while (mek.message?.viewOnceMessageV2) {
      mek.message = mek.message.viewOnceMessageV2.message;
    }

    // Ephemeral message unwrap
    while (mek.message?.ephemeralMessage) {
      mek.message = mek.message.ephemeralMessage.message;
    }

    // Mark message as read
    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
      console.log(`Marked message from ${mek.key.remoteJid} as read.`);
    }

    // Auto read status
    if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === 'true') {
      await conn.readMessages([mek.key]);
    }

    // Auto status reply
    if (mek.key?.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === 'true') {
      const user = mek.key.participant;
      const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`;
      await conn.sendMessage(user, {
        text,
        react: { text: '💜', key: mek.key }
      }, { quoted: mek });
    }

    // Prepare message info & helpers
    const m = sms(conn, mek);  // Your custom message parser/helper
    const type = getContentType(mek.message);
    const from = mek.key.remoteJid;
    const body = (type === 'conversation') ? mek.message.conversation
      : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text
      : (type === 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption
      : (type === 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption
      : '';
    const isCmd = body.startsWith(prefix);
    const cmdName = isCmd ? body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase() : false;
    const args = isCmd ? body.trim().split(/ +/).slice(1) : [];
    const q = args.join(" ");
    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
    const senderNumber = (sender || "").split("@")[0];
    const isOwner = ownerNumber.includes(senderNumber);
    const pushname = mek.pushName || 'Bot User';
//=========================
const reply = (teks) => {
      conn.sendMessage(from, { text: teks }, { quoted: mek });
    };

    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
      try {
        const res = await axios.head(url);
        const mime = res.headers['content-type'];

        if (mime.split("/")[1] === "gif") {
          return conn.sendMessage(jid, {
            video: await getBuffer(url),
            caption: caption,
            gifPlayback: true,
            ...options,
          }, { quoted: quoted, ...options });
        }

        if (mime === "application/pdf") {
          return conn.sendMessage(jid, {
            document: await getBuffer(url),
            mimetype: "application/pdf",
            caption: caption,
            ...options,
          }, { quoted: quoted, ...options });
        }

        const mediaType = mime.split("/")[0];

        if (mediaType === "image") {
          return conn.sendMessage(jid, {
            image: await getBuffer(url),
            caption: caption,
            ...options
          }, { quoted: quoted, ...options });
        }

        if (mediaType === "video") {
          return conn.sendMessage(jid, {
            video: await getBuffer(url),
            caption: caption,
            mimetype: "video/mp4",
            ...options
          }, { quoted: quoted, ...options });
        }

        if (mediaType === "audio") {
          return conn.sendMessage(jid, {
            audio: await getBuffer(url),
            caption: caption,
            mimetype: "audio/mpeg",
            ...options
          }, { quoted: quoted, ...options });
        }
      } catch (err) {
        console.error("sendFileUrl error:", err.message);
      }
    };
//=========================
    
    // ==== COMMAND HANDLER ====
    if (isCmd) {
      if (config.MODE === "private" && !isOwner) return;
      if (config.MODE === "group" && !isGroup) return;
      if (config.MODE === "inbox" && isGroup && !isOwner) return;

      const cmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
      let groupMetadata = {};
      let groupName = '', participants = [], groupAdmins = [], isBotAdmins = false, isAdmins = false;

      if (isGroup) {
        try {
          groupMetadata = await conn.groupMetadata(from);
          groupName = groupMetadata.subject;
          participants = groupMetadata.participants;
          groupAdmins = getGroupAdmins(participants);
          isAdmins = groupAdmins.includes(m.sender);
          isBotAdmins = groupAdmins.includes(udp + '@s.whatsapp.net');
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
            botNumber2: udp + '@s.whatsapp.net',
            isMe: mek.key.fromMe
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    }

    // ==== GLOBAL PLUGIN EVENTS ====
    if (global.events?.commands) {
      for (const command of global.events.commands) {
        try {
          const input = {
            from, quoted: mek, body, isCmd, command: cmdName, args, q, text: body,
            isGroup, sender, senderNumber, pushname, isOwner, isCreator: isOwner, reply,
            groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins,
            botNumber: conn.user.id,
            botNumber2: (conn.user && conn.user.id || '').split(':')[0] + '@s.whatsapp.net',
            isMe: mek.key.fromMe
          };

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
      }
    }

  } catch (err) {
    console.error("Message handler error:", err.message);
  }
});
}
//================ BASIC COMMANDS =====================
//================MAIN COMMAND================
cmd({
  pattern: "restart",
  category: "main",
  react: "👨‍💻",
}, 
async (conn, mek, m, {
  isCreator, reply
}) => {
  if (!isCreator) return reply("📛 Only the owner can use this command.");
  
  const { exec } = require("child_process");
  reply("🔄 Restarting bot...");
  await sleep(1500);
  exec("pm2 restart all");
});


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
    pattern: "ping",
    desc: "Check bot's response time.",
    category: "main",
    react: "🚀",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const startTime = Date.now()
        const message = await conn.sendMessage(from, { text: '*PINGING...*' })
        const endTime = Date.now()
        const ping = endTime - startTime
        await conn.sendMessage(from,{image: {url: config.ALIVE_IMG},caption: `_*MANISHA-MD SPEED : ${ping}ms*_`},{quoted: mek})
        
    } catch (e) {
        console.log(e)
        reply(`${e}`)
    }
})


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
const API_KEY = "sky|decd54b4fa030634e54d6c87fdffbb95f0bb9fb5";
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
const fileId = (selectedDownload?.link || "").split("/").pop();
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

const GEMINI_API_KEY = "AIzaSyBP9qAGQUHjtIPuaZcyvSnbZDGSyHUD6bc";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBP9qAGQUHjtIPuaZcyvSnbZDGSyHUD6bc`;

cmd({
  pattern: "gemini",
  alias: ["ai","chatgpt"],
  react: '🤖',
  desc: "Ask anything to Google Gemini AI.",
  category: "ai",
  use: ".gemini <Your Quoestion>",
  filename: __filename
}, async (conn, mek, msg, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    const text = args.join(" ");
    if (!text) {
      return reply(`❗️ Please GFive Me A Question`);
    }

    const prompt = `my name is ${pushname}, Your name is manisha AI. you are a WhatsApp AI Bot. you were made by මනිෂ coder. answer in the language the person talking to you speak. Answer in a way that doesn't sound like you're a bot. think you are human and answer. Use meaningful emojis. my question is: ${text}`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const response = await axios.post(
      GEMINI_API_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data || !response.data.candidates || !response.data.candidates[0]?.content?.parts) {
      return reply("❌ error in the answer. 😢");
    }
    
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    await reply(`${aiResponse}`);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    reply("❌ Error in the quation 😢");
  }
});


cmd({
    pattern: "ai",
    alias: ["bot", "dj", "gpt", "gpt4", "bing"],
    desc: "Chat with an AI model",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for the AI.\nExample: `.ai Hello`");

        const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.message) {
            await react("❌");
            return reply("AI failed to respond. Please try again later.");
        }

        await reply(`🤖 *AI Response:*\n\n${data.message}`);
        await react("✅");
    } catch (e) {
        console.error("Error in AI command:", e);
        await react("❌");
        reply("An error occurred while communicating with the AI.");
    }
});

cmd({
    pattern: "openai",
    alias: ["chatgpt", "gpt3", "open-gpt"],
    desc: "Chat with OpenAI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for OpenAI.\nExample: `.openai Hello`");

        const apiUrl = `https://vapis.my.id/api/openai?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.result) {
            await react("❌");
            return reply("OpenAI failed to respond. Please try again later.");
        }

        await reply(`🧠 *OpenAI Response:*\n\n${data.result}`);
        await react("✅");
    } catch (e) {
        console.error("Error in OpenAI command:", e);
        await react("❌");
        reply("An error occurred while communicating with OpenAI.");
    }
});

cmd({
    pattern: "deepseek",
    alias: ["deep", "seekai"],
    desc: "Chat with DeepSeek AI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for DeepSeek AI.\nExample: `.deepseek Hello`");

        const apiUrl = `https://api.ryzendesu.vip/api/ai/deepseek?text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.answer) {
            await react("❌");
            return reply("DeepSeek AI failed to respond. Please try again later.");
        }

        await reply(`🧠 *DeepSeek AI Response:*\n\n${data.answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in DeepSeek AI command:", e);
        await react("❌");
        reply("An error occurred while communicating with DeepSeek AI.");
    }
});
//================ BOT START ==========================
setTimeout(() => {
  connectToWA();
}, 4000);