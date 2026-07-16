const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
    console.error('Không tìm thấy DEEPSEEK_API_KEY trong .env');
    process.exit(1);
}

(async () => {
    console.log('=== Test DeepSeek API Connection ===');
    console.log('Using API Key:', apiKey.substring(0, 8) + '...');

    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [
                { role: 'user', content: 'Trả lời ngắn gọn trong 5 từ: 1 + 1 bằng mấy?' }
            ],
            max_tokens: 50,
            temperature: 0.2
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 15000
        });

        console.log('HTTP status:', response.status);
        if (response.status === 200) {
            console.log('Phản hồi từ DeepSeek:', response.data.choices[0].message.content.trim());
            console.log('Usage:', response.data.usage);
            console.log('=== TEST SUCCESSFUL ===');
        } else {
            console.error('Lỗi API:', response.status, response.data);
        }
    } catch (error) {
        console.error('Request failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
})();
