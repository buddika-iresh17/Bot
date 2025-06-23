const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const ytdl = require("ytdl-core");
const fs = require("fs");
const P = require("pino");
const express = require("express");
const { File } = require("megajs");
const config = require("./config");

const prefix = config.PREFIX;
const ownerNumber = config.OWNER_NUM;

const app = express();
const port = process.env.PORT || 8000;

// In-memory database for antilink and antidelete toggle per group (replace with DB in prod)
const antilinkGroups = new Set();    // Groups with antilink ON
const antideleteGroups = new Set();  // Groups with antidelete ON

// Store deleted messages temporarily for antidelete
const deletedMessages = new Map();  // key: msgId, value: { from, sender, message }

// =============== SESSION AUTH ===============
if (!fs.existsSync('./creds.json')) {
  if (!config.SESSION_ID) return console.log("🌀 Please add your session id ! 😥...");
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile('./creds.json', data, () => {
      console.log("✅ Session Downloaded.");
    });
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

  // Auto status seen if enabled
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

  // Listen for deleted messages (antidelete)
  sock.ev.on("messages.delete", async (messageDeletes) => {
    for (const m of messageDeletes) {
      // Only handle group messages & antidelete enabled
      const from = m.key.remoteJid;
      if (
        from &&
        from.endsWith("@g.us") &&
        antideleteGroups.has(from)
      ) {
        try {
          const deletedMsg = m;
          if (deletedMsg.message) {
            // Store deleted message
            deletedMessages.set(m.key.id, {
              from,
              sender: m.key.participant || m.key.remoteJid,
              message: deletedMsg.message,
            });
            // Resend the deleted message content to group
            await sock.sendMessage(from, {
              text:
                `🚫 Someone deleted a message!\n\n` +
                `Sender: @${(m.key.participant || m.key.remoteJid).split("@")[0]}\n` +
                `Message:\n` +
                formatMessage(deletedMsg.message),
              mentions: [(m.key.participant || m.key.remoteJid)],
            });
          }
        } catch (e) {
          console.error("Error handling antidelete:", e);
        }
      }
    }
  });

  // Listen for new messages (antilink + commands + download)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = msg.key.participant || from;

    // ANTI LINK
    if (isGroup && antilinkGroups.has(from)) {
      const text = extractText(msg.message);
      if (text && isLink(text)) {
        // If message contains WhatsApp group invite link
        if (/(chat.whatsapp.com\/)/i.test(text)) {
          await sock.sendMessage(from, {
            text: `⚠️ *AntiLink is active!*\nLink sending is not allowed here.\nMessage removed!`,
            mentions: [sender],
          });
          // Delete the offending message
          await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } });
          return;
        }
      }
    }

    // Handle commands
    let body = "";
    const type = Object.keys(msg.message)[0];

    if (type === "conversation") {
      body = msg.message.conversation;
    } else if (type === "extendedTextMessage") {
      body = msg.message.extendedTextMessage.text;
    } else if (type === "imageMessage") {
      body = msg.message.imageMessage.caption || "";
    } else if (type === "videoMessage") {
      body = msg.message.videoMessage.caption || "";
    } else if (type === "documentMessage") {
      body = msg.message.documentMessage.caption || "";
    }

    if (!body.startsWith(prefix)) return;

    const commandBody = body.slice(prefix.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    try {
      if (command === "antilink") {
        if (!isGroup) return await sock.sendMessage(from, { text: "This command is only for groups." });
        if (args[0] === "on") {
          antilinkGroups.add(from);
          await sock.sendMessage(from, { text: "✅ AntiLink is now *ON* for this group." });
        } else if (args[0] === "off") {
          antilinkGroups.delete(from);
          await sock.sendMessage(from, { text: "❌ AntiLink is now *OFF* for this group." });
        } else {
          await sock.sendMessage(from, { text: "Usage: .antilink on/off" });
        }
      } else if (command === "antidelete") {
        if (!isGroup) return await sock.sendMessage(from, { text: "This command is only for groups." });
        if (args[0] === "on") {
          antideleteGroups.add(from);
          await sock.sendMessage(from, { text: "✅ AntiDelete is now *ON* for this group." });
        } else if (args[0] === "off") {
          antideleteGroups.delete(from);
          await sock.sendMessage(from, { text: "❌ AntiDelete is now *OFF* for this group." });
        } else {
          await sock.sendMessage(from, { text: "Usage: .antidelete on/off" });
        }
      }

      // You can add more commands here (song, video, ping, etc)

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: "❌ Error executing command." });
    }
  });

  // CONNECTION UPDATE HANDLER
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ BOT Connected Successfully!");

      // Send button message to owner on connect
      await sock.sendMessage(ownerNumber + "@s.whatsapp.net", {
        image: {
          url: "https://raw.githubusercontent.com/Dark-Robin/Bot-Helper/refs/heads/main/autoimage/Bot%20robin%20cs.jpg"
        },
        caption: "❤️ *ROBIN Bot connected successfully!*",
        footer: "🔘 Powered by RobinBot",
        templateButtons: [
          {
            index: 1,
            urlButton: {
              displayText: "💠 Visit GitHub",
              url: "https://github.com/Dark-Robin"
            }
          },
          {
            index: 2,
            callButton: {
              displayText: "📞 Contact Owner",
              phoneNumber: ownerNumber
            }
          },
          {
            index: 3,
            quickReplyButton: {
              displayText: "📂 Menu",
              id: prefix + "menu"
            }
          }
        ]
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

// Helper: extract plain text from message object
function extractText(message) {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return message.imageMessage.caption || "";
  if (message.videoMessage) return message.videoMessage.caption || "";
  if (message.documentMessage) return message.documentMessage.caption || "";
  return "";
}

// Helper: detect if text contains any link (simplified)
function isLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return urlRegex.test(text);
}

// Helper: format message object to readable string (for antidelete)
function formatMessage(message) {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return "<Image>";
  if (message.videoMessage) return "<Video>";
  if (message.stickerMessage) return "<Sticker>";
  if (message.documentMessage) return "<Document>";
  return "<Message>";
}

// EXPRESS SERVER
const expressApp = express();
expressApp.get("/", (req, res) => {
  res.send("❤️ ROBIN Bot Server Running ✅");
});
expressApp.listen(port, () => console.log(`🌐 Server listening on http://localhost:${port}`));

setTimeout(connectToWA, 4000);