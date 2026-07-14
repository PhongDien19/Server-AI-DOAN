/**
 * Verification Service - Xác minh tên trường và điểm chuẩn
 *
 * Mục tiêu: đảm bảo mọi dữ liệu trả về cho UI:
 *  - Tên trường nằm trong whitelist đã duyệt (canonical) -> chống tên ảo / cắt cụt.
 *  - Điểm chuẩn thuộc thang 30 (15.0 - 30.0) -> chống dùng nhầm thang 100 / 40.
 *  - Cờ `verified: true/false` để UI biết mức độ tin cậy.
 *
 * Nguồn dữ liệu "đã xác minh":
 *  - benchmarkScores.js (crawler từ tuyensinh247.com): thang 30, đã lọc.
 *
 * Nguồn "ước lượng":
 *  - SerpAPI / Gemini Grounding: chỉ chấp nhận nếu qua whitelist + đúng thang 30.
 */

const path = require('path');

/**
 * Whitelist các trường đại học thực tế tại Việt Nam.
 * Mỗi entry gồm:
 *  - canonical: tên đầy đủ hiển thị
 *  - aliases: các tên/biến thể có thể xuất hiện trong dữ liệu thô
 *  - location: tỉnh/thành phố
 *  - schoolCode: mã crawl (nếu có) để tra cứu nhanh trong benchmarkScores.js
 */
