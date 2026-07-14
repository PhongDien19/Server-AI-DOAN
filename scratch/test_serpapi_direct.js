const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
    const apiKey = process.env.SERPAPI_API_KEY;
    console.log("Using API Key:", apiKey);
    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google',
                q: 'test',
                api_key: apiKey,
                num: 1
            },
            timeout: 10000
        });
        console.log("Status:", response.status);
        console.log("Data keys:", Object.keys(response.data));
        if (response.data.error) {
            console.log("Error from SerpAPI:", response.data.error);
        } else {
            console.log("Organic results count:", response.data.organic_results?.length);
        }
    } catch (error) {
        console.error("Direct request failed:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
})();
