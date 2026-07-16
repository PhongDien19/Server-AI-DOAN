/**
 * Web Search Service - Tìm LINK CHÍNH THỨC trang tuyển sinh
 * 
 * MỤC ĐÍCH: Thay vì hiển thị con số điểm chuẩn (có thể sai/lỗi thời),
 * hệ thống tìm và trả về link CHÍNH THỨC của trang tuyển sinh/trang điểm chuẩn
 * để người dùng tự kiểm tra nguồn chính thức.
 * 
 * Cài đặt:
 * 1. Đăng ký tài khoản tại https://serper.dev
 * 2. Lấy API key và thêm vào .env: SERPER_API_KEY=your_key_here
 */

const axios = require('axios');
require('dotenv').config();

// Serper.dev API configuration
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_BASE_URL = 'https://google.serper.dev/search';

// Cache để tránh search trùng lặp (10 phút)
const searchCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

// Các domain được coi là CHÍNH THỨC/UY TÍN cho trang tuyển sinh
const OFFICIAL_DOMAINS = [
    // Domain trường phổ biến
    '.edu.vn',           // Tất cả trường đại học Việt Nam
    'moet.gov.vn',       // Bộ GD&ĐT
    'vnedu.vn',          // Giáo dục Việt Nam
];

// Domain KHÔNG được coi là chính thức (loại bỏ)
const UNTRUSTED_DOMAINS = [
    'facebook.com',
    'youtube.com',
    'tiktok.com',
    'twitter.com',
    'instagram.com',
    'linkedin.com',
    'reddit.com',
    'zalo.me',
    'blogspot.com',
    'wordpress.com',
    'gov.vn', // Loại trừ gov.vn vì không cụ thể
    // Các trang cổng thông tin điểm chuẩn / trung gian
    'tuyensinh247.com',
    'tuyensinh.vn',
    'tuyensinhso.vn',
    'diemthi.vnexpress.net',
    'thongtintuyensinh.vn',
    'trangedu.com',
    'zunia.vn',
    'diemthilop10.info'
];

/**
 * Tìm link trang tuyển sinh CHÍNH THỨC của trường/ngành
 * @param {string} schoolName - Tên trường
 * @param {string} majorName - Tên ngành (optional)
 * @returns {Promise<{url: string, title: string, domain: string, snippet: string}|null>}
 */
