const { getGenerativeModelWithFallback, extractJsonFromText } = require("./deepseekClient");
const verification = require("./verificationService");
const webSearch = require("./webSearchService");

const model = getGenerativeModelWithFallback({
    model: "deepseek-chat",
    generationConfig: {
        temperature: 0.3
    }
});

/**
 * Whitelist trường & helper xác minh được dùng chung qua verificationService.
 */
const SCHOOL_DIRECTORY = verification.SCHOOL_DIRECTORY;
const getLocationAliases = verification.getLocationAliases;
const lookupSchoolInDirectory = verification.lookupSchool;
const filterSchoolsByLocation = verification.filterSchoolsByLocation;
const normalizeSchoolInDirectory = verification.normalizeSchool;

/**
 * Tìm kiếm ngành học - Trả về TOP trường đào tạo ngành đó
 */
async function searchMajorWithAI(majorName, location = null) {
    console.log(`[SearchService] Tìm trường đào tạo ngành: ${majorName}, khu vực: ${location || 'Toàn quốc'}`);
    try {
        const realSchools = await verification.getRealSchoolsForMajor(majorName, location);

        const result = {
            searchType: 'major_only',
            majorName: majorName,
            location: location || 'Toàn quốc',
            summary: `Danh sách các trường đại học đào tạo ngành ${majorName}`,
            schools: realSchools.map(r => {
                const schoolNorm = verification.normalizeSchool(r.schoolName);
                return {
                    schoolName: r.schoolName,
                    location: schoolNorm.location || location || 'Việt Nam',
                    majorName: majorName,
                    officialLink: r.linkResult ? {
                        url: r.linkResult.url,
                        title: r.linkResult.title,
                        domain: r.linkResult.domain,
                    } : null,
                    source: 'web_search'
                };
            })
        };

        console.log(`[SearchService] Kết quả: ${result.schools.length} trường`);
        for (const s of result.schools) {
            console.log(`  - ${s.schoolName}: ${s.officialLink?.url || 'Không có link'}`);
        }

        return result;
    } catch (error) {
        console.error('[SearchService] Thất bại khi tìm trường:', error.message);
        throw error;
    }
}

/**
 * Gợi ý danh sách ngành học tiêu biểu của trường
 */
