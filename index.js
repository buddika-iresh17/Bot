const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys"); // ⚠️ If you get npm errors, consider switching to @adiwajshing/baileys

const ytdl = require("ytdl-core");
const fs = require("fs");
const P = require("pino");
const express = require("express");
const { File } = require("megajs");
const { exec } = require("child_process");
const config = require("./config");

const prefix = config.PREFIX || ".";
const ownerNumber = (config.OWNER_NUM || "").replace(/[^0-9]/g, ""); // sanitize

const app = express();
const port = process.env.PORT || 8000;

const antilinkGroups = new Set();
const antideleteGroups = new Set();
const deletedMessages = new Map();

if (!fs.existsSync("./creds.json")) {
  if (!config.SESSION_ID) {
    console.log("🌀 Please add your session id in config! 😥");
    process.exit(1); // Exit if no session id
  }
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFileSync("./creds.json", data);
    console.log("✅ Session Downloaded.");
  });
}

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState("./");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version,
  });

  // Auto status seen (optional)
  if (config.AUTO_STATUS_SEEN) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        try {
          if (
            msg.key.remoteJid?.includes("status@broadcast") &&
            !msg.key.fromMe
          ) {
            await sock.readMessages([msg.key]);
            console.log("👀 Auto Viewed Status from:", msg.pushName || msg.key.participant);
          }
        } catch (e) {
          console.error("Error viewing status:", e);
        }
      }
    });
  }

  // Handle deleted messages (antidelete)
  sock.ev.on("messages.delete", async (messageDeletes) => {
    for (const m of messageDeletes) {
      const from = m.key.remoteJid;
      if (
        from &&
        from.endsWith("@g.us") &&
        antideleteGroups.has(from)
      ) {
        try {
          if (m.message) {
            deletedMessages.set(m.key.id, {
              from,
              sender: m.key.participant || m.key.remoteJid,
              message: m.message,
            });
            await sock.sendMessage(from, {
              text:
                `🚫 Someone deleted a message!\n\n` +
                `Sender: @${(m.key.participant || m.key.remoteJid).split("@")[0]}\n` +
                `Message:\n` +
                formatMessage(m.message),
              mentions: [(m.key.participant || m.key.remoteJid)],
            });
          }
        } catch (e) {
          console.error("Error handling antidelete:", e);
        }
      }
    }
  });

  // Message handler: antilink + commands
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = msg.key.participant || from;

    // Extract text from message
    const body = extractText(msg.message);
    if (!body) return;

    // ANTI LINK
    if (isGroup && antilinkGroups.has(from)) {
      if (isLink(body) && /(chat.whatsapp.com\/)/i.test(body)) {
        await sock.sendMessage(from, {
          text: `⚠️ *AntiLink is active!*\nLink sending is not allowed here.\nMessage removed!`,
          mentions: [sender],
        });
        // Delete offending message
        await sock.sendMessage(from, {
          delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender },
        });
        return;
      }
    }

    // COMMANDS
    if (!body.startsWith(prefix)) return;

    const commandBody = body.slice(prefix.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    try {
      switch (command) {
        case "antilink":
          if (!isGroup) {
            await sock.sendMessage(from, { text: "This command is only for groups." });
            return;
          }
          if (args[0] === "on") {
            antilinkGroups.add(from);
            await sock.sendMessage(from, { text: "✅ AntiLink is now *ON* for this group." });
          } else if (args[0] === "off") {
            antilinkGroups.delete(from);
            await sock.sendMessage(from, { text: "❌ AntiLink is now *OFF* for this group." });
          } else {
            await sock.sendMessage(from, { text: "Usage: .antilink on/off" });
          }
          break;

        case "antidelete":
          if (!isGroup) {
            await sock.sendMessage(from, { text: "This command is only for groups." });
            return;
          }
          if (args[0] === "on") {
            antideleteGroups.add(from);
            await sock.sendMessage(from, { text: "✅ AntiDelete is now *ON* for this group." });
          } else if (args[0] === "off") {
            antideleteGroups.delete(from);
            await sock.sendMessage(from, { text: "❌ AntiDelete is now *OFF* for this group." });
          } else {
            await sock.sendMessage(from, { text: "Usage: .antidelete on/off" });
          }
          break;

        case "restart":
          if (sender !== ownerNumber + "@s.whatsapp.net") {
            await sock.sendMessage(from, { text: "❌ Only owner can use this command." });
            return;
          }
          await sock.sendMessage(from, { text: "🔄 Restarting bot now..." });
          exec("pm2 restart all", (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`pm2 restart stdout: ${stdout}`);
            if (stderr) console.error(`pm2 restart stderr: ${stderr}`);
          });
          break;

        // Add more commands here

        default:
          await sock.sendMessage(from, { text: `❓ Unknown command: ${command}` });
      }
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: "❌ Error executing command." });
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ BOT Connected Successfully!");
      await sock.sendMessage(ownerNumber + "@s.whatsapp.net", {
        image: {
          url: "https://raw.githubusercontent.com/Dark-Robin/Bot-Helper/refs/heads/main/autoimage/Bot%20robin%20cs.jpg",
        },
        caption: "❤️ *ROBIN Bot connected successfully!*",
        footer: "🔘 Powered by RobinBot",
        templateButtons: [
          {
            index: 1,
            urlButton: {
              displayText: "💠 Visit GitHub",
              url: "https://github.com/Dark-Robin",
            },
          },
          {
            index: 2,
            callButton: {
              displayText: "📞 Contact Owner",
              phoneNumber: ownerNumber,
            },
          },
          {
            index: 3,
            quickReplyButton: {
              displayText: "📂 Menu",
              id: prefix + "menu",
            },
          },
        ],
      });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Disconnected. Reconnecting...", reason);
      setTimeout(connectToWA, 3000);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

function extractText(message) {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return message.imageMessage.caption || "";
  if (message.videoMessage) return message.videoMessage.caption || "";
  if (message.documentMessage) return message.documentMessage.caption || "";
  return "";
}

function isLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return urlRegex.test(text);
}

function formatMessage(message) {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return "<Image>";
  if (message.videoMessage) return "<Video>";
  if (message.stickerMessage) return "<Sticker>";
  if (message.documentMessage) return "<Document>";
  return "<Message>";
}

app.get("/", (req, res) => {
  res.send("❤️ ROBIN Bot Server Running ✅");
});
app.listen(port, () => console.log(`🌐 Server listening on http://localhost:${port}`));

setTimeout(connectToWA, 4000);