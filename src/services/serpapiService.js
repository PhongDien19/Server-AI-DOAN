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
        const scorePattern = /(\d{1,2}[.,]\d)\s*[-–]\s*(\d{1,2}[.,]\d)/g;
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
            const benchmarkResults = extractBenchmarkData(organicResults, universityName, major);

            results[year] = {
                success: true,
                query: query,
                totalResults: organicResults.length,
                benchmarks: benchmarkResults
            };

            console.log(`[SerpAPI] Tìm thấy ${benchmarkResults.length} kết quả cho năm ${year}`);

            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.warn(`[SerpAPI] Lỗi khi tìm năm ${year}:`, error.message);
            results[year] = { error: error.message, success: false };
        }
    }

    return results;
};

module.exports = {
    searchUniversityBenchmark,
    searchBenchmarkByYears
};
