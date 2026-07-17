const dotenv = require('dotenv');
dotenv.config();

const { Taikhoan, NguoiDung, sequelize } = require('../src/models');
const authService = require('../src/services/authService');
const adminService = require('../src/services/adminService');
const { checkAuth } = require('../src/middlewares/authMiddleware');

async function runVerification() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Setup a test account
    const testEmail = 'verify_test_user@example.com';
    const testPassword = 'testpassword123';
    
    console.log(`Cleaning up any existing test user: ${testEmail}...`);
    const existing = await Taikhoan.findOne({ where: { email: testEmail } });
    if (existing) {
      await NguoiDung.destroy({ where: { userId: existing.id } });
      await Taikhoan.destroy({ where: { id: existing.id } });
    }

    console.log('Creating test user via adminService...');
    const createRes = await adminService.createAccount({
      email: testEmail,
      password: testPassword,
      fullName: 'Verify Test User',
      role: 'User',
      tokenCount: 5,
      tokenTest: 4
    });
    console.log('Create account result:', createRes);

    const user = await Taikhoan.findOne({ where: { email: testEmail } });
    if (!user) {
      throw new Error('Failed to create test user');
    }
    console.log('Created user values:');
    console.log(`- ID: ${user.id}`);
    console.log(`- TokenCount: ${user.tokenCount}`);
    console.log(`- TokenTest: ${user.tokenTest}`);
    console.log(`- isActive: ${user.isActive}`);

    // Verify tokenCount and tokenTest were set properly
    if (user.tokenCount !== 5 || user.tokenTest !== 4) {
      throw new Error('Initial token counts do not match expected values (5 and 4)');
    }

    // 2. Test login behavior (first login of the day / lastLoginAt is null)
    console.log('\n--- Test Login 1 ---');
    const loginRes1 = await authService.checkLogin(testEmail, testPassword);
    console.log('Login 1 result message:', loginRes1.message);
    
    // Fetch user after login
    const userAfterLogin1 = await Taikhoan.findByPk(user.id);
    console.log(`Tokens after login 1: Chat=${userAfterLogin1.tokenCount}, Test=${userAfterLogin1.tokenTest}`);
    console.log('Last login time:', userAfterLogin1.lastLoginAt);

    // Tokens should NOT be reset to 3 since initial counts (5 and 4) are >= 3.
    if (userAfterLogin1.tokenCount !== 5 || userAfterLogin1.tokenTest !== 4) {
      throw new Error('Tokens were incorrectly reset or modified during login 1');
    }

    // 3. Test token decrease and daily reset logic simulation
    console.log('\n--- Test Token Decrement and Login 2 (Same Day) ---');
    // Decrease token to 1
    await Taikhoan.update({ tokenCount: 1, tokenTest: 2 }, { where: { id: user.id } });
    
    // Login again on the same day. Since today is the same, it shouldn't reset to 3.
    const loginRes2 = await authService.checkLogin(testEmail, testPassword);
    console.log('Login 2 result message:', loginRes2.message);
    
    const userAfterLogin2 = await Taikhoan.findByPk(user.id);
    console.log(`Tokens after login 2 (same day): Chat=${userAfterLogin2.tokenCount}, Test=${userAfterLogin2.tokenTest}`);
    if (userAfterLogin2.tokenCount !== 1 || userAfterLogin2.tokenTest !== 2) {
      throw new Error('Tokens were incorrectly reset on same-day login');
    }

    // 4. Test login reset logic simulation for a new day (by fake-updating lastLoginAt to yesterday)
    console.log('\n--- Test Login 3 (Simulated Different Day) ---');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await Taikhoan.update({ lastLoginAt: yesterday }, { where: { id: user.id } });

    const loginRes3 = await authService.checkLogin(testEmail, testPassword);
    console.log('Login 3 result message:', loginRes3.message);

    const userAfterLogin3 = await Taikhoan.findByPk(user.id);
    console.log(`Tokens after login 3 (different day): Chat=${userAfterLogin3.tokenCount}, Test=${userAfterLogin3.tokenTest}`);
    if (userAfterLogin3.tokenCount !== 3 || userAfterLogin3.tokenTest !== 3) {
      throw new Error('Tokens were not correctly topped up to 3 on a new day login');
    }

    // 5. Test deactivation (disabling account)
    console.log('\n--- Test Deactivation ---');
    const updateRes = await adminService.updateAccount(user.id, { trangThai: 0 }); // 0 means lock/deactivate
    console.log('Update account result:', updateRes);

    const userAfterUpdate = await Taikhoan.findByPk(user.id);
    console.log(`User isActive status after update: ${userAfterUpdate.isActive}`);
    if (userAfterUpdate.isActive !== false) {
      throw new Error('User account is still active after updating trangThai to 0');
    }

    // Try logging in deactivated user
    const loginResDeactivated = await authService.checkLogin(testEmail, testPassword);
    console.log('Deactivated login result:', loginResDeactivated);
    if (loginResDeactivated.success !== false || loginResDeactivated.message !== 'Tài khoản hiện đang bị khóa') {
      throw new Error('Deactivated user was allowed to log in or returned wrong message');
    }

    // Test checkAuth middleware with deactivated user
    console.log('\n--- Test checkAuth Middleware with Deactivated User ---');
    let resStatus = null;
    let resJson = null;
    const req = {
      body: { userId: user.id },
      headers: {},
      query: {}
    };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(obj) {
        resJson = obj;
        return this;
      }
    };
    const next = () => {
      throw new Error('Next was called for a deactivated user!');
    };

    await checkAuth(req, res, next);
    console.log(`checkAuth response: Status=${resStatus}, JSON=${JSON.stringify(resJson)}`);
    if (resStatus !== 403 || resJson.success !== false) {
      throw new Error('checkAuth did not block the deactivated user with 403 Forbidden');
    }

    // 6. Test deleteAccount
    console.log('\n--- Test deleteAccount ---');
    const deleteRes = await adminService.deleteAccount(user.id);
    console.log('Delete account result:', deleteRes);

    const userAfterDelete = await Taikhoan.findByPk(user.id);
    const profileAfterDelete = await NguoiDung.findOne({ where: { userId: user.id } });
    console.log(`Account deleted check: ${!userAfterDelete ? 'Deleted' : 'Exist'}`);
    console.log(`Profile deleted check: ${!profileAfterDelete ? 'Deleted' : 'Exist'}`);

    if (userAfterDelete || profileAfterDelete) {
      throw new Error('Failed to delete account or profile cleanly');
    }

    console.log('\n=========================================');
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('=========================================');

  } catch (error) {
    console.error('\nVerification FAILED with error:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

runVerification();
