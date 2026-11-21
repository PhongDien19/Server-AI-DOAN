const { PhienDanhGia } = require('../../models/danhSachModel');
const AssessmentService = require('../../services/dichVuDanhGia');
const ComparisonService = require('../../services/dichVuSoSanhDanhGia');

/** So sanh hai bai danh gia da hoan thanh cua cung mot nguoi dung. */
const soSanhBaiDanhGia = async (req, res) => {
  try {
    const { id, otherId } = req.params;
    if (!id || !otherId || id === otherId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp hai mã bài test khác nhau.'
      });
    }

    const assessments = await PhienDanhGia.findAll({
      where: { id: [id, otherId] }
    });
    if (assessments.length !== 2) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy một hoặc cả hai bài test.'
      });
    }

    const assessmentById = new Map(assessments.map(assessment => [assessment.id, assessment]));
    const first = assessmentById.get(id);
    const second = assessmentById.get(otherId);
    if (String(first.userId ?? '') !== String(second.userId ?? '')) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ có thể so sánh hai bài test của cùng một người dùng.'
      });
    }

    if (first.status !== 'completed' || second.status !== 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ có thể so sánh các bài test đã hoàn thành.'
      });
    }

    const ordered = [first, second].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const [previousAssessment, currentAssessment] = ordered;
    const [previousResponse, currentResponse] = await Promise.all([
      AssessmentService.getOrGenerateResult(previousAssessment.id),
      AssessmentService.getOrGenerateResult(currentAssessment.id)
    ]);

    const comparison = ComparisonService.compareAssessments({
      previousAssessment,
      currentAssessment,
      previousResult: previousResponse.result,
      currentResult: currentResponse.result
    });

    return res.status(200).json({ success: true, comparison });
  } catch (error) {
    console.error('Lỗi so sánh bài đánh giá:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi so sánh hai bài test: ' + error.message
    });
  }
};

module.exports = soSanhBaiDanhGia;
