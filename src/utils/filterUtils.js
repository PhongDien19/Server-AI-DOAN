/**
 * Filter Utility - Dùng chung cho toàn bộ ứng dụng
 * Mục đích: Loại bỏ các giá trị null/undefined/NaN khỏi kết quả
 * 
 * CÓ 2 LOẠI FILTER:
 * 1. isValidScore - kiểm tra điểm số (legacy, vẫn dùng cho data cũ)
 * 2. isValidLink - kiểm tra admission link (mới)
 */

/**
 * Kiểm tra xem điểm có hợp lệ không
 * @param {any} score - Giá trị điểm
 * @returns {boolean}
 */
function isValidScore(score) {
    if (score === null || score === undefined) return false;
    if (typeof score === 'string') {
        const num = parseFloat(score);
        return !isNaN(num) && num > 0 && num <= 30;
    }
    if (typeof score === 'number') {
        return !isNaN(score) && score > 0 && score <= 30;
    }
    return false;
}

/**
 * Kiểm tra xem link có hợp lệ không
 * @param {object|string} link - Link object {url, title} hoặc string URL
 * @returns {boolean}
 */
function isValidLink(link) {
    if (!link) return false;
    
    // Xử lý string URL
    if (typeof link === 'string') {
        return link.length > 0 && (link.startsWith('http://') || link.startsWith('https://'));
    }
    
    // Xử lý object {url, title}
    if (typeof link === 'object') {
        const url = link.url || link.link || link.href;
        if (!url || typeof url !== 'string' || url.length === 0) return false;
        return url.startsWith('http://') || url.startsWith('https://');
    }
    
    return false;
}

/**
 * Lọc bỏ các entry có admission link không hợp lệ
 * @param {Array} items - Mảng items có field officialLink
 * @returns {Array} - Mảng đã lọc
 */
function filterValidLinks(items) {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter(item => {
        const link = item.officialLink || item.admissionLink;
        return isValidLink(link);
    });
}

/**
 * Lọc bỏ các entry có điểm không hợp lệ (null, undefined, NaN, <= 0, > 30)
 * @param {Array|object} data - Dữ liệu cần lọc
 * @param {string} scoreField - Tên field chứa điểm (mặc định 'benchmark' hoặc 'diem')
 * @returns {Array|object} - Dữ liệu đã lọc
 */
function filterValidScores(data, scoreField = 'benchmark') {
    if (!data) return null;

    // Xử lý object đơn lẻ
    if (!Array.isArray(data)) {
        const score = data[scoreField] ?? data.diem ?? data.score;
        if (isValidScore(score)) {
            return data;
        }
        return null;
    }

    // Xử lý mảng
    const filtered = data.filter(item => {
        const score = item[scoreField] ?? item.diem ?? item.score;
        return isValidScore(score);
    });

    return filtered;
}

/**
 * Lọc mảng các schools - loại bỏ benchmark null/undefined
 * @param {Array} schools - Mảng các trường
 * @returns {Array} - Mảng đã lọc
 */
function filterSchoolsWithScores(schools) {
    if (!schools || !Array.isArray(schools)) return [];

    return schools.filter(school => {
        // Kiểm tra benchmark
        const score = school.benchmark ?? school.diem ?? school.score;
        if (!isValidScore(score)) return false;

        // Kiểm tra nested majors
        if (school.majors && Array.isArray(school.majors)) {
            school.majors = school.majors.filter(m => {
                const mScore = m.benchmark ?? m.diem ?? m.score;
                return isValidScore(mScore);
            });
            // Chỉ giữ trường nếu còn majors hợp lệ
            return school.majors.length > 0;
        }

        return true;
    });
}

/**
 * Lọc mảng các majors - loại bỏ benchmark null/undefined
 * @param {Array} majors - Mảng các ngành
 * @returns {Array} - Mảng đã lọc
 */
function filterMajorsWithScores(majors) {
    if (!majors || !Array.isArray(majors)) return [];

    return majors.filter(major => {
        const score = major.benchmark ?? major.diem ?? major.score;
        return isValidScore(score);
    });
}

/**
 * Kiểm tra và tạo response phù hợp khi không có dữ liệu
 * @param {Array|object} data - Dữ liệu sau khi lọc
 * @param {string} message - Message khi không có dữ liệu
 * @returns {{hasData: boolean, data: Array|object|null, message: string|null}}
 */
function validateResponse(data, message = 'Không tìm thấy dữ liệu điểm chuẩn đáng tin cậy cho yêu cầu này.') {
    if (!data) {
        return {
            hasData: false,
            data: null,
            message: message
        };
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return {
                hasData: false,
                data: null,
                message: message
            };
        }
    }

    return {
        hasData: true,
        data: data,
        message: null
    };
}

module.exports = {
    isValidScore,
    isValidLink,
    filterValidScores,
    filterSchoolsWithScores,
    filterMajorsWithScores,
    filterValidLinks,
    validateResponse
};
