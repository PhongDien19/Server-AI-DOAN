const axios = require('axios');
const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");
const { searchBenchmarkByYears, searchLatestBenchmark, searchTopMajors, searchUniversityBenchmark } = require("./serpapiService");
const verification = require("./verificationService");

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
    const scoreRegex = /\b(1[5-9]|2\d|30)(?:[.,]\d{1,2})?\b/g;

    for (const item of benchmarks) {
        if (item.extractedScore && typeof item.extractedScore === 'number') {
            if (item.extractedScore >= 15 && item.extractedScore <= 30) {
                scores.push(item.extractedScore);
            }
        }
        const snippet = item.snippet || '';
        // Loại bỏ các mẫu ngày tháng dạng dd/mm hoặc mm/dd trước để tránh nhận diện sai
        const cleanedSnippet = snippet.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '');
        const matches = cleanedSnippet.match(scoreRegex);
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
 * Lấy điểm chuẩn cho một trường + ngành.
 * Ưu tiên nguồn đã xác minh (crawler benchmarkScores.js) trước,
 * nếu không có mới gọi SerpAPI (ước lượng).
 *
 * @returns {Promise<{benchmark: string|null, year: number|null, source: string, verified: boolean} | null>}
 */
async function getBenchmarkFromSerpAPI(universityName, major = null) {
    // 1) Ưu tiên cache crawler (nguồn đã xác minh)
    try {
        const cached = verification.lookupBenchmarkFromCache(universityName, major);
        if (cached && cached.value !== null) {
            return {
                benchmark: cached.value.toFixed(1),
                year: cached.year,
                source: 'crawler',
                verified: true
            };
        }
    } catch (e) {
        console.warn('[SearchService] Lỗi tra cache crawler:', e.message);
    }

    // 2) Fallback sang SerpAPI (ước lượng)
    try {
        if (!process.env.SERPAPI_API_KEY) {
            console.warn('[SearchService] SERPAPI_API_KEY chưa được cấu hình');
            return null;
        }

        const result = await searchLatestBenchmark(universityName, major, 2025, [2024, 2023]);
        if (!result || result.benchmark == null) {
            return null;
        }

        // Lọc qua normalizeBenchmark để đảm bảo thuộc thang 30
        const norm = verification.normalizeBenchmark(result.benchmark, 'serpapi');
        if (norm.value === null) {
            console.warn(`[SearchService] Điểm từ SerpAPI (${result.benchmark}) nằm ngoài thang 30 -> bỏ`);
            return null;
        }

        return {
            benchmark: norm.value.toFixed(1),
            year: result.year,
            source: 'serpapi',
            verified: false
        };
    } catch (error) {
        console.error('[SearchService] Lỗi khi lấy điểm chuẩn từ SerpAPI:', error.message);
        return null;
    }
}

/**
 * Whitelist trường & helper xác minh được dùng chung qua verificationService.
 * (Tránh định nghĩa trùng lặp; mọi nơi trong file này sẽ gọi qua `verification.*`)
 */
const SCHOOL_DIRECTORY = verification.SCHOOL_DIRECTORY;
const getLocationAliases = verification.getLocationAliases;
const lookupSchoolInDirectory = verification.lookupSchool;
const filterSchoolsByLocation = verification.filterSchoolsByLocation;
const normalizeSchoolInDirectory = verification.normalizeSchool;
const normalizeBenchmark = verification.normalizeBenchmark;

/**
 * Gợi ý danh sách trường đào tạo ngành bằng Gemini (khi SerpAPI lỗi hoặc hết quota)
 * - Chỉ giữ tên thuộc whitelist (verificationService.SCHOOL_DIRECTORY)
 * - Nếu có chọn khu vực -> lọc đúng khu vực
 */
