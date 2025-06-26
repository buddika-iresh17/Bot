const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "VykXxIqT#hQhWQdmK_chRK82q0-jXlVdM3ufVM8T-i4JEA9UbnAI",
    MODE: process.env.MODE || "public",
    PREFIX: process.env.PREFIX || ".",
    ANTILINK: process.env.ANTILINK || "true",
    ANTIDELETE: process.env.ANTIDELETE || "true",
    READ_MESSAGE: process.env.READ_MESSAGE || "false",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "false",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    MOVIE_API_KEY: process.env.MOVIE_API_KEY || "sky|decd54b4fa030634e54d6c87fdffbb95f0bb9fb5",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/vbi10j.png",
    MENU_TYPE: process.env.MENU_TYPE || "true",
    };
    
