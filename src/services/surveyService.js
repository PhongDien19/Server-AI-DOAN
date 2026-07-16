const { CauHoi: Question, SurveyFeedback } = require("../models");
const { setSessionContext, getSessionContext, setPendingEvaluation } = require("./sessionContextStore");
const { getGenerativeModelWithFallback, extractJsonFromText } = require("./deepseekClient");
const verification = require("./verificationService");

const model = getGenerativeModelWithFallback({
    model: "deepseek-chat",
    generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 16384
    }
});

const isStudyingHighSchool = (education) => {
  if (!education) return false;
  const eduLower = String(education).toLowerCase().trim();
  if (eduLower.includes("đại học") || eduLower.includes("đi làm") || eduLower.includes("cao đẳng") || eduLower.includes("tốt nghiệp")) {
    return false;
  }
  return eduLower.includes("thpt") ||
    eduLower.includes("học sinh") ||
    eduLower.includes("cấp 3") ||
    eduLower.includes("đang học");
};

const generateSessionId = () => {
  return 'survey_' + Math.random().toString(36).substr(2, 9);
};

const initSurvey = async (mode, targetCareer, userContext = {}, academicData = null) => {
  try {
    const sessionId = generateSessionId();
    let surveyData;

    const isHighSchool = isStudyingHighSchool(userContext.education);
    const formattedTestName = mode === 'Targeted'
      ? `Khảo sát nghề ${targetCareer} (${isHighSchool ? 'THPT' : 'Sinh viên/Người đi làm'})`
      : `Khảo sát hướng nghiệp động AI (${isHighSchool ? 'THPT' : 'Sinh viên/Người đi làm'})`;

    console.log(`[Survey] Bat dau goi AI de tao bo cau hoi. Mode: ${mode}, Career: ${targetCareer || 'N/A'}, HighSchool: ${isHighSchool}`);

    // Chuẩn bị thông tin điểm số nếu có
    let academicInfo = '';
    if (academicData && isHighSchool) {
      const scores = academicData.scores || {};
      academicInfo = `\n- Điểm số học tập hiện tại của học sinh:
  Toán: ${scores.Toan || 'Chưa có'}, Văn: ${scores.Van || 'Chưa có'}, Anh: ${scores.Anh || 'Chưa có'}
  Lý: ${scores.Ly || 'Chưa có'}, Hóa: ${scores.Hoa || 'Chưa có'}, Sinh: ${scores.Sinh || 'Chưa có'}
  Sử: ${scores.Su || 'Chưa có'}, Địa: ${scores.Dia || 'Chưa có'}, GDCD: ${scores.GDCD || 'Chưa có'}`;
    } else if (academicData && academicData.gpa) {
      academicInfo = `\n- Điểm GPA hiện tại: ${academicData.gpa}`;
    }

    let defaultPrompt = '';
    if (mode === 'Targeted') {
      if (isHighSchool) {
        defaultPrompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc dành cho học sinh trung học phổ thông. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) phù hợp với độ tuổi học sinh THPT đang muốn hướng đến ngành nghề mục tiêu là "${targetCareer}". Tích hợp thông tin cá nhân dưới đây để cá nhân hóa câu hỏi:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Đang học THPT (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Yêu cầu bắt buộc tuân thủ:
1. Thiết kế đúng 15 câu hỏi trắc nghiệm tình huống phù hợp với học sinh cấp 3, tập trung vào môi trường học tập, hoạt động ngoại khóa, câu lạc bộ, dự án nhóm học đường, các tình huống giả định liên quan đến ngành "${targetCareer}" mà học sinh có thể tiếp cận hoặc tự học:
   - 5 câu đầu (từ câu 1-5): Đánh giá mức độ yêu thích với các hoạt động, công việc học tập liên quan đến ngành "${targetCareer}" (Interest Fit - Holland). Các tình huống nên gắn liền với môi trường học tập THPT và sở thích thực tế của họ.
   - 5 câu tiếp theo (từ câu 6-10): Đánh giá hành vi, phản ứng, tính cách khi học tập hoặc tham gia hoạt động nhóm học đường, khả năng chịu áp lực thi cử, kỹ năng giải quyết vấn đề phù hợp với ngành "${targetCareer}" (Behavioral Fit - Big Five).
   - 5 câu cuối (từ câu 11-15): Đánh giá năng lực tự học, sự tự tin và niềm tin tự hiệu quả (Self-efficacy) đối với các kỹ năng nền tảng của ngành "${targetCareer}" (Efficacy Fit - SCCT). Các tình huống cần phù hợp với năng lực tự nghiên cứu và tư duy của học sinh THPT.
2. Tuyệt đối không dùng các tình huống công sở chuyên nghiệp của người đã đi làm (như họp phòng ban, quản lý nhân sự, xử lý bất đồng với sếp, KPI công ty). Thay vào đó, hãy dùng các bối cảnh học tập, thi cử, câu lạc bộ trường học, tự học online, nghiên cứu khoa học kỹ thuật cấp trường.
3. Đối chiếu chéo: Các tình huống phải có sự liên kết để kiểm tra độ tin cậy và tính nhất quán.
4. Thang đo Likert 5 mức độ: Mỗi câu hỏi phải có đúng 5 lựa chọn tương ứng với điểm trọng số từ 1 (Thấp/Không đồng ý/Tránh né) đến 5 (Cao/Rất đồng ý/Chủ động). Câu trả lời hiển thị dạng text tự nhiên (Ví dụ: "Hoàn toàn không phù hợp", "Có thể thử", "Hoàn toàn sẵn sàng").

Yêu cầu trả về định dạng JSON chuẩn xác như sau:
{
  "testName": "Khảo sát nghề ${targetCareer} (Dành cho học sinh THPT)",
  "questions": [
    {
      "questionText": "Tình huống học đường liên quan đến ngành ${targetCareer}... Bạn sẽ làm gì?",
      "options": [
         {"text": "Mô tả lựa chọn tương ứng mức 1", "weight": 1},
         {"text": "Mô tả lựa chọn tương ứng mức 2", "weight": 2},
         {"text": "Mô tả lựa chọn tương ứng mức 3", "weight": 3},
         {"text": "Mô tả lựa chọn tương ứng mức 4", "weight": 4},
         {"text": "Mô tả lựa chọn tương ứng mức 5", "weight": 5}
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      } else {
        defaultPrompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc dành cho sinh viên và người đã đi làm. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) phù hợp với sinh viên đại học hoặc người đi làm đang muốn chuyển nghề/đánh giá độ phù hợp với ngành mục tiêu là "${targetCareer}". Tích hợp thông tin cá nhân dưới đây để cá nhân hóa câu hỏi:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Sinh viên/Người đi làm (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Yêu cầu bắt buộc tuân thủ:
1. Thiết kế đúng 15 câu hỏi trắc nghiệm tình huống thực tế tại giảng đường đại học hoặc môi trường công sở chuyên nghiệp, liên quan trực tiếp đến công việc của ngành "${targetCareer}":
   - 5 câu đầu (từ câu 1-5): Đánh giá mức độ yêu thích với các hoạt động nghiệp vụ chuyên sâu, các nhiệm vụ thực tế của ngành "${targetCareer}" (Interest Fit - Holland). Các tình huống nên gắn liền với môi trường công sở hoặc đồ án đại học.
   - 5 câu tiếp theo (từ câu 6-10): Đánh giá hành vi, phản ứng, tính cách phù hợp với áp lực công việc, văn hóa doanh nghiệp, cách làm việc nhóm chuyên nghiệp, xử lý mâu thuẫn công sở trong ngành "${targetCareer}" (Behavioral Fit - Big Five).
   - 5 câu cuối (từ câu 11-15): Đánh giá năng lực tự nhận thức, niềm tin tự hiệu quả đối với các kỹ năng chuyên môn chuyên sâu của ngành "${targetCareer}" (Efficacy Fit - SCCT). Câu hỏi cần cân nhắc trình độ và kinh nghiệm thực tế để đưa ra tình huống có độ khó phù hợp.
2. Các tình huống câu hỏi cần tập trung vào các bối cảnh dự án, công việc chuyên môn, làm việc với khách hàng, quản lý thời gian, chịu áp lực tiến độ (deadline), KPI và giải quyết vấn đề kỹ thuật/nghiệp vụ thực tế.
3. Đối chiếu chéo: Các tình huống phải có sự liên kết để kiểm tra độ tin cậy và tính nhất quán.
4. Thang đo Likert 5 mức độ: Mỗi câu hỏi phải có đúng 5 lựa chọn tương ứng với điểm trọng số từ 1 (Thấp/Không đồng ý/Tránh né) đến 5 (Cao/Rất đồng ý/Chủ động). Câu trả lời hiển thị dạng text tự nhiên.

Yêu cầu trả về định dạng JSON chuẩn xác như sau:
{
  "testName": "Khảo sát nghề ${targetCareer} (Dành cho sinh viên & người đi làm)",
  "questions": [
    {
      "questionText": "Tình huống công việc liên quan đến ngành ${targetCareer}... Bạn sẽ làm gì?",
      "options": [
         {"text": "Mô tả lựa chọn tương ứng mức 1", "weight": 1},
         {"text": "Mô tả lựa chọn tương ứng mức 2", "weight": 2},
         {"text": "Mô tả lựa chọn tương ứng mức 3", "weight": 3},
         {"text": "Mô tả lựa chọn tương ứng mức 4", "weight": 4},
         {"text": "Mô tả lựa chọn tương ứng mức 5", "weight": 5}
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      }
    } else {
      if (isHighSchool) {
        defaultPrompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc dành cho học sinh trung học phổ thông. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) nhằm khám phá ngành nghề phù hợp nhất cho học sinh THPT dựa trên thông tin cá nhân dưới đây:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Đang học THPT (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Yêu cầu bắt buộc tuân thủ:
1. Thiết kế đúng 15 câu hỏi trắc nghiệm tình huống phù hợp với học sinh cấp 3, xoay quanh môi trường học tập THPT, hoạt động ngoại khóa, việc lựa chọn môn học, cách xử lý bài tập, làm việc nhóm học đường:
   - 5 câu đầu (từ câu 1-5): Đánh giá mức độ yêu thích với các nhóm hoạt động khác nhau theo thuyết Holland (RIASEC) (Interest Fit). Các tình huống nên gần gũi với sở thích và hoạt động học sinh cấp 3.
   - 5 câu tiếp theo (từ câu 6-10): Đánh giá tính cách, phong cách học tập, làm việc nhóm, cách đối mặt với áp lực thi cử và giải quyết các vấn đề cá nhân/học tập (Behavioral Fit - Big Five).
   - 5 câu cuối (từ câu 11-15): Đánh giá khả năng tự nhận thức năng lực học tập và sự tự tin đối với các nhóm kỹ năng cơ bản (như tư duy logic, viết lách, giao tiếp, tổ chức) (Efficacy Fit - SCCT).
2. Tuyệt đối không sử dụng bối cảnh công sở chuyên nghiệp của người đi làm (như đi họp, quản lý nhân viên, tranh chấp với đồng nghiệp). Tập trung vào các bối cảnh học tập, thi đua, câu lạc bộ, các quyết định định hướng học tập cấp 3.
3. Thang đo Likert 5 mức độ: Mỗi câu hỏi phải có đúng 5 lựa chọn tương ứng với điểm trọng số từ 1 (Thấp/Không đồng ý/Tránh né) đến 5 (Cao/Rất đồng ý/Chủ động). Câu trả lời hiển thị dạng text tự nhiên.

Yêu cầu trả về định dạng JSON chuẩn xác như sau:
{
  "testName": "Khảo Sát Hướng Nghiệp Động AI - Khám Phá (THPT)",
  "questions": [
    {
      "questionText": "Tình huống học đường cụ thể... Bạn sẽ làm gì?",
      "options": [
         {"text": "Mô tả lựa chọn tương ứng mức 1", "weight": 1},
         {"text": "Mô tả lựa chọn tương ứng mức 2", "weight": 2},
         {"text": "Mô tả lựa chọn tương ứng mức 3", "weight": 3},
         {"text": "Mô tả lựa chọn tương ứng mức 4", "weight": 4},
         {"text": "Mô tả lựa chọn tương ứng mức 5", "weight": 5}
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      } else {
        defaultPrompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc dành cho sinh viên và người đã đi làm. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) nhằm khám phá ngành nghề phù hợp nhất dựa trên thông tin cá nhân dưới đây:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Sinh viên/Người đi làm (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Yêu cầu bắt buộc tuân thủ:
1. Thiết kế đúng 15 câu hỏi trắc nghiệm tình huống thực tế tại giảng đường đại học hoặc môi trường công sở chuyên nghiệp để đánh giá tố chất nghề nghiệp:
   - 5 câu đầu (từ câu 1-5): Đánh giá mức độ yêu thích với các nhóm công việc nghiệp vụ khác nhau theo thuyết Holland (RIASEC) (Interest Fit). Các tình huống nên gắn với công việc thực tế, dự án nghiên cứu hoặc công tác xã hội.
   - 5 câu tiếp theo (từ câu 6-10): Đánh giá tính cách, phản ứng phù hợp với môi trường làm việc đặc thù, văn hóa doanh nghiệp, tương tác với sếp/đồng nghiệp, chịu áp lực công việc (Behavioral Fit - Big Five).
   - 5 câu cuối (từ câu 11-15): Đánh giá niềm tin tự hiệu quả đối với các nhóm kỹ năng chuyên môn và kỹ năng mềm tại nơi làm việc (Efficacy Fit - SCCT).
2. Tình huống câu hỏi cần mang tính thực tế công sở, môi trường làm việc, xử lý vấn đề trong dự án, quản lý công việc và phát triển sự nghiệp của người lớn.
3. Thang đo Likert 5 mức độ: Mỗi câu hỏi phải có đúng 5 lựa chọn tương ứng với điểm trọng số từ 1 (Thấp/Không đồng ý/Tránh né) đến 5 (Cao/Rất đồng ý/Chủ động). Câu trả lời hiển thị dạng text tự nhiên.

Yêu cầu trả về định dạng JSON chuẩn xác như sau:
{
  "testName": "Khảo Sát Hướng Nghiệp Động AI - Khám Phá (Sinh viên & Người đi làm)",
  "questions": [
    {
      "questionText": "Tình huống công sở/đại học cụ thể... Bạn sẽ làm gì?",
      "options": [
         {"text": "Mô tả lựa chọn tương ứng mức 1", "weight": 1},
         {"text": "Mô tả lựa chọn tương ứng mức 2", "weight": 2},
         {"text": "Mô tả lựa chọn tương ứng mức 3", "weight": 3},
         {"text": "Mô tả lựa chọn tương ứng mức 4", "weight": 4},
         {"text": "Mô tả lựa chọn tương ứng mức 5", "weight": 5}
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      }
    }

    let promptTemplate = defaultPrompt;
    let promptCode = 203;
    if (mode === 'Targeted') {
      promptCode = isHighSchool ? 201 : 202;
    } else {
      promptCode = isHighSchool ? 203 : 204;
    }

    try {
      const { Prompt } = require("../models");
      const dbPrompt = await Prompt.findOne({ where: { MaPrompt: promptCode, TrangThaiHD: true } });
      if (dbPrompt && dbPrompt.NoiDung) {
        promptTemplate = dbPrompt.NoiDung;
      }
    } catch (dbErr) {
      console.error(`[Survey] Lỗi đọc prompt ${promptCode} từ DB, sử dụng mặc định:`, dbErr);
    }

    let prompt = promptTemplate
      .replace(/\{\{targetCareer\}\}/g, targetCareer || '')
      .replace(/\{\{age\}\}/g, userContext.age || 'Chưa rõ')
      .replace(/\{\{education\}\}/g, userContext.education || 'Chưa rõ')
      .replace(/\{\{location\}\}/g, userContext.location || 'Chưa rõ')
      .replace(/\{\{hobby\}\}/g, userContext.hobby || 'Chưa rõ')
      .replace(/\$\{targetCareer\}/g, targetCareer || '')
      .replace(/\$\{userContext\.age\}/g, userContext.age || 'Chưa rõ')
      .replace(/\$\{userContext\.education\}/g, userContext.education || 'Chưa rõ')
      .replace(/\$\{userContext\.location\}/g, userContext.location || 'Chưa rõ')
      .replace(/\$\{userContext\.hobby\}/g, userContext.hobby || 'Chưa rõ');

    // Tối ưu hóa độ dài phản hồi để tăng tốc độ phản hồi của AI
    prompt += `\n\n⚠️ YÊU CẦU BẮT BUỘC VỀ ĐỘ DÀI ĐỂ TỐI ƯU HÓA TỐC ĐỘ:
1. Mỗi câu hỏi (questionText) phải cực kỳ ngắn gọn, súc tích, viết dưới dạng tình huống cô đọng (tối đa 15-20 từ).
2. Các lựa chọn trả lời (options) phải ngắn gọn, súc tích và tự nhiên (tối đa 5-8 từ mỗi lựa chọn). Tránh viết câu dài dòng.`;

    const aiResult = await model.generateContent(prompt);
    let text = aiResult.response.text().trim();

    const generatedSurvey = extractJsonFromText(text);
    if (!generatedSurvey || !Array.isArray(generatedSurvey.questions)) {
      console.error("[Survey] Khong the parse JSON. Phan hoi tho (500 ky tu dau):", text.slice(0, 500));
      throw new Error("Không thể trích xuất JSON hợp lệ từ phản hồi của AI.");
    }

    generatedSurvey.questions = generatedSurvey.questions.filter(q =>
      q && typeof q.questionText === 'string' && Array.isArray(q.options) && q.options.length > 0
    );
    if (generatedSurvey.questions.length === 0) {
      throw new Error("AI trả về JSON không có câu hỏi hợp lệ.");
    }

    const questionRecords = generatedSurvey.questions.map((q, index) => ({
      sessionId,
      testName: formattedTestName,
      testType: 'career',
      questionText: q.questionText,
      options: q.options,
      order: index + 1
    }));
    await Question.bulkCreate(questionRecords);

    surveyData = generatedSurvey;

    setSessionContext(sessionId, { mode, targetCareer, userContext, academicData });

    return { sessionId, survey: surveyData };
  } catch (error) {
    console.error("Lỗi Init Survey:", error);
    throw error;
  }
};

const processSurveySubmit = async (sessionId, answers) => {
  try {
    const questions = await Question.findAll({ where: { sessionId }, order: [['order', 'ASC']] });
    if (!questions.length) {
      throw new Error("Không tìm thấy dữ liệu khảo sát.");
    }

    let interestScore = 0, interestMax = 0;
    let behavioralScore = 0, behavioralMax = 0;
    let efficacyScore = 0, efficacyMax = 0;

    const parsedAnswers = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answerWeight = answers[i] || 3;

      let selectedText = String(answerWeight);
      if (q.options) {
        let opts = [];
        if (typeof q.options === 'string') {
          try { opts = JSON.parse(q.options); } catch (e) {}
        } else if (Array.isArray(q.options)) {
          opts = q.options;
        }
        if (Array.isArray(opts)) {
          const found = opts.find(o => o && o.weight === answerWeight);
          if (found && found.text) {
            selectedText = found.text;
          }
        }
      }

      q.userAnswer = selectedText;
      await q.save();

      parsedAnswers.push({ question: q.questionText, weight: answerWeight });

      if (i < 5) {
        interestScore += answerWeight;
        interestMax += 5;
      } else if (i < 10) {
        behavioralScore += answerWeight;
        behavioralMax += 5;
      } else {
        efficacyScore += answerWeight;
        efficacyMax += 5;
      }
    }

    const normalizedInterest = interestScore / interestMax;
    const normalizedBehavioral = behavioralScore / behavioralMax;
    const normalizedEfficacy = efficacyScore / efficacyMax;

    const totalScore = (normalizedInterest * 5 * 0.5) + (normalizedBehavioral * 5 * 0.3) + (normalizedEfficacy * 5 * 0.2);

    const ctx = getSessionContext(sessionId) || {};
    const mode = ctx.mode || 'Discovery';
    const targetCareer = ctx.targetCareer || '';
    const userContext = ctx.userContext || {};

    const isHighSchool = isStudyingHighSchool(userContext.education);

    const academic = ctx.academicData || userContext.academicData;
    let academicInfo = 'Chưa cung cấp';
    if (academic) {
      if (academic.scores) {
        const s = academic.scores;
        academicInfo = `Toán: ${s.Toan ?? 'N/A'}, Văn: ${s.Van ?? 'N/A'}, Anh: ${s.Anh ?? 'N/A'}, Lý: ${s.Ly ?? 'N/A'}, Hóa: ${s.Hoa ?? 'N/A'}, Sinh: ${s.Sinh ?? 'N/A'}, Sử: ${s.Su ?? 'N/A'}, Địa: ${s.Dia ?? 'N/A'}, GDCD: ${s.GDCD ?? 'N/A'} (GPA: ${academic.gpa ?? 'N/A'})`;
      } else if (academic.gpa) {
        academicInfo = `GPA: ${academic.gpa}`;
      } else {
        academicInfo = JSON.stringify(academic);
      }
    }

    let prompt = '';
    if (mode === 'Discovery') {
      if (isHighSchool) {
        prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI dành riêng cho học sinh trung học phổ thông (THPT). Hãy phân tích kết quả bài khảo sát của học sinh:
Chế độ: Khám phá (Discovery) - Học sinh muốn tìm định hướng ngành học và trường học phù hợp nhất dựa trên hành vi, sở thích, thông tin cá nhân và điểm số học tập:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Đang học THPT (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}
- Điểm số học tập các môn: ${academicInfo}

Các câu hỏi và trả lời của học sinh (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. ĐỐI CHIẾU HỌC LỰC VÀ ĐIỂM SỐ THẾ MẠNH: Hãy phân tích kỹ điểm số học tập các môn của học sinh. 
   - Nếu học sinh học lệch các môn xã hội (điểm Văn, Sử, Địa cao nổi trội, ví dụ từ 7.0 trở lên) nhưng các môn tự nhiên (Toán, Lý, Hóa, Sinh) thấp hoặc không học, tuyệt đối KHÔNG đề xuất các ngành kỹ thuật, công nghệ chuyên sâu (như Công nghệ thông tin, Khoa học máy tính, Kỹ thuật điện tử, Cơ khí...). Thay vào đó, hãy đề xuất các ngành thuộc nhóm Xã hội - Nhân văn, Sư phạm, Truyền thông, Ngôn ngữ, Luật, Du lịch, Kinh doanh... phù hợp với các môn thế mạnh của họ.
   - Ngược lại, nếu học sinh có điểm Toán, Lý, Hóa, Anh cao nổi trội, hãy ưu tiên đề xuất các ngành Công nghệ, Kỹ thuật, Kinh tế, Tài chính, Khoa học tự nhiên...
2. LƯU Ý: Không chấm điểm tương thích hay đánh giá Passed/Failed vì đây là bài khảo sát tự khám phá định hướng tổng quan cho học sinh THPT. Do đó, JSON trả về KHÔNG chứa các trường "score" và "status".
3. Đề xuất các ngành học phù hợp. KHÔNG tạo thông tin trường học hay website ở đây. Chúng sẽ được xử lý riêng.

Hãy thực hiện đánh giá định hướng và trả về cấu trúc JSON chính xác như sau:
{
  "summary": "Tóm tắt phân tích kết quả định hướng tổng quan về nhóm tính cách/sở thích của học sinh (khoảng 3-4 câu ngắn gọn, có cân nhắc đến độ tuổi, học vấn THPT, điểm thế mạnh các môn học và sở thích)",
  "strengths": ["Điểm mạnh nổi bật 1", "Điểm mạnh nổi bật 2"],
  "weaknesses": ["Hạn chế hoặc kỹ năng cần cải thiện 1", "Hạn chế 2..."],
  "advice": "Lời khuyên định hướng học tập cốt lõi và hướng chuẩn bị tiếp theo cho học sinh cấp 3 để thi tuyển hoặc đăng ký xét tuyển",
  "compatibleCareers": [
    {
      "career": "Tên ngành học/lĩnh vực phù hợp (Ví dụ: Luật học hoặc Quan hệ công chúng)",
      "careerName": "Tên ngành học/lĩnh vực phù hợp (Ví dụ: Luật học hoặc Quan hệ công chúng)",
      "reason": "Lý do ngắn gọn vì sao phù hợp",
      "matchRate": "Mức độ phù hợp (Ví dụ: Cao hoặc Rất cao)",
      "studyInfo": {
        "topSchools": ["Tên trường đại học 1", "Tên trường 2"]
      },
      "workInfo": {
        "hiringCompanies": ["Công ty tiêu biểu 1", "Công ty 2"],
        "marketDemand": "Triển vọng thị trường tuyển dụng ngành này"
      }
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      } else {
        prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI dành cho sinh viên đại học và người đi làm. Hãy phân tích kết quả bài khảo sát của người dùng:
Chế độ: Khám phá (Discovery) - Người dùng đang muốn tìm định hướng ngành nghề phù hợp nhất dựa trên hành vi, sở thích và thông tin cá nhân:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Sinh viên/Người đi làm (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Các câu hỏi và trả lời của người dùng (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. LƯU Ý: Không chấm điểm tương thích hay đánh giá Passed/Failed vì đây là bài khảo sát tự khám phá định hướng tổng quan. Do đó, JSON trả về KHÔNG chứa các trường "score" và "status".
2. Đề xuất các ngành nghề phù hợp kèm theo mô tả công việc, vai trò, triển vọng, kỹ năng cốt lõi và thông tin tuyển dụng chi tiết.

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "summary": "Tóm tắt phân tích kết quả tổng quan về nhóm tính cách/sở thích của họ (khoảng 3-4 câu ngắn gọn, có cân nhắc đến độ tuổi, học vấn và sở thích của họ)",
  "strengths": ["Điểm mạnh phù hợp 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Điểm yếu hoặc hạn chế cần cải thiện 1", "Điểm yếu 2..."],
  "advice": "Lời khuyên định hướng sự nghiệp cốt lõi và hướng phát triển tiếp theo (cụ thể hóa dựa trên trình độ học vấn, độ tuổi và sở thích của họ)",
  "compatibleCareers": [
    {
      "career": "Tên ngành nghề/lĩnh vực tương thích (Ví dụ: Kỹ sư phần mềm)",
      "careerName": "Tên ngành nghề/lĩnh vực tương thích (Ví dụ: Kỹ sư phần mềm)",
      "reason": "Lý do ngắn gọn vì sao phù hợp",
      "matchRate": "Mức độ phù hợp (Ví dụ: Cao hoặc Rất cao)",
      "jobDescription": "Mô tả công việc chi tiết",
      "roles": "Các vai trò, nhiệm vụ chính của vị trí này",
      "outlook": "Triển vọng nghề nghiệp phát triển trong tương lai",
      "requiredSkills": "Các kỹ năng cốt lõi cần thiết (viết dưới dạng chuỗi ngăn cách bởi dấu phẩy)",
      "studyInfo": {
        "topSchools": ["Tên trường đại học 1", "Tên trường 2"]
      },
      "workInfo": {
        "hiringCompanies": ["Công ty tiêu biểu 1", "Công ty 2"],
        "marketDemand": "Triển vọng thị trường tuyển dụng ngành này"
      },
      "companyDetails": [
        {
          "companyName": "Tên công ty tuyển dụng tại khu vực ${userContext.location || 'Việt Nam'}",
          "companyDescription": "Mô tả ngắn gọn về công ty, quy mô và môi trường làm việc",
          "careerLink": "Link trang tuyển dụng hoặc trang chủ của công ty",
          "basicSalary": "Mức lương cơ bản của nghề này tại công ty (Ví dụ: 15-20 triệu VNĐ)"
        }
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      }
    } else {
      if (isHighSchool) {
        prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI dành riêng cho học sinh trung học phổ thông (THPT). Hãy phân tích kết quả bài khảo sát của học sinh:
Chế độ: Mục tiêu (Targeted) - Ngành học mục tiêu của học sinh: ${targetCareer}.
Thông tin cá nhân học sinh:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Đang học THPT (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}
- Điểm số học tập các môn: ${academicInfo}

Tổng điểm tương thích định lượng (1-5): ${totalScore.toFixed(2)}/5 (Trong đó: Điểm > 3.0 là Phù hợp, Điểm <= 3.0 là Chưa phù hợp).

Các câu hỏi và trả lời của học sinh (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. ĐỐI CHIẾU HỌC LỰC VÀ ĐIỂM SỐ: Phải phân tích kỹ điểm số học tập các môn của học sinh. Đối chiếu xem học sinh có đủ năng lực học tập các môn nền tảng của ngành mục tiêu hay không.
   - Ví dụ: Nếu ngành học mục tiêu là "${targetCareer}" thuộc nhóm Kỹ thuật, Công nghệ (như CNTT, Khoa học máy tính...) nhưng điểm các môn tự nhiên (Toán, Lý, Hóa) thấp hoặc không học (dưới 6.0), trong khi các môn Văn, Sử, Địa lại cao nổi trội, thì kết quả tương thích tổng thể phải đánh giá là CHƯA PHÙ HỢP (score <= 3.0 và status là 'Failed'). Hãy giải thích rõ trong phần hạn chế (weaknesses) và lời khuyên (advice) rằng ngành này đòi hỏi tư duy Toán lý tốt, và đề xuất các ngành xã hội phù hợp thế mạnh hơn ở phần 'compatibleCareers'.
2. Đưa ra điểm đánh giá phù hợp trên thang điểm từ 1 đến 5 (số thực, ví dụ: 4.25).
3. Đưa ra đánh giá tổng quát về mức độ phù hợp của học sinh với ngành học mục tiêu.
4. Nếu score <= 3.0 (Không đạt), bắt buộc đề xuất thêm danh sách 3 ngành học khác có thể phù hợp hơn cho học sinh trong trường 'compatibleCareers'. Nếu score > 3.0 (Đạt), mảng 'compatibleCareers' để trống hoặc để null.

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Đánh giá chi tiết về mức độ phù hợp của học sinh với ngành học mục tiêu ${targetCareer} (khoảng 3-4 câu ngắn gọn, cân nhắc đến độ tuổi, học vấn THPT, điểm số các môn học và sở thích)",
  "strengths": ["Điểm mạnh của học sinh phù hợp với ngành này 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Hạn chế hoặc kiến thức học sinh cần cải thiện để chuẩn bị cho ngành này 1", "Hạn chế 2..."],
  "advice": "Lời khuyên định hướng học tập cốt lõi và định hướng ôn tập tiếp theo đối với ngành ${targetCareer} dành cho học sinh THPT",
  "roadmap": [
    "Giai đoạn 1: Nắm bắt kiến thức cơ bản và kỹ năng tự học nền tảng cho ngành ${targetCareer}",
    "Giai đoạn 2: Tham gia hoạt động thực hành, làm đồ án/dự án nhỏ cấp trường",
    "Giai đoạn 3: Chuẩn bị hồ sơ năng lực và ôn luyện cho kỳ thi xét tuyển chuyên ngành"
  ],
  "certificates": [
    "Các chứng chỉ học tập/chuyên môn khuyên học 1",
    "Chứng chỉ 2..."
  ],
  "compatibleCareers": [
    {
      "career": "Tên ngành học khác phù hợp hơn (Ví dụ: Luật học hoặc Báo chí)",
      "careerName": "Tên ngành học khác phù hợp hơn (Ví dụ: Luật học hoặc Báo chí)",
      "reason": "Lý do vì sao phù hợp hơn ngành mục tiêu"
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      } else {
        prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI dành cho sinh viên đại học và người đi làm. Hãy phân tích kết quả bài khảo sát của người dùng:
Chế độ: Mục tiêu (Targeted) - Ngành nghề mục tiêu của người dùng: ${targetCareer}.
Thông tin cá nhân người dùng:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: ${userContext.education || 'Chưa rõ'}
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Tổng điểm tương thích định lượng (1-5): ${totalScore.toFixed(2)}/5 (Trong đó: Điểm > 3.0 là Phù hợp, Điểm <= 3.0 là Chưa phù hợp).

Các câu hỏi và trả lời của người dùng (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. Đưa ra điểm đánh giá phù hợp trên thang điểm từ 1 đến 5 (số thực).
2. Đưa ra thông tin về các công ty tiêu biểu có tuyển dụng về ngành nghề "${targetCareer}" theo khu vực sinh sống/mong muốn của họ (${userContext.location || 'Việt Nam'}), kèm theo mức lương cơ bản và thông tin thị trường lao động.

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Đánh giá chi tiết về mức độ phù hợp của người dùng với ngành nghề ${targetCareer} (khoảng 3-4 câu ngắn gọn, cân nhắc đến độ tuổi, học vấn, khu vực và sở thích)",
  "strengths": ["Điểm mạnh phù hợp với ngành này 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Điểm yếu hoặc hạn chế cần cải thiện để làm ngành này 1", "Điểm yếu 2..."],
  "advice": "Lời khuyên định hướng sự nghiệp cốt lõi và hướng phát triển tiếp theo đối với ngành ${targetCareer} (cụ thể hóa dựa trên trình độ học vấn, độ tuổi và sở thích)",
  "roadmap": [
    "Giai đoạn 1: Bổ sung các kiến thức nền tảng và tích lũy chứng chỉ bổ trợ chuyên ngành cho vị trí ${targetCareer}",
    "Giai đoạn 2: Tham gia thiết kế/xây dựng các dự án thực tế hoặc học việc để cọ xát nghiệp vụ",
    "Giai đoạn 3: Tìm kiếm cơ hội thực tập hoặc ứng tuyển chính thức vào các doanh nghiệp tiêu biểu"
  ],
  "certificates": [
    "Các chứng chỉ chuyên môn cần có 1",
    "Chứng chỉ cần có 2..."
  ],
  "companies": [
    {
      "companyName": "Tên công ty tuyển dụng tại khu vực ${userContext.location || 'Việt Nam'}",
      "companyDescription": "Mô tả ngắn gọn về công ty, quy mô và môi trường",
      "careerLink": "Link trang tuyển dụng hoặc trang chủ của công ty",
      "basicSalary": "Mức lương cơ bản của nghề này tại công ty hoặc thị trường (Ví dụ: 15-20 triệu VNĐ)",
      "laborMarket": "Thông tin thị trường lao động tại khu vực mong muốn cho ngành này (Nhu cầu, cơ hội và xu hướng)"
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
      }
    }

    const aiResult = await model.generateContent(prompt);
    let text = aiResult.response.text().trim();
    const evaluation = extractJsonFromText(text);
    if (!evaluation) {
      console.error("[Survey] Khong the parse JSON cham diem. Phan hoi tho (500 ky tu dau):", text.slice(0, 500));
      throw new Error("Không thể trích xuất JSON hợp lệ từ phản hồi đánh giá của AI.");
    }
    evaluation.mode = mode;
    evaluation.targetCareer = targetCareer;

    // ENRICH REAL SCHOOLS AND LINKS programmatically in the backend (Chạy song song bằng Promise.all để tối ưu tốc độ)
    if (isHighSchool) {
      if (mode === 'Discovery') {
        if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
          const promises = evaluation.compatibleCareers.map(async (item) => {
            const careerName = item.career || item.careerName;
            if (careerName) {
              const schools = await verification.getRealSchoolsForMajor(careerName, userContext.location);
              item.trainingInstitutions = schools.map(s => ({
                schoolName: s.schoolName,
                officialLink: s.linkResult ? s.linkResult.url : null,
                admissionLink: s.linkResult ? s.linkResult.url : null
              }));
            }
          });
          await Promise.all(promises);
        }
      } else if (mode === 'Targeted') {
        const scoreVal = Number(evaluation.score || totalScore);
        if (scoreVal > 3.0) {
          const schools = await verification.getRealSchoolsForMajor(targetCareer, userContext.location);
          evaluation.trainingInstitutions = schools.map(s => ({
            schoolName: s.schoolName,
            officialLink: s.linkResult ? s.linkResult.url : null,
            admissionLink: s.linkResult ? s.linkResult.url : null
          }));
        } else {
          if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
            const promises = evaluation.compatibleCareers.map(async (item) => {
              const careerName = item.career || item.careerName;
              if (careerName) {
                const schools = await verification.getRealSchoolsForMajor(careerName, userContext.location);
                item.trainingInstitutions = schools.map(s => ({
                  schoolName: s.schoolName,
                  officialLink: s.linkResult ? s.linkResult.url : null,
                  admissionLink: s.linkResult ? s.linkResult.url : null
                }));
              }
            });
            await Promise.all(promises);
          }
        }
      }
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    return {
      requiresLogin: true,
      sessionId,
      evaluation,
      message: 'Khảo sát đã hoàn thành và được AI chấm điểm. Vui lòng đăng nhập hoặc tạo tài khoản để nhận báo cáo hướng nghiệp chi tiết.'
    };
  } catch (error) {
    console.error("Lỗi AI (Submit Survey):", error);
    throw error;
  }
};

const saveFeedback = async (surveyId, ratingScore, comment, userId) => {
  return await SurveyFeedback.create({
    surveyId,
    ratingScore,
    comment,
    userId
  });
};

module.exports = {
  initSurvey,
  processSurveySubmit,
  saveFeedback
};
