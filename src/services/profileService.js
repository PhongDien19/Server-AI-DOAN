const {
  NguoiDung: UserProfile,
  CauHoi: Question,
  DiemHocSinh,
  DiemNguoiLam,
  KetQuaDiscoveryHoc,
  KetQuaDiscoveryLam,
  KetQuaTargetHoc,
  KetQuaTargetLam,
  LichSuTest
} = require('../models');

/**
 * Lấy thông tin hồ sơ người dùng
 * @param {number} userId 
 */
const getProfile = async (userId) => {
    try {
        const profile = await UserProfile.findOne({
            where: { userId },
            include: ['StudentScores', 'WorkerScores']
        });
        if (!profile) {
            return { success: false, message: 'Không tìm thấy hồ sơ người dùng' };
        }
        const profileJson = profile.toJSON();
        profileJson.hobby = profile.interests;
        profileJson.studentScores = profile.StudentScores || null;
        profileJson.workerScores = profile.WorkerScores || null;
        return { success: true, profile: profileJson };
    } catch (error) {
        console.error("Lỗi getProfile:", error);
        return { success: false, message: "Lỗi hệ thống khi lấy hồ sơ" };
    }
};

const updateProfile = async (userId, data) => {
    try {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            return { success: false, message: 'Không tìm thấy hồ sơ người dùng' };
        }

        // Chỉ cho phép cập nhật các trường này của hồ sơ cơ bản
        const allowedFields = ['fullName', 'age', 'educationLevel', 'studyStatus', 'location', 'interests'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                profile[field] = data[field];
            }
        }
        if (data.hobby !== undefined) {
            profile.interests = data.hobby;
        }

        await profile.save();

        // Cập nhật điểm học sinh
        if (data.studentScores) {
            await DiemHocSinh.upsert({
                MaND: profile.id,
                ...data.studentScores
            });
        }
        // Cập nhật điểm người đi làm
        if (data.workerScores) {
            await DiemNguoiLam.upsert({
                MaND: profile.id,
                ...data.workerScores
            });
        }

        // Load lại đầy đủ
        const updatedProfile = await UserProfile.findOne({
            where: { userId },
            include: ['StudentScores', 'WorkerScores']
        });
        const profileJson = updatedProfile.toJSON();
        profileJson.hobby = updatedProfile.interests;
        profileJson.studentScores = updatedProfile.StudentScores || null;
        profileJson.workerScores = updatedProfile.WorkerScores || null;

        return { success: true, message: 'Cập nhật hồ sơ thành công', profile: profileJson };
    } catch (error) {
        console.error("Lỗi updateProfile:", error);
        return { success: false, message: "Lỗi hệ thống khi cập nhật hồ sơ" };
    }
};

