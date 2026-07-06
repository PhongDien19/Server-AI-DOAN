// Doc key tu .env de khong lo mau chua can in ra terminal
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('Khong tim thay GEMINI_API_KEY trong .env'); process.exit(1); }

const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 20000 }, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Timeout 20s')); });
    });
}

(async () => {
    // 1) Check key bang ListModels (rejects key neu sai)
    console.log('=== 1. ListModels ===');
    try {
        const r = await get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
        if (r.status !== 200) { console.log('Status:', r.status); console.log(r.body); process.exit(1); }
        const data = JSON.parse(r.body);
        const all = (data.models || []).map(m => m.name.replace('models/', ''));
        const flash = all.filter(n => n.toLowerCase().includes('flash') || n.toLowerCase().includes('pro') || n.toLowerCase().includes('nano'));
        console.log('Tong model kha dung:', all.length);
        console.log('Models lien quan (flash/pro/nano):', flash.slice(0, 12).join(', '));
        const has25 = all.some(n => n === 'gemini-2.5-flash');
        console.log('gemini-2.5-flash co mat trong list:', has25);
    } catch (e) { console.log('Loi ListModels:', e.message); }

    // 2) Test generateContent voi gemini-2.5-flash de biet con quota khong
    console.log('\n=== 2. Test generateContent gemini-2.5-flash ===');
    const body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Tra loi ngan gon: 1+1=?' }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.2 }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    try {
        const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 30000 }, (res) => {
            let buf = '';
            res.on('data', (c) => buf += c);
            res.on('end', () => {
                console.log('HTTP status:', res.statusCode);
                try {
                    const data = JSON.parse(buf);
                    if (res.statusCode === 200) {
                        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(khong co text)';
                        console.log('Phan hoi AI:', JSON.stringify(txt));
                        console.log('Usage:', JSON.stringify(data.usageMetadata || {}));
                    } else {
                        console.log('Loi:', JSON.stringify(data.error || buf.slice(0, 600)));
                    }
                } catch { console.log('Raw:', buf.slice(0, 600)); }
            });
        });
        req.on('error', (e) => console.log('Loi request:', e.message));
        req.write(body); req.end();
    } catch (e) { console.log('Loi test:', e.message); }
})();
