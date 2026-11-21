const express = require('express');
const { checkAuth, verifyAdmin } = require('../middlewares/xacThuc');
const router = express.Router();

// Kiem tra tinh trang hoat dong cua server.
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server Quản lý Tài khoản đang hoạt động ổn định!'
  });
});

const layThongKeTaiKhoan = require('../xuLy/taiKhoan/layThongKeTaiKhoan');
const layDanhSachTaiKhoan = require('../xuLy/taiKhoan/layDanhSachTaiKhoan');
const layTaiKhoanTheoId = require('../xuLy/taiKhoan/layTaiKhoanTheoId');
const taoTaiKhoan = require('../xuLy/taiKhoan/taoTaiKhoan');
const capNhatTaiKhoan = require('../xuLy/taiKhoan/capNhatTaiKhoan');
const xoaTaiKhoan = require('../xuLy/taiKhoan/xoaTaiKhoan');
const doiTrangThaiTaiKhoan = require('../xuLy/taiKhoan/doiTrangThaiTaiKhoan');
const dangKyTaiKhoan = require('../xuLy/xacThuc/dangKyTaiKhoan');
const dangNhap = require('../xuLy/xacThuc/dangNhap');
const layTaiKhoanHienTai = require('../xuLy/xacThuc/layTaiKhoanHienTai');
const doiMatKhau = require('../xuLy/xacThuc/doiMatKhau');
const batDauDanhGia = require('../xuLy/danhGia/batDauDanhGia');
const layCauHoiTheoPhan = require('../xuLy/danhGia/layCauHoiTheoPhan');
const nopCauTraLoiPhan = require('../xuLy/danhGia/nopCauTraLoiPhan');
const guiDanhGiaDoTinCay = require('../xuLy/danhGia/guiDanhGiaDoTinCay');
const layKetQuaDanhGia = require('../xuLy/danhGia/layKetQuaDanhGia');
const layLichSuDanhGia = require('../xuLy/danhGia/layLichSuDanhGia');
const soSanhBaiDanhGia = require('../xuLy/danhGia/soSanhBaiDanhGia');
const layHoSoNguoiDung = require('../xuLy/hoSo/layHoSoNguoiDung');
const capNhatHoSoNguoiDung = require('../xuLy/hoSo/capNhatHoSoNguoiDung');
const layDanhSachCauHoi = require('../xuLy/cauHoi/layDanhSachCauHoi');
const taoCauHoiTiengAnh = require('../xuLy/cauHoi/taoCauHoiTiengAnh');
const layCauHoiTheoId = require('../xuLy/cauHoi/layCauHoiTheoId');
const taoCauHoi = require('../xuLy/cauHoi/taoCauHoi');
const capNhatCauHoi = require('../xuLy/cauHoi/capNhatCauHoi');
const xoaCauHoi = require('../xuLy/cauHoi/xoaCauHoi');
const layDanhSachNganh = require('../xuLy/nganh/layDanhSachNganh');
const layNganhTheoMa = require('../xuLy/nganh/layNganhTheoMa');
const layDanhSachTruong = require('../xuLy/truong/layDanhSachTruong');
const traCuuDiemChuan = require('../xuLy/truong/traCuuDiemChuan');
const layTruongTheoMa = require('../xuLy/truong/layTruongTheoMa');

// Xac thuc tai khoan
router.post('/api/auth/register', dangKyTaiKhoan);
router.post('/api/auth/login', dangNhap);
router.get('/api/auth/me', checkAuth, layTaiKhoanHienTai);
router.post('/api/auth/change-password', checkAuth, doiMatKhau);

// Quan ly tai khoan
router.get('/api/accounts/stats', verifyAdmin, layThongKeTaiKhoan);
router.get('/api/accounts', verifyAdmin, layDanhSachTaiKhoan);
router.get('/api/accounts/:id', verifyAdmin, layTaiKhoanTheoId);
router.post('/api/accounts', verifyAdmin, taoTaiKhoan);
router.put('/api/accounts/:id', verifyAdmin, capNhatTaiKhoan);
router.delete('/api/accounts/:id', verifyAdmin, xoaTaiKhoan);
router.patch('/api/accounts/:id/status', verifyAdmin, doiTrangThaiTaiKhoan);

// Ho so ca nhan
router.get('/api/profile/:userId', layHoSoNguoiDung);
router.put('/api/profile/:userId', checkAuth, capNhatHoSoNguoiDung);

// Bai danh gia
router.post('/api/assessment/start', batDauDanhGia);
router.get('/api/assessment/:id/section/:sectionType', layCauHoiTheoPhan);
router.post('/api/assessment/:id/submit-section', nopCauTraLoiPhan);
router.post('/api/assessment/:id/trust-check', guiDanhGiaDoTinCay);
router.get('/api/assessment/:id/result', layKetQuaDanhGia);
router.get('/api/assessment/:id/compare/:otherId', soSanhBaiDanhGia);
router.get('/api/assessment/history/:userId', layLichSuDanhGia);

// Ngan hang cau hoi
router.get('/api/questions/', layDanhSachCauHoi);
router.post('/api/questions/generate-english', verifyAdmin, taoCauHoiTiengAnh);
router.get('/api/questions/:id', layCauHoiTheoId);
router.post('/api/questions/', verifyAdmin, taoCauHoi);
router.put('/api/questions/:id', verifyAdmin, capNhatCauHoi);
router.delete('/api/questions/:id', verifyAdmin, xoaCauHoi);

// Danh muc nganh va truong hoc
router.get('/api/majors/', layDanhSachNganh);
router.get('/api/majors/:id', layNganhTheoMa);
router.get('/api/schools/', layDanhSachTruong);
router.get('/api/schools/admission-scores', traCuuDiemChuan);
router.get('/api/schools/:id', layTruongTheoMa);

module.exports = router;
