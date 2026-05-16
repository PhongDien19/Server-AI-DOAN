# Hệ thống Đánh giá Nghề nghiệp Nâng cao

Hệ thống đã được mở rộng với 4 loại đánh giá chuyên sâu:

## 🎯 1. Đánh giá Phù hợp Nghề (Career Fit)
- **Endpoint**: `POST /api/generate-test`
- **Mô tả**: Đánh giá mức độ phù hợp với nghề dựa trên sở thích cá nhân
- **Điểm số**: 1-5 (thang Likert)

## 🏗️ 2. Lý thuyết Holland (Sở thích Nghề nghiệp)
- **Endpoint**: `POST /api/test/holland`
- **Các loại sở thích**:
  - **R** - Realistic: Kỹ thuật, thực tế
  - **I** - Investigative: Nghiên cứu, phân tích
  - **A** - Artistic: Nghệ thuật, sáng tạo
  - **S** - Social: Xã hội, giúp đỡ
  - **E** - Enterprising: Quản lý, kinh doanh
  - **C** - Conventional: Nghiệp vụ, tổ chức

## 🧠 3. Đánh giá Tính cách (MBTI & Big 5)
- **Endpoint**: `POST /api/test/personality`
- **Big 5 Traits**:
  - Openness: Mở rộng, sáng tạo
  - Conscientiousness: Tận tâm, kỷ luật
  - Extraversion: Hướng ngoại, năng động
  - Agreeableness: Hòa đồng, thân thiện
  - Neuroticism: Bất ổn cảm xúc

## 🧮 4. Trắc nghiệm Năng lực
- **Endpoint**: `POST /api/test/cognitive`
- **Các loại năng lực**:
  - Logical: Tư duy logic
  - Verbal: Khả năng ngôn ngữ
  - Numerical: Tư duy số học
  - Analytical: Phân tích

## 📋 Cách sử dụng

### Tạo bài test
```javascript
// Ví dụ tạo bài test Holland
const response = await fetch('/api/test/holland', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetJob: "Lập trình viên",
    hobby: "Chơi game, thiết kế",
    age: 17,
    educationLevel: "Cấp 3"
  })
});
```

### Lưu câu trả lời
```javascript
// Lưu câu hỏi và câu trả lời
const saveResponse = await fetch('/api/test/questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: "session_123",
    userId: 1,
    testName: "Bài test sở thích Holland",
    questions: [
      {
        questionText: "Bạn thích làm việc với máy móc không?",
        userAnswer: "Đúng",
        hollandType: "R"
      }
    ],
    userContext: {
      targetJob: "Lập trình viên",
      age: 17,
      educationLevel: "Cấp 3"
    }
  })
});
```

### Đánh giá kết quả
```javascript
// Đánh giá bài test Holland
const evaluateResponse = await fetch('/api/test/evaluate-holland/session_123', {
  method: 'POST'
});

// Đánh giá bài test tính cách
const personalityEval = await fetch('/api/test/evaluate-personality/session_456', {
  method: 'POST'
});

// Đánh giá bài test năng lực (cần userAnswers)
const cognitiveEval = await fetch('/api/test/evaluate-cognitive/session_789', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAnswers: ["A", "B", "C", "D"] // Câu trả lời của user
  })
});
```

### Lưu kết quả vào hồ sơ
```javascript
// Sau khi đăng nhập, claim kết quả
const claimResponse = await fetch('/api/assessment/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: "session_123",
    userId: 1
  })
});
```

## 📊 Cấu trúc dữ liệu trả về

### Holland Test Result
```json
{
  "hollandScores": {
    "R": 3.5, "I": 4.2, "A": 2.1,
    "S": 4.8, "E": 3.2, "C": 2.9
  },
  "topTypes": ["S", "I", "E"],
  "summary": "Bạn phù hợp với các công việc xã hội và nghiên cứu",
  "careerSuggestions": ["Giáo viên", "Nhà nghiên cứu", "Quản lý"],
  "advice": "Nên phát triển kỹ năng giao tiếp và lãnh đạo"
}
```

### Personality Test Result
```json
{
  "big5Scores": {
    "openness": 4.2,
    "conscientiousness": 3.8,
    "extraversion": 2.9,
    "agreeableness": 4.1,
    "neuroticism": 2.3
  },
  "suggestedMBTI": "INFJ - Người bảo hộ",
  "personalitySummary": "Bạn là người hướng nội, sáng tạo và đồng cảm",
  "strengths": ["Sáng tạo", "Đồng cảm", "Tập trung"],
  "careerFit": ["Thiết kế", "Tư vấn", "Nghiên cứu"],
  "developmentAdvice": "Cần cải thiện kỹ năng giao tiếp xã hội"
}
```

### Cognitive Test Result
```json
{
  "cognitiveScores": {
    "logical": 4.2,
    "verbal": 3.8,
    "numerical": 4.5,
    "analytical": 3.9
  },
  "overallScore": 4.1,
  "correctPercentage": 85,
  "strengths": ["Logic tốt", "Toán học mạnh"],
  "weaknesses": ["Ngôn ngữ cần cải thiện"],
  "careerImplications": "Phù hợp với công việc kỹ thuật và phân tích",
  "improvementSuggestions": ["Học thêm từ vựng", "Luyện tập phân tích"]
}
```

## 🔧 Tính năng nâng cao

- **Caching thông minh**: Tránh gọi API trùng lặp
- **Timeout protection**: Tự động dừng nếu AI phản hồi chậm
- **Multi-test support**: Hỗ trợ đồng thời nhiều loại test
- **Context awareness**: Câu hỏi phù hợp với lứa tuổi và học vấn
- **Safe content**: Tránh các chủ đề nhạy cảm

## 🚀 Performance

- **Model**: Gemini 1.5-flash (nhanh hơn 2-3x so với 2.5-flash)
- **Cache TTL**: 5 phút cho response trùng lặp
- **Timeout**: 30 giây cho mỗi API call
- **Optimized prompts**: Giảm từ 500+ xuống ~100 từ