async function findOfficialAdmissionLink(schoolName, majorName) {
    if (!SERPER_API_KEY) {
        console.warn('[WebSearch] SERPER_API_KEY không được cấu hình');
        return null;
    }

    // Tạo query ưu tiên tìm trang tuyển sinh chính thức
    const queries = _buildQueries(schoolName, majorName);

    for (const query of queries) {
        const cacheKey = query;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`[WebSearch] Cache hit: ${query}`);
            if (cached.data) return cached.data;
        }

        try {
            console.log(`[WebSearch] Searching: ${query}`);

            const response = await axios.post(
                SERPER_BASE_URL,
                {
                    q: query,
                    num: 10,
                },
                {
                    headers: {
                        'X-API-KEY': SERPER_API_KEY,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const results = response.data?.organic || [];
            
            if (results.length === 0) {
                console.log(`[WebSearch] Không có kết quả cho: ${query}`);
                continue;
            }

            // Tìm link chính thức phù hợp nhất
            const officialLink = _findBestOfficialLink(results, schoolName, majorName);
            
            if (officialLink) {
                // Cache kết quả
                searchCache.set(cacheKey, {
                    data: officialLink,
                    timestamp: Date.now(),
                });
                return officialLink;
            }
        } catch (error) {
            console.error('[WebSearch] Lỗi khi search:', error.message);
            if (error.response) {
                console.error('[WebSearch] Response status:', error.response.status);
            }
            continue;
        }
    }

    // Không tìm được link chính thức
    console.log(`[WebSearch] Không tìm được link chính thức cho ${schoolName} - ${majorName}`);
    return null;
}

/**
 * Tìm link chính thức cho nhiều trường cùng lúc
 * @param {Array<{schoolName: string, majorName: string}>} requests
 * @returns {Promise<Array<{schoolName: string, majorName: string, link: object|null}>>}
 */
async function findOfficialLinksBatch(requests) {
    const results = [];
    const concurrency = 3;

    for (let i = 0; i < requests.length; i += concurrency) {
        const batch = requests.slice(i, i + concurrency);
        const batchPromises = batch.map(async (req) => {
            try {
                const link = await findOfficialAdmissionLink(req.schoolName, req.majorName);
                return {
                    schoolName: req.schoolName,
                    majorName: req.majorName,
                    link: link,
                };
            } catch (err) {
                console.warn(`[WebSearch] Lỗi batch cho ${req.schoolName}:`, err.message);
                return {
                    schoolName: req.schoolName,
                    majorName: req.majorName,
                    link: null,
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

function _buildQueries(schoolName, majorName) {
    const queries = [];
    
    // Query 1: Ưu tiên cao nhất - trang tuyển sinh chính thức ngành học
    if (majorName) {
        queries.push(`tuyển sinh ngành ${majorName} trường ${schoolName}`);
        queries.push(`trang tuyển sinh ${schoolName} ${majorName}`);
        queries.push(`tuyensinh ${schoolName} ${majorName}`);
    } else {
        queries.push(`trang tuyển sinh chính thức ${schoolName}`);
    }

    // Query 2: Cổng tuyển sinh của trường
    queries.push(`${schoolName} cổng tuyển sinh đại học`);
    
    // Query 3: Website chính thức của trường
    queries.push(`trang chủ chính thức ${schoolName}`);

    return queries;
}

/**
 * Tìm link tốt nhất từ kết quả search
 */
function _findBestOfficialLink(results, schoolName, majorName) {
    let bestLink = null;
    let bestScore = -1;

    for (const result of results) {
        const url = result.link || '';
        const title = result.title || '';
        const snippet = result.snippet || '';

        // Loại bỏ các link hướng đến xem điểm chuẩn hoặc bảng điểm tuyển sinh
        const urlLower = url.toLowerCase();
        if (urlLower.includes('diem-chuan') || urlLower.includes('diemchuan') || urlLower.includes('diem-thi') || urlLower.includes('diemthi')) {
            continue;
        }
        const titleLower = title.toLowerCase();
        if (titleLower.includes('điểm chuẩn') || titleLower.includes('điểm thi') || titleLower.includes('bảng điểm')) {
            continue;
        }

        // Kiểm tra domain có phải là chính thức không
        const domainScore = _getDomainScore(url);
        if (domainScore <= 0) continue;

        // Kiểm tra title có liên quan không
        const relevanceScore = _getRelevanceScore(title, snippet, schoolName, majorName);
        if (relevanceScore <= 0) continue;

        // Tính điểm tổng
        const totalScore = domainScore + relevanceScore;

        console.log(`[WebSearch] Kết quả: "${title}" - domain: ${_extractDomain(url)} - score: ${totalScore}`);

        if (totalScore > bestScore) {
            bestScore = totalScore;
            bestLink = {
                url: url,
                title: title,
                domain: _extractDomain(url),
                snippet: snippet.substring(0, 200), // Giới hạn snippet
            };
        }
    }

    return bestScore >= 3 ? bestLink : null; // Yêu cầu điểm tối thiểu
}

/**
 * Lấy điểm domain (ưu tiên domain chính thức)
 */
function _getDomainScore(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        // Loại bỏ domain không đáng tin
        for (const untrusted of UNTRUSTED_DOMAINS) {
            if (hostname.includes(untrusted)) {
                return 0;
            }
        }

        // Ưu tiên domain chính thức
        for (const official of OFFICIAL_DOMAINS) {
            if (hostname.includes(official) || hostname.endsWith(official)) {
                // Ưu tiên cao hơn cho .edu.vn
                return official === '.edu.vn' ? 10 : 8;
            }
        }

        // Các trường tư/cao đẳng
        if (hostname.includes('.edu.') || hostname.includes('truong') || hostname.includes('dh-')) {
            return 6;
        }

        // Nguồn uy tín khác
        if (hostname.includes('tuyensinh247') || hostname.includes('tuyensinh.vn')) {
            return 7;
        }

        return 3; // Default
    } catch (e) {
        return 0;
    }
}

/**
 * Lấy điểm liên quan (title/snippet có chứa từ khóa đúng)
 */
function _getRelevanceScore(title, snippet, schoolName, majorName) {
    const text = (title + ' ' + snippet).toLowerCase();
    const schoolLower = schoolName.toLowerCase();
    const majorLower = majorName ? majorName.toLowerCase() : '';

    let score = 0;

    // Có tên trường trong title
    if (title.toLowerCase().includes(schoolLower) || schoolLower.includes(_extractSchoolCore(schoolLower))) {
        score += 2;
    }

    // Có tên ngành trong title (nếu có)
    if (majorLower && (title.toLowerCase().includes(majorLower) || majorLower.includes(_extractMajorCore(majorLower)))) {
        score += 2;
    }

    // Có từ khóa tuyển sinh
    const tuyensinhKeywords = ['tuyển sinh', 'điểm chuẩn', 'xét tuyển', 'trúng tuyển'];
    tuyensinhKeywords.forEach(kw => {
        if (text.includes(kw)) score += 1;
    });

    // Có năm gần đây
    if (text.includes('2025') || text.includes('2024')) {
        score += 1;
    }

    return score;
}

/**
 * Trích xuất tên trường cốt lõi (bỏ prefix thông dụng)
 */
function _extractSchoolCore(schoolName) {
    return schoolName
        .replace(/^(đại học|trường đại học|dh)\s*/gi, '')
        .replace(/\s*\(.*?\)\s*/g, '') // Bỏ text trong ngoặc
        .trim();
}

/**
 * Trích xuất tên ngành cốt lõi
 */
function _extractMajorCore(majorName) {
    return majorName
        .replace(/\s*\(.*?\)\s*/g, '')
        .replace(/\s*(ct|chương trình)\s*/gi, '')
        .trim();
}

/**
 * Trích xuất domain từ URL
 */
function _extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url;
    }
}

/**
 * Xóa cache
 */
function clearCache() {
    searchCache.clear();
    console.log('[WebSearch] Cache đã được xóa');
}

/**
 * Lấy thống kê cache
 */
function getCacheStats() {
    return {
        size: searchCache.size,
        entries: Array.from(searchCache.keys()).slice(0, 10)
    };
}

// Export các hàm
module.exports = {
    findOfficialAdmissionLink,
    findOfficialLinksBatch,
    clearCache,
    getCacheStats,
};
