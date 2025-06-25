
const fetch = require('node-fetch');
const apilink = "https://www.dark-yasiya-api.site"; // <-- Change to your preferred API

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return await res.json();
};



const fs = require('fs');
const { File } = require('megajs');
const config = require('./config');

if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) {
    return console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Please add your session id ! 😥...");
  }

  console.log("🔐 No session found locally. Downloading from MEGA...");

  const sessdata = config.SESSION_ID;
  const file = File.fromURL(`https://mega.nz/file/${sessdata}`);

  file.download((err, data) => {
    if (err) {
      console.error("❌ Failed to download session from MEGA:", err);
    } else {
      fs.writeFile('./creds.json', data, () => {
        console.log("✅ Session file downloaded successfully.");
      });
    }
  });
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
const path = require('path')
const axios = require('axios')
const ytdl = require('yt-search')
const config = require('./config')
const prefix = config.PREFIX
const ownerNumber = ['94721551183']

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./' + config.SESSION_ID)
  const { version } = await fetchLatestBaileysVersion()
  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    auth: state,
    version
  })

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const mek = messages[0]
    

    // ========== AUTO READ, VIEW ONCE, STATUS HANDLING ==========
    if (config.READ_MESSAGE === 'true') {
      await conn.readMessages([mek.key]);  // Mark message as read
      console.log(`Marked message from ${mek.key.remoteJid} as read.`);
    }

    if (mek.message?.viewOnceMessageV2) {
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
      await conn.readMessages([mek.key])
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
      const user = mek.key.participant
      const text = `_AUTO STATUS SEEN JUST NOW BY MANISHA MD_`
      await conn.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek })
    }

    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTOLIKESTATUS === "true") {
      const user = await conn.decodeJid(conn.user.id);
      await conn.sendMessage(mek.key.remoteJid,
        { react: { key: mek.key, text: '💚' } },
        { statusJidList: [mek.key.participant, user] }
      )
    }

    await Promise.all([
      saveMessage(mek),
    ]);

