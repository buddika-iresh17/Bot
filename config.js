const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "Zq0wFBzS#5T_Rm0JCr5duBvnOe1BsBR4v9iseaeAajjF2m_K_PNI",
    BOT_MODE: process.env.BOT_MODE || "public",
    PREFIX: process.env.PREFIX || ".",
    READ_MESSAGE: process.env.READ_MESSAGE || "true",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "true",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
    ANTILINK: process.env.ANTILINK || "true",
    ANTIDELETE: process.env.ANTIDELETE || "true"
    };
    
