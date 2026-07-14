const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: { 
        temperature: 0.3
    },
    tools: [{ googleSearch: {} }]
});

/**
 * Tìm hiểu nhanh về ngành nghề / trường học (cho màn hình Quick Explore)
 * @param {object} params - Tham số đầu vào
 * @param {string} params.mode - Chế độ 'HOC' hoặc 'LAM'
 * @param {string} params.industry - Ngành học / ngành nghề quan tâm
 * @param {string} params.school - Tên trường đại học (chỉ cho HOC)
 * @param {string} params.position - Vị trí công việc mong muốn
 * @param {string} params.location - Địa điểm / khu vực (chỉ cho LAM)
 * @param {number} params.age - Độ tuổi người dùng
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        let prompt = '';

        if (mode === 'HOC') {
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc tại Việt Nam.
Người dùng muốn tìm hiểu về:
- Ngành học quan tâm: "${industry || 'Bất kỳ'}"
- Trường quan tâm: "${school || 'Bất kỳ'}"
- Vị trí công việc mong muốn: "${position || 'Bất kỳ'}"
Người dùng hiện tại ${age || 18} tuổi.

NHIỆM VỤ: Gợi ý danh sách các trường Đại học/Cao đẳng tại Việt Nam phù hợp với tiêu chí trên.

YÊU CẦU:
1. Hãy cung cấp thông tin tóm tắt ngắn gọn về ngành học/lĩnh vực "${industry || position || 'này'}" và triển vọng học tập.
2. Cung cấp danh sách các trường Đại học/Cao đẳng tốt đào tạo ngành này (từ 3-5 trường). Nếu người dùng có nhập cụ thể tên trường "${school}", bắt buộc trường này phải đứng đầu danh sách.
3. Với mỗi trường, bắt buộc trả về: tên trường (schoolName), mô tả ngắn gọn chất lượng đào tạo (description), điểm chuẩn ngành đó trong 3 năm gần nhất 2025, 2024, 2023 (benchmarkScores - BẮT BUỘC dùng thang điểm tốt nghiệp THPT Quốc gia tối đa là 30.0; tự động quy đổi tương đương nếu trường dùng thang điểm khác như thang 100), link trang web chính thức (officialLink) và link cổng tuyển sinh của trường (admissionLink).

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "summary": "Tóm tắt ngắn gọn về tiềm năng và đặc thù của ngành học này đối với học sinh...",
  "schools": [
    {
      "schoolName": "Tên trường Đại học/Cao đẳng 1",
      "description": "Mô tả ngắn gọn về trường và chất lượng đào tạo ngành này...",
      "benchmarkScores": "2025: 26.5 - 2024: 25.0 - 2023: 24.0",
      "officialLink": "https://...",
      "admissionLink": "https://..."
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        } else {
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc tại Việt Nam.
Người dùng muốn tìm hiểu về thị trường việc làm:
- Ngành nghề quan tâm: "${industry || 'Bất kỳ'}"
- Vị trí công việc: "${position || 'Bất kỳ'}"
- Khu vực mong muốn: "${location || 'Toàn quốc'}"
Người dùng hiện tại ${age || 20} tuổi.

NHIỆM VỤ: Gợi ý danh sách các công ty/doanh nghiệp tiêu biểu đang tuyển dụng ngành/vị trí này.

YÊU CẦU:
1. Hãy cung cấp thông tin tóm tắt ngắn gọn về nhu cầu tuyển dụng và xu hướng việc làm của ngành/vị trí này tại khu vực "${location || 'Việt Nam'}".
2. Cung cấp danh sách các công ty/doanh nghiệp tiêu biểu đang có nhu cầu tuyển dụng (từ 3-5 công ty).
3. Với mỗi công ty, bắt buộc trả về: tên công ty (companyName), mô tả ngắn gọn về lĩnh vực/quy mô (description), các vị trí công việc thường tuyển (positions - dạng danh sách String, ví dụ ["Lập trình viên", "Kỹ sư"]), đường link tuyển dụng hoặc trang web chính thức (careerLink).

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "summary": "Tóm tắt ngắn gọn về nhu cầu tuyển dụng và xu hướng việc làm...",
  "companies": [
    {
      "companyName": "Tên công ty 1",
      "description": "Mô tả ngắn gọn...",
      "positions": ["Vị trí 1", "Vị trí 2"],
      "careerLink": "https://..."
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        }

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        const parsed = extractJsonFromText(text);
        if (!parsed) {
            throw new Error("Không thể trích xuất JSON hợp lệ từ phản hồi của AI.");
        }
        return parsed;
    } catch (error) {
        console.error("Lỗi trong searchCareerQuickly service:", error);
        throw error;
    }
};

module.exports = {
    searchCareerQuickly
};
