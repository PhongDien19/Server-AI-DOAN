/**
 * SerpAPI Service - Tìm kiếm điểm chuẩn đại học qua Google Search
 * 
 * Cần đăng ký API key miễn phí tại: https://serpapi.com/
 * Free tier: 100 searches/tháng
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getGenerativeModelWithFallback } = require("./geminiClient");

const SERPAPI_BASE_URL = 'https://serpapi.com/search';
const CACHE_FILE_PATH = path.resolve(__dirname, '../../benchmark_cache.json');

// Khởi tạo model Gemini có Google Search Grounding để fallback
const geminiGroundedModel = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.1, // Thấp để con số chính xác nhất
        maxOutputTokens: 256
    },
    tools: [{ googleSearch: {} }]
});

// Đọc cache từ file JSON
let benchmarkCache = {};
try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
        const rawData = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
        benchmarkCache = JSON.parse(rawData);
        console.log(`[BenchmarkCache] Đã tải cache từ file JSON với ${Object.keys(benchmarkCache).length} bản ghi`);
    }
} catch (e) {
    console.error('[BenchmarkCache] Lỗi đọc file cache:', e.message);
}

// Hàm lưu cache vào file JSON
function saveCacheToFile() {
    try {
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(benchmarkCache, null, 2), 'utf8');
    } catch (e) {
        console.error('[BenchmarkCache] Lỗi ghi file cache:', e.message);
    }
}

// Tạo key cho cache
function getCacheKey(universityName, major, year) {
    const u = (universityName || '').trim().toLowerCase();
    const m = (major || '').trim().toLowerCase();
    const y = String(year).trim();
    return `${u}_${m}_${y}`;
}

/**
 * Tìm kiếm điểm chuẩn đại học qua SerpAPI
 * @param {string} universityName - Tên trường đại học
 * @param {string} major - Tên ngành (tùy chọn)
 * @returns {Promise<object>} - Kết quả tìm kiếm
 */
const searchUniversityBenchmark = async (universityName, major = null) => {
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (!apiKey) {
        throw new Error('SERPAPI_API_KEY chưa được cấu hình trong file .env');
    }

    // Xây dựng query tìm kiếm
    let query = `điểm chuẩn ${universityName}`;
    if (major) {
        query += ` ngành ${major}`;
    }
    query += ' 2025';

    try {
        console.log(`[SerpAPI] Đang tìm kiếm: "${query}"`);
        
        const response = await axios.get(SERPAPI_BASE_URL, {
            params: {
                engine: 'google',
                q: query,
                api_key: apiKey,
                num: 10,
                gl: 'vn',
                hl: 'vi'
            },
            timeout: 30000
        });

        const data = response.data;

        // Trích xuất kết quả từ organic results
        const organicResults = data.organic_results || [];
        
        // Tìm các kết quả có điểm chuẩn
        const benchmarkResults = extractBenchmarkData(organicResults, universityName, major);

        return {
            success: true,
            query: query,
            totalResults: organicResults.length,
            benchmarks: benchmarkResults,
            searchMetadata: {
                totalResults: data.search_metadata?.total_results || 0,
                searchTime: data.search_information?.search_time || 0
            }
        };
    } catch (error) {
        console.error('[SerpAPI] Lỗi khi tìm kiếm:', error.message);
        
        if (error.response?.status === 401) {
            throw new Error('SerpAPI key không hợp lệ. Vui lòng kiểm tra SERPAPI_API_KEY.');
        }
        if (error.response?.status === 429) {
            throw new Error('Đã hết quota SerpAPI (100 searches/tháng). Vui lòng đợi tháng sau hoặc nâng cấp gói.');
        }
        
        throw new Error(`Lỗi tìm kiếm SerpAPI: ${error.message}`);
    }
};

/**
 * Trích xuất dữ liệu điểm chuẩn từ kết quả tìm kiếm
 */
