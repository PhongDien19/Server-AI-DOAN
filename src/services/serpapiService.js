/**
 * SerpAPI Service - Tìm kiếm điểm chuẩn đại học qua Google Search
 * 
 * Cần đăng ký API key miễn phí tại: https://serpapi.com/
 * Free tier: 100 searches/tháng
 */

const axios = require('axios');

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

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
 * Tìm các pattern phổ biến của điểm chuẩn Việt Nam
 */
function extractScoreFromSnippet(snippet) {
    if (!snippet) return null;
    
    // Pattern 1: "26.50" hoặc "26,50" (có 2 số thập phân)
    const pattern1 = /\b(\d{1,2}[.,]\d{1,2})\b/g;
    
    // Pattern 2: Tìm trong các đoạn có từ "điểm chuẩn" gần đó
    const lines = snippet.split(/[.\n]/);
    const scores = [];
    
    for (const line of lines) {
        const lineScores = line.match(/\b(\d{1,2}[.,]\d)\b/g);
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
 * Tìm kiếm chi tiết điểm chuẩn theo nhiều năm
 * @param {string} universityName - Tên trường
 * @param {string} major - Ngành (tùy chọn)
 * @param {number[]} years - Danh sách năm cần tìm (mặc định: [2025, 2024, 2023])
 */
const searchBenchmarkByYears = async (universityName, major = null, years = [2025, 2024, 2023]) => {
    const results = {};

    for (const year of years) {
        try {
            console.log(`[SerpAPI] Đang tìm kiếm điểm chuẩn năm ${year}...`);

            // Xây dựng query với năm cụ thể
            let query = `điểm chuẩn ${universityName}`;
            if (major) {
                query += ` ngành ${major}`;
            }
            query += ` ${year}`;

            const apiKey = process.env.SERPAPI_API_KEY;

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
            const organicResults = data.organic_results || [];
            
            // Trích xuất điểm chuẩn từ organic results
            const benchmarkResults = [];
            for (const result of organicResults) {
                const title = result.title || '';
                const snippet = result.snippet || '';
                
                // Tìm điểm chuẩn trong snippet
                const score = extractScoreFromSnippet(snippet);
                
                // Tìm năm trong title
                const yearMatch = title.match(/20(2[3-5])/);
                
                if (title.toLowerCase().includes('điểm chuẩn') || score !== null) {
                    benchmarkResults.push({
                        title: title,
                        link: result.link,
                        snippet: snippet,
                        extractedScore: score,
                        year: yearMatch ? `20${yearMatch[1]}` : `20${year}`
                    });
                }
            }

            results[year] = {
                success: true,
                query: query,
                totalResults: organicResults.length,
                benchmarks: benchmarkResults,
                primaryScore: benchmarkResults.length > 0 ? benchmarkResults[0].extractedScore : null
            };

            console.log(`[SerpAPI] Tìm thấy ${benchmarkResults.length} kết quả cho năm ${year}, điểm: ${results[year].primaryScore || 'N/A'}`);

            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.warn(`[SerpAPI] Lỗi khi tìm năm ${year}:`, error.message);
            results[year] = { error: error.message, success: false };
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

module.exports = {
    searchUniversityBenchmark,
    searchBenchmarkByYears,
    searchTopMajors,
    extractScoreFromSnippet
};
