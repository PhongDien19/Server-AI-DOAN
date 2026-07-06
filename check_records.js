require('dotenv').config();
const { LichSuTest, CauHoi, KetQuaDiscoveryHoc, KetQuaDiscoveryLam, KetQuaTargetHoc, KetQuaTargetLam } = require('./src/models');
const sequelize = require('./src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to MySQL database.');

    const historyCount = await LichSuTest.count();
    console.log(`Total records in LichSuTest: ${historyCount}`);
    
    if (historyCount > 0) {
      const records = await LichSuTest.findAll();
      console.log('LichSuTest records:');
      console.log(JSON.stringify(records, null, 2));
    }

    const qWithUser = await CauHoi.count({ where: { userId: { [require('sequelize').Op.ne]: null } } });
    console.log(`Total questions with non-null userId: ${qWithUser}`);

    const dh = await KetQuaDiscoveryHoc.count();
    const dl = await KetQuaDiscoveryLam.count();
    const th = await KetQuaTargetHoc.count();
    const tl = await KetQuaTargetLam.count();
    console.log(`Counts: DiscoveryHoc=${dh}, DiscoveryLam=${dl}, TargetHoc=${th}, TargetLam=${tl}`);

  } catch (error) {
    console.error('Error running test script:', error);
  } finally {
    await sequelize.close();
  }
}

run();
