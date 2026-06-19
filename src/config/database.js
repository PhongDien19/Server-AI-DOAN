const bcrypt = require('bcrypt');
const mockDatabases = {};

function createMockModel(modelName) {
  mockDatabases[modelName] = [];
  let nextId = 1;

  class Model {
    constructor(data) {
      Object.assign(this, data);
    }

    async save() {
      if (!this.id) {
        this.id = nextId++;
        mockDatabases[modelName].push(this);
      } else {
        const idx = mockDatabases[modelName].findIndex(i => i.id === this.id);
        if (idx !== -1) {
          mockDatabases[modelName][idx] = this;
        } else {
          mockDatabases[modelName].push(this);
        }
      }
      return this;
    }

    async update(data) {
      Object.assign(this, data);
      await this.save();
      return this;
    }

    toJSON() {
      const plain = {};
      for (const key of Object.keys(this)) {
        if (typeof this[key] !== 'function') {
          plain[key] = this[key];
        }
      }
      return plain;
    }

    static async findOne({ where }) {
      const list = mockDatabases[modelName];
      const match = list.find(item => {
        return Object.entries(where).every(([key, value]) => {
          return String(item[key]) === String(value);
        });
      });
      return match ? new Model(match) : null;
    }

    static async findAll({ where, order } = {}) {
      let list = mockDatabases[modelName].map(i => new Model(i));
      if (where) {
        list = list.filter(item => {
          return Object.entries(where).every(([key, value]) => {
            return String(item[key]) === String(value);
          });
        });
      }
      if (order) {
        const [field, direction] = order[0];
        list.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (direction === 'DESC') {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
          } else {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
          }
        });
      }
      return list;
    }

    static async create(data) {
      const inst = new Model(data);
      await inst.save();
      return inst;
    }

    static async bulkCreate(array) {
      const results = [];
      for (const item of array) {
        results.push(await Model.create(item));
      }
      return results;
    }

    static async update(data, { where }) {
      const targets = await Model.findAll({ where });
      for (const t of targets) {
        await t.update(data);
      }
      return [targets.length];
    }
  }

  return Model;
}

const mockSequelize = {
  authenticate: async () => {
    console.log("Đã kết nối cơ sở dữ liệu giả lập (In-Memory Mock) thành công!");
  },
  define: (modelName, fields, options) => {
    return createMockModel(modelName);
  }
};

// Tự động tạo sẵn tài khoản phongdien1905@gmail.com khi khởi chạy
setTimeout(() => {
  if (mockDatabases['UserAccount'] && mockDatabases['UserProfile']) {
    const email = 'phongdien1905@gmail.com';
    const passwordHash = bcrypt.hashSync('123456', 10);
    const userId = 1;

    if (!mockDatabases['UserAccount'].some(u => u.email === email)) {
      mockDatabases['UserAccount'].push({
        id: userId,
        email: email,
        passwordHash: passwordHash,
        authProvider: 'local',
        isEmailVerified: true,
        isActive: true,
        role: 'user',
        tokenCount: 3
      });

      mockDatabases['UserProfile'].push({
        id: 1,
        userId: userId,
        email: email,
        fullName: 'Phong Điền',
        avatarUrl: '',
        targetJob: 'Lập trình viên',
        educationLevel: 'Đại học',
        interests: 'Đọc sách, Công nghệ'
      });
      console.log("Đã khởi tạo tài khoản mặc định: phongdien1905@gmail.com / 123456");
    }
  }
}, 1000);

module.exports = mockSequelize;

