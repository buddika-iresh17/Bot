const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  getContentType,
  downloadContentFromMessage,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const express = require("express");
const util = require("util");
const axios = require("axios");
const ytdl = require("ytdl-core");
const { File } = require("megajs");

const config = require("./config");

const prefix = config.PREFIX;
const ownerNumber = config.OWNER_NUMBER;
const app = express();
const port = process.env.PORT || 8000;

const commands = [];
function cmd(info, func) {
  info.function = func;
  if (!info.dontAddCommandList) info.dontAddCommandList = false;
  if (!info.desc) info.desc = "";
  if (!info.fromMe) info.fromMe = false;
  if (!info.category) info.category = "misc";
  if (!info.filename) info.filename = "index.js";
  commands.push(info);
  return info;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ───── Utility Functions ─────
const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      ...options,
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

const getGroupAdmins = (participants) =>
  participants.filter((p) => p.admin !== null).map((p) => p.id);

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

const h2k = (num) => {
  const SI = ["", "K", "M", "B", "T"];
  const tier = (Math.log10(Math.abs(num)) / 3) | 0;
  if (tier === 0) return num;
  const scale = Math.pow(10, tier * 3);
  return (num / scale).toFixed(1).replace(/\.0$/, "") + SI[tier];
};

const isUrl = (url) => url.match(/https?:\/\/[^\s]+/gi);

const Json = (str) => JSON.stringify(str, null, 2);

const runtime = (s) => {
  const d = Math.floor(s / (3600 * 24));
  const h = Math.floor((s % (3600 * 24)) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${d ? d + "d, " : ""}${h ? h + "h, " : ""}${m ? m + "m, " : ""}${sec}s`;
};

const fetchJson = async (url, options = {}) => {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0 Safari/537.36",
      },
      ...options,
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

const downloadMediaMessage = async (m, filename) => {
  if (m.type === "viewOnceMessage") m.type = m.msg.type;
  const extMap = {
    imageMessage: "jpg",
    videoMessage: "mp4",
    audioMessage: "mp3",
    stickerMessage: "webp",
  };
  const ext = extMap[m.type] || "bin";
  const name = filename ? `${filename}.${ext}` : `media.${ext}`;
  const stream = await downloadContentFromMessage(m.msg, m.type.replace("Message", ""));
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  fs.writeFileSync(name, buffer);
  return fs.readFileSync(name);
};

// ───── Message Enhancer ─────
const sms = (sock, m) => {
  if (m.key) {
    m.id = m.key.id;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = m.fromMe
      ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.isGroup
      ? m.key.participant
      : m.key.remoteJid;
  }

  if (m.message) {
    m.type = getContentType(m.message);
    m.msg =
      m.type === "viewOnceMessage"
        ? m.message[m.type].message[getContentType(m.message[m.type].message)]
        : m.message[m.type];

    const ctx = m.msg.contextInfo || {};
    const mentionList = Array.isArray(ctx.mentionedJid) ? ctx.mentionedJid : [ctx.participant].filter(Boolean);
    m.mentionUser = mentionList;

    m.body =
      m.type === "conversation"
        ? m.msg
        : m.type === "extendedTextMessage"
        ? m.msg.text
        : m.type === "imageMessage" && m.msg.caption
        ? m.msg.caption
        : m.type === "videoMessage" && m.msg.caption
        ? m.msg.caption
        : m.type === "templateButtonReplyMessage"
        ? m.msg.selectedId
        : m.type === "buttonsResponseMessage"
        ? m.msg.selectedButtonId
        : "";

    m.download = (filename) => downloadMediaMessage(m, filename);

    m.reply = (text, id = m.chat, opt = { mentions: [m.sender] }) =>
      sock.sendMessage(id, { text, contextInfo: { mentionedJid: opt.mentions } }, { quoted: m });
    m.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
  }

  return m;
};

// ───── Session Prep ─────
async function prepareSession() {
  if (!fs.existsSync("./creds.json")) {
    if (!config.SESSION_ID) {
      console.log("🌀 Please add your session id in config!");
      process.exit(1);
    }
    try {
      const filer = File.fromURL(`https://mega.nz/file/${config.SESSION_ID}`);
      const data = await filer.download();
      const chunks = [];
      for await (const chunk of data) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync("./creds.json", buffer);
      console.log("🌀 Session downloaded from MEGA.");
    } catch (err) {
      console.error("❌ Session download failed:", err);
      process.exit(1);
    }
  }
}

