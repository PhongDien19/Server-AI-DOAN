const bcrypt = require('bcrypt');
const UserAccount = require('../models/UserAccount');
const UserProfile = require('../models/UserProfile'); // Thêm để tạo profile khi user mới đăng nhập

/**
 * Hàm kiểm tra đăng nhập bằng Username / Password
 */
const checkLogin = async (username, password) => {
  try {
    const user = await UserAccount.findOne({ where: { email: username } });

    if (!user) {
      return { success: false, message: 'Tài khoản không tồn tại' };
    }

    // Ngăn đăng nhập bằng pass nếu tài khoản tạo qua Google/Facebook mà chưa setup pass
    if (user.authProvider !== 'local' && !user.passwordHash) {
      return { success: false, message: `Tài khoản này được kết nối qua ${user.authProvider}. Vui lòng đăng nhập bằng ${user.authProvider}.` };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, message: 'Mật khẩu không chính xác' };
    }

            user.lastLoginAt = new Date();
            user.tokenCount = 3; // Reset to 3 tokens on each successful login
            await user.save();

            const profile = await UserProfile.findOne({
                where: { userId: user.id },
                attributes: [
                    'fullName',
                    'targetJob',
                    'educationLevel',
                    'careerFitScore',
                    'careerFitResult',
                    'interests',
                ],
            });

            return {
                success: true,
                message: 'Đăng nhập thành công',
                user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive },
                profile: profile ? profile.toJSON() : null,
            };
  } catch (error) {
    console.error('Lỗi trong quá trình đăng nhập:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

/**
 * Hàm xử lý đăng nhập qua Google hoặc Facebook
 * @param {string} provider - 'google' hoặc 'facebook'
 * @param {string} providerId - ID duy nhất từ Google/Facebook
 * @param {string} email - Email từ Google/Facebook
 * @param {string} displayName - Tên hiển thị người dùng
 * @param {string} avatarUrl - URL ảnh đại diện
 */
/* [TẠM ẨN - Chức năng Social Login]
const socialLogin = async (provider, providerId, email, displayName, avatarUrl) => {
  try {
    let user;

    // 1. Tìm user theo provider ID
    if (provider === 'google') {
      user = await UserAccount.findOne({ where: { googleId: providerId } });
    } else if (provider === 'facebook') {
      user = await UserAccount.findOne({ where: { facebookId: providerId } });
    }

    // 2. Nếu chưa có, thử tìm qua email (người dùng đã tạo acc bằng email trước đó)
    if (!user && email) {
      user = await UserAccount.findOne({ where: { email } });
      if (user) {
        // Cập nhật link tài khoản social vào account cũ
        if (provider === 'google') user.googleId = providerId;
        if (provider === 'facebook') user.facebookId = providerId;
        await user.save();
      }
    }

    // 3. Nếu vẫn không có -> Tài khoản mới tinh, tiến hành tạo mới
    if (!user) {
      user = await UserAccount.create({
        // Nếu Facebook ko cấp quyền lấy email thì sinh email tạm
        email: email || `${providerId}@${provider}.local`, 
        passwordHash: null, // Không cần pass
        googleId: provider === 'google' ? providerId : null,
        facebookId: provider === 'facebook' ? providerId : null,
        authProvider: provider,
        isEmailVerified: true, // Trust social provider
        lastLoginAt: new Date(),
      });

      // Tự động tạo một Profile cho user mới
      await UserProfile.create({
        userId: user.id,
        email: email || '', // Gán email vào email của profile
        fullName: displayName || '', // Tên đầy đủ từ Google/FB
        avatarUrl: avatarUrl || '',
      });
    } else {
      // 4. Nếu đã có tài khoản thì chỉ cập nhật lastLogin
      user.lastLoginAt = new Date();
      await user.save();
    }

    return {
      success: true,
      message: `Đăng nhập qua ${provider} thành công`,
      user: { id: user.id, email: user.email, role: user.role, authProvider: user.authProvider }
    };

  } catch (error) {
    console.error(`Lỗi đăng nhập qua ${provider}:`, error);
    return { success: false, message: 'Lỗi hệ thống khi xử lý đăng nhập mạng xã hội' };
  }
};
*/

/**
 * Hàm đăng ký tài khoản mới bằng Email / Password
 * @param {string} email - Email đăng ký
 * @param {string} password - Mật khẩu
 * @param {string} fullName - Tên đầy đủ
 */
const register = async (email, password, fullName) => {
  try {
    // 1. Kiểm tra xem email đã tồn tại chưa
    const existingUser = await UserAccount.findOne({ where: { email } });
    if (existingUser) {
      return { success: false, message: 'Email này đã được sử dụng' };
    }

    // 2. Mã hóa mật khẩu
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Tạo tài khoản mới
    const newUser = await UserAccount.create({
      email,
      passwordHash,
      authProvider: 'local',
      isEmailVerified: false,
    });

    // 4. Tạo profile cho user
    await UserProfile.create({
      userId: newUser.id,
      email: email,
      fullName: fullName || '',
      avatarUrl: '',
    });

    return { 
      success: true, 
      message: 'Đăng ký thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    };
  } catch (error) {
    console.error('Lỗi khi đăng ký tài khoản:', error);
    return { success: false, message: 'Lỗi hệ thống khi đăng ký' };
  }
};

module.exports = {
  checkLogin,
  // socialLogin,
  register
};
