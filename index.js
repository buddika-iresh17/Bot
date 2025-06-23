const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const fse = require("fs-extra");
const P = require("pino");
const express = require("express");
const { File } = require("megajs");
const { exec } = require("child_process");
const fetch = require("node-fetch");
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const axios = require("axios");
const os = require("os");
const path = require('path');
const cheerio = require("cheerio");
const { igdl } = require("ruhend-scraper");
const FormData = require("form-data");
const ffmpeg = require('fluent-ffmpeg');
const config = require("./config");

const prefix = config.PREFIX || ".";
const ownerNumberRaw = (config.OWNER_NUM || "").replace(/[^0-9]/g, "");
const app = express();
const port = process.env.PORT || 8000;

const antilinkGroups = new Set();
const antideleteGroups = new Set();
const deletedMessages = new Map();

let buttonsEnabled = config.BUTTONS_ON ?? true;

function normalizeJid(jid) {
  if (!jid) return "";
  return jid.endsWith("@s.whatsapp.net") ? jid : jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
}
const ownerNumber = normalizeJid(ownerNumberRaw);

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

if (!fs.existsSync("./creds.json")) {
  if (!config.SESSION_ID) {
    console.log("Please add your session id in config! 😥");
    process.exit(1);
  }
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFileSync("./creds.json", data);
    console.log("✅ Session Downloaded.");
    connectToWA();
  });
} else {
  setTimeout(connectToWA, 4000);
}

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState("./");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    browser: Browsers.macOS("Safari"),
    syncFullHistory: false,
    auth: state,
    version,
  });

  if (config.AUTO_STATUS_SEEN) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        if (
          msg.key.remoteJid?.includes("status@broadcast") &&
          !msg.key.fromMe
        ) {
          await sock.readMessages([msg.key]);
          console.log("👀 Viewed Status from:", msg.pushName || msg.key.participant);
        }
      }
    });
  }

  sock.ev.on("messages.delete", async (messageDeletes) => {
    for (const m of messageDeletes) {
      const from = m.key.remoteJid;
      if (from?.endsWith("@g.us") && antideleteGroups.has(from)) {
        if (m.message) {
          deletedMessages.set(m.key.id, {
            from,
            sender: m.key.participant || from,
            message: m.message,
          });
          await sock.sendMessage(from, {
            text:
              `🚫 Someone deleted a message!\n\n` +
              `👤 Sender: @${(m.key.participant || from).split("@")[0]}\n` +
              `💬 Message: ${formatMessage(m.message)}`,
            mentions: [(m.key.participant || from)],
          });
        }
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = normalizeJid(msg.key.participant || from);
    const body = extractText(msg.message);
    if (!body) return;

    // AntiLink
    if (isGroup && antilinkGroups.has(from)) {
      if (/(chat.whatsapp.com\/)/i.test(body)) {
        await sock.sendMessage(from, {
          text: `⚠️ *AntiLink active!*\nLink sending is not allowed.`,
          mentions: [sender],
        });
        await sock.sendMessage(from, {
          delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender },
        });
        return;
      }
    }

    if (!body.startsWith(prefix)) return;
    const commandBody = body.slice(prefix.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    try {
      switch (command) {
        case "song":
          if (!args[0]) 
            return sock.sendMessage(from, { text: "❓ Please provide a song name or YouTube link." });

          try {
            const yt = await ytsearch(args.join(" "));
            if (!yt || !yt.videos || yt.videos.length === 0)
              return sock.sendMessage(from, { text: "❌ No results found!" });

            const song = yt.videos[0];
            const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(song.url)}`;

            const res = await fetch(apiUrl);
            const data = await res.json();

            if (!data?.result?.downloadUrl)
              return sock.sendMessage(from, { text: "❌ Download failed. Try again later." });

            await sock.sendMessage(from, {
              audio: { url: data.result.downloadUrl },
              mimetype: "audio/mpeg",
              fileName: `${song.title}.mp3`,
              contextInfo: {
                externalAdReply: {
                  title: song.title.length > 25 ? `${song.title.substring(0, 22)}...` : song.title,
                  body: "MANISHA-MD SONG DOWNLOAD",
                  mediaType: 1,
                  thumbnailUrl: song.thumbnail.replace("default.jpg", "hqdefault.jpg"),
                  sourceUrl: song.url,
                  mediaUrl: song.url,
                  showAdAttribution: true,
                  renderLargerThumbnail: true,
                },
              },
            });
          } catch (error) {
            console.error(error);
            sock.sendMessage(from, { text: "❌ An error occurred. Please try again." });
          }
          break;

        case "video": 
          if (!args[0]) 
            return sock.sendMessage(from, { text: "❓ What video do you want to download? Please provide a search term." });

          await sock.sendMessage(from, { text: "🔍 *Searching for your video, please wait...*" });

          try {
            const search = await ytsearch(args.join(" "));
            if (!search || !search.videos || search.videos.length === 0) 
              return sock.sendMessage(from, { text: "❌ No results found for your query." });

            const video = search.videos[0];
            const { title, thumbnail, timestamp, url } = video;
            const videoUrl = encodeURIComponent(url);

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

            await sock.sendMessage(from, {
              image: { url: thumbnail },
              caption: `╔══╣❍ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅ❍╠═══⫸\n╠➢📌 *ᴛɪᴛʟᴇ:* ${title}\n╠➢⏱️ *ᴅᴜʀᴀᴛɪᴏɴ:* ${timestamp}\n╚════════════════════⫸\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
            });

            await sock.sendMessage(from, {
              video: { url: downloadUrl },
              mimetype: "video/mp4",
              caption: `🎬 *Video Downloaded Successfully!*\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`
            });

          } catch (error) {
            await sock.sendMessage(from, { text: `❌ An error occurred: ${error.message}` });
          }
          break;

        case "xvideos": 
          if (!args[0])
            return sock.sendMessage(from, { text: "🔍 Please provide a search term!" });

          try {
            const apilink = "https://www.dark-yasiya-api.site";

            const xv_list = await fetchJson(`${apilink}/search/xvideo?q=${encodeURIComponent(args.join(" "))}`);
            if (!xv_list?.result || xv_list.result.length === 0) {
              return sock.sendMessage(from, { text: "❌ No results found!" });
            }

            const video_url = xv_list.result[0].url;
            if (!video_url)
              return sock.sendMessage(from, { text: "❗ Failed to retrieve video URL." });

            const xv_info = await fetchJson(`${apilink}/download/xvideo?url=${video_url}`);
            if (!xv_info?.result?.dl_link)
              return sock.sendMessage(from, { text: "❌ Failed to get download link." });

            const msg = `╔══╣❍xᴠɪᴅᴇᴏꜱ❍╠═══⫸
╠➢ *ᴛɪᴛʟᴇ* : ${xv_info.result.title}
╠➢ *ᴠɪᴇᴡꜱ* : ${xv_info.result.views}
╠➢ *ʟɪᴋᴇꜱ* : ${xv_info.result.like}
╠➢ *ᴅɪꜱʟɪᴋᴇ* : ${xv_info.result.deslike}
╚═════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

            await sock.sendMessage(from, {
              text: msg,
              contextInfo: {
                externalAdReply: {
                  title: "XVIDEOS DOWNLOADER",
                  body: "XVIDEOS DOWNLOADER",
                  thumbnailUrl: xv_info.result.image,
                  sourceUrl: video_url,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                },
              },
            }, { quoted: msg });

            const fileName = xv_info.result.title.endsWith(".mp4")
              ? xv_info.result.title
              : xv_info.result.title + ".mp4";

            await sock.sendMessage(from, {
              document: { url: xv_info.result.dl_link },
              mimetype: "video/mp4",
              fileName,
            }, { quoted: msg });

          } catch (error) {
            console.error("🚨 Error in xvideos command:", error);
            await sock.sendMessage(from, { text: `❌ Unable to download.\n\n🧾 Error: ${error.message}` });
          }
          break;

        case "apk":
          if (!args[0])
            return sock.sendMessage(from, { text: "❌ Please provide an app name to search." });

          try {
            await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

            const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(args.join(" "))}/limit=1`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
              return sock.sendMessage(from, { text: "⚠️ No results found for the given app name." });
            }

            const app = data.datalist.list[0];
            const appSize = (app.size / 1048576).toFixed(2);

            const caption = `╔══╣❍ᴀᴘᴋ❍╠═══⫸
*ɴᴀᴍᴇ:* ${app.name}
╠➢ *ꜱɪᴢᴇ:* ${appSize}ᴍʙ
╠➢ *ᴘᴀᴄᴋᴀɢᴇ:* ${app.package}
╠➢ *ᴜᴘᴅᴀᴛᴇᴅ:* ${app.updated}
╠➢ *ᴅᴇᴠᴇᴘʟᴏᴘᴇʀ:* ${app.developer?.name || "Unknown"}
╚═════════════⫸

> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`;

            await sock.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

            await sock.sendMessage(from, {
              document: { url: app.file.path_alt },
              fileName: `${app.name}.apk`,
              mimetype: "application/vnd.android.package-archive",
              caption: caption,
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

          } catch (error) {
            console.error("🚨 Error in apk command:", error);
            await sock.sendMessage(from, { text: "❌ An error occurred while fetching the APK. Please try again." });
          }
          break;

        case "sinhalasub": 
          if (!args[0]) return sock.sendMessage(from, { text: '❌ Please provide a movie name! (e.g., Deadpool)' });

          try {
            const q = args.join(" ");
            const API_URL = "https://api.skymansion.site/movies-dl/search";
            const API_KEY = "sky|decd54b4fa030634e54d6c87fdffbb95f0bb9fb5";
            const DOWNLOAD_URL = "https://api.skymansion.site/movies-dl/download";

            const searchUrl = `${API_URL}?q=${encodeURIComponent(q)}&api_key=${API_KEY}`;
            const response = await fetchJson(searchUrl);

            if (!response?.SearchResult?.result?.length)
              return sock.sendMessage(from, { text: `❌ No results found for: *${q}*` });

            const selectedMovie = response.SearchResult.result[0];
            const detailsUrl = `${DOWNLOAD_URL}/?id=${selectedMovie.id}&api_key=${API_KEY}`;
            const detailsResponse = await fetchJson(detailsUrl);

            if (!detailsResponse?.downloadLinks?.result?.links?.driveLinks?.length)
              return sock.sendMessage(from, { text: '❌ No PixelDrain download links found.' });

            const pixelDrainLinks = detailsResponse.downloadLinks.result.links.driveLinks;
            const selectedDownload = pixelDrainLinks.find(link => link.quality === "SD 480p");

            if (!selectedDownload?.link?.startsWith('http'))
              return sock.sendMessage(from, { text: '❌ No valid 480p PixelDrain link available.' });

            const fileId = selectedDownload.link.split('/').pop();
            const directDownloadLink = `https://pixeldrain.com/api/file/${fileId}?download`;

            const safeTitle = selectedMovie.title.replace(/[\\/:*?"<>|]/g, '');
            const filePath = path.join(__dirname, `${safeTitle}-480p.mp4`);

            const writer = fs.createWriteStream(filePath);
            const { data } = await axios({
              url: directDownloadLink,
              method: 'GET',
              responseType: 'stream'
            });
            data.pipe(writer);

            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            await sock.sendMessage(from, {
              document: fs.readFileSync(filePath),
              mimetype: 'video/mp4',
              fileName: `${safeTitle}-480p.mp4`,
              caption: `📌 Quality: 480p\n✅ *Download Complete!*\n\n> _*ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴍᴀɴɪꜱʜᴀ ᴄᴏᴅᴇʀ*_`,
            }, { quoted: msg });

            fs.unlinkSync(filePath);

          } catch (error) {
            console.error('Error in sinhalasub command:', error);
            await sock.sendMessage(from, { text: '❌ Sorry, something went wrong. Please try again later.' });
          }
          break;

       // =================== OWNER COMMANDS ===================
        case "restart":
          if (sender !== ownerNumber)
            return sock.sendMessage(from, { text: "❌ Owner only." });
          sock.sendMessage(from, { text: "🔄 Restarting bot..." });
          exec("pm2 restart all", (err, stdout, stderr) => {
            if (err) console.error(err);
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
          });
          break;

        case "eval":
          if (sender !== ownerNumber)
            return sock.sendMessage(from, { text: "❌ Owner only." });
          try {
            let evaled = eval(args.join(" "));
            if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
            sock.sendMessage(from, { text: `✅ Result:\n\n${evaled}` });
          } catch (err) {
            sock.sendMessage(from, { text: `❌ Error:\n\n${err}` });
          }
          break;

        case "buttons":
          if (sender !== ownerNumber)
            return sock.sendMessage(from, { text: "❌ Owner only." });
          if (!args[0]) return sock.sendMessage(from, { text: "Use: .buttons on/off" });

          if (args[0].toLowerCase() === "on") {
            buttonsEnabled = true;
            await sock.sendMessage(from, { text: "✅ Buttons enabled." });
          } else if (args[0].toLowerCase() === "off") {
            buttonsEnabled = false;
            await sock.sendMessage(from, { text: "❌ Buttons disabled." });
          } else {
            await sock.sendMessage(from, { text: "Use: .buttons on/off" });
          }
          break;

        // =================== MAIN / GENERAL ===================
        case "menu":
  if (buttonsEnabled) {
    await sock.sendMessage(from, {
      image: { url: "https://files.catbox.moe/vbi10j.png" },
      caption: "📜 *manisha-md Bot Menu*",
      footer: "🔘 Powered by manisha coder",
      buttons: [
        { buttonId: prefix + "download https://youtu.be/dQw4w9WgXcQ", buttonText: { displayText: "🎥 Download Example" }, type: 1 },
        { buttonId: prefix + "antilink on", buttonText: { displayText: "🚫 AntiLink On" }, type: 1 },
        { buttonId: prefix + "antidelete on", buttonText: { displayText: "🗑 AntiDelete On" }, type: 1 },
        { buttonId: prefix + "ping", buttonText: { displayText: "🏓 Ping" }, type: 1 },
        { buttonId: prefix + "joke", buttonText: { displayText: "😂 Joke" }, type: 1 },
      ],
      headerType: 4, // Must be 4 when sending an image
    });
  } else {
    await sock.sendMessage(from, {
      text: "📜 *manisha-md Bot Menu*\n\nUse buttons with `.buttons on` to enable interactive menu.",
    });
  }
  break;

        // =================== OTHER ===================
        case "ping":
          const latency = Date.now() - msg.messageTimestamp * 1000;
          await sock.sendMessage(from, { text: `🏓 Pong!\nLatency: ${latency}ms` });
          break;

        // =================== TOOLS ===================
        case "calc":
          if (!args.length)
            return sock.sendMessage(from, { text: "Usage: .calc <expression>" });
          try {
            const result = eval(args.join(" "));
            sock.sendMessage(from, { text: `🧮 Result: ${result}` });
          } catch {
            sock.sendMessage(from, { text: "❌ Invalid expression." });
          }
          break;

        // =================== ANIME ===================
        case "animegif":
          await sock.sendMessage(from, {
            video: { url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.mp4" },
            caption: "✨ Here's an anime gif for you!",
            mimetype: "video/mp4"
          });
          break;

        // =================== FUN ===================
        case "joke":
          await sock.sendMessage(from, { text: "😂 Why did the scarecrow win an award? Because he was outstanding in his field!" });
          break;

        case "meme":
          await sock.sendMessage(from, {
            image: { url: "https://i.imgflip.com/30b1gx.jpg" },
            caption: "🤣 Here's a meme for you!",
            mimetype: "image/jpeg"
          });
          break;

        // =================== ANTI LINK ===================
        case "antilink":
          if (!isGroup) return sock.sendMessage(from, { text: "Group only!" });
          if (args[0] === "on") {
            antilinkGroups.add(from);
            sock.sendMessage(from, { text: "✅ AntiLink enabled." });
          } else if (args[0] === "off") {
            antilinkGroups.delete(from);
            sock.sendMessage(from, { text: "❌ AntiLink disabled." });
          } else {
            sock.sendMessage(from, { text: "Use: .antilink on/off" });
          }
          break;

        // =================== ANTI DELETE ===================
        case "antidelete":
          if (!isGroup) return sock.sendMessage(from, { text: "Group only!" });
          if (args[0] === "on") {
            antideleteGroups.add(from);
            sock.sendMessage(from, { text: "✅ AntiDelete enabled." });
          } else if (args[0] === "off") {
            antideleteGroups.delete(from);
            sock.sendMessage(from, { text: "❌ AntiDelete disabled." });
          } else {
            sock.sendMessage(from, { text: "Use: .antidelete on/off" });
          }
          break;

        default:
          sock.sendMessage(from, { text: `❓ Unknown command: ${command}` });
      }
    } catch (e) {
      console.error(e);
      sock.sendMessage(from, { text: "❌ Command error!" });
    }
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ BOT Connected!");
      await sock.sendMessage(ownerNumber, {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: "❤️ *manisha-md Bot connected successfully!*",
        mimetype: "image/jpeg",
        footer: "🔘 Powered by manisha coder",
        buttons: [
          { buttonId: prefix + "menu", buttonText: { displayText: "📂 Menu" }, type: 1 },
          { buttonId: "github", buttonText: { displayText: "💠 GitHub" }, type: 1 },
        ],
        headerType: 4,
      });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Disconnected, reconnecting...", reason);
      setTimeout(connectToWA, 3000);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

function extractText(msg) {
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage) return msg.extendedTextMessage.text;
  if (msg.imageMessage) return msg.imageMessage.caption || "";
  if (msg.videoMessage) return msg.videoMessage.caption || "";
  if (msg.documentMessage) return msg.documentMessage.caption || "";
  return "";
}

function formatMessage(message) {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return "<Image>";
  if (message.videoMessage) return "<Video>";
  if (message.stickerMessage) return "<Sticker>";
  if (message.documentMessage) return "<Document>";
  return "<Unknown Message>";
}

// Web server
app.get("/", (req, res) => {
  res.send("❤️ manisha-md Bot Server Running ✅");
});
app.listen(port, () => console.log(`🌐 Server listening at http://localhost:${port}`));