const generateCareerMetadata = (careerName) => {
    const normalized = (careerName || "").toLowerCase();
    
    // Mặc định
    let roadmap = [
        {
            stage: "Giai đoạn 1: Xây dựng nền tảng",
            desc: "Tập trung học tập các kiến thức cơ bản, phát triển tư duy tổng quan và trau dồi khả năng ngoại ngữ (Tiếng Anh giao tiếp/chuyên ngành).",
            certs: ["Ngoại ngữ (IELTS/TOEIC)", "Tin học văn phòng"]
        },
        {
            stage: "Giai đoạn 2: Phát triển chuyên môn",
            desc: "Nghiên cứu sâu các môn học/kỹ năng nghiệp vụ chuyên ngành, thực hiện các đề án nhỏ hoặc tham gia câu lạc bộ chuyên môn.",
            certs: ["Chứng chỉ chuyên môn cơ bản"]
        },
        {
            stage: "Giai đoạn 3: Thực tiễn & Việc làm",
            desc: "Tìm kiếm cơ hội thực tập, tham gia vào các dự án thực tế tại doanh nghiệp để tích lũy kinh nghiệm thực chiến.",
            certs: ["Chứng chỉ thực hành chuyên nghiệp"]
        }
    ];

    let salaries = [
        { level: "Mới ra trường / Junior", range: "10 - 15 triệu VNĐ" },
        { level: "Đã có kinh nghiệm / Mid", range: "18 - 28 triệu VNĐ" },
        { level: "Quản lý / Senior", range: "35 - 55 triệu VNĐ" }
    ];

    if (normalized.includes("phần mềm") || normalized.includes("công nghệ thông tin") || normalized.includes("it") || normalized.includes("software") || normalized.includes("computer")) {
        roadmap = [
            {
                stage: "Giai đoạn 1: Tư duy thuật toán & Cơ sở",
                desc: "Nắm vững cấu trúc dữ liệu, giải thuật, cơ sở dữ liệu SQL/NoSQL và sử dụng thành thạo Git.",
                certs: ["Git/GitHub Basics", "HackerRank Problem Solving"]
            },
            {
                stage: "Giai đoạn 2: Lập trình chuyên sâu & Framework",
                desc: "Lựa chọn chuyên ngành (Web/App) phát triển với React, Node.js, Spring Boot hoặc Flutter và làm đồ án thực tế.",
                certs: ["React/NodeJS Developer Certificate", "Mobile Dev Essentials"]
            },
            {
                stage: "Giai đoạn 3: Hệ thống & Môi trường Cloud",
                desc: "Thực tập dự án lớn, học về Docker, CI/CD, thiết kế hệ thống chịu tải cao và dịch vụ đám mây Cloud.",
                certs: ["AWS Cloud Practitioner", "Docker Certified Associate"]
            }
        ];
        salaries = [
            { level: "Mới tốt nghiệp / Junior", range: "12 - 20 triệu VNĐ" },
            { level: "Có kinh nghiệm / Mid-level", range: "22 - 35 triệu VNĐ" },
            { level: "Quản lý / Senior Developer", range: "45 - 75 triệu VNĐ" }
        ];
    } else if (normalized.includes("kinh doanh") || normalized.includes("marketing") || normalized.includes("quản trị") || normalized.includes("sales")) {
        roadmap = [
            {
                stage: "Giai đoạn 1: Kiến thức thị trường & Sales",
                desc: "Học hiểu hành vi khách hàng, nghiên cứu thị trường, rèn luyện kỹ năng giao tiếp và thuyết phục khách hàng.",
                certs: ["Google Analytics", "Marketing Foundations"]
            },
            {
                stage: "Giai đoạn 2: Quản lý chiến dịch & Phân tích",
                desc: "Lập kế hoạch marketing, tối ưu hóa ngân sách chiến dịch quảng cáo kỹ thuật số, phân tích chỉ số ROI/KPI.",
                certs: ["Google Ads Certification", "HubSpot Inbound Marketing"]
            },
            {
                stage: "Giai đoạn 3: Chiến lược kinh doanh & Quản lý",
                desc: "Lập kế hoạch chiến lược thương hiệu toàn diện, quản lý đội ngũ sales/marketing và đàm phán hợp đồng lớn.",
                certs: ["Project Management Professional (PMP)", "Advanced Digital Strategy"]
            }
        ];
        salaries = [
            { level: "Mới tốt nghiệp / Junior", range: "9 - 14 triệu VNĐ" },
            { level: "Có kinh nghiệm / Mid-level", range: "16 - 25 triệu VNĐ" },
            { level: "Trưởng phòng / Senior Manager", range: "30 - 50 triệu VNĐ" }
        ];
    }

    return { roadmap, salaries };
};

/**
 * Lấy lịch sử làm bài test của người dùng
 * @param {number} userId 
 */
