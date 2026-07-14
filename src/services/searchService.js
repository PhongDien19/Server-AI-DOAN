const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");
const { searchBenchmarkByYears } = require("./serpapiService");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: { 
        temperature: 0.3
    },
    tools: [{ googleSearch: {} }]
});

/**
 * Trích xuất điểm chuẩn từ kết quả SerpAPI
 */
function extractBenchmarkFromSerpAPI(benchmarks) {
    if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0) {
        return null;
    }
    
    const scores = [];
    for (const item of benchmarks) {
        const snippet = item.snippet || '';
        const matches = snippet.match(/\b(\d{1,2}[.,]\d)\b/g);
        if (matches) {
            for (const m of matches) {
                const score = parseFloat(m.replace(',', '.'));
                if (score >= 15 && score <= 30) {
                    scores.push(score);
                }
            }
        }
    }
    
    if (scores.length === 0) return null;
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

/**
 * Lấy điểm chuẩn từ SerpAPI cho một trường
 */
async function getBenchmarkFromSerpAPI(universityName, major = null) {
    try {
        if (!process.env.SERPAPI_API_KEY) {
            console.warn('[SerpAPI] SERPAPI_API_KEY chưa được cấu hình');
            return null;
        }

        const results = await searchBenchmarkByYears(universityName, major, [2025, 2024, 2023]);
        
        const extracted = {
            benchmark2025: null,
            benchmark2024: null,
            benchmark2023: null
        };

        for (const [year, result] of Object.entries(results)) {
            if (result.success && result.benchmarks && result.benchmarks.length > 0) {
                const score = extractBenchmarkFromSerpAPI(result.benchmarks);
                if (score !== null) {
                    if (year === '2025') extracted.benchmark2025 = score.toFixed(1);
                    if (year === '2024') extracted.benchmark2024 = score.toFixed(1);
                    if (year === '2023') extracted.benchmark2023 = score.toFixed(1);
                }
            }
        }

        if (extracted.benchmark2025 || extracted.benchmark2024 || extracted.benchmark2023) {
            return extracted;
        }
        return null;
    } catch (error) {
        console.error('[SearchService] Lỗi khi lấy điểm chuẩn từ SerpAPI:', error.message);
        return null;
    }
}

/**
 * Tìm hiểu nhanh về ngành nghề / trường học (cho màn hình Quick Explore)
 * LUỒNG 2 BƯỚC:
 * Bước 1: AI tạo danh sách trường theo ngành + khu vực
 * Bước 2: SerpAPI lấy điểm chuẩn + link cho TỪNG trường
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        // BƯỚC 1: AI tạo danh sách trường/ công ty (chưa có điểm chuẩn)
        let prompt = '';

        if (mode === 'HOC') {
            // Prompt AI chỉ tạo danh sách trường theo khu vực, KHÔNG cần điểm chuẩn
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc tại Việt Nam.
Người dùng muốn tìm hiểu về:
- Ngành học quan tâm: "${industry || 'Bất kỳ'}"
- Trường quan tâm: "${school || 'Bất kỳ'}"
- Khu vực mong muốn: "${location || 'Toàn quốc'}"
- Tuổi: ${age || 18}

NHIỆM VỤ: Gợi ý danh sách các trường Đại học/Cao đẳng phù hợp với ngành và khu vực trên.

YÊU CẦU:
1. Ưu tiên các trường nằm trong khu vực "${location || 'Toàn quốc'}"
2. Nếu không có trường tốt trong khu vực, hãy gợi ý trường ở khu vực gần nhất
3. CHỈ cung cấp danh sách trường, KHÔNG cần điền điểm chuẩn (sẽ được cập nhật tự động sau)
4. Với mỗi trường, bắt buộc trả về: schoolName, schoolLocation (tỉnh/TP), description, benchmark2025=null, benchmark2024=null, benchmark2023=null, officialLink=null, admissionLink=null

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "summary": "Tóm tắt ngắn gọn về ngành học và triển vọng...",
  "schools": [
    {
      "schoolName": "Tên trường Đại học/Cao đẳng",
      "schoolLocation": "Tỉnh/Thành phố",
      "description": "Mô tả ngắn về trường và chất lượng đào tạo...",
      "benchmark2025": null,
      "benchmark2024": null,
      "benchmark2023": null,
      "officialLink": null,
      "admissionLink": null
    }
  ]
}
Chỉ trả về JSON, không kèm giải thích.`;
        } else {
            // Mode LAM - tìm công ty
            prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc tại Việt Nam.
Người dùng muốn tìm hiểu về thị trường việc làm:
- Ngành nghề quan tâm: "${industry || 'Bất kỳ'}"
- Vị trí công việc: "${position || 'Bất kỳ'}"
- Khu vực mong muốn: "${location || 'Toàn quốc'}"
- Tuổi: ${age || 20}

NHIỆM VỤ: Gợi ý danh sách các công ty/doanh nghiệp tiêu biểu đang tuyển dụng.

YÊU CẦU:
1. Ưu tiên công ty nằm trong khu vực "${location || 'Toàn quốc'}"
2. Với mỗi công ty, bắt buộc trả về: companyName, location, description, positions, careerLink

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "summary": "Tóm tắt ngắn gọn về nhu cầu tuyển dụng...",
  "companies": [
    {
      "companyName": "Tên công ty",
      "location": "Tỉnh/Thành phố",
      "description": "Mô tả ngắn gọn...",
      "positions": ["Vị trí 1", "Vị trí 2"],
      "careerLink": null
    }
  ]
}
Chỉ trả về JSON, không kèm giải thích.`;
        }

        // Gọi AI để tạo danh sách trường/công ty
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        const parsed = extractJsonFromText(text);
        if (!parsed) {
            throw new Error("Không thể trích xuất JSON hợp lệ từ phản hồi của AI.");
        }

        // BƯỚC 2: Gọi SerpAPI để lấy điểm chuẩn cho TỪNG trường (chỉ mode HOC)
        if (mode === 'HOC' && parsed.schools && Array.isArray(parsed.schools)) {
            for (const schoolItem of parsed.schools) {
                if (schoolItem.schoolName) {
                    try {
                        const benchmarkData = await getBenchmarkFromSerpAPI(schoolItem.schoolName, industry);
                        if (benchmarkData) {
                            schoolItem.benchmark2025 = benchmarkData.benchmark2025;
                            schoolItem.benchmark2024 = benchmarkData.benchmark2024;
                            schoolItem.benchmark2023 = benchmarkData.benchmark2023;
                        }
                        // Delay để tránh rate limit
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.warn(`[SearchService] Lỗi khi lấy điểm chuẩn cho ${schoolItem.schoolName}:`, err.message);
                    }
                }
            }
            parsed.benchmarkSource = 'serpapi';
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
