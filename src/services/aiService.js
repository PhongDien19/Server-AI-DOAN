const axios = require('axios');
const { SEED_QUESTIONS } = require('../data/seedData');

/**
 * AI Service - Chuyên trách sinh câu hỏi chuẩn hóa và tư vấn hướng nghiệp
 * Phân định rõ trách nhiệm theo tài liệu:
 * - AI: Sinh câu hỏi theo JSON schema chuẩn, diễn đạt tự nhiên, giải thích kết quả
 * - Backend: Giữ thuật toán chấm điểm cố định, kiểm tra tính hợp lệ dữ liệu
 */
class AIService {
  /**
   * Sinh bộ câu hỏi theo section và schema chuẩn
   * Nếu có cấu hình AI_API_KEY (DeepSeek / OpenAI / Gemini), gọi AI để sinh mới hoặc diễn đạt lại.
   * Nếu không có API Key, tự động fallback sang ngân hàng câu hỏi chuẩn đã kiểm duyệt.
   */
  static async generateQuestions({ section, audience = 'all', count = 6, dimensions = [] }) {
    const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

    // Fallback: Lấy từ ngân hàng câu hỏi chuẩn được kiểm duyệt trước
    const defaultFiltered = SEED_QUESTIONS.filter(q => {
      const matchSection = q.section === section;
      const matchAudience = q.audience === 'all' || q.audience === audience || audience === 'all';
      return matchSection && matchAudience;
    });

    if (!apiKey) {
      return {
        success: true,
        source: 'curated_bank',
        questions: defaultFiltered.slice(0, count || defaultFiltered.length)
      };
    }

    try {
      const prompt = `
Bạn là chuyên gia trắc nghiệm hướng nghiệp cao cấp. Hãy sinh đúng ${count} câu hỏi trắc nghiệm tiếng Việt cho phần: "${section}", đối tượng: "${audience}".
Các chiều cần đánh giá: ${dimensions.join(', ') || 'theo chuẩn'}.

Yêu cầu nghiêm ngặt:
1. Không sao chép các bài trắc nghiệm có bản quyền (đặc biệt không sao chép nguyên văn MBTI.vn).
2. Tiếng Việt trong sáng, gần gũi, câu từ gãy gọn, không dẫn dắt hoặc thiên vị.
3. Trả về ĐÚNG ĐỊNH DẠNG JSON sau, không kèm bất kỳ giải thích nào khác:
{
  "questions": [
    {
      "id": "Tự sinh mã (ví dụ: AI_${section.toUpperCase()}_01)",
      "section": "${section}",
      "audience": "${audience}",
      "type": "forced_choice hoặc likert5 hoặc single_choice",
      "text": "Nội dung câu hỏi",
      "options": [
        { "id": "A", "text": "Lựa chọn A", "value": "Giá trị cực hoặc điểm số" },
        { "id": "B", "text": "Lựa chọn B", "value": "Giá trị cực hoặc điểm số" }
      ],
      "scoring": { "dimension": "Tên chiều đánh giá", "weight": 1 }
    }
  ]
}
`;

      const endpoint = process.env.AI_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
      const response = await axios.post(
        endpoint,
        {
          model: process.env.AI_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 15000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return {
            success: true,
            source: 'ai_generated',
            questions: parsed.questions
          };
        }
      }

      // Nếu parse thất bại -> fallback
      return {
        success: true,
        source: 'curated_bank_fallback',
        questions: defaultFiltered.slice(0, count || defaultFiltered.length)
      };
    } catch (err) {
      console.warn(`[AIService] Lỗi gọi AI (${err.message}). Tự động dùng ngân hàng câu hỏi chuẩn.`);
      return {
        success: true,
        source: 'curated_bank_fallback',
        questions: defaultFiltered.slice(0, count || defaultFiltered.length)
      };
    }
  }

  /**
   * Diễn giải chi tiết kết quả hướng nghiệp và đưa ra lời khuyên cá nhân hóa
   */
  static async explainAssessmentResult({ majorName, fitScore, strengths = [], improvementAreas = [], mbtiType, hollandCode }) {
    const defaultAdvice = `Dựa trên phân tích khoa học, ngành ${majorName} đạt mức độ phù hợp ${fitScore}/100 với hồ sơ năng lực của bạn (Tính cách: ${mbtiType || 'Đặc trưng'}, Sở thích Holland: ${hollandCode || 'Trội'}). Các điểm mạnh then chốt của bạn gồm: ${strengths.join(', ')}. Hãy chú trọng cải thiện: ${improvementAreas.join(', ')} để vững vàng tự tin trên con đường sự nghiệp.`;

    const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return defaultAdvice;

    try {
      const prompt = `
Bạn là chuyên gia tư vấn hướng nghiệp. Hãy viết một đoạn nhận xét và lời khuyên truyền cảm hứng (khoảng 150 - 200 từ) cho học sinh/sinh viên:
- Ngành học: ${majorName} (Điểm phù hợp: ${fitScore}/100)
- Kiểu tính cách: ${mbtiType}
- Mã Holland: ${hollandCode}
- Điểm mạnh: ${strengths.join(', ')}
- Điểm cần cải thiện: ${improvementAreas.join(', ')}

Văn phong ân cần, mang tính động viên và hướng dẫn thực tiễn, không dùng từ ngữ sáo rỗng.
`;

      const endpoint = process.env.AI_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
      const response = await axios.post(
        endpoint,
        {
          model: process.env.AI_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data?.choices?.[0]?.message?.content?.trim() || defaultAdvice;
    } catch (e) {
      return defaultAdvice;
    }
  }
}

module.exports = AIService;