const extractBenchmarkData = (results, universityName, major) => {
    const benchmarks = [];

    for (const result of results) {
        const title = result.title || '';
        const snippet = result.snippet || '';
        
        // Tìm kiếm pattern điểm chuẩn (VD: 26.5, 25.0, 24.5)
        const scorePattern = /(\d{1,2}[.,]\d)\s*[-–—]\s*(\d{1,2}[.,]\d)/g;
        const scores = [...snippet.matchAll(scorePattern)];
        
        // Tìm năm trong kết quả
        const yearPattern = /20(2[3-5])/g;
        const years = [...title.matchAll(yearPattern)].map(m => m[1]);
        
        if (scores.length > 0 || title.toLowerCase().includes('điểm chuẩn')) {
            benchmarks.push({
                title: title,
                link: result.link,
                snippet: snippet,
                extractedScores: scores.slice(0, 3).map(s => s[0]),
                years: [...new Set(years)]
            });
        }
    }

    return benchmarks;
};

/**
 * Trích xuất điểm chuẩn từ snippet - Cải thiện
 * Tìm các pattern phổ biến của điểm chuẩn Việt Nam, hỗ trợ cả số thập phân (1 và 2 chữ số) và số nguyên.
 */
function extractScoreFromSnippet(snippet) {
    if (!snippet) return null;
    
    const lines = snippet.split(/[.\n]/);
    const scores = [];
    const scoreRegex = /\b(1[5-9]|2\d|30)(?:[.,]\d{1,2})?\b/g;
    
    for (const line of lines) {
        // Loại bỏ các mẫu ngày tháng dạng dd/mm hoặc mm/dd trước để tránh nhận diện sai
        const cleanedLine = line.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '');
        const lineScores = cleanedLine.match(scoreRegex);
        if (lineScores) {
            for (const s of lineScores) {
                const score = parseFloat(s.replace(',', '.'));
                // Lọc điểm hợp lệ: 15-30 (thang điểm 30)
                if (score >= 15 && score <= 30) {
                    scores.push(score);
                }
            }
        }
    }
    
    if (scores.length === 0) return null;
    
    // Sắp xếp và lấy median
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

/**
 * Tìm kiếm điểm chuẩn cho 1 năm cụ thể với 1 query duy nhất, tối ưu hiệu suất và quota
 */
/**
 * Tìm kiếm điểm chuẩn bằng Gemini Google Search Grounding để làm cứu cánh (Fallback)
 */
async function getBenchmarkFromGeminiGrounding(universityName, major, year) {
    try {
        console.log(`[Gemini Grounding] Đang tìm kiếm điểm chuẩn bằng Gemini: ${universityName} - ${major || 'Tất cả'} năm ${year}...`);
        const prompt = `Bạn là trợ lý trích xuất dữ liệu điểm chuẩn tuyển sinh đại học tại Việt Nam.
Hãy sử dụng công cụ Google Search để tìm kiếm và trả về chính xác điểm chuẩn của trường "${universityName}"${major ? ', ngành "' + major + '"' : ''} trong năm học tuyển sinh ${year}.

Yêu cầu cực kỳ nghiêm ngặt:
1. Bạn phải tìm đúng trang tin chính thống, đáng tin cậy về điểm chuẩn đại học năm ${year}.
2. Chỉ trả về một số thực duy nhất đại diện cho điểm chuẩn (ví dụ: 25.5 hoặc 28.25 hoặc 24).
3. KHÔNG ĐƯỢC thêm bất kỳ lời giải thích, không thêm chữ "điểm", không kèm theo tên trường hay tên ngành. Chỉ trả về đúng con số điểm chuẩn.
4. Nếu thực sự không tìm thấy điểm chuẩn sau khi tìm kiếm, chỉ trả về chữ "null".`;

        const response = await geminiGroundedModel.generateContent(prompt);
        const text = response.response.text().trim();
        console.log(`[Gemini Grounding] Kết quả nhận được từ Gemini: "${text}"`);
        
        // Trích xuất con số từ text trả về
        const cleanedText = text.replace(',', '.').replace(/[^\d.]/g, '');
        if (cleanedText && !isNaN(parseFloat(cleanedText))) {
            const score = parseFloat(cleanedText);
            if (score >= 15 && score <= 30) {
                return score;
            }
        }
        return null;
    } catch (error) {
        console.error(`[Gemini Grounding] Lỗi khi tra cứu:`, error.message);
        return null;
    }
}

