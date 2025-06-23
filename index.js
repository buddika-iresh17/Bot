// index.js

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const { File } = require("megajs");
const { exec } = require("child_process");
const fetch = require("node-fetch");
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const axios = require("axios");
const path = require('path');
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

// ----------- Utility functions (from your utils) -------------

const getBuffer = async (url, options) => {
  try {
    options = options || {};
    const res = await axios({
      method: "get",
      url,
      headers: {
        DNT: 1,
        "Upgrade-Insecure-Request": 1,
      },
      ...options,
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

const getGroupAdmins = (participants) => {
  let admins = [];
  for (let i of participants) {
    if (i.admin !== null) admins.push(i.id);
  }
  return admins;
};

const getRandom = (ext) => {
  return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const h2k = (num) => {
  const units = ["", "K", "M", "B", "T", "P", "E"];
  const order = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (order === 0) return num.toString();
  const unitname = units[order];
  const scale = Math.pow(10, order * 3);
  const scaled = num / scale;
  let formatted = scaled.toFixed(1);
  if (/\.0$/.test(formatted)) formatted = formatted.slice(0, -2);
  return formatted + unitname;
};

const isUrl = (url) => {
  return url.match(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/gi
  );
};

const Json = (string) => {
  return JSON.stringify(string, null, 2);
};

const runtime = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
  const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options) => {
  try {
    options = options || {};
    const res = await axios({
      method: "GET",
      url: url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
      },
      ...options,
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

// ------------- Helper functions --------------------

async function fetchJsonSafe(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
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

// ----------- Session and connect logic ------------

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
    const sender = msg.key.participant || from;
    const body = extractText(msg.message);
    if (!body) return;

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

        case "buttons":
          if (sender !== ownerNumber) return sock.sendMessage(from, { text: "❌ Owner only." });
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
              headerType: 4,
            });
          } else {
            await sock.sendMessage(from, {
              text: "📜 *manisha-md Bot Menu*\n\nUse buttons with `.buttons on` to enable interactive menu.",
            });
          }
          break;

        case "ping":
          const latency = Date.now() - msg.messageTimestamp * 1000;
          await sock.sendMessage(from, { text: `🏓 Pong!\nLatency: ${latency}ms` });
          break;

        case "joke":
          await sock.sendMessage(from, { text: "😂 Why did the scarecrow win an award? Because he was outstanding in his field!" });
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
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("❤️ manisha-md Bot Server Running ✅");
});
app.listen(port, () => console.log(`🌐 Server listening at http://localhost:${port}`));