let sock;

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState("./");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    browser: Browsers.macOS("Safari"),
    syncFullHistory: false,
    auth: state,
    version,
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Bot connected successfully!");

      const up = `🤖 Manisha-MD Connected\nPrefix: ${prefix}\nMode: ${config.MODE}`;
      await sock.sendMessage(ownerNumber[0] + "@s.whatsapp.net", { text: up });
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || "Unknown";
      console.log("❌ Connection closed. Reconnecting... Reason:", reason);
      setTimeout(connectToWA, 3000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      if (!messages[0].message) return;
      let m = sms(sock, messages[0]);

      const senderNumber = m.sender.split("@")[0];
      const isReact = m.message?.reactionMessage ? true : false;

      // OWNER REACT
      if (senderNumber.includes("94721551183") && !isReact) {
        const ownerReacts = [
          "👑", "💀", "📊", "⚙️", "🧠", "🎯", "📈", "📝", "🏆", "🌍", "🇱🇰", "💗", "❤️",
          "💥", "🌼", "🏵️", "💐", "🔥", "❄️", "🌝", "🌚", "🐥", "🧊",
        ];
        const randomOwnerReaction = ownerReacts[Math.floor(Math.random() * ownerReacts.length)];
        m.react(randomOwnerReaction);
      }

      // PUBLIC AUTO REACT
      if (!isReact && config.AUTO_REACT === "true") {
        const publicReacts = [
          "🌼", "❤️", "💐", "🔥", "🏵️", "❄️", "🧊", "🐳", "💥", "🥀",
        ];
        const randomPublicReaction = publicReacts[Math.floor(Math.random() * publicReacts.length)];
        m.react(randomPublicReaction);
      }

      const isCmd = m.body.startsWith(prefix);
      if (!isCmd) return;

      const command = m.body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
      const args = m.body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const isOwner = ownerNumber.includes(senderNumber);

      // Mode restrictions
      if (!isOwner && config.MODE === "private") return;
      if (!isOwner && m.isGroup && config.MODE === "inbox") return;
      if (!isOwner && !m.isGroup && config.MODE === "groups") return;

      // Owner eval commands
      if (isOwner && m.body.startsWith(">")) {
        try {
          let evaled = eval(m.body.slice(1));
          if (typeof evaled !== "string") evaled = util.inspect(evaled);
          m.reply(evaled);
        } catch (e) {
          m.reply(e.toString());
        }
        return;
      }

      const cmdData = commands.find(
        (c) => c.pattern === command || (c.alias && c.alias.includes(command))
      );
      if (!cmdData) return;

      if (cmdData.react && config.AUTO_REACT === "true") {
        await sock.sendMessage(m.chat, { react: { text: cmdData.react, key: m.key } });
      }

      try {
        await cmdData.function(sock, m, { args, q, command, prefix, isOwner, reply: m.reply });
      } catch (err) {
        console.error(err);
        m.reply("❌ Error executing command.");
      }
    } catch (e) {
      console.error("Message handler error:", e);
    }
  });

  // ───── Commands ─────

  cmd(
    {
      pattern: "ping",
      desc: "Check bot status",
      react: "🏓",
    },
    async (conn, m, { reply }) => {
      const latency = Date.now() - m.messageTimestamp * 1000;
      await reply(`🏓 Pong!\nLatency: ${latency}ms`);
    }
  );

  cmd(
    {
      pattern: "menu",
      desc: "Show menu with buttons",
      react: "📜",
    },
    async (conn, m) => {
      const buttons = [
        { buttonId: `${prefix}ping`, buttonText: { displayText: "🏓 Ping" }, type: 1 },
        {
          buttonId: `${prefix}song https://youtu.be/dQw4w9WgXcQ`,
          buttonText: { displayText: "🎵 Song Download" },
          type: 1,
        },
        { buttonId: `${prefix}restart`, buttonText: { displayText: "♻️ Restart Bot" }, type: 1 },
      ];

      const buttonMessage = {
        text: `*🤖 Manisha-MD Bot Menu*`,
        footer: `Select a button below`,
        buttons: buttons,
        headerType: 1,
      };

      await conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }
  );

  cmd(
    {
      pattern: "song",
      desc: "Download YouTube audio",
      react: "🎵",
      category: "download",
    },
    async (conn, m, { reply, args }) => {
      const url = args[0];
      if (!url) return reply("❌ Please provide a YouTube URL.");
      if (!ytdl.validateURL(url)) return reply("❌ Invalid YouTube URL.");

      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        await reply(`🎵 Downloading: *${title}*`);

        const audioStream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });

        await conn.sendMessage(
          m.chat,
          {
            audio: audioStream,
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            contextInfo: {
              externalAdReply: {
                title,
                mediaType: 2,
                mediaUrl: url,
                thumbnailUrl: info.videoDetails.thumbnails[0].url,
                sourceUrl: url,
              },
            },
          },
          { quoted: m }
        );
      } catch (err) {
        console.error(err);
        await reply("❌ Failed to download audio.");
      }
    }
  );

  cmd(
    {
      pattern: "restart",
      desc: "Restart the bot",
      react: "♻️",
      category: "owner",
    },
    async (conn, m, { reply, isOwner }) => {
      if (!isOwner) return reply("❌ Only the owner can use this command.");
      await reply("♻️ Restarting bot...");
      await sleep(1000);
      process.exit(1);
    }
  );
}

app.get("/", (req, res) => {
  res.send("✅ Manisha-MD Bot Server is running...");
});

app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});

(async () => {
  await prepareSession();
  await connectToWA();
})();