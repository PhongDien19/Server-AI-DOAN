const { CauHoi: Question, SurveyFeedback } = require("../models");
const { setSessionContext, getSessionContext, setPendingEvaluation } = require("./sessionContextStore");
const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.5,
        // gemini-2.5-flash mac dinh dung 1 phan token cho "thinking/reasoning"
        // (thoughtsTokenCount), nen can maxOutputTokens du lon de phan JSON
        // tra ve khong bi cat cut.
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
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

const initSurvey = async (mode, targetCareer, userContext = {}) => {
  try {
    const sessionId = generateSessionId();
    let surveyData;

    const isHighSchool = isStudyingHighSchool(userContext.education);
    const formattedTestName = mode === 'Targeted'
      ? `Khảo sát nghề ${targetCareer} (${isHighSchool ? 'THPT' : 'Sinh viên/Người đi làm'})`
      : `Khảo sát hướng nghiệp động AI (${isHighSchool ? 'THPT' : 'Sinh viên/Người đi làm'})`;

    console.log(`[Survey] Bắt đầu gọi AI để tạo bộ câu hỏi. Mode: ${mode}, Career: ${targetCareer || 'N/A'}, HighSchool: ${isHighSchool}`);

    let prompt = '';
    if (mode === 'Targeted') {
      if (isHighSchool) {
        prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc dành cho học sinh trung học phổ thông. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) phù hợp với độ tuổi học sinh THPT đang muốn hướng đến ngành nghề mục tiêu là "${targetCareer}". Tích hợp thông tin cá nhân dưới đây để cá nhân hóa câu hỏi:
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
        prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc dành cho sinh viên và người đã đi làm. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) phù hợp với sinh viên đại học hoặc người đi làm đang muốn chuyển nghề/đánh giá độ phù hợp với ngành mục tiêu là "${targetCareer}". Tích hợp thông tin cá nhân dưới đây để cá nhân hóa câu hỏi:
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
        prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc dành cho học sinh trung học phổ thông. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) nhằm khám phá ngành nghề phù hợp nhất cho học sinh THPT dựa trên thông tin cá nhân dưới đây:
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
        prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc dành cho sinh viên và người đã đi làm. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) nhằm khám phá ngành nghề phù hợp nhất dựa trên thông tin cá nhân dưới đây:
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

    const aiResult = await model.generateContent(prompt);
    let text = aiResult.response.text().trim();

    const generatedSurvey = extractJsonFromText(text);
    if (!generatedSurvey) {
      // In ra 500 ky tu dau cua phan hoi de biet tai sao parse loi
      console.error("[Survey] Khong the parse JSON. Phan hoi tho (500 ky tu dau):", text.slice(0, 500));
      throw new Error("Không thể trích xuất JSON hợp lệ từ phản hồi của AI.");
    }

    // Chuẩn hóa và lưu vào DB
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

    // Lưu thông tin context vào sessionContextStore
    setSessionContext(sessionId, { mode, targetCareer, userContext });

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

    // 1. Áp dụng Thuật toán phân tích tương thích (Weight-based Scoring)
    // Interest Fit (50%), Behavioral Fit (30%), Efficacy Fit (20%)
    let interestScore = 0, interestMax = 0;
    let behavioralScore = 0, behavioralMax = 0;
    let efficacyScore = 0, efficacyMax = 0;

    const parsedAnswers = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answerWeight = answers[i] || 3; // default neutral if missing

      // update userAnswer vào DB
      q.userAnswer = String(answerWeight);
      await q.save();

      parsedAnswers.push({ question: q.questionText, weight: answerWeight });

      // Phân loại 15 câu theo thứ tự (5 Holland, 5 Big Five, 5 SCCT)
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

    const normalizedInterest = interestScore / interestMax; // 0 to 1
    const normalizedBehavioral = behavioralScore / behavioralMax;
    const normalizedEfficacy = efficacyScore / efficacyMax;

    const totalScore = (normalizedInterest * 5 * 0.5) + (normalizedBehavioral * 5 * 0.3) + (normalizedEfficacy * 5 * 0.2);

    // Đọc lại context từ sessionContextStore
    const ctx = getSessionContext(sessionId) || {};
    const mode = ctx.mode || 'Discovery';
    const targetCareer = ctx.targetCareer || '';
    const userContext = ctx.userContext || {};

    // Quyết định nhóm người dùng dựa trên thông tin trình độ học vấn
    const isHighSchool = isStudyingHighSchool(userContext.education);

    // Gọi Gemini để phân tích chi tiết và sinh kết quả động
    let prompt = '';
    if (mode === 'Discovery') {
      if (isHighSchool) {
        prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI dành riêng cho học sinh trung học phổ thông (THPT). Hãy phân tích kết quả bài khảo sát của học sinh:
Chế độ: Khám phá (Discovery) - Học sinh muốn tìm định hướng ngành học và trường học phù hợp nhất dựa trên hành vi, sở thích và thông tin cá nhân:
- Độ tuổi: ${userContext.age || 'Chưa rõ'}
- Trình độ học vấn: Đang học THPT (${userContext.education || 'Chưa rõ'})
- Khu vực sinh sống: ${userContext.location || 'Chưa rõ'}
- Sở thích cá nhân: ${userContext.hobby || 'Chưa rõ'}

Các câu hỏi và trả lời của học sinh (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. LƯU Ý: Không chấm điểm tương thích hay đánh giá Passed/Failed vì đây là bài khảo sát tự khám phá định hướng tổng quan cho học sinh THPT. Do đó, JSON trả về KHÔNG chứa các trường "score" và "status".
2. Đề xuất các ngành học phù hợp, với mỗi ngành đề xuất các trường học có đào tạo ngành đó tại Việt Nam, kèm website chính thức, điểm chuẩn tuyển sinh các năm 2024, 2023, 2022 và link tuyển sinh.

Hãy thực hiện đánh giá định hướng và trả về cấu trúc JSON chính xác như sau:
{
  "summary": "Tóm tắt phân tích kết quả định hướng tổng quan về nhóm tính cách/sở thích của học sinh (khoảng 3-4 câu ngắn gọn, có cân nhắc đến độ tuổi, học vấn THPT và sở thích)",
  "strengths": ["Điểm mạnh nổi bật 1", "Điểm mạnh nổi bật 2"],
  "weaknesses": ["Hạn chế hoặc kỹ năng cần cải thiện 1", "Hạn chế 2..."],
  "advice": "Lời khuyên định hướng học tập cốt lõi và hướng chuẩn bị tiếp theo cho học sinh cấp 3 để thi tuyển hoặc đăng ký xét tuyển",
  "compatibleCareers": [
    {
      "career": "Tên ngành học/lĩnh vực phù hợp (Ví dụ: Công nghệ thông tin)",
      "careerName": "Tên ngành học/lĩnh vực phù hợp (Ví dụ: Công nghệ thông tin)",
      "reason": "Lý do ngắn gọn vì sao phù hợp",
      "matchRate": "Mức độ phù hợp (Ví dụ: Cao hoặc Rất cao)",
      "studyInfo": {
        "topSchools": ["Tên trường đại học 1", "Tên trường 2", "Tên trường 3"]
      },
      "workInfo": {
        "hiringCompanies": ["Công ty tiêu biểu 1", "Công ty 2"],
        "marketDemand": "Triển vọng thị trường tuyển dụng ngành này"
      },
      "trainingInstitutions": [
        {
          "schoolName": "Tên trường Đại học/Cao đẳng (Ví dụ: Trường Đại học Bách khoa Hà Nội)",
          "benchmark2024": 26.5,
          "benchmark2023": 25.0,
          "benchmark2022": 24.0,
          "officialLink": "Website chính thức của trường",
          "admissionLink": "Link cổng tuyển sinh của trường"
        }
      ]
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
3. Ưu tiên chọn các trường học, công ty nằm trong khu vực sinh sống của người dùng (${userContext.location || 'Việt Nam'}).

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

Tổng điểm tương thích định lượng (1-5): ${totalScore.toFixed(2)}/5 (Trong đó: Điểm > 3.0 là Phù hợp, Điểm <= 3.0 là Chưa phù hợp).

Các câu hỏi và trả lời của học sinh (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ ĐÁNH GIÁ VÀ HƯỚNG NGHIỆP:
1. Đưa ra điểm đánh giá phù hợp trên thang điểm từ 1 đến 5 (số thực, ví dụ: 4.25).
2. Đưa ra đánh giá tổng quát về mức độ phù hợp của học sinh với ngành học mục tiêu.
3. Cung cấp thông tin các trường Đại học/Cao đẳng đào tạo ngành "${targetCareer}" thuộc khu vực mong muốn/sinh sống của học sinh (${userContext.location || 'Việt Nam'}).
4. Đối với mỗi trường đề xuất, phải cung cấp đầy đủ thông tin: website trường (link trường), điểm chuẩn (điểm tuyển sinh) cho ngành "${targetCareer}" trong 3 năm gần nhất 2024, 2023, 2022 (dưới dạng số thực hoặc null), và link cổng tuyển sinh chính thức của trường.

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Đánh giá chi tiết về mức độ phù hợp của học sinh với ngành học mục tiêu ${targetCareer} (khoảng 3-4 câu ngắn gọn, cân nhắc đến độ tuổi, học vấn THPT, khu vực và sở thích)",
  "strengths": ["Điểm mạnh của học sinh phù hợp với ngành này 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Hạn chế hoặc kiến thức học sinh cần cải thiện để chuẩn bị cho ngành này 1", "Hạn chế 2..."],
  "advice": "Lời khuyên định hướng học tập cốt lõi và định hướng ôn tập tiếp theo đối với ngành ${targetCareer} dành cho học sinh THPT",
  "roadmap": [
    "Giai đoạn 1: Nắm bắt kiến thức cơ bản và kỹ năng tự học nền tảng cho ngành ${targetCareer}",
    "Giai đoạn 2: Tham gia hoạt động thực hành, làm đồ án/dự án nhỏ cấp trường",
    "Giai đoạn 3: Chuẩn bị hồ sơ năng lực và ôn luyện cho kỳ thi xét tuyển chuyên ngành"
  ],
  "trainingInstitutions": [
    {
      "schoolName": "Tên trường Đại học/Cao đẳng tại khu vực ${userContext.location || 'Việt Nam'} (Ví dụ: Trường Đại học Bách khoa Hà Nội)",
      "officialLink": "Website chính thức của trường (Ví dụ: https://hust.edu.vn)",
      "benchmark2024": 26.5,
      "benchmark2023": 25.5,
      "benchmark2022": 25.0,
      "admissionLink": "Link cổng tuyển sinh chính thức của trường (Ví dụ: https://ts.hust.edu.vn)"
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

    // Lưu kết quả vào trạng thái chờ (Pending)
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
