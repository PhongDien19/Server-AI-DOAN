require('dotenv').config();
const { LichSuTest, CauHoi, Taikhoan } = require('./src/models');
const { claimAssessmentResult } = require('./src/services/assessmentService');
const sequelize = require('./src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to MySQL database.');

    // Clean up previous test records to avoid unique key / primary key duplicate errors
    await LichSuTest.destroy({ where: { sessionId: 'survey_zngrs32pr' } });

    const firstQ = await CauHoi.findOne({ where: {} });
    if (!firstQ) {
      console.log('No questions found in database.');
      return;
    }
    const sessionId = firstQ.sessionId;
    console.log(`Testing with sessionId: ${sessionId}`);

    const user = await Taikhoan.findOne({ where: {} });
    const userId = user.id;
    console.log(`Testing with userId: ${userId}`);

    // Manually populate pending store for Discovery with education = 'Đại học' (College/Worker)
    const { setPendingEvaluation } = require('./src/services/sessionContextStore');
    
    // Mock evaluation where roles, outlook, and strengths/weaknesses are arrays, matching typical AI output
    const mockEvaluation = {
      summary: 'Mock summary for testing',
      strengths: ['Strength A', 'Strength B'],
      weaknesses: ['Weakness A'],
      advice: 'Mock advice for worker',
      compatibleCareers: [
        {
          careerName: 'Kỹ sư phần mềm',
          jobDescription: 'Mô tả công việc phần mềm',
          roles: ['Thiết kế hệ thống', 'Lập trình viên', 'Bảo trì mã nguồn'], // Array instead of string!
          outlook: ['Rất triển vọng', 'Nhu cầu cao trong 5 năm tới'], // Array instead of string!
          requiredSkills: ['JavaScript', 'Node.js'] // Array instead of string!
        }
      ]
    };
    
    setPendingEvaluation(sessionId, mockEvaluation, { 
      mode: 'Discovery', 
      userContext: { education: 'Đại học' } // isHighSchool = false
    });

    console.log('Calling claimAssessmentResult...');
    const result = await claimAssessmentResult(sessionId, userId);
    console.log('Result from claimAssessmentResult:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Crash during script execution:', error);
  } finally {
    await sequelize.close();
  }
}

run();
