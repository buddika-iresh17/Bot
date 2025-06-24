const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  jidNormalizedUser,
  getContentType,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const { File } = require("megajs");
const express = require("express");
const util = require("util");
const ytdl = require("ytdl-core");
const axios = require("axios");
const config = require("./config");

const prefix = config.PREFIX;
const ownerNumber = ["94721551183"];
const app = express();
const port = process.env.PORT || 8000;
const commands = [];

// Command registration
function cmd(info, func) {
  const data = info;
  data.function = func;
  if (!data.dontAddCommandList) data.dontAddCommandList = false;
  if (!info.desc) info.desc = "";
  if (!data.fromMe) data.fromMe = false;
  if (!info.category) data.category = "misc";
  if (!info.filename) data.filename = "index.js";
  commands.push(data);
  return data;
}

// Utility functions
const getBuffer = async (url, options) => {
  try {
    options ? options : {};
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
  return participants.filter((p) => p.admin !== null).map((p) => p.id);
};

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

const runtime = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + "d, " : ""}${h > 0 ? h + "h, " : ""}${m > 0 ? m + "m, " : ""}${s}s`;
};

const isUrl = (url) =>
  url.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/gi);

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options) => {
  try {
    options ? options : {};
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

// Fixed session download
async function prepareSession() {
  if (!fs.existsSync("./creds.json")) {
    if (!config.SESSION_ID) {
      console.log("🌀 Please add your session id ! 😥...");
      process.exit(1);
    }

    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);

    try {
      const stream = await filer.download();
      const writeStream = fs.createWriteStream("./creds.json");

      stream.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      console.log("🌀 Session downloaded successfully from MEGA 📥...");
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
    auth: state,
    version,
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Bot connected successfully!");

      await sock.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: "https://files.catbox.moe/vbi10j.png" },
        caption: `✅ Bot Connected Successfully!\nPrefix: ${prefix}\nMode: ${config.MODE}\nOwner: ${ownerNumber[0]}\nBot by Manisha Sasmitha`,
      });
    }

    if (connection === "close") {
      console.log("❌ Disconnected. Reconnecting...");
      setTimeout(connectToWA, 3000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const mek = messages[0];
    if (!mek.message) return;

    const type = getContentType(mek.message);
    const from = mek.key.remoteJid;
    const body =
      type === "conversation"
        ? mek.message.conversation || ""
        : type === "extendedTextMessage"
        ? mek.message.extendedTextMessage.text || ""
        : type === "imageMessage"
        ? mek.message.imageMessage.caption || ""
        : type === "videoMessage"
        ? mek.message.videoMessage.caption || ""
        : "";

    if (!body) return;

    const isCmd = body.startsWith(prefix);
    const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(" ");
    const sender = mek.key.fromMe ? sock.user.id : mek.key.participant || from;
    const senderNumber = sender.split("@")[0];
    const isGroup = from.endsWith("@g.us");
    const pushname = mek.pushName || "No Name";
    const botNumber = sock.user.id.split(":")[0];
    const botNumber2 = await jidNormalizedUser(sock.user.id);
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;

    let groupMetadata = {};
    let groupAdmins = [];
    let isAdmins = false;
    let isBotAdmins = false;
    let participants = [];
    let groupName = "";

    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        participants = groupMetadata.participants;
        groupAdmins = participants.filter((p) => p.admin !== null).map((p) => p.id);
        groupName = groupMetadata.subject;
        isAdmins = groupAdmins.includes(sender);
        isBotAdmins = groupAdmins.includes(botNumber2);
      } catch {}
    }

    const reply = (text) => sock.sendMessage(from, { text }, { quoted: mek });

    // Mode checks
    if (!isOwner && config.MODE === "private") return;
    if (!isOwner && isGroup && config.MODE === "inbox") return;
    if (!isOwner && !isGroup && config.MODE === "groups") return;

    // Owner terminal eval
    if (isOwner && body.startsWith(">")) {
      try {
        let code = body.slice(1).trim();
        let evaled = eval(code);
        if (typeof evaled !== "string") evaled = util.inspect(evaled);
        reply(evaled);
      } catch (err) {
        reply(err.toString());
      }
      return;
    }

    if (isOwner && body.startsWith("$")) {
      try {
        let code = body.slice(1).trim();
        let evaled = await eval(`(async () => { ${code} })()`);
        if (typeof evaled !== "string") evaled = util.inspect(evaled);
        reply(evaled);
      } catch (err) {
        reply(err.toString());
      }
      return;
    }

    const cmdData =
      isCmd &&
      (commands.find((cmd) => cmd.pattern === commandName) ||
        commands.find((cmd) => cmd.alias && cmd.alias.includes(commandName)));

    if (cmdData) {
      if (cmdData.react) sock.sendMessage(from, { react: { text: cmdData.react, key: mek.key } });

      try {
        await cmdData.function(sock, mek, {
          from,
          body,
          command: commandName,
          args,
          q,
          isCmd,
          sender,
          senderNumber,
          pushname,
          botNumber,
          botNumber2,
          isMe,
          isOwner,
          isGroup,
          groupMetadata,
          groupName,
          participants,
          groupAdmins,
          isAdmins,
          isBotAdmins,
          reply,
        });
      } catch (err) {
        console.error("[PLUGIN ERROR]:", err);
      }
    }
  });
}

// ======= COMMANDS =======

cmd(
  {
    pattern: "ping",
    desc: "Check bot status",
    category: "main",
    react: "🏓",
  },
  async (conn, m, { reply }) => {
    const latency = Date.now() - m.messageTimestamp * 1000;
    reply(`🏓 Pong!\nLatency: ${latency}ms`);
  }
);

cmd(
  {
    pattern: "menu",
    desc: "Bot button menu",
    category: "main",
    react: "📜",
  },
  async (conn, m, { from }) => {
    const buttons = [
      { buttonId: `${prefix}ping`, buttonText: { displayText: "🏓 Ping" }, type: 1 },
      { buttonId: `${prefix}song https://youtu.be/dQw4w9WgXcQ`, buttonText: { displayText: "🎵 Song Download" }, type: 1 },
    ];
    const buttonMessage = {
      text: `*🤖 Manisha-MD Bot Menu*`,
      footer: `Select a button below`,
      buttons: buttons,
      headerType: 1,
    };
    await conn.sendMessage(from, buttonMessage, { quoted: m });
  }
);

cmd(
  {
    pattern: "song",
    desc: "Download YouTube audio",
    category: "download",
    react: "🎵",
  },
  async (conn, m, { reply, args, from }) => {
    const url = args[0];
    if (!url) return reply("❌ Provide a YouTube link.");
    if (!ytdl.validateURL(url)) return reply("❌ Invalid YouTube URL.");

    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      reply(`🎵 Downloading: *${title}*`);

      const audioStream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });

      await conn.sendMessage(
        from,
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
      reply("❌ Error downloading audio.");
    }
  }
);
//============

// === Express Server ===
app.get("/", (req, res) => {
  res.send("✅ Manisha-MD Bot is online...");
});

app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});

// === Start Bot ===
(async () => {
  await prepareSession();
  await connectToWA();
})();