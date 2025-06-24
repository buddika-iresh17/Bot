// Manisha-MD - WhatsApp Bot
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  downloadContentFromMessage,
  getContentType,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const express = require("express");
const util = require("util");
const { File } = require("megajs");
const axios = require("axios");
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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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

  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.log("✅ Bot connected successfully!");
      const up = `╔═══╣❍ᴍᴀɴɪꜱʜᴀ-ᴍᴅ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version: v1.0.0
╠➢ 👑 Owner  : [94721551183]
╠➢ 🛠️ Created By: Manisha Sasmitha
╠➢ 🧠 Framework : Node.js + Baileys
╚═════════════════════⫸`;
      await sock.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `https://files.catbox.moe/vbi10j.png` },
        caption: up,
      });
    }
    if (connection === "close") {
      console.log("❌ Connection closed. Reconnecting...");
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

      if (senderNumber.includes("94721551183") && !isReact) {
        const ownerReacts = ["👑", "💀", "📊", "⚙️", "🧠", "🎯", "💥", "🏆"];
        const randomOwnerReaction = ownerReacts[Math.floor(Math.random() * ownerReacts.length)];
        m.react(randomOwnerReaction);
      }

      if (!isReact && config.AUTO_REACT === "true") {
        const publicReacts = ["🌼", "❤️", "💐", "🔥", "🏵️", "❄️", "💥"];
        const randomPublicReaction = publicReacts[Math.floor(Math.random() * publicReacts.length)];
        m.react(randomPublicReaction);
      }

      const isCmd = m.body.startsWith(prefix);
      if (!isCmd) return;

      const command = m.body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
      const args = m.body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const isOwner = ownerNumber.includes(senderNumber);

      if (!isOwner && config.MODE === "private") return;
      if (!isOwner && m.isGroup && config.MODE === "inbox") return;
      if (!isOwner && !m.isGroup && config.MODE === "groups") return;

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

  // ───── AUTO STATUS HANDLER ─────
  sock.ev.on("status.update", async ({ statuses }) => {
    if (!statuses || statuses.length === 0) return;

    for (const status of statuses) {
      try {
        const jid = status.id;
        const statusMsg = status.text || "🌀 Status update";

        if (config.AUTO_STATUS_SEEN === "true") {
          await sock.readMessages([{ remoteJid: jid, id: status.key?.id || "", fromMe: false }]);
        }

        if (config.AUTO_STATUS_REPLY === "true") {
          await sock.sendMessage(jid, {
            text: `🤖 Auto-reply:\nHey, I saw your status!\n\nMessage: ${statusMsg}`,
          });
        }

        if (config.AUTO_STATUS_REACT === "true") {
          const emojis = ["🔥", "💗", "❤️", "🥵", "🥰", "😎", "👍"];
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          await sock.sendMessage(jid, {
            react: {
              text: randomEmoji,
              key: { id: status.key.id, remoteJid: jid, fromMe: false },
            },
          });
        }
      } catch (err) {
        console.error("❌ Status handler error:", err);
      }
    }
  });

  // ───── COMMANDS ─────
  cmd(
    { pattern: "ping", desc: "Check bot status", react: "🏓" },
    async (conn, m, { reply }) => {
      const latency = Date.now() - m.messageTimestamp * 1000;
      reply(`🏓 Pong!\nLatency: ${latency}ms`);
    }
  );

  

  cmd(
    {
      pattern: "restart",
      desc: "Restart bot",
      react: "♻️",
      category: "owner",
    },
    async (conn, m, { reply, isOwner }) => {
      if (!isOwner) return reply("❌ Only owner can use this.");
      reply("♻️ Restarting...");
      await sleep(1000);
      process.exit(1);
    }
  );
  
  cmd(
  {
    pattern: "song",
    desc: "Download YouTube audio by name or URL",
    react: "🎧",
    category: "download",
  },
  async (conn, m, { reply, args }) => {
    const q = args.join(" ");
    if (!q) return reply("❌ Please provide a song name or YouTube URL.");

    let videoUrl;

    // If input is URL, use it
    if (q.includes("youtube.com") || q.includes("youtu.be")) {
      videoUrl = q;
    } else {
      try {
        // Else, search YouTube and get first result
        reply(`🔍 Searching YouTube for: *${q}*`);
        const ytSearch = await fetchJson(`https://youtube-scrape.deno.dev/search?query=${encodeURIComponent(q)}`);
        const result = ytSearch?.videos?.[0];
        if (!result) return reply("❌ No results found.");
        videoUrl = `https://www.youtube.com/watch?v=${result.id}`;
      } catch (e) {
        console.error(e);
        return reply("❌ Failed to search YouTube.");
      }
    }

    try {
      reply("⏳ Fetching audio...");
      const res = await axios.get(`https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(videoUrl)}`);
      if (!res.data || !res.data.url) return reply("❌ Failed to fetch audio from API.");

      const audioBuffer = await getBuffer(res.data.url);
      await conn.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${res.data.title || "audio"}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: res.data.title || "YouTube Audio",
              mediaType: 2,
              mediaUrl: videoUrl,
              sourceUrl: videoUrl,
              thumbnailUrl: res.data.thumbnail,
            },
          },
        },
        { quoted: m }
      );
    } catch (err) {
      console.error(err);
      reply("❌ Error downloading the song.");
    }
  }
);
  
  cmd(
  {
    pattern: "recover",
    desc: "Recover view-once image or video",
    react: "🔓",
    category: "tools",
  },
  async (conn, m, { reply }) => {
    if (!m.quoted) return reply("❌ Reply to a view-once image or video.");
    
    const quoted = sms(conn, m.quoted);
    if (quoted.type !== "viewOnceMessage") return reply("❌ Not a view-once message.");

    try {
      const actualType = getContentType(quoted.msg.message);
      const media = quoted.msg.message[actualType];
      const stream = await downloadContentFromMessage(media, actualType.replace("Message", ""));
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      if (actualType === "imageMessage") {
        await conn.sendMessage(m.chat, { image: buffer }, { quoted: m });
      } else if (actualType === "videoMessage") {
        await conn.sendMessage(m.chat, { video: buffer }, { quoted: m });
      } else {
        return reply("❌ Unsupported media type.");
      }
    } catch (e) {
      console.error(e);
      reply("❌ Failed to recover media.");
    }
  }
);

  cmd(
    {
      pattern: "statusseen",
      desc: "Toggle auto status seen (on/off)",
      react: "👀",
      category: "owner",
    },
    async (conn, m, { reply, args, isOwner }) => {
      if (!isOwner) return reply("❌ Only owner can toggle this.");
      const arg = args[0]?.toLowerCase();
      if (!["on", "off"].includes(arg)) return reply("Usage: .statusseen on/off");
      config.AUTO_STATUS_SEEN = arg === "on" ? "true" : "false";
      reply(`✅ Auto status seen set to *${arg}*`);
    }
  );
  //===
}
//==

app.get("/", (req, res) => {
  res.send("✅ Manisha-MD Bot Server is running...");
});

app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});

(async () => {
  await prepareSession();
  await connectToWA();
})();