const axios = require('axios');
const { GoogleGenAI } = require('@google/generative-ai');

(async () => {
    try {
        console.log("Testing connection to google.com...");
        const resGoogle = await axios.get('https://google.com', { timeout: 5000 });
        console.log("google.com status:", resGoogle.status);
    } catch (e) {
        console.error("google.com failed:", e.message);
    }

    try {
        console.log("Testing connection to serpapi.com (no key, just ping)...");
        const resSerp = await axios.get('https://serpapi.com', { timeout: 5000 });
        console.log("serpapi.com status:", resSerp.status);
    } catch (e) {
        console.error("serpapi.com failed:", e.message);
    }
})();
