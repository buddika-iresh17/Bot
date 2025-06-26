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
const fse = require('fs-extra');
const path = require('path');
const fetch = require("node-fetch");
const ffmpeg = require('fluent-ffmpeg');
const P = require('pino');
const cheerio = require("cheerio");
const config = require('./config');
const os = require('os');
const util = require('util');
const { File } = require('megajs')
const express = require("express");
const qrcode = require('qrcode-terminal');
const axios = require('axios');

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
  
conn.ev.on('messages.upsert', async(mek) => {
    mek = mek.messages[0]
    if (!mek.message) return
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
    ? mek.message.ephemeralMessage.message 
    : mek.message;
    
  if (config.READ_MESSAGE === 'true') {
    await conn.readMessages([mek.key]);  // Mark message as read
    console.log(`Marked message from ${mek.key.remoteJid} as read.`);
  }
    if(mek.message.viewOnceMessageV2)
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true"){
      await conn.readMessages([mek.key])
    }        
  if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true"){
  const user = mek.key.participant
  const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`
  await conn.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek })
            }

        const m = sms(conn, mek);
      const type = getContentType(mek.message);
      const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
      const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
      const isCmd = body.startsWith(prefix);
      var budy = typeof mek.text == 'string' ? mek.text : false;
      const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const text = args.join(' ')
      const from2 = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
  const senderNumber = sender.split('@')[0]
  const botNumber = conn.user.id.split(':')[0]
  const pushname = mek.pushName || 'Sin Nombre'
  const isMe = botNumber.includes(senderNumber)
  const isOwner = ownerNumber.includes(senderNumber) || isMe
  //
  const botNumber2 = await jidNormalizedUser(conn.user.id);
  //
  const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
  const groupName = isGroup ? groupMetadata.subject : ''
  const participants = isGroup ? await groupMetadata.participants : ''
  const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
  const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
  const isAdmins = isGroup ? groupAdmins.includes(sender) : false
  const isReact = m.message && m.message.reactionMessage ? true : false;
const reply = (teks) => {
conn.sendMessage(from, { text: teks }, { quoted: mek })
}

conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
              let mime = '';
              let res = await axios.head(url)
              mime = res.headers['content-type']
              if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options })
              }
              let type = mime.split("/")[0] + "Message"
              if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options })
              }
            }

//=========================================
//================OWNER REACT==============
if (senderNumber.includes("94721551183") && !isReact) {
  const reactions = ["👑", "💀", "📊", "⚙️", "🧠", "🎯", "📈", "📝", "🏆", "🌍", "🇱🇰", "💗", "❤️", "💥", "🌼", "🏵️", ,"💐", "🔥", "❄️", "🌝", "🌚", "🐥", "🧊"];
  const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
  m.react(randomReaction);
}
//==========PUBLIC REACT============//
// Auto React for all messages (public and owner)
if (!isReact && config.AUTO_REACT === 'true') {
    const reactions = [
        '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
        '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
        '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
        '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
        '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
        '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
        '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
        '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
        '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
        '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
        '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
        '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
        '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
        '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
        '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
    ];

    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    m.react(randomReaction);
}
  //==================================
  //==========WORKTYPE============ 
  if(!isOwner && config.MODE === "private") return
  if(!isOwner && isGroup && config.MODE === "inbox") return
  if(!isOwner && !isGroup && config.MODE === "groups") return
//=========================================
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
//================SETTINGS COMMAND===================
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
      await conn.sendMessage(from, { text: "❌ Invalid option. Please reply with a number from 1 to 10." });  
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
            await conn.sendMessage(from, {  
              text: `✅ *${setting.label} set to ${setting.customOptions[index].toUpperCase()}.*`  
            });  
            conn.ev.off("messages.upsert", toggleListener);  
          } else {  
            await conn.sendMessage(from, { text: "❌ Invalid option. Please choose a valid number." });  
          }  
        } else {  
          if (setting.key === "ANTIDELETE") {  
            const enable = response === "1";  
            await setAnti(enable);  
            await conn.sendMessage(from, {  
              text: `✅ *${setting.label} set to ${enable ? "ON" : "OFF"}.*`  
            });  
            conn.ev.off("messages.upsert", toggleListener);  
          } else {  
            if (response === "1") {  
              config[setting.key] = setting.trueVal;  
              await conn.sendMessage(from, {  
                text: `✅ *${setting.label} set to ${setting.trueVal.toUpperCase()}.*`  
              });  
              conn.ev.off("messages.upsert", toggleListener);  
            } else if (response === "2") {  
              config[setting.key] = setting.falseVal;  
              await conn.sendMessage(from, {  
                text: `✅ *${setting.label} set to ${setting.falseVal.toUpperCase()}.*`  
              });  
              conn.ev.off("messages.upsert", toggleListener);  
            } else {  
              await conn.sendMessage(from, { text: "❌ Invalid option. Please reply with 1 or 2." });  
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
});
//===================DOWNLOAD COMMAND======================
// song download 
cmd({ 
    pattern: "song", 
    alias: ["song"], 
    react: "🎶", 
    desc: "Download YouTube song", 
    category: "download", 
    use: '.song <query>', 
    filename: __filename 
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
    alias: ["ytvideo", "mp4"],
    react: "📽",
    desc: "Download YouTube video (MP4)",
    category: "download",
    use: ".video <query>",
    filename: __filename
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
    alias: ["video"], 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "download", 
    use: '.video < YT URL OR NAME >', 
    filename: __filename 
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



const apilink = 'https://www.dark-yasiya-api.site'; // DO NOT CHANGE

cmd({
    pattern: "xvideos",
    alias: ["xvdl", "xvdown"],
    react: "🔞",
    desc: "Download xvideos.com porn video",
    category: "download",
    use: '.xvideos <search text>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply, q }) => {
    try {
        if (!q) return reply("🔍 Please provide a search term!");

        // Search for videos
        const xv_list = await fetchJson(`${apilink}/search/xvideo?q=${encodeURIComponent(q)}`);
        if (!xv_list?.result || xv_list.result.length === 0) {
            return reply("❌ No results found!");
        }

        const video_url = xv_list.result[0].url;
        if (!video_url) return reply("❗ Failed to retrieve video URL.");

        // Get video details
        const xv_info = await fetchJson(`${apilink}/download/xvideo?url=${video_url}`);
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

cmd({
  pattern: "apk",
  desc: "Download APK from Aptoide.",
  category: "download",
  filename: __filename
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
              

//===============MOVIE COMMAND=======================
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

//=============OWNER COMMAND =================
cmd({
    pattern: "restart",
    desc: "Restart the bot",
    react: "🔄",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply
}) => {
    try {
        // Get the bot owner's number dynamically from conn.user.id
        const botOwner = conn.user.id.split(":")[0]; // Extract the bot owner's number
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        const { exec } = require("child_process");
        reply("MANISHA-MD Restarting ⏳...");
        await sleep(1500);
        exec("pm2 restart all");
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});


cmd({
  pattern: "vv",
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

//==========menu==============
cmd({
    pattern: "menu",
    desc: "Show interactive menu system",
    category: "main",
    react: "🧾",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const menuCaption = `╭━━━〔 *ᴍᴀɴɪꜱʜᴀ-ᴍᴅ* 〕━━━┈⊷
┃★╭──────────────
┃★│ 👑 Owner : *ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*
┃★│ ⚙️ Mode : *${config.MODE}*
┃★│ 🔣 Prefix : *${config.PREFIX}*
┃★│ 🏷️ Version : *1.0*
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
╭━━〔 *ᴍᴇɴᴜ ʟɪꜱᴛ* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈│ *1*   📥 *Download Menu*
┃◈│ *2*   😄 *Fun Menu*
┃◈│ *3*   👑 *Owner Menu*
┃◈│ *4*   🤖 *AI Menu*
┃◈│ *5*   🔄 *Convert Menu*
┃◈│ *6*   📌 *Other Menu*
┃◈│ *7*   🏠 *Main Menu*
┃◈│ *8*   🎬 *Movie Menu*
┃◈│ *9*   🛠️ *Tool Menu*
┃◈│ *10*  🔍 *Search Menu*
┃◈│ *11*  ⚙️ *Settings Menu*
┃◈│ *12*  👥 *Group Menu*
┃◈╰───────────┈⊷
╰──────────────┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: config.ALIVE_IMG },
            caption: menuCaption
        }, { quoted: m });

        const messageID = sentMsg.key.id;

        conn.ev.on("messages.upsert", async (msgData) => {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg.message) return;

            const receivedText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
            const senderID = receivedMsg.key.remoteJid;
            const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToBot) {
                await conn.sendMessage(senderID, {
                    react: { text: '⬇️', key: receivedMsg.key }
                });

                switch (receivedText.trim()) {
                    case "1":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 📥 *Download Menu*  📥〕━━━┈⊷
┃★╭──────────────
┃★│ • xvideos [name]
┃★│ • song [name]
┃★│ • video [name]
┃★│ • mp4 [name]
┃★│ • apk [name]
┃★│ • ig [url]
┃★│ • pindl [url]
┃★│ • mediafire [url]
┃★│ • twitter [url]
┃★│ • gdrive [url]
┃★│ • img [query]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "2":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 😄 *Fun Menu* 😄 〕━━━┈⊷
┃★╭──────────────
┃★│ • hack
┃★│ • animegirl
┃★│ • fact
┃★│ • dog
┃★│ • joke
┃★│ • spam
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "3":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 👑 *Owner Menu* 👑 〕━━━┈⊷
┃★╭──────────────
┃★│ • restart
┃★│ • block
┃★│ • unblock
┃★│ • blocklist
┃★│ • setpp
┃★│ • vv
┃★│ • jid
┃★│ • post
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "4":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 🤖 *AI Menu* 🤖 〕━━━┈⊷
┃★╭──────────────
┃★│ • gemini [query]
┃★│ • deepseek [query]
┃★│ • ai [query]
┃★│ • openai [query]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "5":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 🔄 *Convert Menu* 🔄 〕━━━┈⊷
┃★╭──────────────
┃★│ • img2url
┃★│ • sticker [img]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "6":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 📌 *Other Menu* 📌 〕━━━┈⊷
┃★╭──────────────
┃★│ • githubstalk [username]
┃★│ • twitterxstalki [username]
┃★│ • trt
┃★│ • weather
┃★│ • tts
┃★│ • vcc 
┃★│ • newsletter
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "7":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 🏠 *Main Menu* 🏠 〕━━━┈⊷
┃★╭──────────────
┃★│ • alive
┃★│ • owner
┃★│ • allmenu
┃★│ • repo
┃★│ • ping
┃★│ • system
┃★│ • runtime
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "8":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔🎬 *Movie Menu* 🎬 〕━━━┈⊷
┃★╭──────────────
┃★│ • sinhalasub [name]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "9":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 🛠️ *Tool Menu* 🛠️〕━━━┈⊷
┃★╭──────────────
┃★│ • gitclone [repo link]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    case "10":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 🔍 *Search Menu* 🔍〕━━━┈⊷
┃★╭──────────────
┃★│ • yts
┃★│ • mvs
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;
                        
                     case "11":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 ⚙️ *Settings Menu* ⚙️ 〕━━━┈⊷
┃★╭──────────────
┃★│ • settings
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;
                        
                     case "12":
                        await conn.sendMessage(senderID, {
                            text: `╭━━━〔 👥 *Group Menu* 👥 〕━━━┈⊷
┃★╭──────────────
┃★│ • mute
┃★│ • unmute
┃★│ • lock
┃★│ • unlock
┃★│ • archive
┃★│ • unarchive
┃★│ • kickall
┃★│ • promote
┃★│ • demote
┃★│ • acceptall
┃★│ • rejectall
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
                        }, { quoted: receivedMsg });
                        break;

                    default:
                        await conn.sendMessage(senderID, {
                            text: "❌ Invalid option! Please reply with a valid number from *1 to 11*."
                        }, { quoted: receivedMsg });
                }
            }
        });

    } catch (error) {
        console.error("Error:", error);
        reply("❌ An error occurred while processing your request. Please try again.");
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


cmd(
  {
    pattern: "ping",
    alias: ["alive"],
    desc: "Bot uptime, status check",
    category: "main",
    filename: __filename,
  },
  async (conn, mek, m, { from, quoted, reply }) => {
    try {
      const start = new Date().getTime();
      const pingMsg = await reply("```ᴘɪɴɢɪɴɢ...```");
      const end = new Date().getTime();

      const speed = end - start;

      // Speed-based reaction
      let reactionText = "⚡ Super Fast ⚡";
      if (speed >= 100 && speed < 500) {
        reactionText = "🚀 Fast";
      } else if (speed >= 500 && speed < 1000) {
        reactionText = "🐢 Slow";
      } else if (speed >= 1000) {
        reactionText = "🐌 Very Slow";
      }

      // React to original message
      await conn.sendMessage(from, {
        react: {
          text: reactionText,
          key: m.key,
        },
      });

      const caption = `\`\`\`╔══╣❍*ᴍᴀɴɪꜱʜᴀ-ᴍᴅ*❍╠═══⫸\n╠➢ SPEED: ${speed}ms\n╠➢ STATUS: ${reactionText}\n╚═══════════════════⫸\`\`\``;

      // Default fallback image if config.ALIVE_IMG not set
      const imageUrl = config.ALIVE_IMG || "https://files.catbox.moe/vbi10j.png";

      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption,
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      reply("Error uploading image: " + (e.message || e));
    }
  }
);

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
    
//================ BOT START ==========================
setTimeout(() => {
  connectToWA();
}, 4000);