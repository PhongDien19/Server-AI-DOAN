const { Sequelize } = require('sequelize');

// Khởi tạo kết nối Sequelize tới MySQL
const sequelize = new Sequelize('database_name', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Set true nếu muốn xem log query
});

module.exports = sequelize;