const SCHOOL_DIRECTORY = [
    // ===== ĐÀ NẴNG =====
    { canonical: 'Đại học Bách khoa - ĐH Đà Nẵng', aliases: ['đại học bách khoa đà nẵng', 'đh bách khoa đà nẵng', 'bách khoa đà nẵng', 'đh bách khoa - đh đà nẵng', 'bka'], location: 'Đà Nẵng', schoolCode: 'BKA' },
    { canonical: 'Đại học Sư phạm - ĐH Đà Nẵng', aliases: ['đại học sư phạm đà nẵng', 'đh sư phạm đà nẵng', 'sư phạm đà nẵng'], location: 'Đà Nẵng', schoolCode: 'SPDN' },
    { canonical: 'Đại học Kinh tế - ĐH Đà Nẵng', aliases: ['đại học kinh tế đà nẵng', 'đh kinh tế đà nẵng', 'kinh tế đà nẵng'], location: 'Đà Nẵng' },
    { canonical: 'Đại học Ngoại ngữ - ĐH Đà Nẵng', aliases: ['đại học ngoại ngữ đà nẵng', 'đh ngoại ngữ đà nẵng', 'ngoại ngữ đà nẵng'], location: 'Đà Nẵng' },
    { canonical: 'Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng', aliases: ['đại học sư phạm kỹ thuật đà nẵng', 'đh sư phạm kỹ thuật đà nẵng'], location: 'Đà Nẵng', schoolCode: 'DCT' },
    { canonical: 'Trường Đại học Kiến trúc Đà Nẵng', aliases: ['đại học kiến trúc đà nẵng', 'đh kiến trúc đà nẵng', 'trường đại học kiến trúc đà nẵng', 'kiến trúc đà nẵng'], location: 'Đà Nẵng', schoolCode: 'MTU' },
    { canonical: 'Trường Đại học Mỹ thuật Đà Nẵng', aliases: ['đại học mỹ thuật đà nẵng', 'đh mỹ thuật đà nẵng', 'mỹ thuật đà nẵng'], location: 'Đà Nẵng' },
    { canonical: 'Trường Đại học Duy Tân', aliases: ['đại học duy tân', 'đh duy tân', 'duy tân'], location: 'Đà Nẵng' },
    { canonical: 'Trường Đại học FPT Đà Nẵng', aliases: ['đại học fpt đà nẵng', 'fpt đà nẵng'], location: 'Đà Nẵng' },
    { canonical: 'Trường Đại học Đông Á', aliases: ['đại học đông á', 'đông á đà nẵng'], location: 'Đà Nẵng' },
    { canonical: 'Trường Đại học Vinh Viện Đà Nẵng', aliases: ['đại học vinh viện đà nẵng', 'vinh viện đà nẵng'], location: 'Đà Nẵng' },

    // ===== HÀ NỘI =====
    { canonical: 'Đại học Bách khoa Hà Nội', aliases: ['đại học bách khoa hà nội', 'đh bách khoa hà nội', 'bách khoa hà nội', 'bka hn'], location: 'Hà Nội', schoolCode: 'BKA' },
    { canonical: 'Đại học Quốc gia Hà Nội', aliases: ['đại học quốc gia hà nội', 'đhqg hà nội', 'quốc gia hà nội'], location: 'Hà Nội' },
    { canonical: 'Đại học Sư phạm Hà Nội', aliases: ['đại học sư phạm hà nội', 'đh sư phạm hà nội', 'sư phạm hà nội'], location: 'Hà Nội', schoolCode: 'SPHN' },
    { canonical: 'Đại học Mỹ thuật Công nghiệp Hà Nội', aliases: ['đại học mỹ thuật công nghiệp', 'mỹ thuật công nghiệp'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Mỹ thuật Việt Nam', aliases: ['đại học mỹ thuật việt nam'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Kiến trúc Hà Nội', aliases: ['đại học kiến trúc hà nội', 'kiến trúc hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học FPT Hà Nội', aliases: ['đại học fpt hà nội', 'fpt hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Phenikaa', aliases: ['đại học phenikaa', 'phenikaa'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Hà Nội', aliases: ['đại học hà nội', 'đh hà nội'], location: 'Hà Nội', schoolCode: 'HANU' },

    // ===== TP. HỒ CHÍ MINH =====
    { canonical: 'Đại học Bách khoa - ĐHQG TP.HCM', aliases: ['đại học bách khoa tphcm', 'đại học bách khoa tp.hcm', 'bách khoa tphcm', 'bách khoa tp.hcm', 'hcmut', 'bkcm'], location: 'TP. Hồ Chí Minh', schoolCode: 'BKCM' },
    { canonical: 'Đại học Quốc gia TP.HCM', aliases: ['đại học quốc gia tphcm', 'đhqg tphcm', 'quốc gia tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Đại học Sư phạm TP.HCM', aliases: ['đại học sư phạm tphcm', 'sư phạm tphcm'], location: 'TP. Hồ Chí Minh', schoolCode: 'SPHCM' },
    { canonical: 'Trường Đại học Kiến trúc TP.HCM', aliases: ['đại học kiến trúc tphcm', 'kiến trúc tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Mỹ thuật TP.HCM', aliases: ['đại học mỹ thuật tphcm', 'mỹ thuật tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học FPT TP.HCM', aliases: ['đại học fpt tphcm', 'fpt tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Tôn Đức Thắng', aliases: ['đại học tôn đức thắng', 'tôn đức thắng'], location: 'TP. Hồ Chí Minh', schoolCode: 'TDT' },
    { canonical: 'Trường Đại học Văn Lang', aliases: ['đại học văn lang', 'văn lang'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học HUTECH', aliases: ['đại học hutech', 'hutech'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Kinh tế - Luật (ĐHQG TP.HCM)', aliases: ['đại học kinh tế luật', 'đh kinh tế luật', 'kinh tế luật', 'uel'], location: 'TP. Hồ Chí Minh', schoolCode: 'UEL' },
    { canonical: 'Đại học Khoa học Tự nhiên - ĐHQG TP.HCM', aliases: ['đại học khoa học tự nhiên', 'đh khtn', 'khoa học tự nhiên tphcm', 'hcmus'], location: 'TP. Hồ Chí Minh', schoolCode: 'HCMUS' },
    { canonical: 'Đại học Khoa học Xã hội và Nhân văn - ĐHQG TP.HCM', aliases: ['ussh tphcm', 'khoa học xã hội và nhân văn tphcm', 'ussh'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Hoa Sen', aliases: ['đại học hoa sen', 'hoa sen'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Nguyễn Tất Thành', aliases: ['đại học nguyễn tất thành', 'nguyễn tất thành'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Sài Gòn', aliases: ['đại học sài gòn', 'đh sài gòn'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Fulbright Việt Nam', aliases: ['đại học fulbright', 'fulbright'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học RMIT Việt Nam', aliases: ['đại học rmit', 'rmit'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Greenwich (Việt Nam)', aliases: ['đại học greenwich', 'greenwich'], location: 'TP. Hồ Chí Minh' },

    // ===== TOP TRƯỜNG TOÀN QUỐC (phổ biến nhất) =====
    { canonical: 'Đại học Kinh tế Quốc dân', aliases: ['đại học kinh tế quốc dân', 'đh kinh tế quốc dân', 'kinh tế quốc dân', 'ktqd', 'đh ktqd'], location: 'Hà Nội', schoolCode: 'KTQD' },
    { canonical: 'Trường Đại học Ngoại thương', aliases: ['đại học ngoại thương', 'đh ngoại thương', 'ngoại thương', 'ftu', 'đh ftu'], location: 'Hà Nội', schoolCode: 'NT' },
    { canonical: 'Đại học Khoa học Tự nhiên - ĐHQG Hà Nội', aliases: ['đại học khoa học tự nhiên hà nội', 'khtn hà nội', 'đh khtn hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Khoa học Xã hội và Nhân văn - ĐHQG Hà Nội', aliases: ['đại học khoa học xã hội và nhân văn', 'ussh hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Công nghệ - ĐHQG Hà Nội', aliases: ['đại học công nghệ đhqg hà nội', 'uet', 'công nghệ đhqg hà nội'], location: 'Hà Nội' },
    { canonical: 'Học viện Ngân hàng', aliases: ['học viện ngân hàng', 'hv ngân hàng'], location: 'Hà Nội', schoolCode: 'NH' },
    { canonical: 'Học viện Tài chính', aliases: ['học viện tài chính', 'hv tài chính'], location: 'Hà Nội', schoolCode: 'TCNH' },
    { canonical: 'Trường Đại học Luật Hà Nội', aliases: ['đại học luật hà nội', 'luật hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Luật TP.HCM', aliases: ['đại học luật tphcm', 'luật tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Y Hà Nội', aliases: ['đại học y hà nội', 'đh y hà nội', 'y hà nội'], location: 'Hà Nội', schoolCode: 'YHN' },
    { canonical: 'Trường Đại học Y Dược TP.HCM', aliases: ['đại học y dược tphcm', 'y dược tphcm'], location: 'TP. Hồ Chí Minh', schoolCode: 'YD_HCM' },
    { canonical: 'Trường Đại học Y khoa Phạm Ngọc Thạch', aliases: ['đại học y khoa phạm ngọc thạch', 'phạm ngọc thạch'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Y Dược Cần Thơ', aliases: ['đại học y dược cần thơ', 'y dược cần thơ'], location: 'Cần Thơ', schoolCode: 'Y_CT' },
    { canonical: 'Trường Đại học Tài chính - Marketing', aliases: ['đại học tài chính marketing', 'tài chính marketing', 'ufm'], location: 'TP. Hồ Chí Minh', schoolCode: 'BFM' },
    { canonical: 'Trường Đại học Kinh tế TP.HCM (UEH)', aliases: ['đại học kinh tế tphcm', 'ueh', 'kinh tế tphcm', 'neu hcm'], location: 'TP. Hồ Chí Minh', schoolCode: 'NEU_HCM' },

    // ===== CÁC TỈNH/TP KHÁC =====
    { canonical: 'Đại học Huế', aliases: ['đại học huế', 'đh huế'], location: 'Thừa Thiên Huế' },
    { canonical: 'Đại học Cần Thơ', aliases: ['đại học cần thơ', 'đh cần thơ'], location: 'Cần Thơ' },
    { canonical: 'Đại học Bình Dương', aliases: ['đại học bình dương'], location: 'Bình Dương' },
    { canonical: 'Trường Đại học Sư phạm Hà Nội 2', aliases: ['đại học sư phạm hà nội 2', 'sư phạm hà nội 2'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Hồng Đức', aliases: ['đại học hồng đức', 'hồng đức'], location: 'Thanh Hóa' },
    { canonical: 'Trường Đại học Vinh', aliases: ['đại học vinh', 'đh vinh'], location: 'Nghệ An' },
    { canonical: 'Trường Đại học Hải Phòng', aliases: ['đại học hải phòng', 'đh hải phòng'], location: 'Hải Phòng' },
    { canonical: 'Trường Đại học Nha Trang', aliases: ['đại học nha trang', 'đh nha trang'], location: 'Khánh Hòa' },
    { canonical: 'Trường Đại học Đà Lạt', aliases: ['đại học đà lạt', 'đh đà lạt'], location: 'Lâm Đồng' },
    { canonical: 'Trường Đại học Quy Nhơn', aliases: ['đại học quy nhơn', 'đh quy nhơn'], location: 'Bình Định' },
    { canonical: 'Trường Đại học Tây Nguyên', aliases: ['đại học tây nguyên'], location: 'Đắk Lắk' },
    { canonical: 'Trường Đại học Đồng Tháp', aliases: ['đại học đồng tháp'], location: 'Đồng Tháp' },
    { canonical: 'Trường Đại học An Giang', aliases: ['đại học an giang'], location: 'An Giang' },
    { canonical: 'Trường Đại học Trà Vinh', aliases: ['đại học trà vinh'], location: 'Trà Vinh' },
    { canonical: 'Trường Đại học Cửu Long', aliases: ['đại học cửu long'], location: 'Vĩnh Long' },
    { canonical: 'Trường Đại học Tiền Giang', aliases: ['đại học tiền giang'], location: 'Tiền Giang' },
    { canonical: 'Trường Đại học Giao thông vận tải TP.HCM', aliases: ['đại học giao thông vận tải tphcm', 'gtvt tphcm', 'utc'], location: 'TP. Hồ Chí Minh', schoolCode: 'GTVT' },
    { canonical: 'Trường Đại học Giao thông vận tải Hà Nội', aliases: ['đại học giao thông vận tải hà nội', 'gtvt hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Xây dựng Hà Nội', aliases: ['đại học xây dựng hà nội', 'xây dựng hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Xây dựng Miền Trung', aliases: ['đại học xây dựng miền trung'], location: 'Phú Yên' },
    { canonical: 'Trường Đại học Công nghiệp Hà Nội', aliases: ['đại học công nghiệp hà nội'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Công nghiệp TP.HCM', aliases: ['đại học công nghiệp tphcm', 'công nghiệp tphcm', 'iuhtp'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Điện lực', aliases: ['đại học điện lực', 'đh điện lực'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Mỏ - Địa chất', aliases: ['đại học mỏ địa chất', 'đh mỏ địa chất'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Thủy lợi', aliases: ['đại học thủy lợi', 'đh thủy lợi'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học Nông Lâm TP.HCM', aliases: ['đại học nông lâm tphcm', 'nông lâm tphcm'], location: 'TP. Hồ Chí Minh' },
    { canonical: 'Trường Đại học Nông Lâm Thái Nguyên', aliases: ['đại học nông lâm thái nguyên'], location: 'Thái Nguyên' },
    { canonical: 'Trường Đại học Hoà Bình', aliases: ['đại học hoà bình', 'hoà bình'], location: 'Hà Nội' },
    { canonical: 'Trường Đại học BUV (British University Vietnam)', aliases: ['đại học buv', 'buv', 'british university vietnam'], location: 'Hà Nội' },
];

/**
 * Map location -> canonical aliases để map nhanh.
 */
const LOCATION_ALIAS_MAP = {
    'đà nẵng': ['đà nẵng'],
    'da nang': ['đà nẵng'],
    'hà nội': ['hà nội'],
    'ha noi': ['hà nội'],
    'tp. hồ chí minh': ['tp. hồ chí minh'],
    'tp hồ chí minh': ['tp. hồ chí minh'],
    'tp.hcm': ['tp. hồ chí minh'],
    'hồ chí minh': ['tp. hồ chí minh'],
    'ho chi minh': ['tp. hồ chí minh'],
    'sài gòn': ['tp. hồ chí minh'],
    'hải phòng': ['hải phòng'],
    'cần thơ': ['cần thơ'],
    'bình dương': ['bình dương'],
    'đồng nai': ['đồng nai'],
    'quảng ninh': ['quảng ninh'],
    'thừa thiên huế': ['thừa thiên huế'],
    'huế': ['thừa thiên huế'],
};

/**
 * Tra cứu tên trường trong whitelist.
 * Trả về entry {canonical, location, schoolCode, aliases} hoặc null.
 */
function lookupSchool(rawName) {
    if (!rawName) return null;
    const lower = rawName.toLowerCase().trim();

    // 1. Match exact alias (alias bao gồm cả canonical dạng lowercase)
    for (const entry of SCHOOL_DIRECTORY) {
        const aliasSet = [...entry.aliases, entry.canonical.toLowerCase()];
        for (const alias of aliasSet) {
            if (lower === alias) return entry;
        }
    }

    // 2. Match substring với alias dài (≥ 5 ký tự) để bắt biến thể viết tắt
    let best = null;
    let bestLen = 0;
    for (const entry of SCHOOL_DIRECTORY) {
        const aliasSet = [...entry.aliases, entry.canonical.toLowerCase()];
        for (const alias of aliasSet) {
            if (alias.length < 5) continue;
            if (lower.includes(alias) && alias.length > bestLen) {
                best = entry;
                bestLen = alias.length;
            }
        }
    }
    return best;
}

/**
 * Map tên khu vực người dùng nhập -> tập location hợp lệ.
 */
function getLocationAliases(userLocation) {
    if (!userLocation) return null;
    const lower = userLocation.toLowerCase().trim();
    return LOCATION_ALIAS_MAP[lower] || [lower];
}

/**
 * Lọc danh sách trường theo khu vực (chỉ giữ các entry thuộc khu vực).
 * Mỗi input là một object có thể có `schoolName` hoặc `name`.
 */
function filterSchoolsByLocation(schools, userLocation) {
    const allowed = getLocationAliases(userLocation);
    if (!allowed) return schools;
    return schools.filter((s) => {
        const name = s.schoolName || s.name || '';
        const entry = lookupSchool(name);
        if (!entry) return false;
        return allowed.includes(entry.location.toLowerCase());
    });
}

/**
 * Chuẩn hoá tên trường (canonical + location). Trả về:
 *  - { canonical, location, schoolCode, verified: true } nếu tìm thấy trong whitelist
 *  - { canonical: inputName, location: inputLocation, schoolCode: null, verified: false } nếu không
 */
function normalizeSchool(rawName, fallbackLocation = null) {
    const entry = lookupSchool(rawName);
    if (entry) {
        return {
            canonical: entry.canonical,
            location: entry.location,
            schoolCode: entry.schoolCode || null,
            verified: true
        };
    }
    return {
        canonical: rawName,
        location: fallbackLocation,
        schoolCode: null,
        verified: false
    };
}

/**
 * Xác minh điểm chuẩn có thuộc thang 30 hay không.
 * Trả về { value, source, verified }.
 *  - value: số thực đã được làm tròn 1 chữ số, hoặc null nếu không hợp lệ.
 *  - source: 'crawler' | 'serpapi' | 'gemini-grounding' | null.
 *  - verified: true nếu từ crawler (benchmarkScores.js) hoặc qua whitelist.
 */
function normalizeBenchmark(rawValue, source = null) {
    if (rawValue === null || rawValue === undefined) {
        return { value: null, source: null, verified: false };
    }
    const str = String(rawValue).trim();
    if (!str || str === 'N/A' || str === 'null') {
        return { value: null, source: null, verified: false };
    }
    const cleaned = str.replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (parsed === null || isNaN(parsed)) {
        return { value: null, source: null, verified: false };
    }
    if (parsed < 15.0 || parsed > 30.0) {
        // Nằm ngoài thang 30 -> bỏ
        return { value: null, source: null, verified: false };
    }
    const isVerified = source === 'crawler'; // dữ liệu từ benchmarkScores.js
    return {
        value: Math.round(parsed * 10) / 10,
        source: source,
        verified: isVerified
    };
}

// ===== LOAD BENCHMARK CACHE TỪ benchmarkScores.js =====
let _benchmarkCache = null;
function loadBenchmarkCache() {
    if (_benchmarkCache) return _benchmarkCache;
    try {
        const data = require(path.resolve(__dirname, '../data/benchmarkScores.js'));
        const list = Array.isArray(data) ? data : (data.default || []);
        // Map: schoolCode -> { schoolName, majors: Map<majorNameLower, {majorName, scores, combination}> }
        const map = new Map();
        for (const sch of list) {
            const code = (sch.schoolCode || '').toUpperCase();
            const majorsByName = new Map();
            for (const mj of (sch.majors || [])) {
                const key = (mj.majorName || '').toLowerCase();
                majorsByName.set(key, {
                    majorName: mj.majorName,
                    scores: mj.scores || {},
                    combination: mj.combination || ''
                });
            }
            map.set(code, {
                schoolName: sch.schoolName,
                majorsByName: majorsByName
            });
        }
        _benchmarkCache = map;
        console.log(`[Verification] Đã tải benchmark cache: ${map.size} trường từ benchmarkScores.js`);
        return map;
    } catch (e) {
        console.warn('[Verification] Không thể tải benchmarkScores.js:', e.message);
        _benchmarkCache = new Map();
        return _benchmarkCache;
    }
}

/**
 * Tra cứu điểm chuẩn từ cache crawler (nguồn "đã xác minh").
 * @param {string} schoolName - Tên trường
 * @param {string} majorName - Tên ngành
 * @returns {{value: number|null, year: number|null, source: 'crawler', verified: boolean} | null}
 */
function lookupBenchmarkFromCache(schoolName, majorName) {
    const cache = loadBenchmarkCache();
    if (cache.size === 0) return null;

    const norm = normalizeSchool(schoolName);
    const code = (norm.schoolCode || '').toUpperCase();
    if (!code) return null;

    const schoolEntry = cache.get(code);
    if (!schoolEntry) return null;

    const mjLower = (majorName || '').toLowerCase().trim();
    if (!mjLower) return null;

    // Tìm major: thử exact trước, rồi substring dài nhất
    let best = schoolEntry.majorsByName.get(mjLower);
    if (!best) {
        let bestKey = null;
        let bestLen = 0;
        for (const [k, v] of schoolEntry.majorsByName) {
            if (mjLower.includes(k) && k.length > bestLen) {
                best = v;
                bestLen = k.length;
                bestKey = k;
            }
        }
        if (!best) {
            // Thử ngược lại: tên major chứa key
            for (const [k, v] of schoolEntry.majorsByName) {
                if (k.includes(mjLower) && k.length > bestLen) {
                    best = v;
                    bestLen = k.length;
                }
            }
        }
    }
    if (!best) return null;

    const years = ['2025', '2024', '2023'];
    for (const y of years) {
        const raw = best.scores[y];
        if (raw === null || raw === undefined) continue;
        const norm = normalizeBenchmark(raw, 'crawler');
        if (norm.value !== null) {
            return {
                value: norm.value,
                year: Number(y),
                source: 'crawler',
                verified: true
            };
        }
    }
    return null;
}

module.exports = {
    SCHOOL_DIRECTORY,
    LOCATION_ALIAS_MAP,
    lookupSchool,
    getLocationAliases,
    filterSchoolsByLocation,
    normalizeSchool,
    normalizeBenchmark,
    lookupBenchmarkFromCache,
    loadBenchmarkCache
};