async function getSchoolsFromGeminiFallback(majorName, location = null) {
    console.log(`[Gemini Fallback] Đang lấy danh sách trường đào tạo ngành: "${majorName}" tại "${location || 'Toàn quốc'}"...`);
    try {
        const prompt = `Bạn là chuyên gia hướng nghiệp tại Việt Nam.
Người dùng đang tìm kiếm danh sách các trường đại học tiêu biểu nhất đào tạo ngành: "${majorName}" ở khu vực "${location || 'Toàn quốc'}".
Hãy gợi ý tối đa 5 trường đại học phù hợp nhất.

Hãy trả về dữ liệu dưới dạng JSON chuẩn xác theo cấu trúc sau:
{
  "schools": [
    {
      "schoolName": "Tên trường đầy đủ (ví dụ: Đại học Bách khoa Hà Nội)"
    }
  ]
}

Yêu cầu:
1. Chỉ trả về chuỗi JSON thô, không kèm định dạng markdown (không có dấu \`\`\`json), không giải thích gì thêm.
2. Danh sách trường phải thực tế và có đào tạo ngành này.`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log('[Gemini Fallback] Response trường từ Gemini:', text);
        
        const parsed = extractJsonFromText(text);
        if (!parsed || !parsed.schools || !Array.isArray(parsed.schools)) {
            throw new Error("Không thể phân tích danh sách trường từ Gemini");
        }
        
        const result = {
            searchType: 'major_only',
            majorName: majorName,
            location: location || 'Toàn quốc',
            summary: `Danh sách ${parsed.schools.length} trường đại học hàng đầu đào tạo ngành ${majorName} (Được đề xuất bởi AI)`,
            schools: []
        };
        
        const allowedLocations = verification.getLocationAliases(location);
        for (const s of parsed.schools) {
            const normSchool = verification.normalizeSchool(s.schoolName, location);
            if (!normSchool.verified) {
                console.warn(`[Gemini Fallback] Bỏ trường không xác minh: ${s.schoolName}`);
                continue;
            }
            if (allowedLocations &&
                !allowedLocations.includes(normSchool.location.toLowerCase())) {
                continue;
            }

            const schoolInfo = {
                schoolName: normSchool.canonical,
                location: normSchool.location || location || 'Việt Nam',
                schoolVerified: true,
                benchmark: null,
                benchmarkYear: null,
                benchmarkSource: null,
                benchmarkVerified: false
            };

            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(normSchool.canonical, majorName);
                if (benchmarkData && benchmarkData.benchmark) {
                    schoolInfo.benchmark = benchmarkData.benchmark;
                    schoolInfo.benchmarkYear = benchmarkData.year;
                    schoolInfo.benchmarkSource = benchmarkData.source;
                    schoolInfo.benchmarkVerified = benchmarkData.verified;
                }
            } catch (err) {
                console.warn(`[Gemini Fallback] Lỗi lấy điểm cho ${s.schoolName}:`, err.message);
            }

            result.schools.push(schoolInfo);
        }

        return result;
    } catch (error) {
        console.error('[Gemini Fallback] Thất bại hoàn toàn:', error.message);
        throw error;
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
        const query = `điểm chuẩn ngành ${majorName}${locationQuery} 2025 các trường đại học`;

        console.log(`[SearchService] Query SerpAPI: "${query}"`);
        
        let organicResults = [];
        try {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google',
                    q: query,
                    api_key: apiKey,
                    num: 20,
                    gl: 'vn',
                    hl: 'vi'
                },
                timeout: 30000
            });
            organicResults = response.data.organic_results || [];
        } catch (apiErr) {
            console.warn('[SearchService] SerpAPI tìm trường thất bại:', apiErr.message);
            // Kích hoạt Gemini Fallback để lấy danh sách trường và điểm
            return await getSchoolsFromGeminiFallback(majorName, location);
        }
        
        // Trích xuất trường từ kết quả tìm kiếm - chỉ giữ tên nằm trong whitelist
        const schoolsMap = new Map();

        // Lấy text đầy đủ để quét tên trường
        const allText = organicResults.map(r => `${r.title || ''} ${r.snippet || ''}`).join('\n');
        const allowedLocations = getLocationAliases(location);

        // 1) Quét theo whitelist trước (ưu tiên các trường nằm trong khu vực yêu cầu)
        for (const entry of SCHOOL_DIRECTORY) {
            const isInRegion = allowedLocations
                ? allowedLocations.includes(entry.location.toLowerCase())
                : true;
            if (!isInRegion) continue;

            const aliasSet = [...entry.aliases, entry.canonical.toLowerCase()];
            for (const alias of aliasSet) {
                if (alias.length < 5) continue;
                if (allText.toLowerCase().includes(alias)) {
                    const key = entry.canonical.toLowerCase();
                    if (!schoolsMap.has(key)) {
                        // Tìm điểm trong các snippet liên quan
                        let bestScore = null;
                        for (const result of organicResults) {
                            const text = `${result.title || ''} ${result.snippet || ''}`;
                            if (text.toLowerCase().includes(alias)) {
                                const score = extractBenchmarkFromSnippet(result.snippet || '');
                                if (score !== null) {
                                    bestScore = score;
                                    break;
                                }
                            }
                        }

                        schoolsMap.set(key, {
                            schoolName: entry.canonical,
                            location: entry.location,
                            score: bestScore,
                            link: null,
                            snippet: '',
                            sourceTitle: 'whitelist',
                        });
                    }
                    break; // đã khớp canonical này, không cần duyệt alias khác
                }
            }
        }

        // 2) Nếu whitelist chưa đủ 3 và người dùng có chọn khu vực,
        //    bổ sung bằng SerpAPI nhưng CHỈ giữ tên khớp whitelist (chống cắt cụt/ảo)
        if (schoolsMap.size < 3) {
            console.log('[SearchService] Whitelist chưa đủ, bổ sung thêm từ SerpAPI...');
            const query2 = `top các trường đào tạo ${majorName} tại ${location || 'Việt Nam'}`;
            try {
                const response2 = await axios.get('https://serpapi.com/search', {
                    params: {
                        engine: 'google',
                        q: query2,
                        api_key: apiKey,
                        num: 15,
                        gl: 'vn',
                        hl: 'vi'
                    },
                    timeout: 30000
                });
                const organicResults2 = response2.data.organic_results || [];
                const allText2 = organicResults2.map(r => `${r.title || ''} ${r.snippet || ''}`).join('\n');

                for (const entry of SCHOOL_DIRECTORY) {
                    const isInRegion = allowedLocations
                        ? allowedLocations.includes(entry.location.toLowerCase())
                        : true;
                    if (!isInRegion) continue;
                    const key = entry.canonical.toLowerCase();
                    if (schoolsMap.has(key)) continue;

                    const aliasSet = [...entry.aliases, entry.canonical.toLowerCase()];
                    for (const alias of aliasSet) {
                        if (alias.length < 5) continue;
                        if (allText2.toLowerCase().includes(alias)) {
                            schoolsMap.set(key, {
                                schoolName: entry.canonical,
                                location: entry.location,
                                score: null,
                                link: null,
                                snippet: '',
                                sourceTitle: 'whitelist-supp'
                            });
                            break;
                        }
                    }
                }
            } catch (apiErr2) {
                console.warn('[SearchService] Query bổ sung thất bại:', apiErr2.message);
            }
        }

        // 3) Nếu vẫn chưa đủ 3 và có khu vực cụ thể, bổ sung bằng Gemini (fallback có kiểm tra whitelist)
        if (schoolsMap.size < 3) {
            console.log('[SearchService] Bổ sung bằng Gemini Fallback...');
            try {
                const geminiResult = await getSchoolsFromGeminiFallback(majorName, location);
                if (geminiResult && Array.isArray(geminiResult.schools)) {
                    for (const sch of geminiResult.schools) {
                        const entry = lookupSchoolInDirectory(sch.schoolName);
                        if (!entry) continue;
                        if (allowedLocations &&
                            !allowedLocations.includes(entry.location.toLowerCase())) {
                            continue;
                        }
                        const key = entry.canonical.toLowerCase();
                        if (schoolsMap.has(key)) continue;
                        schoolsMap.set(key, {
                            schoolName: entry.canonical,
                            location: entry.location,
                            score: sch.benchmark ? parseFloat(sch.benchmark) : null,
                            link: null,
                            snippet: '',
                            sourceTitle: 'gemini'
                        });
                    }
                }
            } catch (geminiErr) {
                console.warn('[SearchService] Gemini fallback lỗi:', geminiErr.message);
            }
        }

        // 4) Nếu cuối cùng vẫn chưa đủ 5, thêm các trường whitelist phổ biến theo ngành + khu vực
        if (schoolsMap.size < 5) {
            const majorLower = majorName.toLowerCase();
            const extraByMajor = {
                'thiết kế đồ họa': ['Trường Đại học Kiến trúc Đà Nẵng', 'Trường Đại học Mỹ thuật Đà Nẵng', 'Đại học Bách khoa - ĐH Đà Nẵng', 'Đại học Sư phạm - ĐH Đà Nẵng'],
                'thiết kế': ['Trường Đại học Kiến trúc Đà Nẵng', 'Trường Đại học Mỹ thuật Đà Nẵng', 'Đại học Bách khoa - ĐH Đà Nẵng'],
                'đồ họa': ['Trường Đại học Kiến trúc Đà Nẵng', 'Trường Đại học Mỹ thuật Đà Nẵng'],
                'mỹ thuật': ['Trường Đại học Mỹ thuật Đà Nẵng', 'Trường Đại học Mỹ thuật Việt Nam', 'Trường Đại học Mỹ thuật TP.HCM'],
                'công nghệ thông tin': ['Đại học Bách khoa - ĐH Đà Nẵng', 'Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng', 'Trường Đại học Duy Tân'],
                'it': ['Đại học Bách khoa - ĐH Đà Nẵng', 'Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng', 'Trường Đại học Duy Tân'],
                'kinh tế': ['Đại học Kinh tế - ĐH Đà Nẵng', 'Đại học Bách khoa - ĐH Đà Nẵng'],
                'sư phạm': ['Đại học Sư phạm - ĐH Đà Nẵng', 'Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng'],
            };

            const candidates = extraByMajor[majorLower] || [];
            for (const cand of candidates) {
                if (schoolsMap.size >= 5) break;
                const entry = lookupSchoolInDirectory(cand);
                if (!entry) continue;
                if (allowedLocations &&
                    !allowedLocations.includes(entry.location.toLowerCase())) {
                    continue;
                }
                const key = entry.canonical.toLowerCase();
                if (schoolsMap.has(key)) continue;
                schoolsMap.set(key, {
                    schoolName: entry.canonical,
                    location: entry.location,
                    score: null,
                    link: null,
                    snippet: '',
                    sourceTitle: 'default-region'
                });
            }
        }

        // Nếu người dùng có chọn khu vực, áp bộ lọc khu vực cuối cùng
        // để chắc chắn không lọt trường ngoài khu vực.
        let schools = Array.from(schoolsMap.values());
        schools = filterSchoolsByLocation(schools, location);

        // Sắp xếp theo điểm (cao nhất trước)
        schools.sort((a, b) => {
            if (a.score && b.score) return b.score - a.score;
            if (a.score) return -1;
            if (b.score) return 1;
            return 0;
        });

        // Lấy top 5 trường
        const topSchools = schools.slice(0, 5);
        console.log(`[SearchService] Tìm được ${topSchools.length} trường:`, topSchools.map(s => s.schoolName));

        // Gọi SerpAPI để lấy điểm chuẩn MỚI NHẤT (1 năm gần nhất) cho từng trường
        const result = {
            searchType: 'major_only',
            majorName: majorName,
            location: location || 'Toàn quốc',
            summary: `Danh sách ${topSchools.length} trường đại học hàng đầu đào tạo ngành ${majorName}`,
            schools: []
        };

        for (const school of topSchools) {
            const normSchool = verification.normalizeSchool(school.schoolName, school.location);
            const schoolInfo = {
                schoolName: normSchool.canonical,
                location: normSchool.location || location || 'Việt Nam',
                schoolVerified: normSchool.verified,
                benchmark: null,
                benchmarkYear: null,
                benchmarkSource: null,
                benchmarkVerified: false
            };

            try {
                // Lấy điểm chuẩn MỚI NHẤT (đã ưu tiên cache crawler ở getBenchmarkFromSerpAPI)
                const benchmarkData = await getBenchmarkFromSerpAPI(normSchool.canonical, majorName);
                if (benchmarkData && benchmarkData.benchmark) {
                    schoolInfo.benchmark = benchmarkData.benchmark;
                    schoolInfo.benchmarkYear = benchmarkData.year;
                    schoolInfo.benchmarkSource = benchmarkData.source;
                    schoolInfo.benchmarkVerified = benchmarkData.verified;
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi lấy điểm cho ${school.schoolName}:`, err.message);
            }

            // Bỏ những trường có tên ảo (không nằm trong whitelist)
            if (!schoolInfo.schoolVerified) {
                console.warn(`[SearchService] Bỏ trường không xác minh: ${school.schoolName}`);
                continue;
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
    const scoreRegex = /\b(1[5-9]|2\d|30)(?:[.,]\d{1,2})?\b/g;
    
    for (const line of lines) {
        // Loại bỏ các mẫu ngày tháng dạng dd/mm hoặc mm/dd trước để tránh nhận diện sai
        const cleanedLine = line.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '');
        const lineScores = cleanedLine.match(scoreRegex);
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
 * Gợi ý danh sách ngành học tiêu biểu của trường bằng Gemini (khi SerpAPI lỗi hoặc hết quota)
 */
async function getTopMajorsFromGeminiFallback(schoolName, location = null) {
    console.log(`[Gemini Fallback] Đang tìm các ngành hot của trường: ${schoolName}...`);
    try {
        const prompt = `Bạn là chuyên gia tư vấn tuyển sinh đại học tại Việt Nam.
Người dùng muốn biết top 5 ngành học tiêu biểu nhất (hot nhất, điểm chuẩn cao hoặc nhiều người quan tâm) của trường: "${schoolName}".

Hãy trả về dữ liệu dưới dạng JSON chuẩn xác theo cấu trúc sau:
{
  "majors": [
    {
      "majorName": "Tên ngành (ví dụ: Công nghệ thông tin)"
    }
  ]
}

Yêu cầu:
1. Chỉ trả về chuỗi JSON thô, không kèm định dạng markdown (không có dấu \`\`\`json), không giải thích gì thêm.
2. Các ngành phải thực tế nằm trong danh mục đào tạo của trường này.`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log('[Gemini Fallback] Top majors response từ Gemini:', text);
        
        const parsed = extractJsonFromText(text);
        if (!parsed || !parsed.majors || !Array.isArray(parsed.majors)) {
            throw new Error("Không thể phân tích danh sách ngành từ Gemini");
        }
        
        const normSchool = verification.normalizeSchool(schoolName, location);
        if (!normSchool.verified) {
            console.warn(`[Gemini Fallback School] Trường "${schoolName}" không nằm trong whitelist.`);
            return {
                searchType: 'school_only',
                schoolName: schoolName,
                location: location || 'Việt Nam',
                summary: `Không tìm thấy thông tin đáng tin cậy cho trường "${schoolName}".`,
                topMajors: [],
                schoolVerified: false
            };
        }

        const result = {
            searchType: 'school_only',
            schoolName: normSchool.canonical,
            schoolVerified: true,
            location: normSchool.location || location || 'Việt Nam',
            summary: `TOP ${parsed.majors.length} ngành đào tạo hot nhất tại ${normSchool.canonical} (Đề xuất bởi AI)`,
            topMajors: []
        };

        for (const m of parsed.majors) {
            const majorInfo = {
                majorName: m.majorName,
                benchmark: null,
                benchmarkYear: null,
                benchmarkSource: null,
                benchmarkVerified: false,
                schoolVerified: true
            };

            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(normSchool.canonical, m.majorName);
                if (benchmarkData && benchmarkData.benchmark) {
                    majorInfo.benchmark = benchmarkData.benchmark;
                    majorInfo.benchmarkYear = benchmarkData.year;
                    majorInfo.benchmarkSource = benchmarkData.source;
                    majorInfo.benchmarkVerified = benchmarkData.verified;
                }
            } catch (err) {
                console.warn(`[Gemini Fallback] Lỗi lấy điểm ngành ${m.majorName}:`, err.message);
            }

            result.topMajors.push(majorInfo);
        }

        return result;
    } catch (error) {
        console.error('[Gemini Fallback School] Thất bại hoàn toàn:', error.message);
        throw error;
    }
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
        let topMajorsResult;
        try {
            topMajorsResult = await searchTopMajors(schoolName, 5);
            if (!topMajorsResult.success) {
                throw new Error(topMajorsResult.error || 'Không tìm thấy thông tin');
            }
        } catch (apiErr) {
            console.warn('[SearchService] SerpAPI tìm ngành hot thất bại:', apiErr.message);
            // Kích hoạt Gemini Fallback để tìm ngành hot và điểm chuẩn
            return await getTopMajorsFromGeminiFallback(schoolName, location);
        }

        // Chuẩn hoá tên trường
        const normSchool = verification.normalizeSchool(schoolName, location);
        const finalSchoolName = normSchool.verified ? normSchool.canonical : schoolName;
        const finalLocation = normSchool.verified ? (normSchool.location || location || 'Việt Nam') : (location || 'Việt Nam');

        const result = {
            searchType: 'school_only',
            schoolName: finalSchoolName,
            location: finalLocation,
            summary: `TOP 5 ngành đào tạo hot nhất tại ${finalSchoolName}`,
            topMajors: []
        };

        // Lấy điểm chuẩn MỚI NHẤT (1 năm gần nhất) cho từng ngành
        for (const major of topMajorsResult.majors) {
            const majorInfo = {
                majorName: major.majorName,
                benchmark: null,
                benchmarkYear: null,
                benchmarkSource: null,
                benchmarkVerified: false,
                schoolVerified: normSchool.verified
            };

            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(normSchool.canonical, major.majorName);
                if (benchmarkData && benchmarkData.benchmark) {
                    majorInfo.benchmark = benchmarkData.benchmark;
                    majorInfo.benchmarkYear = benchmarkData.year;
                    majorInfo.benchmarkSource = benchmarkData.source;
                    majorInfo.benchmarkVerified = benchmarkData.verified;
                } else if (major.score) {
                    const norm = verification.normalizeBenchmark(major.score, 'serpapi');
                    if (norm.value !== null) {
                        majorInfo.benchmark = norm.value.toFixed(1);
                        majorInfo.benchmarkYear = 2025;
                        majorInfo.benchmarkSource = 'serpapi';
                        majorInfo.benchmarkVerified = false;
                    }
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi lấy điểm ngành ${major.majorName}:`, err.message);
            }

            result.topMajors.push(majorInfo);

            // Delay để tránh rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        result.schoolName = normSchool.canonical;
        result.location = normSchool.location || location || 'Việt Nam';
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
 *    -> Trả thông tin trường + TOP 5 ngành HOT của trường kèm điểm chuẩn MỚI NHẤT (1 năm gần nhất)
 *    -> Sử dụng SerpAPI để tìm ngành và điểm
 * 
 * 2. CHỈ CÓ TÊN NGÀNH (school trống):
 *    -> Gợi ý danh sách trường đào tạo ngành này + điểm chuẩn MỚI NHẤT (1 năm gần nhất) cho từng trường
 *    -> Sử dụng SerpAPI để tìm trường và điểm
 * 
 * 3. CÓ CẢ TRƯỜNG VÀ NGÀNH:
 *    -> Trả thông tin trường + điểm chuẩn ngành cụ thể MỚI NHẤT (1 năm gần nhất)
 *    -> Sử dụng SerpAPI để lấy điểm
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        // ========== XÁC ĐỊNH TRƯỜNG HỢP CẦN XỬ LÝ ==========
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

            const normSchool = verification.normalizeSchool(school, location);
            const finalSchoolName = normSchool.verified ? normSchool.canonical : school;
            const finalLocation = normSchool.verified ? (normSchool.location || location || 'Việt Nam') : (location || 'Việt Nam');

            const result = {
                searchType: 'school_and_major',
                schoolName: finalSchoolName,
                schoolVerified: normSchool.verified,
                majorName: industry,
                location: finalLocation,
                summary: `Thông tin trường ${finalSchoolName} và ngành ${industry}`,
                majorInfo: {
                    majorName: industry,
                    benchmark: null,
                    benchmarkYear: null,
                    benchmarkSource: null,
                    benchmarkVerified: false
                }
            };

            // Gọi SerpAPI để lấy điểm chuẩn ngành của trường (đã ưu tiên cache crawler)
            try {
                const benchmarkData = await getBenchmarkFromSerpAPI(normSchool.canonical, industry);
                if (benchmarkData && benchmarkData.benchmark) {
                    result.majorInfo.benchmark = benchmarkData.benchmark;
                    result.majorInfo.benchmarkYear = benchmarkData.year;
                    result.majorInfo.benchmarkSource = benchmarkData.source;
                    result.majorInfo.benchmarkVerified = benchmarkData.verified;
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

NHIỆM VỤ: Gợi ý danh sách CHÍNH XÁC 5 công ty/doanh nghiệp tiêu biểu đang tuyển dụng.

YÊU CẦU BẮT BUỘC:
1. Ưu tiên công ty nằm trong khu vực "${location || 'Toàn quốc'}"
2. Với mỗi công ty, bắt buộc trả về:
   - companyName: Tên đầy đủ của công ty
   - location: Tỉnh/Thành phố
   - description: Mô tả ngắn gọn
   - positions: Danh sách vị trí đang tuyển
   - website: Link trang chủ chính thức của công ty (VD: https://fpt.com.vn)
   - careerLink: Link trang tuyển dụng (nếu biết, không có thì để null)

QUAN TRỌNG:
- CHỈ trả về ĐÚNG 5 công ty, không hơn không kém
- Link website phải là URL thật của trang chủ công ty (https://...)
- Tránh các trang trung gian, mạng xã hội

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "summary": "Tóm tắt ngắn gọn về nhu cầu tuyển dụng...",
  "companies": [
    {
      "companyName": "Tên công ty",
      "location": "Tỉnh/Thành phố",
      "description": "Mô tả ngắn gọn...",
      "positions": ["Vị trí 1", "Vị trí 2"],
      "website": "https://example.com",
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

            // Giới hạn chỉ lấy tối đa 5 công ty và đảm bảo có trường website
            if (parsed.companies && Array.isArray(parsed.companies)) {
                parsed.companies = parsed.companies.slice(0, 5).map(c => ({
                    companyName: c.companyName || '',
                    location: c.location || '',
                    description: c.description || '',
                    positions: Array.isArray(c.positions) ? c.positions : [],
                    website: c.website || null,
                    careerLink: c.careerLink || null
                }));
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
