const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const express = require("express");
const { File } = require("megajs");
const { exec } = require("child_process");
const config = require("./config");

const prefix = config.PREFIX || ".";

function normalizeJid(jid) {
  if (!jid) return "";
  return jid.endsWith("@s.whatsapp.net") ? jid : jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
}
const ownerNumber = normalizeJid(config.OWNER_NUMBER || "");
const app = express();
const port = process.env.PORT || 8000;

const antilinkGroups = new Set();
const antideleteGroups = new Set();
const deletedMessages = new Map();
let buttonsEnabled = config.BUTTONS_ON ?? true;

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

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = normalizeJid(msg.key.participant || from);
    const isOwner = sender === ownerNumber || sender.includes(ownerNumber.split("@")[0]);
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
        case "restart":
          if (!isOwner) return sock.sendMessage(from, { text: "❌ Owner only." });
          sock.sendMessage(from, { text: "🔄 Restarting bot..." });
          exec("pm2 restart all");
          break;

        case "eval":
          if (!isOwner) return sock.sendMessage(from, { text: "❌ Owner only." });
          try {
            let evaled = eval(args.join(" "));
            if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
            sock.sendMessage(from, { text: `✅ Result:\n\n${evaled}` });
          } catch (err) {
            sock.sendMessage(from, { text: `❌ Error:\n\n${err}` });
          }
          break;

        case "buttons":
          if (!isOwner) return sock.sendMessage(from, { text: "❌ Owner only." });
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
        case "help":
          if (buttonsEnabled) {
            await sock.sendMessage(from, {
              text: "📜 *manisha-md Bot Menu*",
              footer: "🔘 Powered by manisha coder",
              buttons: [
                { buttonId: prefix + "download https://youtu.be/dQw4w9WgXcQ", buttonText: { displayText: "🎥 Download Example" }, type: 1 },
                { buttonId: prefix + "antilink on", buttonText: { displayText: "🚫 AntiLink On" }, type: 1 },
                { buttonId: prefix + "antidelete on", buttonText: { displayText: "🗑 AntiDelete On" }, type: 1 },
                { buttonId: prefix + "ping", buttonText: { displayText: "🏓 Ping" }, type: 1 },
                { buttonId: prefix + "joke", buttonText: { displayText: "😂 Joke" }, type: 1 },
              ],
              headerType: 1,
            });
          } else {
            await sock.sendMessage(from, {
              text: "📜 *manisha-md Bot Menu*\n\nUse `.buttons on` to enable buttons.",
            });
          }
          break;

        case "ping":
          const latency = Date.now() - msg.messageTimestamp * 1000;
          await sock.sendMessage(from, { text: `🏓 Pong!\nLatency: ${latency}ms` });
          break;

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

        case "animegif":
          await sock.sendMessage(from, {
            video: { url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.mp4" },
            caption: "✨ Here's an anime gif for you!"
          });
          break;

        case "joke":
          await sock.sendMessage(from, { text: "😂 Why did the scarecrow win an award? Because he was outstanding in his field!" });
          break;

        case "meme":
          await sock.sendMessage(from, {
            image: { url: "https://i.imgflip.com/30b1gx.jpg" },
            caption: "🤣 Here's a meme for you!"
          });
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

// Helper functions
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

app.get("/", (req, res) => {
  res.send("❤️ manisha-md Bot Server Running ✅");
});
app.listen(port, () => console.log(`🌐 Server running at http://localhost:${port}`));