const regex = /\b(1[5-9]|2\d|30)(?:[.,]\d{1,2})?\b/g;

const testCases = [
    "Điểm chuẩn ngành CNTT năm 2024 là 28.25 điểm",
    "Năm 2023 điểm chuẩn của ngành là 27.5",
    "Điểm chuẩn năm 2025 dao động từ 22 đến 29 điểm",
    "Trường lấy điểm chuẩn là 24,15 điểm",
    "Chỉ tiêu tuyển sinh năm 2024 là 2000",
    "Tỷ lệ trúng tuyển là 25%",
    "Ngày 20/8 công bố điểm chuẩn",
    "Công bố ngày 5/20/2026",
    "Điểm số 20-25 điểm"
];

for (const tc of testCases) {
    // Clean slash dates
    const cleaned = tc.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '');
    const matches = cleaned.match(regex);
    console.log(`Original: "${tc}" => Cleaned: "${cleaned}" => Matches:`, matches);
}
