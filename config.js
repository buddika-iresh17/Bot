const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "Zq0wFBzS#5T_Rm0JCr5duBvnOe1BsBR4v9iseaeAajjF2m_K_PNI",
    MODE: process.env.MODE || "private",
    PREFIX: process.env.PREFIX || "."
    };
    
