const { getGenerativeModelWithFallback } = require("./geminiClient");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.3 }
});

/**
 * Tìm hiểu nhanh về 1 ngành nghề
 * @param {string} careerName - Tên ngành nghề
 * @param {string} location - Khu vực mong muốn
 * @param {number} age - Độ tuổi
 */
const searchCareerQuickly = async (careerName, location, age) => {
    try {
        if (!careerName || !location || age == null) {
            throw new Error("Thiếu tham số careerName, location hoặc age");
        }

        const isHighSchool = Number(age) <= 18;
        let prompt = '';

        if (isHighSchool) {
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc dành cho học sinh trung học phổ thông. 
Người dùng muốn tìm hiểu nhanh về ngành nghề: "${careerName}" tại khu vực: "${location}".
Người dùng hiện tại ${age} tuổi (thuộc nhóm học sinh THPT).

YÊU CẦU:
1. Hãy cung cấp thông tin tóm tắt ngắn gọn về ngành nghề "${careerName}".
2. Cung cấp danh sách các trường Đại học/Cao đẳng hàng đầu có đào tạo ngành đó tại khu vực "${location}" (tối thiểu 3-5 trường nếu có).
3. Với mỗi trường, bắt buộc trả về: tên trường, mô tả ngắn, thang điểm chuẩn ngành đó trong 3 năm gần nhất, link trang web chính thức và link tuyển sinh của trường.

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "ageGroup": "THPT",
  "career": "${careerName}",
  "location": "${location}",
  "summary": "Tóm tắt ngắn gọn về tiềm năng và đặc thù của ngành nghề này đối với học sinh THPT...",
  "schools": [
    {
      "schoolName": "Tên trường Đại học/Cao đẳng 1",
      "description": "Mô tả ngắn gọn về trường và chất lượng đào tạo ngành này...",
      "benchmarkScores": "Thang điểm chuẩn 3 năm gần nhất (Ví dụ: 2023: 26.5 điểm, 2024: 27.2 điểm, 2025: 27.5 điểm)",
      "officialLink": "URL trang web chính thức của trường",
      "admissionLink": "URL cổng tuyển sinh chính thức của trường"
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        } else {
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc.
Người dùng muốn tìm hiểu nhanh về ngành nghề: "${careerName}" tại khu vực: "${location}".
Người dùng hiện tại ${age} tuổi (thuộc nhóm sinh viên/người đi làm).

YÊU CẦU:
1. Hãy cung cấp thông tin tóm tắt ngắn gọn về ngành nghề "${careerName}" đối với người chuẩn bị ra trường hoặc đi làm.
2. Cung cấp danh sách các công ty/doanh nghiệp tiêu biểu hoặc đáng ứng tuyển đang có nhu cầu tuyển dụng nhiều về ngành nghề đó tại khu vực "${location}" (tối thiểu 3-5 công ty nếu có).
3. Với mỗi công ty, bắt buộc trả về: tên công ty, mô tả ngắn gọn về lĩnh vực hoạt động/quy mô, các vị trí tuyển dụng phổ biến và đường link tuyển sinh/tuyển dụng hoặc trang web chính thức của công ty.

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "ageGroup": "Đại học/Đi làm",
  "career": "${careerName}",
  "location": "${location}",
  "summary": "Tóm tắt ngắn gọn về nhu cầu tuyển dụng và xu hướng việc làm của ngành nghề này...",
  "companies": [
    {
      "companyName": "Tên công ty/doanh nghiệp 1",
      "description": "Mô tả ngắn gọn về công ty, quy mô và môi trường làm việc...",
      "positions": "Các vị trí công việc thường tuyển (Ví dụ: Lập trình viên Web, Kỹ sư Hệ thống)",
      "careerLink": "Đường link trang tuyển dụng hoặc trang chủ của công ty"
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        }

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        if (text.startsWith('```json')) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
            text = text.substring(3, text.length - 3).trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Lỗi trong searchCareerQuickly service:", error);
        throw error;
    }
};

module.exports = {
    searchCareerQuickly
};
