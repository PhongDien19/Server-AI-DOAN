const axios = require('axios');
const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");
const verification = require("./verificationService");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: { 
        temperature: 0.3
    },
    tools: [{ googleSearch: {} }]
});

/**
 * Lấy điểm chuẩn cho một trường + ngành.
 * Ưu tiên nguồn đã xác minh (crawler benchmarkScores.js) trước,
 * nếu không có mới gọi Gemini Grounding (AI) để tra cứu trực tuyến.
 *
 * @returns {Promise<{benchmark: string|null, year: number|null, source: string, verified: boolean} | null>}
 */
async function getBenchmarkFromAI(universityName, major = null) {
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

    // 2) Fallback sang AI Grounding (tra cứu trực tuyến bằng Gemini nhắm tới năm 2025)
    try {
        const majorPrompt = major ? `ngành: "${major}"` : '';
        const prompt = `Bạn là một AI chuyên gia trích xuất dữ liệu tuyển sinh đại học có độ chính xác cao tại Việt Nam.
Nhiệm vụ của bạn là tra cứu thông tin điểm chuẩn của năm 2025 của trường: "${universityName}" ${majorPrompt} từ internet (sử dụng công cụ tìm kiếm của bạn) và trả về kết quả chính xác nhất.

HƯỚNG DẪN XỬ LÝ DỮ LIỆU NGHIÊM NGẶT:
1. Quy trình suy luận từng bước (Chain-of-Thought):
   - Bước 1: Tra cứu trực tuyến để tìm các trang web uy tín (tuyensinh247, vnexpress, vietnamnet, v.v.) nói về điểm chuẩn tuyển sinh năm 2025 của trường "${universityName}".
   - Bước 2: Tìm đúng ngành "${major || ''}" trong các kết quả tìm kiếm điểm chuẩn năm 2025. Chú ý các bảng điểm có thể bị lỗi định dạng hoặc vỡ dòng trong kết quả thô.
   - Bước 3: Xác định đúng phương thức xét tuyển trúng tuyển chính thức (ưu tiên xét điểm thi tốt nghiệp THPT năm 2025). Không lấy điểm sàn nhận hồ sơ.
   - Bước 4: Kiểm tra định dạng điểm số, thực hiện tự động sửa lỗi dấu phẩy thành dấu chấm (ví dụ: 25,5 -> 25.5). Quy đổi về hệ điểm thang 30 nếu trường dùng thang điểm khác (ví dụ: thang 40).
   - Bước 5: Điền thông tin vào định dạng JSON yêu cầu.

2. Quy tắc tự sửa lỗi định dạng số:
   - Nếu điểm số tìm thấy sử dụng dấu phẩy (ví dụ: 24,75 hoặc 25,5), bắt buộc phải tự động chuyển thành dấu chấm (24.75 hoặc 25.5) trong trường "benchmark".
   - Trường "benchmark" phải là một số thực (FLOAT) hợp lệ hoặc null. Không bao giờ chứa dấu phẩy hay ký tự lạ.
   - Nếu điểm là số nguyên (ví dụ: 25), hãy biểu diễn dưới dạng số (25 hoặc 25.0).

3. Nới lỏng định dạng (Mental Slack):
   - Nếu không tìm thấy điểm chuẩn năm 2025 chính thức, hoặc chỉ có điểm sàn nhận hồ sơ của năm 2025, hãy điền null vào trường "benchmark" và ghi chú rõ lý do hoặc dữ liệu mập mờ vào trường "raw_status" (ví dụ: "Chỉ tìm thấy điểm sàn năm 2025").

4. Ví dụ mẫu (Few-Shot Prompting):
   [Ví dụ 1: Dữ liệu chuẩn]
   Tìm thấy: "Ngành Công nghệ thông tin Đại học Bách khoa Hà Nội lấy 25.04 điểm thi THPT năm 2025."
   JSON trả về: { "benchmark": 25.04, "year": 2025, "method": "Xét điểm thi THPT", "raw_status": "Thành công" }

   [Ví dụ 2: Dữ liệu sử dụng dấu phẩy]
   Tìm thấy: "Điểm trúng tuyển ngành Sư phạm Toán năm 2025 trường Đại học Sư phạm Hà Nội là 26,75 điểm."
   JSON trả về: { "benchmark": 26.75, "year": 2025, "method": "Xét điểm thi tốt nghiệp THPT", "raw_status": "Thành công - Đã chuyển dấu phẩy thành dấu chấm" }

   [Ví dụ 3: Bảng dữ liệu bị vỡ dòng hoặc viết tắt]
   Tìm thấy: "Mã ngành|Tên ngành|Điểm\n7480201|CNTT|25,5" (dành cho năm 2025)
   JSON trả về: { "benchmark": 25.5, "year": 2025, "method": "Xét điểm thi THPT", "raw_status": "Thành công - Nhận diện từ CNTT viết tắt" }

   [Ví dụ 4: Không có điểm trúng tuyển chính thức rõ ràng năm 2025, chỉ có điểm sàn]
   Tìm thấy: "Trường vừa công bố điểm sàn nhận hồ sơ xét tuyển ngành CNTT năm 2025 là 19,0 điểm."
   JSON trả về: { "benchmark": null, "year": 2025, "method": null, "raw_status": "Chỉ tìm thấy điểm sàn nhận hồ sơ năm 2025 là 19.0, chưa có điểm chuẩn chính thức" }

ĐẦU RA BẮT BUỘC:
Chỉ trả về chuỗi JSON thô, không kèm định dạng markdown (không có dấu \`\`\`json), không giải thích gì thêm ngoài JSON.
JSON cấu trúc chính xác như sau:
{
  "benchmark": <số thực hoặc null>,
  "year": 2025,
  "method": "<phương thức xét tuyển hoặc null>",
  "raw_status": "<ghi chú/lý do trích xuất hoặc tình trạng dữ liệu>"
}`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log(`[SearchService] AI response cho điểm chuẩn ${universityName} - ${major || ''}:`, text);

        const parsed = extractJsonFromText(text);
        if (!parsed) {
            return null;
        }

        if (parsed.raw_status) {
            console.log(`[SearchService] AI raw_status: ${parsed.raw_status}`);
        }

        if (parsed.benchmark == null) {
            return null;
        }

        // Lọc qua normalizeBenchmark để đảm bảo thuộc thang 30
        const norm = verification.normalizeBenchmark(parsed.benchmark, 'gemini-grounding');
        if (norm.value === null) {
            console.warn(`[SearchService] Điểm từ AI (${parsed.benchmark}) nằm ngoài thang 30 -> bỏ`);
            return null;
        }

        return {
            benchmark: norm.value.toFixed(1),
            year: parsed.year || 2025,
            source: 'gemini-grounding',
            verified: false
        };
    } catch (error) {
        console.error('[SearchService] Lỗi khi lấy điểm chuẩn từ AI:', error.message);
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
 * Lấy điểm chuẩn cho một trường và DANH SÁCH các ngành bằng AI Grounding trong một request duy nhất (Batching).
 */
async function getBenchmarksFromAIBatched(universityName, majors) {
    if (!majors || majors.length === 0) return {};

    try {
        const prompt = `Bạn là một AI chuyên gia trích xuất dữ liệu tuyển sinh đại học có độ chính xác cao tại Việt Nam.
Nhiệm vụ của bạn là tra cứu thông tin điểm chuẩn năm 2025 của trường: "${universityName}" cho danh sách các ngành dưới đây từ internet (sử dụng công cụ tìm kiếm của bạn) và trả về kết quả chính xác nhất.

Danh sách ngành cần tra cứu:
${majors.map((m, idx) => `${idx + 1}. "${m}"`).join('\n')}

HƯỚNG DẪN XỬ LÝ DỮ LIỆU NGHIÊM NGẶT:
1. Quy trình suy luận từng bước (Chain-of-Thought):
   - Bước 1: Tra cứu trực tuyến để tìm các trang web uy tín (tuyensinh247, vnexpress, vietnamnet, v.v.) nói về điểm chuẩn tuyển sinh năm 2025 của trường "${universityName}".
   - Bước 2: Tìm đúng từng ngành trong danh sách các ngành trên trong các kết quả tìm kiếm.
   - Bước 3: Xác định đúng phương thức xét tuyển trúng tuyển chính thức (ưu tiên xét điểm thi tốt nghiệp THPT năm 2025). Không lấy điểm sàn nhận hồ sơ.
   - Bước 4: Kiểm tra định dạng điểm số, thực hiện tự động sửa lỗi dấu phẩy thành dấu chấm (ví dụ: 25,5 -> 25.5). Quy đổi về hệ điểm thang 30 nếu trường dùng thang điểm khác (ví dụ: thang 40).
   - Bước 5: Điền thông tin vào định dạng JSON yêu cầu.

2. Quy tắc tự sửa lỗi định dạng số:
   - Nếu điểm số tìm thấy sử dụng dấu phẩy (ví dụ: 24,75 hoặc 25,5), bắt buộc phải tự động chuyển thành dấu chấm (24.75 hoặc 25.5) trong trường "benchmark".
   - Trường "benchmark" phải là một số thực (FLOAT) hợp lệ hoặc null. Không bao giờ chứa dấu phẩy hay ký tự lạ.
   - Nếu điểm là số nguyên (ví dụ: 25), hãy biểu diễn dưới dạng số (25 hoặc 25.0).

3. Nới lỏng định dạng (Mental Slack):
   - Nếu không tìm thấy điểm chuẩn năm 2025 chính thức, hoặc chỉ có điểm sàn nhận hồ sơ của năm 2025 cho một ngành nào đó, hãy điền null vào trường "benchmark" và ghi chú rõ lý do vào trường "raw_status".

ĐẦU RA BẮT BUỘC:
Chỉ trả về chuỗi JSON thô, không kèm định dạng markdown (không có dấu \`\`\`json), không giải thích gì thêm ngoài JSON.
JSON cấu trúc chính xác như sau:
{
  "results": [
    {
      "majorName": "<tên ngành gốc được yêu cầu>",
      "benchmark": <số thực hoặc null>,
      "year": 2025,
      "method": "<phương thức xét tuyển hoặc null>",
      "raw_status": "<ghi chú/lý do trích xuất hoặc tình trạng dữ liệu>"
    }
  ]
}
`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log(`[SearchService] AI batched response cho điểm chuẩn ${universityName}:`, text);

        const parsed = extractJsonFromText(text);
        if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
            console.warn(`[SearchService] Không thể phân tích JSON điểm chuẩn gộp cho ${universityName}`);
            return {};
        }

        const benchmarkMap = {};
        for (const item of parsed.results) {
            if (item.benchmark == null) continue;
            
            const norm = verification.normalizeBenchmark(item.benchmark, 'gemini-grounding');
            if (norm.value === null) {
                console.warn(`[SearchService] Điểm của ngành ${item.majorName} từ AI (${item.benchmark}) nằm ngoài thang 30 -> bỏ`);
                continue;
            }

            benchmarkMap[item.majorName.toLowerCase().trim()] = {
                benchmark: norm.value.toFixed(1),
                year: item.year || 2025,
                source: 'gemini-grounding',
                verified: false
            };
        }

        return benchmarkMap;
    } catch (error) {
        console.error(`[SearchService] Lỗi khi lấy điểm chuẩn gộp cho ${universityName}:`, error.message);
        return {};
    }
}

/**
 * Lấy điểm chuẩn ngành cho DANH SÁCH các trường đại học bằng AI Grounding trong một request duy nhất (Batching).
 */
async function getBenchmarksForSchoolsBatched(schoolsList, majorName) {
    if (!schoolsList || schoolsList.length === 0) return {};

    try {
        const prompt = `Bạn là một AI chuyên gia trích xuất dữ liệu tuyển sinh đại học có độ chính xác cao tại Việt Nam.
Nhiệm vụ của bạn là tra cứu trực tuyến thông tin điểm chuẩn năm 2025 của ngành: "${majorName}" của các trường đại học dưới đây từ internet (sử dụng công cụ tìm kiếm của bạn) và trả về kết quả chính xác nhất.

Danh sách trường cần tra cứu:
${schoolsList.map((s, idx) => `${idx + 1}. "${s}"`).join('\n')}

HƯỚNG DẪN XỬ LÝ DỮ LIỆU NGHIÊM NGẶT:
1. Quy trình suy luận từng bước (Chain-of-Thought):
   - Bước 1: Tra cứu trực tuyến điểm chuẩn năm 2025 của ngành "${majorName}" cho từng trường trong danh sách.
   - Bước 2: Xác định đúng phương thức xét tuyển trúng tuyển chính thức (ưu tiên xét điểm thi tốt nghiệp THPT năm 2025). Không lấy điểm sàn nhận hồ sơ.
   - Bước 3: Kiểm tra định dạng điểm số, thực hiện tự động sửa lỗi dấu phẩy thành dấu chấm (ví dụ: 25,5 -> 25.5). Quy đổi về hệ điểm thang 30 nếu trường dùng thang điểm khác (ví dụ: thang 40).
   - Bước 4: Điền thông tin vào định dạng JSON yêu cầu.

2. Quy tắc tự sửa lỗi định dạng số:
   - Nếu điểm số tìm thấy sử dụng dấu phẩy (ví dụ: 24,75 hoặc 25,5), bắt buộc phải tự động chuyển thành dấu chấm (24.75 hoặc 25.5) trong trường "benchmark".
   - Trường "benchmark" phải là một số thực (FLOAT) hợp lệ hoặc null. Không bao giờ chứa dấu phẩy hay ký tự lạ.
   - Nếu điểm là số nguyên (ví dụ: 25), hãy biểu diễn dưới dạng số (25 hoặc 25.0).

3. Nới lỏng định dạng (Mental Slack):
   - Nếu không tìm thấy điểm chuẩn năm 2025 chính thức, hoặc chỉ có điểm sàn nhận hồ sơ của năm 2025 cho một trường nào đó, hãy điền null vào trường "benchmark" và ghi chú rõ lý do vào trường "raw_status".

ĐẦU RA BẮT BUỘC:
Chỉ trả về chuỗi JSON thô, không kèm định dạng markdown (không có dấu \`\`\`json), không giải thích gì thêm ngoài JSON.
JSON cấu trúc chính xác như sau:
{
  "results": [
    {
      "schoolName": "<tên trường gốc được yêu cầu>",
      "benchmark": <số thực hoặc null>,
      "year": 2025,
      "method": "<phương thức xét tuyển hoặc null>",
      "raw_status": "<ghi chú/lý do trích xuất hoặc tình trạng dữ liệu>"
    }
  ]
}
`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log(`[SearchService] AI batched response điểm chuẩn ngành ${majorName} cho các trường:`, text);

        const parsed = extractJsonFromText(text);
        if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
            console.warn(`[SearchService] Không thể phân tích JSON điểm chuẩn gộp của ngành ${majorName}`);
            return {};
        }

        const benchmarkMap = {};
        for (const item of parsed.results) {
            if (item.benchmark == null) continue;

            const norm = verification.normalizeBenchmark(item.benchmark, 'gemini-grounding');
            if (norm.value === null) {
                console.warn(`[SearchService] Điểm tại trường ${item.schoolName} từ AI (${item.benchmark}) nằm ngoài thang 30 -> bỏ`);
                continue;
            }

            benchmarkMap[item.schoolName.toLowerCase().trim()] = {
                benchmark: norm.value.toFixed(1),
                year: item.year || 2025,
                source: 'gemini-grounding',
                verified: false
            };
        }

        return benchmarkMap;
    } catch (error) {
        console.error(`[SearchService] Lỗi khi lấy điểm chuẩn ngành ${majorName} gộp cho các trường:`, error.message);
        return {};
    }
}

