const dotenv = require('dotenv');
dotenv.config();

const adminService = require('../src/services/adminService');

async function testStats() {
  try {
    console.log('Calling getDashboardStats...');
    const result = await adminService.getDashboardStats();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error caught in script:', error);
  }
}

testStats();