/**
 * Tìm kiếm điểm chuẩn cho 1 năm cụ thể với 1 query duy nhất, tối ưu hiệu suất và quota
 */
const searchBenchmarkForYear = async (universityName, major, year) => {
    // 1. Kiểm tra cache từ file JSON trước
    const cacheKey = getCacheKey(universityName, major, year);
    if (benchmarkCache[cacheKey] !== undefined) {
        const cachedVal = benchmarkCache[cacheKey];
        console.log(`[BenchmarkCache] Hit cache cho key: "${cacheKey}" => Điểm: ${cachedVal}`);
        return {
            success: true,
            benchmarks: cachedVal ? [{ title: 'Cached Value', extractedScore: cachedVal, year: String(year) }] : [],
            primaryScore: cachedVal,
            scoresByYear: cachedVal ? { [year]: [cachedVal] } : {}
        };
    }

    const query = major 
        ? `điểm chuẩn ${universityName} ngành ${major} ${year}`
        : `điểm chuẩn ${universityName} ${year}`;
    
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        throw new Error('SERPAPI_API_KEY chưa được cấu hình trong file .env');
    }

    const allBenchmarks = [];
    const scoresByYear = {}; // Map để tổng hợp điểm theo năm
    
    try {
        console.log(`[SerpAPI] Đang truy vấn: "${query}"`);
        const response = await axios.get(SERPAPI_BASE_URL, {
            params: {
                engine: 'google',
                q: query,
                api_key: apiKey,
                num: 10,
                gl: 'vn',
                hl: 'vi'
            },
            timeout: 20000
        });
        
        const organicResults = response.data.organic_results || [];
        
        for (const result of organicResults) {
            const title = result.title || '';
            const snippet = result.snippet || '';
            const fullText = `${title} ${snippet}`;
            
            const score = extractScoreFromSnippet(snippet);
            
            // Xác định năm từ title hoặc snippet
            const yearMatch = fullText.match(/20(2[3-5])/g) || [];
            const detectedYear = yearMatch.length > 0 
                ? yearMatch[yearMatch.length - 1] 
                : String(year).slice(2);
            
            if (title.toLowerCase().includes('điểm chuẩn') || score !== null) {
                allBenchmarks.push({
                    title,
                    link: result.link,
                    snippet,
                    extractedScore: score,
                    year: `20${detectedYear}`,
                    query: query
                });
                
                // Tổng hợp điểm theo năm phát hiện được
                if (score !== null) {
                    const yearKey = `20${detectedYear}`;
                    if (!scoresByYear[yearKey]) {
                        scoresByYear[yearKey] = [];
                    }
                    scoresByYear[yearKey].push(score);
                }
            }
        }
    } catch (err) {
        console.warn(`[SerpAPI] Query "${query}" lỗi:`, err.message);
    }
    
    // Lấy điểm median cho năm đang tìm
    const yearKey = String(year);
    let bestScore = null;
    if (scoresByYear[yearKey] && scoresByYear[yearKey].length > 0) {
        const sorted = [...scoresByYear[yearKey]].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        bestScore = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    } else if (scoresByYear[`20${String(year).slice(2)}`] && scoresByYear[`20${String(year).slice(2)}`].length > 0) {
        const sorted = [...scoresByYear[`20${String(year).slice(2)}`]].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        bestScore = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    // 2. Fallback dùng Gemini Grounding nếu SerpAPI không có điểm
    if (bestScore === null) {
        console.log(`[SerpAPI] Trả về N/A điểm chuẩn cho năm ${year}. Kích hoạt Gemini Grounding...`);
        bestScore = await getBenchmarkFromGeminiGrounding(universityName, major, year);
    }

    // 3. Ghi kết quả vào cache file JSON
    benchmarkCache[cacheKey] = bestScore;
    saveCacheToFile();
    
    return {
        success: true,
        benchmarks: bestScore ? [{ title: 'Extracted Score', extractedScore: bestScore, year: String(year) }] : allBenchmarks,
        primaryScore: bestScore,
        scoresByYear: bestScore ? { [year]: [bestScore] } : scoresByYear
    };
};