/**
 * Tìm kiếm ngành học - Trả về TOP trường đào tạo ngành đó
 * Sử dụng Gemini (AI Grounding) để đề xuất trường và tra cứu điểm chuẩn
 */
async function searchMajorWithAI(majorName, location = null) {
    console.log(`[SearchService] Tìm trường đào tạo ngành bằng AI: ${majorName}, khu vực: ${location || 'Toàn quốc'}`);
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
        console.log('[SearchService] Response trường từ Gemini:', text);
        
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
        const candidateSchools = [];

        // Lọc và chuẩn hóa danh sách các trường trước
        for (const s of parsed.schools) {
            const normSchool = verification.normalizeSchool(s.schoolName, location);
            if (!normSchool.verified) {
                console.warn(`[SearchService] Bỏ trường không xác minh: ${s.schoolName}`);
                continue;
            }
            if (allowedLocations &&
                !allowedLocations.includes(normSchool.location.toLowerCase())) {
                continue;
            }
            candidateSchools.push(normSchool);
        }

        // Bước 1: Tra cứu offline cache
        const schoolsToQueryAI = [];
        const cachedBenchmarks = {};

        for (const normSchool of candidateSchools) {
            const key = normSchool.canonical.toLowerCase().trim();
            try {
                const cached = verification.lookupBenchmarkFromCache(normSchool.canonical, majorName);
                if (cached && cached.value !== null) {
                    cachedBenchmarks[key] = {
                        benchmark: cached.value.toFixed(1),
                        year: cached.year,
                        source: 'crawler',
                        verified: true
                    };
                } else {
                    schoolsToQueryAI.push(normSchool.canonical);
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi tra cache cho trường ${normSchool.canonical}:`, err.message);
                schoolsToQueryAI.push(normSchool.canonical);
            }
        }

        // Bước 2: Gọi AI gộp cho những trường không có trong cache (Batching)
        let aiBenchmarks = {};
        if (schoolsToQueryAI.length > 0) {
            aiBenchmarks = await getBenchmarksForSchoolsBatched(schoolsToQueryAI, majorName);
        }

        // Bước 3: Tổng hợp kết quả
        for (const normSchool of candidateSchools) {
            const key = normSchool.canonical.toLowerCase().trim();
            let benchmarkData = cachedBenchmarks[key] || null;

            if (!benchmarkData) {
                benchmarkData = aiBenchmarks[key];
            }

            if (!benchmarkData) {
                for (const aiKey of Object.keys(aiBenchmarks)) {
                    if (aiKey.includes(key) || key.includes(aiKey)) {
                        benchmarkData = aiBenchmarks[aiKey];
                        break;
                    }
                }
            }

            const benchmarkVal = benchmarkData ? benchmarkData.benchmark : null;
            if (benchmarkVal === null || benchmarkVal === undefined) {
                console.log(`[SearchService] Lọc bỏ trường ${normSchool.canonical} vì điểm chuẩn ngành ${majorName} là null`);
                continue;
            }

            const schoolInfo = {
                schoolName: normSchool.canonical,
                location: normSchool.location || location || 'Việt Nam',
                schoolVerified: true,
                benchmark: benchmarkVal,
                benchmarkYear: benchmarkData ? benchmarkData.year : null,
                benchmarkSource: benchmarkData ? benchmarkData.source : null,
                benchmarkVerified: benchmarkData ? benchmarkData.verified : false
            };

            result.schools.push(schoolInfo);
        }

        return result;
    } catch (error) {
        console.error('[SearchService] Thất bại khi tìm trường bằng AI:', error.message);
        throw error;
    }
}

/**
 * Gợi ý danh sách ngành học tiêu biểu của trường và tra cứu điểm bằng AI
 */
async function searchSchoolWithAI(schoolName, location = null) {
    console.log(`[SearchService] Đang tìm các ngành hot của trường: ${schoolName} bằng AI...`);
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
        console.log('[SearchService] Top majors response từ Gemini:', text);
        
        const parsed = extractJsonFromText(text);
        if (!parsed || !parsed.majors || !Array.isArray(parsed.majors)) {
            throw new Error("Không thể phân tích danh sách ngành từ Gemini");
        }
        
        const normSchool = verification.normalizeSchool(schoolName, location);
        if (!normSchool.verified) {
            console.warn(`[SearchService] Trường "${schoolName}" không nằm trong whitelist. Vẫn tiến hành tìm kiếm bằng AI.`);
        }

        const result = {
            searchType: 'school_only',
            schoolName: normSchool.canonical,
            schoolVerified: normSchool.verified,
            location: normSchool.location || location || 'Việt Nam',
            summary: `TOP ${parsed.majors.length} ngành đào tạo hot nhất tại ${normSchool.canonical} (Đề xuất bởi AI)`,
            topMajors: []
        };

        // Bước 1: Tra cứu offline cache trước
        const majorsToQueryAI = [];
        const cachedBenchmarks = {};

        for (const m of parsed.majors) {
            const key = m.majorName.toLowerCase().trim();
            try {
                const cached = verification.lookupBenchmarkFromCache(normSchool.canonical, m.majorName);
                if (cached && cached.value !== null) {
                    cachedBenchmarks[key] = {
                        benchmark: cached.value.toFixed(1),
                        year: cached.year,
                        source: 'crawler',
                        verified: true
                    };
                } else {
                    majorsToQueryAI.push(m.majorName);
                }
            } catch (err) {
                console.warn(`[SearchService] Lỗi tra cache cho ngành ${m.majorName}:`, err.message);
                majorsToQueryAI.push(m.majorName);
            }
        }

        // Bước 2: Gọi AI gộp cho những ngành không có trong cache (Batching)
        let aiBenchmarks = {};
        if (majorsToQueryAI.length > 0) {
            aiBenchmarks = await getBenchmarksFromAIBatched(normSchool.canonical, majorsToQueryAI);
        }

        // Bước 3: Tổng hợp kết quả
        for (const m of parsed.majors) {
            const key = m.majorName.toLowerCase().trim();
            let benchmarkData = cachedBenchmarks[key] || null;

            if (!benchmarkData) {
                benchmarkData = aiBenchmarks[key];
            }

            if (!benchmarkData) {
                for (const aiKey of Object.keys(aiBenchmarks)) {
                    if (aiKey.includes(key) || key.includes(aiKey)) {
                        benchmarkData = aiBenchmarks[aiKey];
                        break;
                    }
                }
            }

            const benchmarkVal = benchmarkData ? benchmarkData.benchmark : null;
            if (benchmarkVal === null || benchmarkVal === undefined) {
                console.log(`[SearchService] Lọc bỏ ngành ${m.majorName} của trường ${normSchool.canonical} vì điểm chuẩn là null`);
                continue;
            }

            const majorInfo = {
                majorName: m.majorName,
                benchmark: benchmarkVal,
                benchmarkYear: benchmarkData ? benchmarkData.year : null,
                benchmarkSource: benchmarkData ? benchmarkData.source : null,
                benchmarkVerified: benchmarkData ? benchmarkData.verified : false,
                schoolVerified: normSchool.verified
            };

            result.topMajors.push(majorInfo);
        }

        return result;
    } catch (error) {
        console.error('[SearchService] Lỗi searchSchoolWithAI:', error.message);
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
 *    -> Sử dụng AI Grounding để tìm ngành và điểm
 * 
 * 2. CHỈ CÓ TÊN NGÀNH (school trống):
 *    -> Gợi ý danh sách trường đào tạo ngành này + điểm chuẩn MỚI NHẤT (1 năm gần nhất) cho từng trường
 *    -> Sử dụng AI Grounding để tìm trường và điểm
 * 
 * 3. CÓ CẢ TRƯỜNG VÀ NGÀNH:
 *    -> Trả thông tin trường + điểm chuẩn ngành cụ thể MỚI NHẤT (1 năm gần nhất)
 *    -> Sử dụng AI Grounding để lấy điểm
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        // ========== XÁC ĐỊNH TRƯỜNG HỢP CẦN XỬ LÝ ==========
        const hasSchool = school && school.trim().length > 0;
        const hasIndustry = industry && industry.trim().length > 0;
        
        console.log(`[SearchService] Xử lý bằng AI: hasSchool=${hasSchool}, hasIndustry=${hasIndustry}, mode=${mode}`);

        // ========== TRƯỜNG HỢP 1: CHỈ CÓ TÊN TRƯỜNG ==========
        if (hasSchool && !hasIndustry && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 1: Chỉ có tên trường - ${school}`);
            return await searchSchoolWithAI(school, location);
        }

        // ========== TRƯỜNG HỢP 2: CHỈ CÓ TÊN NGÀNH ==========
        if (hasIndustry && !hasSchool && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 2: Chỉ có tên ngành - ${industry}`);
            return await searchMajorWithAI(industry, location);
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

            // Gọi AI Grounding để lấy điểm chuẩn ngành của trường (đã ưu tiên cache crawler)
            try {
                const benchmarkData = await getBenchmarkFromAI(normSchool.canonical, industry);
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
    searchCareerQuickly,
    getBenchmarkFromAI
};
