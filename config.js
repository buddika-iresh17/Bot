const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "VykXxIqT#hQhWQdmK_chRK82q0-jXlVdM3ufVM8T-i4JEA9UbnAI",
    MODE: process.env.MODE || "public",
    PREFIX: process.env.PREFIX || ".",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "94721551183",
    ANTIDELETE: process.env.ANTIDELETE || "true",
    READ_MESSAGE: process.env.READ_MESSAGE || "false",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "false",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/vbi10j.png"
    };
    