/**
 * Tìm kiếm chi tiết điểm chuẩn theo nhiều năm (chạy song song)
 * @param {string} universityName - Tên trường
 * @param {string} major - Ngành (tùy chọn)
 * @param {number[]} years - Danh sách năm cần tìm (mặc định: [2025, 2024, 2023])
 */
const searchBenchmarkByYears = async (universityName, major = null, years = [2025, 2024, 2023]) => {
    const results = {};
    console.log(`[SerpAPI] Đang tìm kiếm điểm chuẩn song song các năm ${years.join(', ')} cho ${universityName}...`);

    const promises = years.map(async (year) => {
        try {
            const yearResult = await searchBenchmarkForYear(universityName, major, year);
            return { year, result: yearResult };
        } catch (error) {
            console.warn(`[SerpAPI] Lỗi khi tìm năm ${year}:`, error.message);
            return { year, result: { error: error.message, success: false } };
        }
    });

    const outcomes = await Promise.all(promises);
    for (const outcome of outcomes) {
        results[outcome.year] = outcome.result;
        if (outcome.result.success) {
            console.log(`[SerpAPI] Năm ${outcome.year}: ${outcome.result.benchmarks?.length || 0} kết quả, điểm: ${outcome.result.primaryScore || 'N/A'}`);
        }
    }

    return results;
};

/**
 * Tìm kiếm TOP ngành của một trường
 * @param {string} universityName - Tên trường
 * @param {number} limit - Số lượng ngành cần lấy (mặc định: 5)
 */