const getHistory = async (userId) => {
    try {
        // Lấy tất cả câu hỏi mà user này đã làm
        const questions = await Question.findAll({
            where: { userId },
            order: [['sessionId', 'DESC'], ['order', 'ASC']]
        });

        if (!questions || questions.length === 0) {
            return { success: true, history: [] };
        }

        const [discHocList, discLamList, targetHocList, targetLamList, testHistoryList] = await Promise.all([
            KetQuaDiscoveryHoc.findAll({ where: { userId } }),
            KetQuaDiscoveryLam.findAll({ where: { userId } }),
            KetQuaTargetHoc.findAll({ where: { userId } }),
            KetQuaTargetLam.findAll({ where: { userId } }),
            LichSuTest.findAll({ where: { userId } }),
        ]);

        const historyMap = {};
        for (const h of testHistoryList) {
            historyMap[h.sessionId] = h;
        }

        const profile = await UserProfile.findOne({ where: { userId } });

        // Gom nhóm các câu hỏi theo từng sessionId (từng bài test)
        const sessionsMap = {};
        for (const q of questions) {
            if (!sessionsMap[q.sessionId]) {
                let mode = 'discovery';
                let title = q.testName || 'Bài khảo sát';
                let subtitle = 'Khảo sát định hướng nghề nghiệp';
                let details = 'Đã hoàn thành đánh giá hệ thống.';
                let recommendedCareer = 'Chưa xác định';
                let conclusionReason = 'Hệ thống AI đã tổng hợp các tham số từ câu trả lời của bạn.';
                let roadmap = [];

                if (q.testType === 'career') {
                    const isTarget = q.testName && q.testName.toLowerCase().includes('khảo sát nghề');
                    if (isTarget) {
                        mode = 'target';
                        title = 'Mục Tiêu (Target)';
                        const targetCareer = q.testName.replace(/Khảo sát nghề/i, '').trim();
                        subtitle = `Mục tiêu: ${targetCareer}`;
                        details = `Đánh giá mức độ phù hợp với nghề ${targetCareer}.`;
                        recommendedCareer = targetCareer;
                        
                        const matchedLam = targetLamList.filter(item => item.careerName === targetCareer);
                        const matchedHoc = targetHocList.filter(item => item.careerName === targetCareer);
                        if (matchedLam.length > 0) {
                            conclusionReason = `Công ty tiêu biểu: ` + matchedLam.map(c => c.companyName).join(', ');
                        } else if (matchedHoc.length > 0) {
                            conclusionReason = `Trường đào tạo đề xuất: ` + matchedHoc.map(s => s.schoolName).join(', ');
                        }
                    } else {
                        mode = 'discovery';
                        title = 'Khám Phá (Discovery)';
                        subtitle = 'Khám phá nghề nghiệp phù hợp';
                        details = 'Bài khảo sát định hướng và gợi ý lĩnh vực phù hợp.';
                        
                        if (discHocList.length > 0) {
                            recommendedCareer = discHocList.map(c => c.careerName).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                            subtitle = `Gợi ý: ${recommendedCareer}`;
                            conclusionReason = `Các trường đề xuất: ` + discHocList.map(s => s.schoolName).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                        } else if (discLamList.length > 0) {
                            recommendedCareer = discLamList.map(c => c.careerName).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                            subtitle = `Gợi ý: ${recommendedCareer}`;
                            conclusionReason = `Ngành nghề đề xuất: ` + recommendedCareer;
                        }
                    }
                } else {
                    mode = q.testType; // holland, personality, cognitive, values
                    if (q.testType === 'holland') {
                        title = 'Sở Thích Holland';
                        subtitle = 'Bài trắc nghiệm RIASEC';
                        details = 'Xác định nhóm sở thích nghề nghiệp trội.';
                    } else if (q.testType === 'personality') {
                        title = 'Tính Cách Big 5';
                        subtitle = 'Đặc điểm hành vi & MBTI';
                        details = 'Phân tích tính cách chủ đạo và xu hướng.';
                    } else if (q.testType === 'cognitive') {
                        title = 'Năng Lực Nhận Thức';
                        subtitle = 'Logic, số học, ngôn ngữ';
                        details = 'Đánh giá khả năng tư duy giải quyết vấn đề.';
                    } else if (q.testType === 'values') {
                        title = 'Hệ Giá Trị Cá Nhân';
                        subtitle = 'Động lực nghề nghiệp';
                        details = 'Xác định các giá trị cốt lõi thúc đẩy sự nghiệp.';
                    }
                }

                let relevanceScore = null;
                const dbHistory = historyMap[q.sessionId];
                if (dbHistory) {
                    mode = dbHistory.testMode;
                    if (dbHistory.score != null) {
                        relevanceScore = dbHistory.score;
                    }
                }

                // Xây dựng danh sách trường học và công ty phù hợp
                let matchingSchools = [];
                if (mode === 'discovery') {
                    matchingSchools = discHocList.filter(item => item.sessionId === q.sessionId).map(item => ({
                        name: item.schoolName,
                        major: item.careerName,
                        location: profile?.location || 'Việt Nam',
                        score: `Điểm chuẩn: ${item.benchmark2024 || 'N/A'}`,
                        officialLink: item.officialLink || null,
                        admissionLink: item.admissionLink || null
                    }));
                } else if (mode === 'target') {
                    matchingSchools = targetHocList.filter(item => item.sessionId === q.sessionId).map(item => ({
                        name: item.schoolName,
                        major: item.careerName,
                        location: profile?.location || 'Việt Nam',
                        score: `Điểm chuẩn: ${item.benchmark2024 || 'N/A'}`,
                        officialLink: item.officialLink || null,
                        admissionLink: item.admissionLink || null
                    }));
                }
                if (matchingSchools.length === 0) {
                    matchingSchools = [
                        { name: "Đại học Bách Khoa", major: recommendedCareer, location: "Hà Nội/TP.HCM", score: "Điểm chuẩn: 25.5", officialLink: null, admissionLink: null },
                        { name: "Đại học Quốc Gia", major: recommendedCareer, location: "Hà Nội/TP.HCM", score: "Điểm chuẩn: 24.8", officialLink: null, admissionLink: null },
                        { name: "Đại học RMIT / FPT", major: recommendedCareer, location: "Toàn quốc", score: "Xét tuyển/Học bạ", officialLink: null, admissionLink: null }
                    ];
                }

                let hiringCompanies = [];
                if (mode === 'discovery') {
                    hiringCompanies = discLamList.filter(item => item.sessionId === q.sessionId).map(item => ({
                        role: item.careerName,
                        company: item.companyName || 'Tập đoàn Công nghệ/Dịch vụ',
                        loc: profile?.location || 'Việt Nam',
                        type: 'Toàn thời gian',
                        salary: item.basicSalary || null,
                        description: item.companyDescription || null,
                        careerLink: item.careerLink || null
                    }));
                } else if (mode === 'target') {
                    hiringCompanies = targetLamList.filter(item => item.sessionId === q.sessionId).map(item => ({
                        role: item.careerName,
                        company: item.companyName,
                        loc: profile?.location || 'Việt Nam',
                        type: 'Toàn thời gian',
                        salary: item.basicSalary || null,
                        description: item.companyDescription || null,
                        careerLink: item.careerLink || null
                    }));
                }
                if (hiringCompanies.length === 0) {
                    hiringCompanies = [
                        { role: `Chuyên viên ${recommendedCareer}`, company: "FPT Software / Telecom", loc: "Toàn quốc", type: "Toàn thời gian", salary: null, description: null },
                        { role: `Kỹ sư / Nhân sự ${recommendedCareer}`, company: "Tập đoàn Viettel", loc: "Hà Nội", type: "Toàn thời gian", salary: null, description: null },
                        { role: `Chuyên gia ${recommendedCareer}`, company: "Các công ty đa quốc gia", loc: "TP. HCM", type: "Toàn thời gian", salary: null, description: null }
                    ];
                }

                const meta = generateCareerMetadata(recommendedCareer);

                sessionsMap[q.sessionId] = {
                    sessionId: q.sessionId,
                    mode,
                    title,
                    subtitle,
                    isCompleted: true,
                    createdAt: q.createdAt || q.NgayTao || new Date(),
                    relevanceScore,
                    details,
                    recommendedCareer,
                    conclusionReason,
                    roadmap: meta.roadmap,
                    matchingSchools: matchingSchools,
                    marketSalaries: meta.salaries,
                    hiringCompanies: hiringCompanies,
                    questions: []
                };
            }

            // Map thuộc tính câu hỏi tương thích với Front-end mong đợi
            sessionsMap[q.sessionId].questions.push({
                q: q.questionText,
                a: q.userAnswer || 'Chưa trả lời'
            });

            if (!q.userAnswer) {
                sessionsMap[q.sessionId].isCompleted = false;
            }
        }

        // Chuyển Map thành mảng
        const history = Object.values(sessionsMap);

        // Tính điểm đánh giá tương thích động dựa trên câu trả lời
        for (const session of history) {
            if (session.relevanceScore !== null) {
                continue; // Điểm số đã có từ CSDL
            }
            const sessionQuestions = questions.filter(q => q.sessionId === session.sessionId);
            
            if (session.isCompleted) {
                if (session.mode === 'discovery' || session.mode === 'target') {
                    let interestScore = 0, interestMax = 0;
                    let behavioralScore = 0, behavioralMax = 0;
                    let efficacyScore = 0, efficacyMax = 0;
                    
                    for (let i = 0; i < sessionQuestions.length; i++) {
                        const ansVal = parseInt(sessionQuestions[i].userAnswer, 10) || 3;
                        if (i < 5) {
                            interestScore += ansVal;
                            interestMax += 5;
                        } else if (i < 10) {
                            behavioralScore += ansVal;
                            behavioralMax += 5;
                        } else {
                            efficacyScore += ansVal;
                            efficacyMax += 5;
                        }
                    }
                    const normalizedInterest = interestScore / (interestMax || 1);
                    const normalizedBehavioral = behavioralScore / (behavioralMax || 1);
                    const normalizedEfficacy = efficacyScore / (efficacyMax || 1);
                    
                    const score = (normalizedInterest * 5 * 0.5) + (normalizedBehavioral * 5 * 0.3) + (normalizedEfficacy * 5 * 0.2);
                    session.relevanceScore = parseFloat(score.toFixed(1));
                } else {
                    // Bài trắc nghiệm khác: tính điểm trung bình câu trả lời làm điểm số tổng quan
                    let totalScore = 0;
                    let answeredCount = 0;
                    for (const q of sessionQuestions) {
                        const scoreVal = parseFloat(q.userAnswer);
                        if (!isNaN(scoreVal)) {
                            totalScore += scoreVal;
                            answeredCount++;
                        }
                    }
                    if (answeredCount > 0) {
                        session.relevanceScore = parseFloat((totalScore / answeredCount).toFixed(1));
                    } else {
                        session.relevanceScore = 4.0;
                    }
                }
            }
        }

        return { success: true, history };
    } catch (error) {
        console.error("Lỗi getHistory:", error);
        return { success: false, message: "Lỗi hệ thống khi lấy lịch sử" };
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getHistory
};