if (!mek.message) return

    mek.message = getContentType(mek.message) === 'ephemeralMessage'
      ? mek.message.ephemeralMessage.message
      : mek.message

    const from = mek.key.remoteJid
    const type = getContentType(mek.message)
    const body = (type === 'conversation') ? mek.message.conversation :
                (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : ''
    const isCmd = body.startsWith(prefix)
    const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : ''
    const args = body.trim().split(/ +/).slice(1)
    const q = args.join(" ")
    const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek })

    if (isCmd) {
      // ==== ping ====
      if (command === 'ping') {
        reply('pong!')
      
      // ==== owner ====
      else if (command === 'owner') {
        reply("👑 Owner: wa.me/94721551183");
      
      // ==== group ====
      else if (command === 'group') {
        reply("👥 Group Command Placeholder: Add your group logic here.");
      
      // ==== xvideos ====
      else if (command === 'xvideos') {
        try {
          if (!q) return reply("🔍 Please provide a search term!");
          const xv_list = await fetchJson(`${apilink}/search/xvideo?q=${encodeURIComponent(q)}`);
          if (!xv_list?.result || xv_list.result.length === 0) return reply("❌ No results found!");
          const video_url = xv_list.result[0].url;
          if (!video_url) return reply("❗ Failed to retrieve video URL.");
          const xv_info = await fetchJson(`${apilink}/download/xvideo?url=${video_url}`);
          if (!xv_info?.result?.dl_link) return reply("❌ Failed to get download link.");

          const msg = `╔══╣❍xᴠɪᴅᴇᴏꜱ❍╠═══⫸\n╠➢ *ᴛɪᴛʟᴇ* : ${xv_info.result.title}\n╠➢ *ᴠɪᴇᴡꜱ* : ${xv_info.result.views}\n╠➢ *ʟɪᴋᴇꜱ* : ${xv_info.result.like}\n╠➢ *ᴅɪꜱʟɪᴋᴇ* : ${xv_info.result.deslike}\n╚═════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

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
        } catch (e) {
          reply("❌ Error occurred while processing your request.");
        }
      }

      // ==== pindl ====
      else if (command === 'pindl') {
        try {
          if (args.length < 1) return reply("❎ Please provide a valid Pinterest URL.");
          const pinterestUrl = args[0];
          if (!pinterestUrl.includes('pinterest')) return reply("❎ That doesn't look like a Pinterest link!");

          const res = await axios.get(`https://api.giftedtech.web.id/api/download/pinterestdl?apikey=gifted&url=${encodeURIComponent(pinterestUrl)}`);
          if (!res.data.success || !res.data.result.media || res.data.result.media.length === 0) return reply("❎ Failed to fetch media.");

          const { title = 'No Title', media } = res.data.result;
          const video = media.find(m => m.type.includes('720p') || m.type.includes('video'));
          const image = media.find(m => m.type.toLowerCase().includes('image') || m.type.toLowerCase().includes('thumbnail'));

          const caption = `╔══╣❍ᴘɪɴᴛᴇʀᴇꜱᴛᴅʟ❍╠═══⫸\n╠➢ *ᴛɪᴛʟᴇ* - ${title}\n╠➢ *ᴛʏᴘᴇ* - ${video ? 'Video' : 'Image'}\n╚══════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

          if (video) {
            await conn.sendMessage(from, { video: { url: video.download_url }, caption }, { quoted: mek });
          } else if (image) {
            await conn.sendMessage(from, { image: { url: image.download_url }, caption }, { quoted: mek });
          } else {
            reply("❎ No valid media found.");
          }
        } catch (err) {
          reply("❌ Failed to download Pinterest media.");
        }
      }

}

      // ==== main ====
      else if (command === 'main') {
        reply("🌟 Main Command Placeholder: Add your main logic here.");
      }

      // ==== fun ====
      else if (command === 'fun') {
        reply("🎉 Fun Command Placeholder: Add your fun logic here.");
      }

      // ==== download ====
      else if (command === 'download') {
        reply("📥 Download Command Placeholder: Add your downloader logic here.");
      }

}

      // ==== repo ====
      else if (command === 'repo') {
        reply("📦 Repository: https://github.com/manisha-sasmitha/MANISHA-MD");
      }

}

      // ==== runtime ====
      else if (command === 'runtime') {
        const uptime = process.uptime();
        const formatTime = (seconds) => {
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = Math.floor(seconds % 60);
          return `${h}h ${m}m ${s}s`;
        };
        reply("⏱ Bot Runtime: " + formatTime(uptime));
      }

      // ==== system ====
      else if (command === 'system') {
        const os = require('os');
        const used = process.memoryUsage();
        const memory = `🧠 RAM: ${(used.rss / 1024 / 1024).toFixed(2)} MB`;
        const platform = `💻 Platform: ${os.platform()} ${os.arch()}`;
        const uptime = `⏱ Uptime: ${(os.uptime() / 60).toFixed(1)} min`;
        reply(`${memory}\n${platform}\n${uptime}`);
      }


      // ==== ping command ====
      if (command === 'ping') {
        reply("pong!")
      }

      // ==== song command ====
      else if (command === 'song') {
        try {
          if (!q) return reply("Please provide a song name or YouTube link.")
          const yt = await ytdl(q)
          if (!yt.videos.length) return reply("No results found.")
          const song = yt.videos[0]
          const downloadUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(song.url)}`
          const res = await axios.get(downloadUrl)
          const data = res.data
          if (!data?.result?.downloadUrl) return reply("Download failed.")
          await conn.sendMessage(from, {
            audio: { url: data.result.downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `${song.title}.mp3`
          }, { quoted: mek })
        } catch (err) {
          reply("Error downloading song.")
        }
        
}
    }
  })

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      connectToWA()
    } else if (connection === 'open') {
      console.log("Bot connected.")
    
      await conn.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: `╔═══╣❍ᴍᴀɴɪꜱʜᴀ-ᴍᴅ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠════════════➢
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version   : v1.0.0
╠➢ 👑 Owner  : [${ownerNumber[0]}]
╠➢ 🛠️ Created By: Manisha Sasmitha
╠➢ 🧠 Framework : Node.js + Baileys
╚═════════════════════⫸`
      });

}
  })

  conn.ev.on('creds.update', saveCreds)
}

connectToWA()

    // ========== WORKTYPE RESTRICTION ==========
    if (!isOwner) {
      if (config.MODE === "private") return;
      if (config.MODE === "inbox" && isGroup) return;
      if (config.MODE === "groups" && !isGroup) return;
    }


    // ========== ANTILINK ==========
    if (config.ANTILINK === 'true' && isGroup && !isAdmins && !isOwner) {
      const urlRegex = /(https?:\/\/)?(www\.)?(chat\.whatsapp\.com)\/[\w\d]{20,}/gi;
      if (urlRegex.test(body)) {
        await conn.sendMessage(from, { text: "🔗 Group link detected! Removing..." });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
      }
    }

    // ========== ANTIDELETE ==========
    conn.ev.on("messages.delete", async ({ messages }) => {
      if (config.ANTIDELETE !== 'true') return;
      for (const msg of messages) {
        if (msg?.key?.fromMe) return;
        const chat = msg.key.remoteJid;
        const sender = msg.key.participant;
        await conn.sendMessage(chat, {
          text: `🗑️ Message deleted by @${sender?.split("@")[0]}`,
          mentions: [sender],
          contextInfo: { isForwarded: true }
        });
      }
    });