const searchTopMajors = async (universityName, limit = 5) => {
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (!apiKey) {
        throw new Error('SERPAPI_API_KEY chưa được cấu hình trong file .env');
    }

    try {
        console.log(`[SerpAPI] Đang tìm top ngành của ${universityName}...`);
        
        // Query 1: Tìm top ngành
        const query = `top ngành điểm chuẩn ${universityName} 2025`;
        
        const response = await axios.get(SERPAPI_BASE_URL, {
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

        const data = response.data;
        const organicResults = data.organic_results || [];
        
        const majors = [];
        
        // Trích xuất ngành và điểm chuẩn từ kết quả
        for (const result of organicResults) {
            const title = result.title || '';
            const snippet = result.snippet || '';
            
            // Tìm pattern tên ngành phổ biến
            const commonMajors = [
                'Công nghệ thông tin', 'Khoa học máy tính', 'Kỹ thuật máy tính',
                'Quản trị kinh doanh', 'Kinh tế', 'Kế toán', 'Tài chính', 'Ngân hàng',
                'Kỹ thuật điện', 'Kỹ thuật điện tử', 'Kỹ thuật ô tô', 'Cơ khí',
                'Y khoa', 'Dược học', 'Điều dưỡng', 'Y học cổ truyền',
                'Luật', 'Luật kinh tế', 'Quan hệ quốc tế', 'Truyền thông',
                'Marketing', 'Digital Marketing', 'Thiết kế đồ họa', 'Kiến trúc',
                'Công nghệ sinh học', 'Môi trường', 'Xây dựng', 'Giao thông vận tải',
                'Sư phạm', 'Ngôn ngữ Anh', 'Hóa học', 'Vật lý', 'Toán học',
                'Kỹ thuật hóa học', 'Vật liệu', 'Hàng không', 'An toàn thông tin',
                'Trí tuệ nhân tạo', 'An ninh mạng', 'Khoa học dữ liệu'
            ];
            
            // Tìm ngành trong title
            for (const major of commonMajors) {
                if (title.toLowerCase().includes(major.toLowerCase()) || 
                    snippet.toLowerCase().includes(major.toLowerCase())) {
                    const score = extractScoreFromSnippet(snippet);
                    majors.push({
                        majorName: major,
                        score: score,
                        link: result.link,
                        snippet: snippet,
                        sourceTitle: title
                    });
                    break; // Chỉ lấy 1 ngành mỗi kết quả
                }
            }
        }
        
        // Loại bỏ trùng lặp và lấy top N
        const uniqueMajors = [];
        const seen = new Set();
        
        for (const major of majors) {
            const key = major.majorName.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMajors.push(major);
            }
        }
        
        // Nếu không tìm thấy đủ, thêm các ngành mặc định phổ biến
        if (uniqueMajors.length < limit) {
            const defaultMajors = [
                'Công nghệ thông tin',
                'Khoa học máy tính', 
                'Quản trị kinh doanh',
                'Kỹ thuật điện',
                'Kinh tế'
            ];
            
            for (const defMajor of defaultMajors) {
                if (uniqueMajors.length >= limit) break;
                if (!seen.has(defMajor.toLowerCase())) {
                    seen.add(defMajor.toLowerCase());
                    uniqueMajors.push({
                        majorName: defMajor,
                        score: null,
                        link: null,
                        snippet: '',
                        sourceTitle: 'Default'
                    });
                }
            }
        }
        
        return {
            success: true,
            universityName: universityName,
            majors: uniqueMajors.slice(0, limit)
        };
    } catch (error) {
        console.error('[SerpAPI] Lỗi khi tìm top ngành:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Tìm điểm chuẩn MỚI NHẤT (chỉ 1 năm - năm gần nhất có dữ liệu).
 * Trả về: { benchmark: number|null, year: number|null, source: string }
 * @param {string} universityName
 * @param {string|null} major
 * @param {number} [latestYear=2025] - Năm ưu tiên (mặc định 2025)
 * @param {number[]} [fallbackYears=[2024, 2023]] - Các năm fallback nếu năm chính không có dữ liệu
 */
const searchLatestBenchmark = async (universityName, major = null, latestYear = 2025, fallbackYears = [2024, 2023]) => {
    console.log(`[SerpAPI] Tìm điểm chuẩn mới nhất cho ${universityName}${major ? ' - ' + major : ''}...`);

    const allYears = [latestYear, ...fallbackYears];
    for (const year of allYears) {
        try {
            const yearResult = await searchBenchmarkForYear(universityName, major, year);
            if (yearResult.success && yearResult.primaryScore != null) {
                console.log(`[SerpAPI] Tìm được điểm ${yearResult.primaryScore} cho năm ${year}`);
                return {
                    benchmark: Number(yearResult.primaryScore.toFixed(2)),
                    year,
                    source: 'serpapi',
                    raw: yearResult
                };
            }
        } catch (err) {
            console.warn(`[SerpAPI] Lỗi khi tìm năm ${year}:`, err.message);
        }
    }

    console.log(`[SerpAPI] Không tìm được điểm chuẩn cho ${universityName}${major ? ' - ' + major : ''}`);
    return {
        benchmark: null,
        year: null,
        source: 'serpapi'
    };
};

module.exports = {
    searchUniversityBenchmark,
    searchBenchmarkByYears,
    searchLatestBenchmark,
    searchTopMajors,
    extractScoreFromSnippet
};
