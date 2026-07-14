const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");
const { searchBenchmarkByYears, searchTopMajors, searchUniversityBenchmark } = require("./serpapiService");

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
        if (item.extractedScore && typeof item.extractedScore === 'number') {
            if (item.extractedScore >= 15 && item.extractedScore <= 30) {
                scores.push(item.extractedScore);
            }
        }
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
 * Lấy điểm chuẩn từ SerpAPI cho một trường + ngành
 */
async function getBenchmarkFromSerpAPI(universityName, major = null) {
    try {
        if (!process.env.SERPAPI_API_KEY) {
            console.warn('[SearchService] SERPAPI_API_KEY chưa được cấu hình');
            return null;
        }

        const results = await searchBenchmarkByYears(universityName, major, [2025, 2024, 2023]);
        
        const extracted = {
            benchmark2025: null,
            benchmark2024: null,
            benchmark2023: null,
            source: 'serpapi'
        };

        for (const [year, result] of Object.entries(results)) {
            if (result.success) {
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
 * Tìm kiếm ngành học - Trả về TOP trường đào tạo ngành đó
 * Sử dụng SerpAPI để lấy thông tin điểm chuẩn
 */
async function searchMajorWithSerpAPI(majorName, location = null) {
    try {
        console.log(`[SearchService] Tìm trường đào tạo ngành: ${majorName}, khu vực: ${location || 'Toàn quốc'}`);
        
        const apiKey = process.env.SERPAPI_API_KEY;
        if (!apiKey) {
            throw new Error('SERPAPI_API_KEY chưa được cấu hình');
        }

        // Query tìm kiếm điểm chuẩn ngành
        const locationQuery = location ? ` ${location}` : '';
        const query = `điểm chuẩn ngành ${majorName}${locationQuery} 2025`;

        console.log(`[SearchService] Query SerpAPI: "${query}"`);
        
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google',
                q: query,
                api_key: apiKey,
                num: 15,
                gl: 'vn',
                hl: 'vi'
            },
            timeout: 30000
        });

        const organicResults = response.data.organic_results || [];
        
        // Trích xuất trường từ kết quả tìm kiếm
        const schoolsMap = new Map();
        
        // Danh sách trường phổ biến để nhận diện
        const commonUniversities = [
            'Đại học Bách Khoa', 'Đại học Quốc gia', 'Đại học Kinh tế', 'Đại học Ngoại thương',
            'Đại học FPT', 'Đại học RMIT', 'Đại học Y Hà Nội', 'Đại học Sư phạm',
            'Đại học KHTN', 'Học viện Ngân hàng', 'Học viện Tài chính', 'Đại học Luật',
            'Đại học Kiến trúc', 'Đại học Mỹ thuật', 'Đại học Y dược', 'Đại học Duy Tân',
            'Đại học Đông Á', 'Đại học Bình Dương', 'Đại học Cần Thơ', 'Đại học Huế'
        ];

        for (const result of organicResults) {
            const title = result.title || '';
            const snippet = result.snippet || '';
            
            // Tìm trường trong title
            for (const uni of commonUniversities) {
                if (title.toLowerCase().includes(uni.toLowerCase())) {
                    if (!schoolsMap.has(uni)) {
                        const score = extractBenchmarkFromSnippet(snippet);
                        schoolsMap.set(uni, {
                            schoolName: uni,
                            score: score,
                            link: result.link,
                            snippet: snippet,
                            sourceTitle: title
                        });
                    }
                    break;
                }
            }
        }

        // Chuyển Map thành Array và sắp xếp theo điểm
        let schools = Array.from(schoolsMap.values());
        
        // Loại bỏ trùng lặp
        const seen = new Set();
        schools = schools.filter(s => {
            const key = s.schoolName.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sắp xếp theo điểm (cao nhất trước)
        schools.sort((a, b) => {
            if (a.score && b.score) return b.score - a.score;
            if (a.score) return -1;
            if (b.score) return 1;
            return 0;
        });

        // Lấy top 5 trường
        const topSchools = schools.slice(0, 5);

        // Gọi SerpAPI để lấy điểm chuẩn 3 năm cho từng trường
        const result = {
            searchType: 'major_only',
            majorName: majorName,
            location: location || 'Toàn quốc',
            summary: `Danh sách các trường đại học hàng đầu đào tạo ngành ${majorName} tại ${location || 'Việt Nam'}`,
            schools: []
        };

        for (const school of topSchools) {
            const schoolInfo = {
                schoolName: school.schoolName,
                location: location || 'Việt Nam',
                benchmark2025: null,
                benchmark2024: null,
                benchmark2023: null,
                benchmarkSource: 'serpapi'
            };

            try {
                // Lấy điểm chuẩn 3 năm
                const benchmarkData = await getBenchmarkFromSerpAPI(school.schoolName, majorName);
                if (benchmarkData) {
                    schoolInfo.benchmark2025 = benchmarkData.benchmark2025;
                    schoolInfo.benchmark2024 = benchmarkData.benchmark2024;
                    schoolInfo.benchmark2023 = benchmarkData.benchmark2023;
                } else if (school.score) {
                    schoolInfo.benchmark2025 = school.score.toFixed(1);
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi lấy điểm cho ${school.schoolName}:`, err.message);
            }

            result.schools.push(schoolInfo);
            
            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return result;
    } catch (error) {
        console.error('[SearchService] Lỗi searchMajorWithSerpAPI:', error.message);
        throw error;
    }
}

/**
 * Trích xuất điểm từ snippet
 */
function extractBenchmarkFromSnippet(snippet) {
    if (!snippet) return null;
    
    const lines = snippet.split(/[.\n]/);
    const scores = [];
    
    for (const line of lines) {
        const lineScores = line.match(/\b(\d{1,2}[.,]\d)\b/g);
        if (lineScores) {
            for (const s of lineScores) {
                const score = parseFloat(s.replace(',', '.'));
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
 * Tìm kiếm trường học - Trả về TOP 5 ngành HOT của trường kèm điểm
 * Sử dụng SerpAPI để lấy thông tin
 */
async function searchSchoolWithSerpAPI(schoolName, location = null) {
    try {
        console.log(`[SearchService] Tìm ngành hot của trường: ${schoolName}`);
        
        const apiKey = process.env.SERPAPI_API_KEY;
        if (!apiKey) {
            throw new Error('SERPAPI_API_KEY chưa được cấu hình');
        }

        // Gọi SerpAPI để lấy top ngành của trường
        const topMajorsResult = await searchTopMajors(schoolName, 5);
        
        if (!topMajorsResult.success) {
            throw new Error(topMajorsResult.error || 'Không tìm thấy thông tin');
        }

        const result = {
            searchType: 'school_only',
            schoolName: schoolName,
            location: location || 'Việt Nam',
            summary: `TOP 5 ngành đào tạo hot nhất tại ${schoolName}`,
            topMajors: []
        };

        // Lấy điểm chuẩn 3 năm cho từng ngành
        for (const major of topMajorsResult.majors) {
            const majorInfo = {
                majorName: major.majorName,
                benchmark2025: null,
                benchmark2024: null,
                benchmark2023: null,
                benchmarkSource: 'serpapi'
            };

            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(schoolName, major.majorName);
                if (benchmarkData) {
                    majorInfo.benchmark2025 = benchmarkData.benchmark2025;
                    majorInfo.benchmark2024 = benchmarkData.benchmark2024;
                    majorInfo.benchmark2023 = benchmarkData.benchmark2023;
                } else if (major.score) {
                    majorInfo.benchmark2025 = major.score.toFixed(1);
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi lấy điểm ngành ${major.majorName}:`, err.message);
            }

            result.topMajors.push(majorInfo);
            
            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return result;
    } catch (error) {
        console.error('[SearchService] Lỗi searchSchoolWithSerpAPI:', error.message);
        throw error;
    }
}

/**
 * Tìm hiểu nhanh về ngành nghề / trường học (cho màn hình Quick Explore)
 * 
 * LUỒNG XỬ LÝ:
 * 
 * 1. CHỈ CÓ TÊN TRƯỜNG (industry/school trống):
 *    -> Trả thông tin trường + TOP 5 ngành HOT của trường kèm điểm chuẩn 3 năm
 *    -> Sử dụng SerpAPI để tìm ngành và điểm
 * 
 * 2. CHỈ CÓ TÊN NGÀNH (school trống):
 *    -> Gợi ý danh sách trường đào tạo ngành này + điểm chuẩn 3 năm cho từng trường
 *    -> Sử dụng SerpAPI để tìm trường và điểm
 * 
 * 3. CÓ CẢ TRƯỜNG VÀ NGÀNH:
 *    -> Trả thông tin trường + điểm chuẩn ngành cụ thể 3 năm
 *    -> Sử dụng SerpAPI để lấy điểm
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        // Import axios here to avoid circular dependency
        const axios = require('axios');
        
        // Xác định trường hợp đang xử lý
        const hasSchool = school && school.trim().length > 0;
        const hasIndustry = industry && industry.trim().length > 0;
        
        console.log(`[SearchService] Xử lý: hasSchool=${hasSchool}, hasIndustry=${hasIndustry}, mode=${mode}`);

        // ========== TRƯỜNG HỢP 1: CHỈ CÓ TÊN TRƯỜNG ==========
        if (hasSchool && !hasIndustry && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 1: Chỉ có tên trường - ${school}`);
            return await searchSchoolWithSerpAPI(school, location);
        }

        // ========== TRƯỜNG HỢP 2: CHỈ CÓ TÊN NGÀNH ==========
        if (hasIndustry && !hasSchool && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 2: Chỉ có tên ngành - ${industry}`);
            return await searchMajorWithSerpAPI(industry, location);
        }

        // ========== TRƯỜNG HỢP 3: CÓ CẢ TRƯỜNG VÀ NGÀNH ==========
        if (hasSchool && hasIndustry && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 3: Có cả trường và ngành - ${school} / ${industry}`);
            
            const result = {
                searchType: 'school_and_major',
                schoolName: school,
                majorName: industry,
                location: location || 'Việt Nam',
                summary: `Thông tin trường ${school} và ngành ${industry}`,
                majorInfo: {
                    majorName: industry,
                    benchmark2025: null,
                    benchmark2024: null,
                    benchmark2023: null,
                    benchmarkSource: 'serpapi'
                }
            };

            // Gọi SerpAPI để lấy điểm chuẩn ngành của trường
            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(school, industry);
                if (benchmarkData) {
                    result.majorInfo.benchmark2025 = benchmarkData.benchmark2025;
                    result.majorInfo.benchmark2024 = benchmarkData.benchmark2024;
                    result.majorInfo.benchmark2023 = benchmarkData.benchmark2023;
                }
            } catch (err) {
                console.warn('[SearchService] Lỗi khi lấy điểm chuẩn:', err.message);
            }

            return result;
        }

        // ========== MODE 'LAM' (Tìm công việc) ==========
        if (mode === 'LAM') {
            console.log(`[SearchService] MODE LAM: Tìm công việc - ${industry || position}`);
            
            const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc tại Việt Nam.
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

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const parsed = extractJsonFromText(text);

            if (!parsed) {
                throw new Error("AI không trả về JSON hợp lệ");
            }

            return parsed;
        }

        // Fallback: Nếu không khớp các trường hợp trên
        return {
            success: false,
            message: 'Vui lòng nhập tên trường hoặc tên ngành để tìm kiếm'
        };

    } catch (error) {
        console.error("[SearchService] Lỗi:", error);
        throw error;
    }
};

module.exports = {
    searchCareerQuickly
};
