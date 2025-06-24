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
const ownerNumber = config.OWNER_NUMBER; // owner number array

const app = express();
const port = process.env.PORT || 8000;

const commands = [];
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

const getBuffer = async (url, options = {}) => {
  try {
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
    console.error(e);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const prepareSession = async () => {
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
};

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

      const up = `╔═══╣❍ MANISHA-MD ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠════════════➢
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version : v1.0.0
╠➢ 👑 Owner  : [${ownerNumber[0]}]
╠➢ 🛠️ Created By: Manisha Sasmitha
╠➢ 🧠 Framework : Node.js + Baileys
╠═══════════════════➢
║ 📜 Bot Description:  
╠════════════➢
║ MANISHA-MD is a powerful multipurpose WhatsApp bot
║ built for automation, moderation, entertainment,
║ AI integration, and more. Supports modular
║ plugins, auto-replies, media tools, group protection,
║ and developer APIs.
╚═════════════════════⫸`;

      await sock.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: config.ALIVE_IMG },
        caption: up,
      });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || "Unknown";
      console.log("❌ Connection closed, reconnecting... Reason:", reason);
      setTimeout(connectToWA, 3000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    try {
      const mek = m.messages[0];
      if (!mek.message) return;

      const msgType = getContentType(mek.message);
      if (msgType === "ephemeralMessage") {
        mek.message = mek.message.ephemeralMessage.message;
      }
      if (mek.message.viewOnceMessage) {
        mek.message = mek.message.viewOnceMessage.message;
      }

      const type = getContentType(mek.message);
      let body = "";

      if (type === "conversation") body = mek.message.conversation || "";
      else if (type === "extendedTextMessage") body = mek.message.extendedTextMessage.text || "";
      else if (type === "imageMessage") body = mek.message.imageMessage.caption || "";
      else if (type === "videoMessage") body = mek.message.videoMessage.caption || "";

      if (!body) return;

      const isCmd = body.startsWith(prefix);
      if (!isCmd) return;

      const from = mek.key.remoteJid;
      const command = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const sender = mek.key.fromMe ? sock.user.id : mek.key.participant || from;
      const senderNumber = sender.split("@")[0];
      const isGroup = from.endsWith("@g.us");
      const pushname = mek.pushName || "No Name";
      const botNumber = sock.user.id.split(":")[0];
      const botNumber2 = jidNormalizedUser(sock.user.id);
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

      // Mode restrictions
      if (!isOwner && config.MODE === "private") return;
      if (!isOwner && isGroup && config.MODE === "inbox") return;
      if (!isOwner && !isGroup && config.MODE === "groups") return;

      // Owner eval commands
      if (isOwner && body.startsWith(">")) {
        let code = body.slice(1).trim();
        if (!code) return reply("Please enter code to evaluate!");
        try {
          let evaled = eval(code);
          if (typeof evaled !== "string") evaled = util.inspect(evaled);
          reply(evaled);
        } catch (err) {
          reply(err.toString());
        }
        return;
      }

      if (isOwner && body.startsWith("$")) {
        let code = body.slice(1).trim();
        if (!code) return reply("Please enter code to execute!");
        try {
          let evaled = await eval(`(async () => { ${code} })()`);
          if (typeof evaled !== "string") evaled = util.inspect(evaled);
          reply(evaled);
        } catch (err) {
          reply(err.toString());
        }
        return;
      }

      // Find command
      const cmdData = commands.find(
        (c) => c.pattern === command || (c.alias && c.alias.includes(command))
      );
      if (!cmdData) return;

      if (cmdData.react && config.AUTO_REACT) {
        await sock.sendMessage(from, { react: { text: cmdData.react, key: mek.key } });
      }

      try {
        await cmdData.function(sock, mek, {
          from,
          body,
          command,
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
        await reply("❌ Error executing command.");
      }
    } catch (err) {
      console.error("Message handler error:", err);
    }
  });

  // Commands registration

  cmd(
    {
      pattern: "ping",
      desc: "Check bot status",
      category: "main",
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
      category: "main",
      react: "📜",
    },
    async (conn, m, { from }) => {
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
      if (!url) return reply("❌ Please provide a YouTube URL.");
      if (!ytdl.validateURL(url)) return reply("❌ Invalid YouTube URL.");

      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        await reply(`🎵 Downloading: *${title}*`);

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
        await reply("❌ Failed to download audio.");
      }
    }
  );

  cmd(
    {
      pattern: "restart",
      desc: "Restart the bot",
      category: "owner",
      react: "♻️",
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