const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { getGenerativeModelWithFallback } = require('../src/services/deepseekClient');

const model = getGenerativeModelWithFallback({
    model: "deepseek-chat",
    generationConfig: {
        temperature: 0.3
    }
});

(async () => {
    const prompt = `Bạn là chuyên gia tuyển sinh đại học Việt Nam.
Trong danh sách các trường đại học sau đây:
1. Đại học Bách khoa - ĐH Đà Nẵng
2. Đại học Sư phạm - ĐH Đà Nẵng
3. Đại học Kinh tế - ĐH Đà Nẵng
4. Đại học Ngoại ngữ - ĐH Đà Nẵng
5. Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng
6. Trường Đại học Kiến trúc Đà Nẵng
7. Trường Đại học Mỹ thuật Đà Nẵng
8. Trường Đại học Duy Tân
9. Trường Đại học FPT Đà Nẵng
10. Trường Đại học Đông Á
11. Trường Đại học Vinh Viện Đà Nẵng

Hãy cho biết những trường nào có đào tạo ngành: "công nghệ thông tin".
Yêu cầu:
1. Chỉ chọn các trường có trong danh sách trên.
2. Chọn tối đa 5 trường phù hợp nhất, ưu tiên các trường nổi tiếng có đào tạo ngành này.
3. Trả về kết quả dạng mảng JSON gồm các tên trường viết chính xác như trong danh sách (Ví dụ: ["Trường A", "Trường B"]).
4. Không giải thích gì thêm ngoài mảng JSON thô.`;

    try {
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        console.log("=== RAW TEXT ===");
        console.log(text);
        console.log("=================");
    } catch (e) {
        console.error("Error:", e);
    }
})();
