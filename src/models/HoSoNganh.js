const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu các kỹ năng và yêu cầu phù hợp của từng ngành học.
const HoSoNganh = sequelize.define('HoSoNganh', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaHoSo'
  },
  majorId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'MaNganh'
  },
  hollandProfile: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'HoSoHolland', // JSON: { R: 4, I: 10, A: 5, S: 3, E: 5, C: 7 }
    get() {
      const raw = this.getDataValue('hollandProfile');
      try {
        return raw ? JSON.parse(raw) : { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      } catch (e) {
        return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      }
    },
    set(val) {
      this.setDataValue('hollandProfile', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  personalityFit: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'TinhCachPhuHop', // JSON: ["INTJ", "INTP", "ISTJ", "ENTP"]
    get() {
      const raw = this.getDataValue('personalityFit');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('personalityFit', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  skillsRequired: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'KyNangCanThiet', // JSON: ["Tư duy logic", "Giải quyết vấn đề", ...]
    get() {
      const raw = this.getDataValue('skillsRequired');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('skillsRequired', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  subjectRequirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'MonHocNenTang', // JSON: ["Toán", "Tin học", "Tiếng Anh"]
    get() {
      const raw = this.getDataValue('subjectRequirements');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('subjectRequirements', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  languageMin: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'YeuCauNgoaiNgu', // JSON: { level: "B1", ielts: 5.5, toeic: 550, isRequired: true }
    get() {
      const raw = this.getDataValue('languageMin');
      try {
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },
    set(val) {
      this.setDataValue('languageMin', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  careerPaths: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'HuongNgheNghiep', // JSON: ["Lập trình viên", "Kỹ sư hệ thống", ...]
    get() {
      const raw = this.getDataValue('careerPaths');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('careerPaths', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  relatedMajors: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'NganhLienQuan', // JSON: ["Kỹ thuật phần mềm", "Khoa học máy tính", ...]
    get() {
      const raw = this.getDataValue('relatedMajors');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('relatedMajors', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  jobOutlook: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'TrienVongViecLam', // JSON: { demand: "Rất cao", avgSalary: "15 - 30 triệu", growthRate: "12%/năm" }
    get() {
      const raw = this.getDataValue('jobOutlook');
      try {
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },
    set(val) {
      this.setDataValue('jobOutlook', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '1.0.0',
    field: 'PhienBan'
  }
}, {
  tableName: 'danhmuc_hoso_nganh',
  timestamps: false
});

module.exports = HoSoNganh;

