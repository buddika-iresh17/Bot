const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "Zq0wFBzS#5T_Rm0JCr5duBvnOe1BsBR4v9iseaeAajjF2m_K_PNI",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "94721551183",
    PREFIX: process.env.PREFIX || ".",
    MOVIE_API_KEY: process.env.MOVIE_API_KEY || "sky|decd54b4fa030634e54d6c87fdffbb95f0bb9fb5"
    };
    
