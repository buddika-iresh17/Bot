const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "VykXxIqT#hQhWQdmK_chRK82q0-jXlVdM3ufVM8T-i4JEA9UbnAI",
    MODE: process.env.MODE || "public",
    PREFIX: process.env.PREFIX || ".",
    MOVIE_API_KEY: process.env.MOVIE_API_KEY || "sky|decd54b4fa030634e54d6c87fdffbb95f0bb9fb5",
    };
    