async function searchSchoolWithAI(schoolName, location = null) {
    console.log(`[SearchService] Tìm ngành của trường: ${schoolName}`);
    try {
        const normSchool = verification.normalizeSchool(schoolName, location);
        const finalSchoolName = normSchool.verified ? normSchool.canonical : schoolName;

        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp.
Hãy cho biết top 5 ngành học hot nhất hiện tại của trường đại học: "${finalSchoolName}".
Yêu cầu:
1. Trả về kết quả dạng mảng JSON gồm các tên ngành (Ví dụ: ["Ngành A", "Ngành B"]).
2. Không giải thích gì thêm ngoài mảng JSON thô.`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const parsed = extractJsonFromText(text) || [];

        console.log(`[SearchService] Tìm admission links cho trường ${finalSchoolName}...`);

        // Gọi web search để tìm link tuyển sinh của trường
        const linkResult = await webSearch.findOfficialAdmissionLink(finalSchoolName, null);

        // Trả về thông tin trường với link tuyển sinh
        const result = {
            searchType: 'school_only',
            schoolName: finalSchoolName,
            schoolVerified: normSchool.verified,
            location: normSchool.location || location || 'Việt Nam',
            summary: `Danh sách các ngành đào tạo tại ${finalSchoolName}`,
            officialLink: linkResult ? {
                url: linkResult.url,
                title: linkResult.title,
                domain: linkResult.domain,
            } : null,
            topMajors: parsed.slice(0, 5).map(major => ({
                majorName: major,
                officialLink: null,
            }))
        };

        console.log(`[SearchService] Kết quả: ${result.topMajors.length} ngành, admission link: ${result.officialLink?.url || 'Không có'}`);

        return result;
    } catch (error) {
        console.error('[SearchService] Thất bại khi tìm ngành:', error.message);
        throw error;
    }
}

/**
 * Tìm hiểu nhanh về ngành nghề / trường học (cho màn hình Quick Explore)
 */
const searchCareerQuickly = async ({ mode, industry, school, position, location, age }) => {
    try {
        const hasSchool = school && school.trim().length > 0;
        const hasIndustry = industry && industry.trim().length > 0;
        
        console.log(`[SearchService] Xử lý bằng AI: hasSchool=${hasSchool}, hasIndustry=${hasIndustry}, mode=${mode}`);

        if (hasSchool && !hasIndustry && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 1: Chỉ có tên trường - ${school}`);
            return await searchSchoolWithAI(school, location);
        }

        if (hasIndustry && !hasSchool && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 2: Chỉ có tên ngành - ${industry}`);
            return await searchMajorWithAI(industry, location);
        }

        if (hasSchool && hasIndustry && mode === 'HOC') {
            console.log(`[SearchService] TRƯỜNG HỢP 3: Có cả trường và ngành - ${school} / ${industry}`);

            const normSchool = verification.normalizeSchool(school, location);
            const finalSchoolName = normSchool.verified ? normSchool.canonical : school;
            const finalLocation = normSchool.verified ? (normSchool.location || location || 'Việt Nam') : (location || 'Việt Nam');

            const prompt = `Bạn là chuyên gia tư vấn tuyển sinh và hướng nghiệp đại học tại Việt Nam.
Hãy xác định xem trường: "${finalSchoolName}" có đào tạo ngành: "${industry}" hay không.

Yêu cầu trả về định dạng JSON chính xác như sau:
{
  "hasMajor": true hoặc false (Bắt buộc: điền true nếu trường có đào tạo ngành này, ngược lại điền false),
  "summary": "Mô tả ngắn gọn về ngành học này tại trường (nếu hasMajor là true) hoặc thông báo chi tiết bằng tiếng Việt giải thích rằng trường không đào tạo ngành này (nếu hasMajor là false)",
  "duration": "Thời gian đào tạo, ví dụ: 4 năm (nếu hasMajor là true, ngược lại để null)",
  "combinations": ["Các tổ hợp môn xét tuyển phổ biến, ví dụ: A00, A01" (nếu hasMajor là true, ngược lại để mảng rỗng)]
}
Chỉ trả về JSON thô, không kèm giải thích.`;

            let parsed = {};
            try {
                const aiResult = await model.generateContent(prompt);
                parsed = extractJsonFromText(aiResult.response.text().trim()) || {};
            } catch (aiErr) {
                console.warn('[SearchService] Lỗi gọi AI lấy chi tiết ngành:', aiErr.message);
            }

            const hasMajor = parsed.hasMajor === true;

            const result = {
                searchType: 'school_and_major',
                schoolName: finalSchoolName,
                schoolVerified: normSchool.verified,
                majorName: industry,
                location: finalLocation,
                summary: parsed.summary || (hasMajor 
                    ? `Thông tin trường ${finalSchoolName} và ngành ${industry}`
                    : `Trường ${finalSchoolName} không đào tạo ngành ${industry}.`),
                hasMajor: hasMajor
            };

            if (hasMajor) {
                result.majorInfo = {
                    majorName: industry,
                    duration: parsed.duration || 'Chưa rõ',
                    combinations: parsed.combinations || [],
                    officialLink: null,
                };

                try {
                    const linkResult = await webSearch.findOfficialAdmissionLink(finalSchoolName, industry);
                    if (linkResult) {
                        result.majorInfo.officialLink = {
                            url: linkResult.url,
                            title: linkResult.title,
                            domain: linkResult.domain,
                        };
                    }
                } catch (err) {
                    console.warn('[SearchService] Lỗi khi tìm admission link:', err.message);
                }
            }

            return result;
        }

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
    searchCareerQuickly
};
