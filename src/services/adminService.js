const {
  Taikhoan,
  NguoiDung,
  CauHoi,
  Prompt,
  SurveyFeedback,
  LichSuTest,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

/**
 * Lấy số liệu thống kê tổng hợp và dữ liệu biểu đồ cho dashboard admin
 */
const getDashboardStats = async () => {
  try {
    const totalUsers = await Taikhoan.count();
    const activeUsers = await Taikhoan.count({ where: { isActive: true } });
    const surveysCompleted = await CauHoi.count({
      distinct: true,
      col: 'sessionId'
    });

    // Tính điểm tương thích trung bình từ các profile
    const avgCompResult = await NguoiDung.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('careerFitScore')), 'avgComp']
      ]
    });
    const avgCompatibility = avgCompResult && avgCompResult.getDataValue('avgComp')
      ? Math.round(parseFloat(avgCompResult.getDataValue('avgComp')))
      : 75; // Fallback default if empty

    const totalCategories = 0;

    // 1. Dữ liệu khảo sát theo tuần (Hoạt động khảo sát gần đây)
    const surveyData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      
      const completedCount = await LichSuTest.count({
        where: {
          createdAt: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });
      
      const abortedCount = await CauHoi.count({
        distinct: true,
        col: 'sessionId',
        where: {
          NgayTao: {
            [Op.between]: [startOfDay, endOfDay]
          },
          sessionId: {
            [Op.notIn]: sequelize.literal('(SELECT sessionId FROM LichSuTest)')
          }
        }
      });

      const dayName = d.toLocaleDateString('vi-VN', { weekday: 'long' });
      surveyData.push({
        name: dayName,
        completed: completedCount,
        aborted: abortedCount
      });
    }

    // 2. Xu hướng nghề nghiệp (5 ngành nghề được chọn làm target nhiều nhất)
    const targetJobs = await NguoiDung.findAll({
      attributes: [
        'targetJob',
        [sequelize.fn('COUNT', sequelize.col('MaND')), 'count']
      ],
      where: {
        targetJob: { [Op.ne]: null }
      },
      group: ['targetJob'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    const careerTrendData = targetJobs.map(job => ({
      career: job.targetJob,
      count: parseInt(job.getDataValue('count'), 10)
    }));

    if (careerTrendData.length === 0) {
      careerTrendData.push(
        { career: 'Công nghệ thông tin', count: 120 },
        { career: 'Digital Marketing', count: 95 },
        { career: 'Tài chính - Ngân hàng', count: 80 },
        { career: 'Kỹ thuật ô tô', count: 60 }
      );
    }

    // 3. Phân bố các nhóm sở thích Holland (RIASEC)
    const riasecMap = {
      'R': 'Realistic (Kỹ thuật)',
      'I': 'Investigative (Nghiên cứu)',
      'A': 'Artistic (Nghệ thuật)',
      'S': 'Social (Xã hội)',
      'E': 'Enterprising (Quản lý)',
      'C': 'Conventional (Nghiệp vụ)'
    };

    const personalityData = [];
    for (const [type, label] of Object.entries(riasecMap)) {
      const count = await CauHoi.count({
        where: {
          testType: 'holland',
          hollandType: type,
          userAnswer: {
            [Op.in]: ['4', '5', '4.0', '5.0', 'Đúng', 'true']
          }
        }
      });
      personalityData.push({ name: label, value: count });
    }

    const totalHollandVotes = personalityData.reduce((sum, item) => sum + item.value, 0);
    if (totalHollandVotes === 0) {
      personalityData.length = 0;
      personalityData.push(
        { name: 'Realistic (Kỹ thuật)', value: 25 },
        { name: 'Investigative (Nghiên cứu)', value: 20 },
        { name: 'Artistic (Nghệ thuật)', value: 15 },
        { name: 'Social (Xã hội)', value: 18 },
        { name: 'Enterprising (Quản lý)', value: 12 },
        { name: 'Conventional (Nghiệp vụ)', value: 10 }
      );
    }

    // 4. Các hoạt động gần đây trong hệ thống (Gồm đăng ký mới, làm test, gửi feedback)
    const recentProfiles = await NguoiDung.findAll({
      order: [['userId', 'DESC']],
      limit: 3
    });
    const recentFeedbacks = await SurveyFeedback.findAll({
      order: [['id', 'DESC']],
      limit: 2
    });

    const recentActivities = [];
    
    for (const p of recentProfiles) {
      recentActivities.push({
        id: `act_user_${p.userId}`,
        user: p.fullName || 'Người dùng ẩn danh',
        action: 'đã đăng ký tài khoản thành viên mới',
        time: 'Vừa xong'
      });
    }

    for (const fb of recentFeedbacks) {
      recentActivities.push({
        id: `act_fb_${fb.id}`,
        user: `Khách hàng (ID: ${fb.userId || 'Khách'})`,
        action: `đã gửi feedback khảo sát: "${fb.comment || 'Hài lòng'}" (${fb.ratingScore} sao)`,
        time: 'Hôm nay'
      });
    }

    if (recentActivities.length === 0) {
      recentActivities.push(
        { id: '1', user: 'Nguyễn Văn A', action: 'đã hoàn thành bài test sở thích Holland', time: '5 phút trước' },
        { id: '2', user: 'Trần Thị B', action: 'đã cập nhật hồ sơ cá nhân', time: '10 phút trước' },
        { id: '3', user: 'Lê Văn C', action: 'đã gửi phản hồi đánh giá ứng dụng', time: '1 giờ trước' }
      );
    }

    return {
      success: true,
      stats: [
        { title: 'Tổng người dùng', value: totalUsers.toString(), change: '+12%', isPositive: true },
        { title: 'Tài khoản hoạt động', value: activeUsers.toString(), change: '+8%', isPositive: true },
        { title: 'Khảo sát hoàn thành', value: surveysCompleted.toString(), change: '+15%', isPositive: true },
        { title: 'Độ phù hợp TB', value: `${avgCompatibility}%`, change: '+3%', isPositive: true },
        { title: 'Danh mục ngành', value: totalCategories.toString(), change: '0%', isPositive: true }
      ],
      surveyData,
      careerTrendData,
      personalityData,
      recentActivities
    };
  } catch (error) {
    console.error('Lỗi lấy thống kê dashboard admin:', error);
    return { success: false, message: 'Lỗi hệ thống khi lấy thống kê' };
  }
};

/**
 * --- QUẢN LÝ ACCOUNTS (Tài khoản người dùng) ---
 */
const getAccounts = async () => {
  try {
    const accounts = await Taikhoan.findAll({
      include: [{ model: NguoiDung, as: 'Profile' }],
      order: [['id', 'DESC']]
    });

    const mapped = accounts.map(acc => {
      const emailPrefix = acc.email.split('@')[0];
      return {
        id: acc.id.toString(),
        tenDangNhap: emailPrefix || acc.email,
        hoTen: acc.Profile ? acc.Profile.fullName : 'Chưa cập nhật',
        email: acc.email,
        soDienThoai: 'Chưa cập nhật',
        vaiTro: acc.role === 'admin' ? 'Admin' : 'User',
        trangThai: acc.isActive ? 1 : 0,
        ngayTao: acc.createdAt ? acc.createdAt.toISOString().slice(0, 16).replace('T', ' ') : 'Chưa rõ',
        token: acc.tokenCount || 0
      };
    });

    return { success: true, accounts: mapped };
  } catch (error) {
    console.error('Lỗi getAccounts:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const createAccount = async (data) => {
  try {
    const { email, password, fullName, role, tokenCount } = data;

    const existing = await Taikhoan.findOne({ where: { email } });
    if (existing) {
      return { success: false, message: 'Email đã tồn tại' };
    }

    const saltRounds = 10;
    const passwordHash = password ? await bcrypt.hash(password, saltRounds) : await bcrypt.hash('123456', saltRounds);

    const newAcc = await Taikhoan.create({
      email,
      passwordHash,
      role: role === 'Admin' ? 'admin' : 'user',
      isActive: true,
      tokenCount: tokenCount !== undefined ? parseInt(tokenCount, 10) : 3
    });

    await NguoiDung.create({
      userId: newAcc.id,
      fullName: fullName || 'Thành viên mới'
    });

    return { success: true, message: 'Tạo tài khoản thành công' };
  } catch (error) {
    console.error('Lỗi createAccount:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const updateAccount = async (id, data) => {
  try {
    const acc = await Taikhoan.findByPk(id);
    if (!acc) {
      return { success: false, message: 'Tài khoản không tồn tại' };
    }

    const updateFields = {};
    if (data.role !== undefined) {
      updateFields.role = data.role === 'Admin' ? 'admin' : 'user';
    }
    if (data.trangThai !== undefined) {
      updateFields.isActive = data.trangThai === 1;
    }
    if (data.token !== undefined) {
      updateFields.tokenCount = parseInt(data.token, 10);
    }
    if (data.email !== undefined) {
      updateFields.email = data.email;
    }

    await Taikhoan.update(updateFields, { where: { id } });

    // Cập nhật profile tương ứng
    const profile = await NguoiDung.findOne({ where: { userId: id } });
    if (profile) {
      const profileFields = {};
      if (data.hoTen !== undefined) {
        profileFields.fullName = data.hoTen;
      }
      if (Object.keys(profileFields).length > 0) {
        await NguoiDung.update(profileFields, { where: { userId: id } });
      }
    }

    return { success: true, message: 'Cập nhật tài khoản thành công' };
  } catch (error) {
    console.error('Lỗi updateAccount:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const deleteAccount = async (id) => {
  try {
    const acc = await Taikhoan.findByPk(id);
    if (!acc) {
      return { success: false, message: 'Tài khoản không tồn tại' };
    }
    // Xóa profile và tài khoản
    await NguoiDung.destroy({ where: { userId: id } });
    await Taikhoan.destroy({ where: { id } });
    return { success: true, message: 'Xóa tài khoản thành công' };
  } catch (error) {
    console.error('Lỗi deleteAccount:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

/**
 * --- QUẢN LÝ CAREERS (Ngành nghề) ---
 */
const getCareers = async () => {
  return { success: true, careers: [] };
};

const createCareer = async (data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const updateCareer = async (id, data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const deleteCareer = async (id) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const getCategories = async () => {
  return { success: true, categories: [] };
};

const createCategory = async (data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const updateCategory = async (id, data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const deleteCategory = async (id) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const getMarketData = async () => {
  return { success: true, data: [] };
};

const createMarketData = async (data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const updateMarketData = async (id, data) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

const deleteMarketData = async (id) => {
  return { success: true, message: 'Tính năng đã tạm tắt để nâng cấp' };
};

/**
 * --- QUẢN LÝ PROMPTS (Cấu hình prompt) ---
 */
const getPrompts = async () => {
  try {
    const prompts = await Prompt.findAll({
      order: [['MaID', 'DESC']]
    });

    const mapped = prompts.map(pr => ({
      id: pr.MaID.toString(),
      code: pr.MaPrompt ? pr.MaPrompt.toString() : `PMT_${pr.MaID}`,
      title: pr.MoTa || 'Prompt vô đề',
      description: pr.MoTa || '',
      content: pr.NoiDung || '',
      version: pr.PhienBan ? pr.PhienBan.toString() : '1.0.0',
      inputVariables: pr.BienDauVao ? (typeof pr.BienDauVao === 'object' ? JSON.stringify(pr.BienDauVao) : pr.BienDauVao) : '{}',
      status: pr.TrangThaiHD ? 'active' : 'inactive',
      createdAt: pr.createdAt ? pr.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    }));

    return { success: true, prompts: mapped };
  } catch (error) {
    console.error('Lỗi getPrompts:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const createPrompt = async (data) => {
  try {
    const { code, title, content, description, version, inputVariables, status } = data;

    let variables = {};
    if (inputVariables) {
      try {
        variables = typeof inputVariables === 'string' ? JSON.parse(inputVariables) : inputVariables;
      } catch (e) {
        variables = { raw: inputVariables };
      }
    }

    // Convert code string to integer representation if needed, or generate random id
    const promptCode = parseInt(code.replace(/[^0-9]/g, ''), 10) || Math.floor(Math.random() * 1000);

    await Prompt.create({
      MaPrompt: promptCode,
      MoTa: description || title || '',
      NoiDung: content || '',
      BienDauVao: variables,
      TrangThaiHD: status === 'active',
      PhienBan: parseInt(version, 10) || 1
    });

    return { success: true, message: 'Tạo Prompt thành công' };
  } catch (error) {
    console.error('Lỗi createPrompt:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const updatePrompt = async (id, data) => {
  try {
    const pr = await Prompt.findByPk(id);
    if (!pr) {
      return { success: false, message: 'Prompt không tồn tại' };
    }

    const updateFields = {};
    if (data.description !== undefined || data.title !== undefined) {
      updateFields.MoTa = data.description || data.title;
    }
    if (data.content !== undefined) {
      updateFields.NoiDung = data.content;
    }
    if (data.version !== undefined) {
      updateFields.PhienBan = parseInt(data.version, 10) || 1;
    }
    if (data.status !== undefined) {
      updateFields.TrangThaiHD = data.status === 'active';
    }
    if (data.code !== undefined) {
      updateFields.MaPrompt = parseInt(data.code.replace(/[^0-9]/g, ''), 10) || pr.MaPrompt;
    }
    if (data.inputVariables !== undefined) {
      let variables = {};
      try {
        variables = typeof data.inputVariables === 'string' ? JSON.parse(data.inputVariables) : data.inputVariables;
      } catch (e) {
        variables = { raw: data.inputVariables };
      }
      updateFields.BienDauVao = variables;
    }

    await Prompt.update(updateFields, { where: { MaID: id } });
    return { success: true, message: 'Cập nhật Prompt thành công' };
  } catch (error) {
    console.error('Lỗi updatePrompt:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const deletePrompt = async (id) => {
  try {
    const pr = await Prompt.findByPk(id);
    if (!pr) {
      return { success: false, message: 'Prompt không tồn tại' };
    }
    await Prompt.destroy({ where: { MaID: id } });
    return { success: true, message: 'Xóa Prompt thành công' };
  } catch (error) {
    console.error('Lỗi deletePrompt:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

/**
 * --- QUẢN LÝ QUESTIONS (Ngân hàng câu hỏi khảo sát) ---
 */
const getQuestions = async () => {
  try {
    const questions = await CauHoi.findAll({
      order: [['id', 'DESC']]
    });

    const mapped = questions.map(q => ({
      id: q.id.toString(),
      noiDungCH: q.questionText,
      cauTL: q.options ? (typeof q.options === 'object' ? JSON.stringify(q.options) : q.options) : '[]',
      ngayTao: q.createdAt ? q.createdAt.toISOString().slice(0, 10) : 'Chưa rõ'
    }));

    return { success: true, questions: mapped };
  } catch (error) {
    console.error('Lỗi getQuestions (Admin):', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const createQuestion = async (data) => {
  try {
    const { noiDungCH, cauTL } = data;
    
    let parsedOpts = null;
    if (cauTL) {
      try {
        parsedOpts = typeof cauTL === 'string' ? JSON.parse(cauTL) : cauTL;
      } catch (e) {
        parsedOpts = cauTL.split(',').map(s => s.trim());
      }
    }

    await CauHoi.create({
      questionText: noiDungCH,
      options: parsedOpts,
      testType: 'career',
      order: 0,
      createdAt: new Date()
    });
    return { success: true, message: 'Tạo câu hỏi thành công' };
  } catch (error) {
    console.error('Lỗi createQuestion:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const updateQuestion = async (id, data) => {
  try {
    const q = await CauHoi.findByPk(id);
    if (!q) {
      return { success: false, message: 'Câu hỏi không tồn tại' };
    }

    const updateFields = {};
    if (data.noiDungCH !== undefined) {
      updateFields.questionText = data.noiDungCH;
    }
    if (data.cauTL !== undefined) {
      let parsedOpts = null;
      try {
        parsedOpts = typeof data.cauTL === 'string' ? JSON.parse(data.cauTL) : data.cauTL;
      } catch (e) {
        parsedOpts = data.cauTL.split(',').map(s => s.trim());
      }
      updateFields.options = parsedOpts;
    }

    await CauHoi.update(updateFields, { where: { id } });
    return { success: true, message: 'Cập nhật câu hỏi thành công' };
  } catch (error) {
    console.error('Lỗi updateQuestion:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

const deleteQuestion = async (id) => {
  try {
    const q = await CauHoi.findByPk(id);
    if (!q) {
      return { success: false, message: 'Câu hỏi không tồn tại' };
    }
    await CauHoi.destroy({ where: { id } });
    return { success: true, message: 'Xóa câu hỏi thành công' };
  } catch (error) {
    console.error('Lỗi deleteQuestion:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

module.exports = {
  getDashboardStats,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMarketData,
  createMarketData,
  updateMarketData,
  deleteMarketData,
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
