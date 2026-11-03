/**
 * Dữ liệu hạt giống (Seed Data) chuẩn hóa cho Hệ thống trắc nghiệm hướng nghiệp
 * Tuân thủ theo các yêu cầu và đặc tả trong tài liệu:
 * - 24 câu hỏi Tính cách 4 chiều (forced-choice, 6 câu/chiều, không vi phạm bản quyền MBTI)
 * - 18 câu hỏi Holland RIASEC (3 câu/nhóm, thang Likert 1-5)
 * - 8 câu hỏi Ngoại ngữ (Đánh giá kỹ năng & kiểm tra năng lực)
 * - 5 câu hỏi Cơ hội việc làm (Dành riêng cho sinh viên năm 1)
 * - 5 câu hỏi Profile (Môn học, năng lực học tập, mục tiêu)
 * - 10 ngành nghề trọng điểm kèm Hồ sơ năng lực ngành (MajorProfiles)
 * - 30 trường đại học (10 miền Bắc, 10 miền Trung, 10 miền Nam) kèm Điểm chuẩn 2024 - 2025
 */

const SEED_QUESTIONS = [
  // ==========================================
  // 1. TÍNH CÁCH 4 CHIỀU (24 CÂU FORCED-CHOICE)
  // Mỗi chiều 6 câu (E/I: 6, S/N: 6, T/F: 6, J/P: 6)
  // ==========================================

  // --- Cặp E (Hướng ngoại) vs I (Hướng nội) ---
  {
    id: 'P_EI_01',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Sau một tuần học tập và làm việc căng thẳng, bạn thường nạp lại năng lượng bằng cách nào?',
    options: [
      { id: 'A', text: 'Tụ tập, trò chuyện hoặc tham gia các hoạt động sôi nổi cùng bạn bè', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Ở một mình trong không gian yên tĩnh, đọc sách, nghe nhạc hoặc xem phim', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 1
  },
  {
    id: 'P_EI_02',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi bước vào một môi trường tập thể mới hoặc tham gia sự kiện đông người:',
    options: [
      { id: 'A', text: 'Bạn chủ động bắt chuyện và dễ dàng làm quen với người mới', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Bạn thường chờ đợi người khác bắt chuyện trước hoặc tìm người quen', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 2
  },
  {
    id: 'P_EI_03',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi đối mặt với một vấn đề phức tạp cần suy nghĩ giải pháp:',
    options: [
      { id: 'A', text: 'Bạn thích thảo luận, trao đổi thành tiếng với người khác để tìm ý tưởng', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Bạn thích tự mình suy ngẫm, phân tích thấu đáo trước khi chia sẻ', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 3
  },
  {
    id: 'P_EI_04',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Trong phong cách làm việc nhóm hàng ngày:',
    options: [
      { id: 'A', text: 'Bạn thích vai trò kết nối, điều phối và tương tác liên tục', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Bạn thích được giao một phần việc độc lập để tập trung làm sâu', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 4
  },
  {
    id: 'P_EI_05',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Mọi người xung quanh thường nhận xét về bạn là người:',
    options: [
      { id: 'A', text: 'Cởi mở, nhiệt tình, dễ bộc lộ cảm xúc và suy nghĩ', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Kín đáo, điềm đạm, giữ nhiều suy nghĩ cho riêng mình', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 5
  },
  {
    id: 'P_EI_06',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi có một ý tưởng mới nảy ra trong đầu:',
    options: [
      { id: 'A', text: 'Bạn muốn kể ngay cho ai đó nghe để lấy phản hồi tức thì', value: 'E', dimension: 'EI' },
      { id: 'B', text: 'Bạn muốn âm thầm phác thảo và phát triển nó trọn vẹn trước', value: 'I', dimension: 'EI' }
    ],
    scoring: { dimension: 'EI', weight: 1 },
    orderIndex: 6
  },

  // --- Cặp S (Thực tế - Giác quan) vs N (Trực giác - Tương lai) ---
  {
    id: 'P_SN_01',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi tiếp nhận thông tin hoặc học một chủ đề mới, bạn thường chú ý nhiều hơn đến:',
    options: [
      { id: 'A', text: 'Dữ liệu cụ thể, số liệu thực tế và các bước thực hành rõ ràng', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Khái niệm tổng quát, ý nghĩa ẩn sâu và các khả năng phát triển trong tương lai', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 7
  },
  {
    id: 'P_SN_02',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi phải hoàn thành một công việc thực tế, bạn thường tin tưởng vào:',
    options: [
      { id: 'A', text: 'Kinh nghiệm đã được chứng minh hiệu quả và quy trình chuẩn', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Linh cảm, giải pháp đột phá và thử nghiệm cách làm mới chưa ai làm', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 8
  },
  {
    id: 'P_SN_03',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Bạn cảm thấy hứng thú hơn với dạng câu hỏi nào:',
    options: [
      { id: 'A', text: 'Câu hỏi có đáp án xác thực, rõ ràng và có thể kiểm chứng ngay', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Câu hỏi mở, gợi mở trí tưởng tượng và nhiều cách kiến giải khác nhau', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 9
  },
  {
    id: 'P_SN_04',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi nhìn vào một bức tranh hoặc sản phẩm:',
    options: [
      { id: 'A', text: 'Bạn tập trung vào chi tiết tỉ mỉ, chất liệu, màu sắc cụ thể', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Bạn cảm nhận thông điệp, ý nghĩa biểu tượng và ấn tượng chung', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 10
  },
  {
    id: 'P_SN_05',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi lập kế hoạch cho tương lai 3 - 5 năm tới:',
    options: [
      { id: 'A', text: 'Bạn chú trọng vào những mục tiêu thực tế gắn với điều kiện hiện tại', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Bạn thường mơ ước về những viễn cảnh lớn và nhiều cơ hội bất ngờ', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 11
  },
  {
    id: 'P_SN_06',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Trong giải quyết vấn đề, điều nào quan trọng hơn đối với bạn:',
    options: [
      { id: 'A', text: 'Tính thực tế và hiệu quả đo lường được ngay lập tức', value: 'S', dimension: 'SN' },
      { id: 'B', text: 'Tính sáng tạo, độc đáo và mở ra góc nhìn mới mẻ', value: 'N', dimension: 'SN' }
    ],
    scoring: { dimension: 'SN', weight: 1 },
    orderIndex: 12
  },

  // --- Cặp T (Lý trí - Logic) vs F (Cảm xúc - Cảm thông) ---
  {
    id: 'P_TF_01',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi cần đưa ra quyết định quan trọng, yếu tố quyết định hàng đầu của bạn là:',
    options: [
      { id: 'A', text: 'Lý lẽ logic, sự thật khách quan và tính đúng sai công bằng', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Cảm xúc của những người liên quan và sự hòa hợp giữa mọi người', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 13
  },
  {
    id: 'P_TF_02',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi bạn bè hoặc người thân gặp khó khăn và tìm đến bạn tâm sự:',
    options: [
      { id: 'A', text: 'Bạn nhanh chóng phân tích nguyên nhân và đưa ra giải pháp cụ thể', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Bạn lắng nghe chân thành, an ủi và đồng cảm với cảm xúc của họ trước', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 14
  },
  {
    id: 'P_TF_03',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Trong một cuộc tranh luận sôi nổi về một vấn đề học tập:',
    options: [
      { id: 'A', text: 'Bạn sẵn sàng chỉ ra lỗi sai để tìm ra chân lý đúng đắn', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Bạn chú ý giữ hòa khí, tránh làm đối phương cảm thấy tổn thương', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 15
  },
  {
    id: 'P_TF_04',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Điều gì khiến bạn cảm thấy tự hào hơn khi hoàn thành một nhiệm vụ:',
    options: [
      { id: 'A', text: 'Nhiệm vụ được hoàn thành chính xác, logic và không có sai sót', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Nhiệm vụ mang lại niềm vui, sự giúp ích và gắn kết cho mọi người', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 16
  },
  {
    id: 'P_TF_05',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi đánh giá bài tập hoặc dự án của bạn khác:',
    options: [
      { id: 'A', text: 'Bạn đánh giá thẳng thắn dựa trên tiêu chí và barem điểm đề ra', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Bạn ghi nhận sự nỗ lực và tìm cách khuyến khích tinh thần của bạn ấy', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 17
  },
  {
    id: 'P_TF_06',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Bạn cảm thấy khó chịu hơn với điều gì:',
    options: [
      { id: 'A', text: 'Lập luận mâu thuẫn, thiếu tính logic và không thuyết phục', value: 'T', dimension: 'TF' },
      { id: 'B', text: 'Sự lạnh lùng, vô cảm và thiếu thấu hiểu giữa con người', value: 'F', dimension: 'TF' }
    ],
    scoring: { dimension: 'TF', weight: 1 },
    orderIndex: 18
  },

  // --- Cặp J (Nguyên tắc - Kế hoạch) vs P (Linh hoạt - Tùy biến) ---
  {
    id: 'P_JP_01',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Cách bạn chuẩn bị cho một chuyến đi chơi hoặc một kỳ thi:',
    options: [
      { id: 'A', text: 'Lên lịch trình cụ thể từng ngày, chuẩn bị đầy đủ từ trước', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Chỉ chuẩn bị đồ cơ bản, để mọi thứ diễn ra tự nhiên theo cảm hứng', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 19
  },
  {
    id: 'P_JP_02',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Không gian góc học tập hoặc bàn làm việc của bạn thường ở trạng thái:',
    options: [
      { id: 'A', text: 'Ngăn nắp, gọn gàng, tài liệu và đồ dùng ở đúng vị trí quy định', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Khá bừa bộn một cách có trật tự riêng, miễn là bạn tìm thấy thứ mình cần', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 20
  },
  {
    id: 'P_JP_03',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi được giao một bài tập lớn với hạn nộp 2 tuần:',
    options: [
      { id: 'A', text: 'Bạn chia nhỏ bài làm và hoàn thành sớm trước hạn vài ngày', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Bạn có cảm hứng làm việc năng suất nhất khi sát nút deadline', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 21
  },
  {
    id: 'P_JP_04',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Bạn cảm thấy thoải mái hơn khi:',
    options: [
      { id: 'A', text: 'Mọi việc đã được chốt phương án dứt khoát và rõ ràng', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Mọi phương án vẫn để ngỏ để có thể linh hoạt thay đổi khi cần', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 22
  },
  {
    id: 'P_JP_05',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Khi lịch trình trong ngày bị thay đổi đột ngột ngoài dự kiến:',
    options: [
      { id: 'A', text: 'Bạn cảm thấy khó chịu và phải mất thời gian sắp xếp lại', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Bạn dễ dàng thích nghi và xem đó là trải nghiệm mới thú vị', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 23
  },
  {
    id: 'P_JP_06',
    section: 'personality',
    audience: 'all',
    type: 'forced_choice',
    text: 'Trong cuộc sống hàng ngày, bạn thuộc tuýp người:',
    options: [
      { id: 'A', text: 'Luôn làm xong hết việc cần làm rồi mới an tâm thư giãn, vui chơi', value: 'J', dimension: 'JP' },
      { id: 'B', text: 'Vừa học vừa chơi, làm việc theo cảm xúc và nhịp điệu riêng', value: 'P', dimension: 'JP' }
    ],
    scoring: { dimension: 'JP', weight: 1 },
    orderIndex: 24
  },

  // ==========================================
  // 2. SỞ THÍCH HOLLAND (18 CÂU LIKERT 1-5, 3 CÂU/NHÓM)
  // R: Thực tế | I: Nghiên cứu | A: Nghệ thuật | S: Xã hội | E: Quản lý | C: Nghiệp vụ
  // ==========================================

  // --- Nhóm R (Realistic - Kỹ thuật / Thực tế) ---
  {
    id: 'H_R_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Lắp ráp, sửa chữa thiết bị điện tử, đồ gia dụng hoặc máy móc cơ khí',
    scoring: { dimension: 'R', weight: 1 },
    orderIndex: 25
  },
  {
    id: 'H_R_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Thực hành thao tác với công cụ, thiết bị kỹ thuật ngoài trời hoặc trong xưởng thực hành',
    scoring: { dimension: 'R', weight: 1 },
    orderIndex: 26
  },
  {
    id: 'H_R_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Vận hành hệ thống mạng, cài ráp phần cứng máy tính hoặc thiết bị thông minh',
    scoring: { dimension: 'R', weight: 1 },
    orderIndex: 27
  },

  // --- Nhóm I (Investigative - Nghiên cứu / Tư duy) ---
  {
    id: 'H_I_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Giải quyết các bài toán hóc búa, viết code thuật toán hoặc phân tích quy luật tự nhiên',
    scoring: { dimension: 'I', weight: 1 },
    orderIndex: 28
  },
  {
    id: 'H_I_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Đọc tài liệu chuyên sâu, nghiên cứu khoa học hoặc làm thí nghiệm khám phá điều mới',
    scoring: { dimension: 'I', weight: 1 },
    orderIndex: 29
  },
  {
    id: 'H_I_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Phân tích dữ liệu, biểu đồ số liệu để tìm ra nguyên nhân cốt lõi của một hiện tượng',
    scoring: { dimension: 'I', weight: 1 },
    orderIndex: 30
  },

  // --- Nhóm A (Artistic - Nghệ thuật / Sáng tạo) ---
  {
    id: 'H_A_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Thiết kế đồ họa, vẽ minh họa, chỉnh sửa video hoặc sáng tạo nội dung truyền thông',
    scoring: { dimension: 'A', weight: 1 },
    orderIndex: 31
  },
  {
    id: 'H_A_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Viết lách, sáng tác kịch bản, chơi nhạc cụ hoặc thể hiện bản thân qua tác phẩm nghệ thuật',
    scoring: { dimension: 'A', weight: 1 },
    orderIndex: 32
  },
  {
    id: 'H_A_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Lên ý tưởng sáng tạo đột phá cho các chiến dịch thương hiệu và sự kiện',
    scoring: { dimension: 'A', weight: 1 },
    orderIndex: 33
  },

  // --- Nhóm S (Social - Xã hội / Giúp đỡ) ---
  {
    id: 'H_S_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Giảng dạy, hướng dẫn bạn bè hiểu bài hoặc tư vấn giải quyết vấn đề tâm lý',
    scoring: { dimension: 'S', weight: 1 },
    orderIndex: 34
  },
  {
    id: 'H_S_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Tham gia các hoạt động tình nguyện, chăm sóc sức khỏe hoặc công tác cộng đồng',
    scoring: { dimension: 'S', weight: 1 },
    orderIndex: 35
  },
  {
    id: 'H_S_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Lắng nghe, thấu cảm và chăm sóc khách hàng hoặc người cần hỗ trợ trong xã hội',
    scoring: { dimension: 'S', weight: 1 },
    orderIndex: 36
  },

  // --- Nhóm E (Enterprising - Quản lý / Kinh doanh) ---
  {
    id: 'H_E_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Lãnh đạo đội nhóm, thuyết phục đối tác hoặc dẫn dắt các dự án kinh doanh',
    scoring: { dimension: 'E', weight: 1 },
    orderIndex: 37
  },
  {
    id: 'H_E_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Bán hàng, đàm phán hợp đồng hoặc quảng bá sản phẩm đến khách hàng tiềm năng',
    scoring: { dimension: 'E', weight: 1 },
    orderIndex: 38
  },
  {
    id: 'H_E_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Khởi nghiệp, nắm bắt cơ hội thương mại và chấp nhận thử thách để đạt doanh số lớn',
    scoring: { dimension: 'E', weight: 1 },
    orderIndex: 39
  },

  // --- Nhóm C (Conventional - Nghiệp vụ / Quy củ) ---
  {
    id: 'H_C_01',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Ghi chép sổ sách, lập bảng tính Excel quản lý thu chi và hóa đơn chứng từ chính xác',
    scoring: { dimension: 'C', weight: 1 },
    orderIndex: 40
  },
  {
    id: 'H_C_02',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Sắp xếp hồ sơ lưu trữ, kiểm tra quy trình làm việc theo đúng quy chuẩn và luật định',
    scoring: { dimension: 'C', weight: 1 },
    orderIndex: 41
  },
  {
    id: 'H_C_03',
    section: 'holland',
    audience: 'all',
    type: 'likert5',
    text: 'Thực hiện các công việc văn phòng đòi hỏi tính cẩn thận, chuẩn xác từng chi tiết nhỏ',
    scoring: { dimension: 'C', weight: 1 },
    orderIndex: 42
  },

  // ==========================================
  // 3. ĐÁNH GIÁ NĂNG LỰC NGOẠI NGỮ (8 CÂU)
  // ==========================================
  {
    id: 'L_SELF_01',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Khả năng ĐỌC HIỂU tài liệu tiếng Anh (hoặc ngoại ngữ chính) của bạn:',
    options: [
      { id: '1', text: 'Chỉ hiểu được các từ vựng đơn giản, biển báo cơ bản (A1)', value: 20 },
      { id: '2', text: 'Hiểu các đoạn văn ngắn, email thường ngày với từ điển hỗ trợ (A2)', value: 40 },
      { id: '3', text: 'Đọc hiểu báo chí, tài liệu chuyên ngành cơ bản mà không gặp khó khăn lớn (B1)', value: 65 },
      { id: '4', text: 'Đọc thông thạo sách chuyên môn, bài nghiên cứu và báo cáo phức tạp (B2 trở lên)', value: 90 }
    ],
    scoring: { dimension: 'reading', weight: 1 },
    orderIndex: 43
  },
  {
    id: 'L_SELF_02',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Khả năng GIAO TIẾP VÀ NÓI tiếng Anh của bạn:',
    options: [
      { id: '1', text: 'Chưa thể tự tin nói câu trọn vẹn, phát âm còn ngập ngừng (A1)', value: 20 },
      { id: '2', text: 'Giao tiếp được các câu chào hỏi, mua sắm, hỏi đường đơn giản (A2)', value: 40 },
      { id: '3', text: 'Thuyết trình ngắn, trao đổi ý kiến công việc về chủ đề quen thuộc (B1)', value: 65 },
      { id: '4', text: 'Giao tiếp lưu loát, tự tin tranh biện và làm việc cùng người bản xứ (B2 trở lên)', value: 90 }
    ],
    scoring: { dimension: 'speaking', weight: 1 },
    orderIndex: 44
  },
  {
    id: 'L_TEST_01',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Choose the best word to complete: "The company’s revenue has grown significantly ______ the new marketing strategy."',
    options: [
      { id: 'A', text: 'due to', isCorrect: true, value: 100 },
      { id: 'B', text: 'because', isCorrect: false, value: 0 },
      { id: 'C', text: 'despite', isCorrect: false, value: 0 },
      { id: 'D', text: 'although', isCorrect: false, value: 0 }
    ],
    scoring: { dimension: 'grammar', weight: 1 },
    orderIndex: 45
  },
  {
    id: 'L_TEST_02',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Which word is closest in meaning to "FEASIBLE"?',
    options: [
      { id: 'A', text: 'Practicable / Achievable (Khả thi)', isCorrect: true, value: 100 },
      { id: 'B', text: 'Difficult / Complicated (Phức tạp)', isCorrect: false, value: 0 },
      { id: 'C', text: 'Expensive / Costly (Đắt đỏ)', isCorrect: false, value: 0 },
      { id: 'D', text: 'Temporary / Short-term (Tạm thời)', isCorrect: false, value: 0 }
    ],
    scoring: { dimension: 'vocabulary', weight: 1 },
    orderIndex: 46
  },
  {
    id: 'L_TEST_03',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Identify the sentence with correct grammar:',
    options: [
      { id: 'A', text: 'Neither the manager nor the employees were informed about the schedule change.', isCorrect: true, value: 100 },
      { id: 'B', text: 'Neither the manager nor the employees was informed about the schedule change.', isCorrect: false, value: 0 },
      { id: 'C', text: 'Neither the manager or the employees were informed about the schedule change.', isCorrect: false, value: 0 },
      { id: 'D', text: 'Neither the manager nor the employees has informed about the schedule change.', isCorrect: false, value: 0 }
    ],
    scoring: { dimension: 'grammar', weight: 1 },
    orderIndex: 47
  },
  {
    id: 'L_CERT_01',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Hiện tại bạn đã có chứng chỉ ngoại ngữ quốc tế nào chưa?',
    options: [
      { id: 'none', text: 'Chưa có chứng chỉ / Đang tự học', value: 45 },
      { id: 'ielts_5', text: 'IELTS 5.0 - 5.5 hoặc TOEIC 500 - 650', value: 70 },
      { id: 'ielts_6', text: 'IELTS 6.0 - 6.5 hoặc TOEIC 700 - 800', value: 85 },
      { id: 'ielts_7', text: 'IELTS 7.0+ hoặc TOEIC 850+', value: 100 }
    ],
    scoring: { dimension: 'certificate', weight: 1 },
    orderIndex: 48
  },
  {
    id: 'L_SELF_03',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Mức độ tự tin khi phải học tập hoàn toàn bằng giáo trình và tài liệu tiếng Anh:',
    options: [
      { id: '1', text: 'Rất lo lắng, cần có bản dịch tiếng Việt', value: 30 },
      { id: '2', text: 'Có thể đọc chậm với sự trợ giúp của công cụ dịch AI', value: 60 },
      { id: '3', text: 'Khá tự tin, chỉ tra từ vựng chuyên ngành hiếm gặp', value: 80 },
      { id: '4', text: 'Hoàn toàn tự tin và yêu thích môi trường quốc tế', value: 95 }
    ],
    scoring: { dimension: 'readiness', weight: 1 },
    orderIndex: 49
  },
  {
    id: 'L_TEST_04',
    section: 'language',
    audience: 'all',
    type: 'single_choice',
    text: 'Fill in: "If we had invested in cybersecurity earlier, we ______ the recent data breach."',
    options: [
      { id: 'A', text: 'would have prevented', isCorrect: true, value: 100 },
      { id: 'B', text: 'will prevent', isCorrect: false, value: 0 },
      { id: 'C', text: 'would prevent', isCorrect: false, value: 0 },
      { id: 'D', text: 'had prevented', isCorrect: false, value: 0 }
    ],
    scoring: { dimension: 'grammar', weight: 1 },
    orderIndex: 50
  },

  // ==========================================
  // 4. CƠ HỘI VIỆC LÀM (5 CÂU - DÀNH RIÊNG CHO SV NĂM 1)
  // ==========================================
  {
    id: 'CO_DEMAND_01',
    section: 'career_opportunity',
    audience: 'freshman',
    type: 'single_choice',
    text: 'Mức độ ưu tiên của bạn đối với nhu cầu tuyển dụng và tính ổn định việc làm khi tốt nghiệp:',
    options: [
      { id: '1', text: 'Cực kỳ quan trọng: Ngành phải có tỷ lệ việc làm cao, không sợ thất nghiệp', value: 95 },
      { id: '2', text: 'Quan trọng: Nhưng vẫn phải cân đối với sự đam mê cá nhân', value: 75 },
      { id: '3', text: 'Bình thường: Tôi sẵn sàng làm trái ngành nếu cần thiết', value: 50 },
      { id: '4', text: 'Không quá quan trọng: Tôi ưu tiên trải nghiệm và sở thích', value: 30 }
    ],
    scoring: { dimension: 'market_demand', weight: 1 },
    orderIndex: 51
  },
  {
    id: 'CO_SALARY_01',
    section: 'career_opportunity',
    audience: 'freshman',
    type: 'single_choice',
    text: 'Kỳ vọng mức thu nhập khởi điểm của bạn sau 1 - 2 năm ra trường:',
    options: [
      { id: '1', text: 'Từ 8 - 12 triệu VNĐ/tháng (Mức căn bản, học hỏi kinh nghiệm)', value: 60 },
      { id: '2', text: 'Từ 15 - 20 triệu VNĐ/tháng (Mức khá, ngành có tính cạnh tranh cao)', value: 80 },
      { id: '3', text: 'Từ 25 triệu VNĐ trở lên (Đòi hỏi chuyên môn cao hoặc ngoại ngữ xuất sắc)', value: 95 }
    ],
    scoring: { dimension: 'salary_expectation', weight: 1 },
    orderIndex: 52
  },
  {
    id: 'CO_ENV_01',
    section: 'career_opportunity',
    audience: 'freshman',
    type: 'single_choice',
    text: 'Môi trường làm việc mà bạn hướng tới nhất trong tương lai:',
    options: [
      { id: '1', text: 'Tập đoàn công nghệ, doanh nghiệp đa quốc gia (MNCs)', value: 90 },
      { id: '2', text: 'Doanh nghiệp trong nước, cơ quan nhà nước hoặc ngân hàng lớn', value: 75 },
      { id: '3', text: 'Công ty khởi nghiệp (Startup), môi trường linh hoạt và tự do sáng tạo', value: 80 },
      { id: '4', text: 'Làm việc tự do (Freelance) hoặc tự mở kinh doanh riêng', value: 85 }
    ],
    scoring: { dimension: 'work_environment', weight: 1 },
    orderIndex: 53
  },
  {
    id: 'CO_INTERN_01',
    section: 'career_opportunity',
    audience: 'freshman',
    type: 'single_choice',
    text: 'Kế hoạch tham gia thực tập và tích lũy kinh nghiệm thực tế của bạn:',
    options: [
      { id: '1', text: 'Ngay từ năm nhất hoặc năm hai đại học', value: 95 },
      { id: '2', text: 'Từ năm ba theo chương trình nhà trường', value: 75 },
      { id: '3', text: 'Năm cuối khi làm khóa luận tốt nghiệp', value: 50 }
    ],
    scoring: { dimension: 'practical_readiness', weight: 1 },
    orderIndex: 54
  },
  {
    id: 'CO_GROWTH_01',
    section: 'career_opportunity',
    audience: 'freshman',
    type: 'single_choice',
    text: 'Động lực phát triển sự nghiệp lớn nhất của bạn là:',
    options: [
      { id: '1', text: 'Trở thành chuyên gia kỹ thuật/nghiệp vụ đầu ngành', value: 90 },
      { id: '2', text: 'Thăng tiến lên các vị trí quản trị, lãnh đạo', value: 90 },
      { id: '3', text: 'Cân bằng tốt giữa công việc và đời sống cá nhân', value: 70 },
      { id: '4', text: 'Tạo ra tác động xã hội tích cực cho cộng đồng', value: 85 }
    ],
    scoring: { dimension: 'career_drive', weight: 1 },
    orderIndex: 55
  },

  // ==========================================
  // 5. THÔNG TIN PROFILE & NĂNG LỰC HỌC TẬP (5 CÂU)
  // ==========================================
  {
    id: 'PROF_SUBJ_01',
    section: 'profile',
    audience: 'all',
    type: 'multi_choice',
    text: 'Những môn học bạn có điểm số tốt nhất hoặc cảm thấy yêu thích nhất:',
    options: [
      { id: 'math', text: 'Toán học', value: 'Toán' },
      { id: 'cs', text: 'Tin học / Công nghệ', value: 'Tin học' },
      { id: 'phy', text: 'Vật lý / Hóa học', value: 'Vật lý' },
      { id: 'eng', text: 'Tiếng Anh', value: 'Tiếng Anh' },
      { id: 'lit', text: 'Ngữ văn / Lịch sử', value: 'Ngữ văn' },
      { id: 'art', text: 'Mỹ thuật / Âm nhạc', value: 'Mỹ thuật' }
    ],
    scoring: { dimension: 'academic_strengths', weight: 1 },
    orderIndex: 56
  },
  {
    id: 'PROF_GPA_01',
    section: 'profile',
    audience: 'all',
    type: 'single_choice',
    text: 'Điểm trung bình học tập gần nhất của bạn:',
    options: [
      { id: '1', text: 'Xuất sắc (GPA >= 9.0 hoặc >= 3.6/4.0)', value: 95 },
      { id: '2', text: 'Giỏi (GPA 8.0 - 8.9 hoặc 3.2 - 3.5/4.0)', value: 85 },
      { id: '3', text: 'Khá (GPA 6.5 - 7.9 hoặc 2.5 - 3.1/4.0)', value: 70 },
      { id: '4', text: 'Trung bình (GPA < 6.5)', value: 50 }
    ],
    scoring: { dimension: 'academic_performance', weight: 1 },
    orderIndex: 57
  },
  {
    id: 'PROF_FINANCE_01',
    section: 'profile',
    audience: 'all',
    type: 'single_choice',
    text: 'Điều kiện tài chính gia đình dự kiến cho học phí đại học:',
    options: [
      { id: '1', text: 'Dưới 25 triệu VNĐ/năm (Ưu tiên các trường công lập học phí chuẩn)', value: 'low' },
      { id: '2', text: 'Từ 25 - 60 triệu VNĐ/năm (Công lập tự chủ, chất lượng cao)', value: 'medium' },
      { id: '3', text: 'Trên 60 triệu VNĐ/năm (Trường tư thục, chương trình liên kết quốc tế, RMIT)', value: 'high' }
    ],
    scoring: { dimension: 'tuition_budget', weight: 1 },
    orderIndex: 58
  },
  {
    id: 'PROF_REGION_01',
    section: 'profile',
    audience: 'all',
    type: 'single_choice',
    text: 'Khu vực bạn mong muốn theo học đại học nhất:',
    options: [
      { id: 'Bac', text: 'Miền Bắc (Hà Nội và các tỉnh phía Bắc)', value: 'Bac' },
      { id: 'Trung', text: 'Miền Trung (Đà Nẵng, Huế, Quy Nhơn, Nha Trang...)', value: 'Trung' },
      { id: 'Nam', text: 'Miền Nam (TP. Hồ Chí Minh, Cần Thơ, Bình Dương...)', value: 'Nam' }
    ],
    scoring: { dimension: 'preferred_region', weight: 1 },
    orderIndex: 59
  },
  {
    id: 'PROF_STATUS_01',
    section: 'profile',
    audience: 'all',
    type: 'single_choice',
    text: 'Mục đích lớn nhất khi bạn tham gia bài trắc nghiệm này:',
    options: [
      { id: 'explore', text: 'Khám phá bản thân: Chưa biết mình hợp ngành nào, cần gợi ý mở', value: 'explore' },
      { id: 'validate', text: 'Kiểm chứng ngành: Đã nhắm sẵn ngành nhưng muốn biết mình hợp bao nhiêu %', value: 'validate' }
    ],
    scoring: { dimension: 'assessment_goal', weight: 1 },
    orderIndex: 60
  }
];

// ==========================================
// 6. DANH MỤC 10 NGÀNH & HỒ SƠ NĂNG LỰC NGÀNH
// ==========================================
const SEED_MAJORS = [
  {
    id: 'CNTT',
    name: 'Công nghệ thông tin',
    category: 'Công nghệ',
    description: 'Nghiên cứu, phát triển và ứng dụng phần mềm, hệ thống mạng, trí tuệ nhân tạo và dữ liệu.',
    profile: {
      hollandProfile: { R: 6, I: 10, A: 4, S: 3, E: 5, C: 7 },
      personalityFit: ['INTJ', 'INTP', 'ISTJ', 'ENTP', 'ISTP'],
      skillsRequired: ['Tư duy logic', 'Khả năng tự học công nghệ mới', 'Lập trình căn bản', 'Giải quyết vấn đề'],
      subjectRequirements: ['Toán', 'Tin học', 'Tiếng Anh'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 550, isRequired: true },
      careerPaths: ['Kỹ sư phần mềm', 'Chuyên viên trí tuệ nhân tạo', 'Quản trị hệ thống Cloud', 'Kỹ sư an toàn thông tin'],
      relatedMajors: ['KTPM', 'KHMT', 'HTTT', 'ATTT'],
      jobOutlook: { demand: 'Rất cao', avgSalary: '15 - 35 triệu VNĐ', growthRate: '15%/năm' }
    }
  },
  {
    id: 'KTPM',
    name: 'Kỹ thuật phần mềm',
    category: 'Công nghệ',
    description: 'Chuyên sâu về quy trình phát triển, thiết kế kiến trúc, kiểm thử và bảo trì hệ thống phần mềm quy mô lớn.',
    profile: {
      hollandProfile: { R: 5, I: 9, A: 5, S: 4, E: 6, C: 8 },
      personalityFit: ['INTJ', 'INTP', 'ISTJ', 'INFJ'],
      skillsRequired: ['Lập trình ứng dụng Web/App', 'Kiểm thử phần mềm (QA/QC)', 'Làm việc nhóm Agile/Scrum'],
      subjectRequirements: ['Toán', 'Tin học', 'Tiếng Anh'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 600, isRequired: true },
      careerPaths: ['Full-stack Developer', 'Mobile App Developer', 'Software Architect', 'Product Owner'],
      relatedMajors: ['CNTT', 'KHMT', 'HTTT'],
      jobOutlook: { demand: 'Rất cao', avgSalary: '16 - 38 triệu VNĐ', growthRate: '16%/năm' }
    }
  },
  {
    id: 'QTKD',
    name: 'Quản trị kinh doanh',
    category: 'Kinh tế - Quản lý',
    description: 'Đào tạo kiến thức quản trị, chiến lược vận hành doanh nghiệp, đàm phán thương mại và lãnh đạo.',
    profile: {
      hollandProfile: { R: 2, I: 5, A: 4, S: 7, E: 10, C: 6 },
      personalityFit: ['ENTJ', 'ESTJ', 'ENFJ', 'ESTP', 'ESFJ'],
      skillsRequired: ['Giao tiếp thuyết phục', 'Quản lý thời gian', 'Lập kế hoạch chiến lược', 'Giải quyết xung đột'],
      subjectRequirements: ['Toán', 'Tiếng Anh', 'Ngữ văn'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 600, isRequired: false },
      careerPaths: ['Chuyên viên phát triển kinh doanh', 'Quản lý dự án', 'Chuyên viên vận hành', 'Khởi nghiệp'],
      relatedMajors: ['MKT', 'TCNH', 'LOGISTICS'],
      jobOutlook: { demand: 'Cao', avgSalary: '12 - 25 triệu VNĐ', growthRate: '10%/năm' }
    }
  },
  {
    id: 'MKT',
    name: 'Marketing',
    category: 'Kinh tế - Quản lý',
    description: 'Nghiên cứu thị trường, xây dựng chiến lược thương hiệu, quảng cáo kỹ thuật số và trải nghiệm khách hàng.',
    profile: {
      hollandProfile: { R: 2, I: 6, A: 9, S: 7, E: 9, C: 4 },
      personalityFit: ['ENFP', 'ENTP', 'ESFP', 'ENFJ'],
      skillsRequired: ['Sáng tạo nội dung', 'Phân tích dữ liệu người dùng', 'Quản lý mạng xã hội', 'Bắt trend thị trường'],
      subjectRequirements: ['Tiếng Anh', 'Ngữ văn', 'Toán'],
      languageMin: { level: 'B1', ielts: 6.0, toeic: 650, isRequired: true },
      careerPaths: ['Digital Marketing Specialist', 'Content Creator', 'Brand Manager', 'Media Planner'],
      relatedMajors: ['QTKD', 'TKDH', 'TRUYENTHONG'],
      jobOutlook: { demand: 'Rất cao', avgSalary: '12 - 28 triệu VNĐ', growthRate: '14%/năm' }
    }
  },
  {
    id: 'TCNH',
    name: 'Tài chính - Ngân hàng',
    category: 'Kinh tế - Quản lý',
    description: 'Quản trị dòng tiền, đầu tư tài chính, thị trường chứng khoán, định giá và ngân hàng thương mại.',
    profile: {
      hollandProfile: { R: 2, I: 8, A: 2, S: 5, E: 8, C: 9 },
      personalityFit: ['ISTJ', 'ESTJ', 'INTJ', 'ENTJ'],
      skillsRequired: ['Phân tích báo cáo tài chính', 'Mô hình hóa tài chính', 'Tính toán cẩn thận', 'Quản trị rủi ro'],
      subjectRequirements: ['Toán', 'Tiếng Anh'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 600, isRequired: true },
      careerPaths: ['Chuyên viên phân tích đầu tư', 'Chuyên viên tín dụng ngân hàng', 'Quản lý quỹ', 'Môi giới chứng khoán'],
      relatedMajors: ['KETOAN', 'QTKD'],
      jobOutlook: { demand: 'Khá cao', avgSalary: '14 - 30 triệu VNĐ', growthRate: '9%/năm' }
    }
  },
  {
    id: 'KETOAN',
    name: 'Kế toán - Kiểm toán',
    category: 'Kinh tế - Quản lý',
    description: 'Thu thập, xử lý và kiểm tra thông tin tài chính, lập báo cáo thuế và đảm bảo tuân thủ chuẩn mực kế toán.',
    profile: {
      hollandProfile: { R: 3, I: 7, A: 1, S: 4, E: 5, C: 10 },
      personalityFit: ['ISTJ', 'ISFJ', 'ESTJ'],
      skillsRequired: ['Thành thạo Excel', 'Nắm vững luật thuế', 'Tính trung thực và tỉ mỉ', 'Chịu áp lực số liệu'],
      subjectRequirements: ['Toán', 'Tiếng Anh'],
      languageMin: { level: 'A2', ielts: 5.0, toeic: 500, isRequired: false },
      careerPaths: ['Kế toán tổng hợp', 'Kiểm toán viên độc lập', 'Chuyên viên tư vấn thuế', 'Kế toán trưởng'],
      relatedMajors: ['TCNH', 'QTKD'],
      jobOutlook: { demand: 'Rất ổn định', avgSalary: '10 - 22 triệu VNĐ', growthRate: '8%/năm' }
    }
  },
  {
    id: 'NNA',
    name: 'Ngôn ngữ Anh',
    category: 'Ngôn ngữ',
    description: 'Nghiên cứu văn hóa, ngôn ngữ học, biên phiên dịch và ứng dụng tiếng Anh trong thương mại quốc tế.',
    profile: {
      hollandProfile: { R: 1, I: 6, A: 8, S: 8, E: 6, C: 5 },
      personalityFit: ['ENFP', 'INFJ', 'INFP', 'ISFJ', 'ESFJ'],
      skillsRequired: ['Ngoại ngữ xuất sắc (4 kỹ năng)', 'Biên phiên dịch', 'Giao tiếp liên văn hóa', 'Soạn thảo văn bản'],
      subjectRequirements: ['Tiếng Anh', 'Ngữ văn'],
      languageMin: { level: 'B2', ielts: 6.5, toeic: 750, isRequired: true },
      careerPaths: ['Biên phiên dịch viên', 'Giảng viên tiếng Anh', 'Chuyên viên đối ngoại', 'Điều phối viên quốc tế'],
      relatedMajors: ['MKT', 'QTKD', 'QUANHEXAHOI'],
      jobOutlook: { demand: 'Cao', avgSalary: '12 - 26 triệu VNĐ', growthRate: '11%/năm' }
    }
  },
  {
    id: 'TKDH',
    name: 'Thiết kế đồ họa',
    category: 'Nghệ thuật - Thiết kế',
    description: 'Kết hợp mỹ thuật và công nghệ để truyền tải thông điệp thị giác qua hình ảnh, UI/UX, ấn phẩm và hoạt họa.',
    profile: {
      hollandProfile: { R: 4, I: 5, A: 10, S: 4, E: 5, C: 3 },
      personalityFit: ['ISFP', 'INFP', 'INTP', 'ENFP'],
      skillsRequired: ['Sử dụng công cụ Adobe (Photoshop, AI)', 'Tư duy thẩm mỹ & màu sắc', 'Thiết kế giao diện UI/UX'],
      subjectRequirements: ['Mỹ thuật', 'Tin học', 'Ngữ văn'],
      languageMin: { level: 'A2', ielts: 5.0, toeic: 500, isRequired: false },
      careerPaths: ['Graphic Designer', 'UI/UX Designer', 'Motion Graphic Artist', 'Art Director'],
      relatedMajors: ['MKT', 'CNTT'],
      jobOutlook: { demand: 'Rất cao', avgSalary: '12 - 28 triệu VNĐ', growthRate: '15%/năm' }
    }
  },
  {
    id: 'YDK',
    name: 'Y đa khoa',
    category: 'Y tế',
    description: 'Chẩn đoán, điều trị, phục hồi chức năng và bảo vệ sức khỏe cho bệnh nhân tại các cơ sở y tế.',
    profile: {
      hollandProfile: { R: 6, I: 10, A: 2, S: 9, E: 4, C: 7 },
      personalityFit: ['INFJ', 'ISFJ', 'INTJ', 'ISTJ'],
      skillsRequired: ['Khả năng ghi nhớ kiến thức khổng lồ', 'Thao tác lâm sàng chính xác', 'Tinh thần y đức và lòng trắc ẩn', 'Chịu áp lực ca trực'],
      subjectRequirements: ['Hóa học', 'Sinh học', 'Toán'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 550, isRequired: true },
      careerPaths: ['Bác sĩ điều trị', 'Bác sĩ nội trú', 'Bác sĩ nghiên cứu y học', 'Giảng viên trường y'],
      relatedMajors: ['DUOCHOC', 'RHM'],
      jobOutlook: { demand: 'Cực kỳ cao', avgSalary: '15 - 40 triệu VNĐ', growthRate: '10%/năm' }
    }
  },
  {
    id: 'LOGISTICS',
    name: 'Logistics và Quản lý chuỗi cung ứng',
    category: 'Kinh tế - Quản lý',
    description: 'Quản lý dòng chảy hàng hóa, kho bãi, vận tải quốc tế và chuỗi cung ứng từ nhà sản xuất tới người tiêu dùng.',
    profile: {
      hollandProfile: { R: 5, I: 7, A: 2, S: 4, E: 8, C: 9 },
      personalityFit: ['ISTJ', 'ESTJ', 'ENTJ', 'INTJ'],
      skillsRequired: ['Tối ưu hóa quy trình vận chuyển', 'Quản lý kho bãi', 'Ngoại thương & thủ tục hải quan'],
      subjectRequirements: ['Toán', 'Tiếng Anh', 'Địa lý'],
      languageMin: { level: 'B1', ielts: 5.5, toeic: 600, isRequired: true },
      careerPaths: ['Chuyên viên xuất nhập khẩu', 'Quản lý chuỗi cung ứng', 'Điều phối vận tải kho bãi', 'Chuyên viên mua hàng (Purchasing)'],
      relatedMajors: ['QTKD', 'TCNH'],
      jobOutlook: { demand: 'Rất cao', avgSalary: '13 - 30 triệu VNĐ', growthRate: '16%/năm' }
    }
  }
];

// ==========================================
// 7. DANH MỤC 30 TRƯỜNG ĐẠI HỌC (3 MIỀN)
// 10 Miền Bắc, 10 Miền Trung, 10 Miền Nam
// ==========================================
const SEED_UNIVERSITIES = [
  // --- 10 TRƯỜNG MIỀN BẮC ---
  {
    id: 'BKA',
    name: 'Đại học Bách Khoa Hà Nội',
    code: 'BKA',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://hust.edu.vn',
    tuition: '28 - 45 triệu VNĐ/năm',
    employmentRate: 98.2
  },
  {
    id: 'QHI',
    name: 'Trường Đại học Công nghệ - ĐHQGHN',
    code: 'QHI',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://uet.vnu.edu.vn',
    tuition: '35 - 40 triệu VNĐ/năm',
    employmentRate: 97.5
  },
  {
    id: 'KHA',
    name: 'Trường Đại học Kinh tế Quốc dân',
    code: 'KHA',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://neu.edu.vn',
    tuition: '24 - 35 triệu VNĐ/năm',
    employmentRate: 97.8
  },
  {
    id: 'NTH',
    name: 'Trường Đại học Ngoại thương (Cơ sở Hà Nội)',
    code: 'NTA',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://ftu.edu.vn',
    tuition: '25 - 45 triệu VNĐ/năm',
    employmentRate: 98.5
  },
  {
    id: 'BVH',
    name: 'Học viện Công nghệ Bưu chính Viễn thông',
    code: 'BVH',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://ptit.edu.vn',
    tuition: '27 - 35 triệu VNĐ/năm',
    employmentRate: 95.8
  },
  {
    id: 'HAN',
    name: 'Trường Đại học Hà Nội',
    code: 'HAN',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://hanu.edu.vn',
    tuition: '22 - 32 triệu VNĐ/năm',
    employmentRate: 94.6
  },
  {
    id: 'YHB',
    name: 'Trường Đại học Y Hà Nội',
    code: 'YHB',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://hmu.edu.vn',
    tuition: '20 - 55 triệu VNĐ/năm',
    employmentRate: 99.0
  },
  {
    id: 'GHA',
    name: 'Trường Đại học Giao thông Vận tải',
    code: 'GHA',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Công lập',
    website: 'https://utc.edu.vn',
    tuition: '16 - 24 triệu VNĐ/năm',
    employmentRate: 92.5
  },
  {
    id: 'FPT_HN',
    name: 'Trường Đại học FPT Hà Nội',
    code: 'FPT',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Tư thục',
    website: 'https://hanoi.fpt.edu.vn',
    tuition: '60 - 80 triệu VNĐ/năm',
    employmentRate: 96.0
  },
  {
    id: 'PKA',
    name: 'Trường Đại học Phenikaa',
    code: 'PKA',
    region: 'Bac',
    province: 'Hà Nội',
    type: 'Tư thục',
    website: 'https://phenikaa-uni.edu.vn',
    tuition: '30 - 45 triệu VNĐ/năm',
    employmentRate: 93.8
  },

  // --- 10 TRƯỜNG MIỀN TRUNG ---
  {
    id: 'DDK',
    name: 'Trường Đại học Bách Khoa - ĐH Đà Nẵng',
    code: 'DDK',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Công lập',
    website: 'https://dut.udn.vn',
    tuition: '24 - 32 triệu VNĐ/năm',
    employmentRate: 96.5
  },
  {
    id: 'DDQ',
    name: 'Trường Đại học Kinh tế - ĐH Đà Nẵng',
    code: 'DDQ',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Công lập',
    website: 'https://due.udn.vn',
    tuition: '22 - 30 triệu VNĐ/năm',
    employmentRate: 95.8
  },
  {
    id: 'DDF',
    name: 'Trường Đại học Ngoại ngữ - ĐH Đà Nẵng',
    code: 'DDF',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Công lập',
    website: 'https://ufl.udn.vn',
    tuition: '18 - 25 triệu VNĐ/năm',
    employmentRate: 94.0
  },
  {
    id: 'DSK',
    name: 'Trường Đại học Sư phạm Kỹ thuật - ĐH Đà Nẵng',
    code: 'DSK',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Công lập',
    website: 'https://ute.udn.vn',
    tuition: '20 - 26 triệu VNĐ/năm',
    employmentRate: 94.2
  },
  {
    id: 'DDT',
    name: 'Trường Đại học Duy Tân',
    code: 'DDT',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Tư thục',
    website: 'https://duytan.edu.vn',
    tuition: '30 - 55 triệu VNĐ/năm',
    employmentRate: 95.0
  },
  {
    id: 'FPT_DN',
    name: 'Trường Đại học FPT Đà Nẵng',
    code: 'FPT',
    region: 'Trung',
    province: 'Đà Nẵng',
    type: 'Tư thục',
    website: 'https://dnuni.fpt.edu.vn',
    tuition: '60 - 80 triệu VNĐ/năm',
    employmentRate: 96.2
  },
  {
    id: 'DHK',
    name: 'Trường Đại học Khoa học - ĐH Huế',
    code: 'DHK',
    region: 'Trung',
    province: 'Thừa Thiên Huế',
    type: 'Công lập',
    website: 'https://husc.edu.vn',
    tuition: '16 - 22 triệu VNĐ/năm',
    employmentRate: 91.5
  },
  {
    id: 'DHE',
    name: 'Trường Đại học Kinh tế - ĐH Huế',
    code: 'DHE',
    region: 'Trung',
    province: 'Thừa Thiên Huế',
    type: 'Công lập',
    website: 'https://hce.edu.vn',
    tuition: '18 - 25 triệu VNĐ/năm',
    employmentRate: 93.0
  },
  {
    id: 'TSN',
    name: 'Trường Đại học Nha Trang',
    code: 'TSN',
    region: 'Trung',
    province: 'Khánh Hòa',
    type: 'Công lập',
    website: 'https://ntu.edu.vn',
    tuition: '16 - 24 triệu VNĐ/năm',
    employmentRate: 92.0
  },
  {
    id: 'DQN',
    name: 'Trường Đại học Quy Nhơn',
    code: 'DQN',
    region: 'Trung',
    province: 'Bình Định',
    type: 'Công lập',
    website: 'https://qnu.edu.vn',
    tuition: '15 - 22 triệu VNĐ/năm',
    employmentRate: 90.8
  },

  // --- 10 TRƯỜNG MIỀN NAM ---
  {
    id: 'QSB',
    name: 'Trường Đại học Bách Khoa - ĐHQG TP.HCM',
    code: 'QSB',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://hcmut.edu.vn',
    tuition: '30 - 45 triệu VNĐ/năm',
    employmentRate: 98.6
  },
  {
    id: 'QSC',
    name: 'Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
    code: 'QSC',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://uit.edu.vn',
    tuition: '35 - 45 triệu VNĐ/năm',
    employmentRate: 98.4
  },
  {
    id: 'QST',
    name: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
    code: 'QST',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://hcmus.edu.vn',
    tuition: '25 - 40 triệu VNĐ/năm',
    employmentRate: 96.0
  },
  {
    id: 'KSA',
    name: 'Đại học Kinh tế TP. Hồ Chí Minh (UEH)',
    code: 'KSA',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://ueh.edu.vn',
    tuition: '32 - 45 triệu VNĐ/năm',
    employmentRate: 98.0
  },
  {
    id: 'SPK',
    name: 'Trường Đại học Sư phạm Kỹ thuật TP.HCM',
    code: 'SPK',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://hcmute.edu.vn',
    tuition: '28 - 38 triệu VNĐ/năm',
    employmentRate: 96.8
  },
  {
    id: 'DTT',
    name: 'Trường Đại học Tôn Đức Thắng',
    code: 'DTT',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://tdtu.edu.vn',
    tuition: '28 - 45 triệu VNĐ/năm',
    employmentRate: 97.2
  },
  {
    id: 'NTS',
    name: 'Trường Đại học Ngoại thương (Cơ sở 2 TP.HCM)',
    code: 'NTS',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://cs2.ftu.edu.vn',
    tuition: '26 - 45 triệu VNĐ/năm',
    employmentRate: 98.8
  },
  {
    id: 'YDS',
    name: 'Đại học Y Dược TP. Hồ Chí Minh',
    code: 'YDS',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Công lập',
    website: 'https://ump.edu.vn',
    tuition: '45 - 80 triệu VNĐ/năm',
    employmentRate: 99.2
  },
  {
    id: 'TCT',
    name: 'Trường Đại học Cần Thơ',
    code: 'TCT',
    region: 'Nam',
    province: 'Cần Thơ',
    type: 'Công lập',
    website: 'https://ctu.edu.vn',
    tuition: '18 - 26 triệu VNĐ/năm',
    employmentRate: 94.5
  },
  {
    id: 'RMIT',
    name: 'Trường Đại học RMIT Việt Nam',
    code: 'RMIT',
    region: 'Nam',
    province: 'TP. Hồ Chí Minh',
    type: 'Quốc tế',
    website: 'https://rmit.edu.vn',
    tuition: '300 - 350 triệu VNĐ/năm',
    employmentRate: 97.5
  }
];

// ==========================================
// 8. ĐIỂM CHUẨN TUYỂN SINH MẪU (ADMISSION SCORES)
// Năm 2024 & 2025 theo các phương thức THPT và ĐGNL
// ==========================================
const SEED_ADMISSION_SCORES = [
  // Bách Khoa Hà Nội (BKA)
  { universityId: 'BKA', majorId: 'CNTT', majorNameInSchool: 'Khoa học máy tính (IT1)', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.29, scoreScale: '30', sourceUrl: 'https://ts.hust.edu.vn' },
  { universityId: 'BKA', majorId: 'KTPM', majorNameInSchool: 'Kỹ thuật phần mềm (IT2)', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.65, scoreScale: '30', sourceUrl: 'https://ts.hust.edu.vn' },
  { universityId: 'BKA', majorId: 'LOGISTICS', majorNameInSchool: 'Logistics và Quản lý chuỗi cung ứng', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.85, scoreScale: '30', sourceUrl: 'https://ts.hust.edu.vn' },

  // Đại học Công nghệ ĐHQGHN (QHI)
  { universityId: 'QHI', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.80, scoreScale: '30', sourceUrl: 'https://uet.vnu.edu.vn' },
  { universityId: 'QHI', majorId: 'KTPM', majorNameInSchool: 'Kỹ thuật phần mềm', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.25, scoreScale: '30', sourceUrl: 'https://uet.vnu.edu.vn' },

  // Kinh tế Quốc dân (KHA)
  { universityId: 'KHA', majorId: 'QTKD', majorNameInSchool: 'Quản trị kinh doanh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.10, scoreScale: '30', sourceUrl: 'https://neu.edu.vn' },
  { universityId: 'KHA', majorId: 'MKT', majorNameInSchool: 'Marketing', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.80, scoreScale: '30', sourceUrl: 'https://neu.edu.vn' },
  { universityId: 'KHA', majorId: 'TCNH', majorNameInSchool: 'Tài chính - Ngân hàng', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.90, scoreScale: '30', sourceUrl: 'https://neu.edu.vn' },
  { universityId: 'KHA', majorId: 'KETOAN', majorNameInSchool: 'Kế toán', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.65, scoreScale: '30', sourceUrl: 'https://neu.edu.vn' },
  { universityId: 'KHA', majorId: 'LOGISTICS', majorNameInSchool: 'Logistics và Quản lý chuỗi cung ứng', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.00, scoreScale: '30', sourceUrl: 'https://neu.edu.vn' },

  // Ngoại thương Hà Nội (NTH)
  { universityId: 'NTH', majorId: 'QTKD', majorNameInSchool: 'Quản trị kinh doanh quốc tế', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.05, scoreScale: '30', sourceUrl: 'https://ftu.edu.vn' },
  { universityId: 'NTH', majorId: 'TCNH', majorNameInSchool: 'Tài chính quốc tế', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.80, scoreScale: '30', sourceUrl: 'https://ftu.edu.vn' },
  { universityId: 'NTH', majorId: 'LOGISTICS', majorNameInSchool: 'Logistics và Chuỗi cung ứng quốc tế', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.30, scoreScale: '30', sourceUrl: 'https://ftu.edu.vn' },

  // Học viện Bưu chính Viễn thông (BVH)
  { universityId: 'BVH', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.40, scoreScale: '30', sourceUrl: 'https://ptit.edu.vn' },
  { universityId: 'BVH', majorId: 'MKT', majorNameInSchool: 'Marketing (Công nghệ số)', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.80, scoreScale: '30', sourceUrl: 'https://ptit.edu.vn' },
  { universityId: 'BVH', majorId: 'TKDH', majorNameInSchool: 'Thiết kế đa phương tiện', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.50, scoreScale: '30', sourceUrl: 'https://ptit.edu.vn' },

  // Đại học Hà Nội (HAN)
  { universityId: 'HAN', majorId: 'NNA', majorNameInSchool: 'Ngôn ngữ Anh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT (tiếng Anh nhân 2)', cutoffScore: 34.80, scoreScale: '40', sourceUrl: 'https://hanu.edu.vn' },

  // Đại học Y Hà Nội (YHB)
  { universityId: 'YHB', majorId: 'YDK', majorNameInSchool: 'Y khoa', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.25, scoreScale: '30', sourceUrl: 'https://hmu.edu.vn' },

  // Đại học Bách Khoa Đà Nẵng (DDK)
  { universityId: 'DDK', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.15, scoreScale: '30', sourceUrl: 'https://dut.udn.vn' },
  { universityId: 'DDK', majorId: 'KTPM', majorNameInSchool: 'Kỹ thuật phần mềm', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.75, scoreScale: '30', sourceUrl: 'https://dut.udn.vn' },

  // Đại học Kinh tế Đà Nẵng (DDQ)
  { universityId: 'DDQ', majorId: 'QTKD', majorNameInSchool: 'Quản trị kinh doanh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 24.50, scoreScale: '30', sourceUrl: 'https://due.udn.vn' },
  { universityId: 'DDQ', majorId: 'MKT', majorNameInSchool: 'Marketing', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.50, scoreScale: '30', sourceUrl: 'https://due.udn.vn' },
  { universityId: 'DDQ', majorId: 'LOGISTICS', majorNameInSchool: 'Kinh doanh quốc tế & Logistics', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.00, scoreScale: '30', sourceUrl: 'https://due.udn.vn' },

  // Đại học Ngoại ngữ Đà Nẵng (DDF)
  { universityId: 'DDF', majorId: 'NNA', majorNameInSchool: 'Ngôn ngữ Anh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 24.20, scoreScale: '30', sourceUrl: 'https://ufl.udn.vn' },

  // Đại học Duy Tân (DDT)
  { universityId: 'DDT', majorId: 'CNTT', majorNameInSchool: 'Công nghệ phần mềm', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 21.00, scoreScale: '30', sourceUrl: 'https://duytan.edu.vn' },
  { universityId: 'DDT', majorId: 'TKDH', majorNameInSchool: 'Thiết kế đồ họa', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 19.50, scoreScale: '30', sourceUrl: 'https://duytan.edu.vn' },

  // Bách Khoa TP.HCM (QSB)
  { universityId: 'QSB', majorId: 'CNTT', majorNameInSchool: 'Khoa học máy tính', admissionYear: 2024, admissionMethod: 'Đánh giá năng lực ĐHQG-HCM', cutoffScore: 885, scoreScale: '1200', sourceUrl: 'https://hcmut.edu.vn' },
  { universityId: 'QSB', majorId: 'LOGISTICS', majorNameInSchool: 'Logistics và Quản lý chuỗi cung ứng', admissionYear: 2024, admissionMethod: 'Đánh giá năng lực ĐHQG-HCM', cutoffScore: 840, scoreScale: '1200', sourceUrl: 'https://hcmut.edu.vn' },

  // Đại học Công nghệ Thông tin TP.HCM (QSC)
  { universityId: 'QSC', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.50, scoreScale: '30', sourceUrl: 'https://uit.edu.vn' },
  { universityId: 'QSC', majorId: 'KTPM', majorNameInSchool: 'Kỹ thuật phần mềm', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.65, scoreScale: '30', sourceUrl: 'https://uit.edu.vn' },

  // Đại học Kinh tế TP.HCM (KSA)
  { universityId: 'KSA', majorId: 'QTKD', majorNameInSchool: 'Quản trị kinh doanh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.80, scoreScale: '30', sourceUrl: 'https://ueh.edu.vn' },
  { universityId: 'KSA', majorId: 'MKT', majorNameInSchool: 'Marketing', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.50, scoreScale: '30', sourceUrl: 'https://ueh.edu.vn' },
  { universityId: 'KSA', majorId: 'TCNH', majorNameInSchool: 'Tài chính - Ngân hàng', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.40, scoreScale: '30', sourceUrl: 'https://ueh.edu.vn' },
  { universityId: 'KSA', majorId: 'LOGISTICS', majorNameInSchool: 'Logistics và Quản lý chuỗi cung ứng', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 27.90, scoreScale: '30', sourceUrl: 'https://ueh.edu.vn' },

  // Đại học Sư phạm Kỹ thuật TP.HCM (SPK)
  { universityId: 'SPK', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 26.75, scoreScale: '30', sourceUrl: 'https://hcmute.edu.vn' },
  { universityId: 'SPK', majorId: 'TKDH', majorNameInSchool: 'Thiết kế đồ họa', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.10, scoreScale: '30', sourceUrl: 'https://hcmute.edu.vn' },

  // Đại học Y Dược TP.HCM (YDS)
  { universityId: 'YDS', majorId: 'YDK', majorNameInSchool: 'Y khoa', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 28.15, scoreScale: '30', sourceUrl: 'https://ump.edu.vn' },

  // Đại học Tôn Đức Thắng (DTT)
  { universityId: 'DTT', majorId: 'TKDH', majorNameInSchool: 'Thiết kế đồ họa', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.00, scoreScale: '30', sourceUrl: 'https://tdtu.edu.vn' },
  { universityId: 'DTT', majorId: 'KTPM', majorNameInSchool: 'Kỹ thuật phần mềm', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.50, scoreScale: '30', sourceUrl: 'https://tdtu.edu.vn' },

  // Đại học Cần Thơ (TCT)
  { universityId: 'TCT', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 25.00, scoreScale: '30', sourceUrl: 'https://ctu.edu.vn' },
  { universityId: 'TCT', majorId: 'QTKD', majorNameInSchool: 'Quản trị kinh doanh', admissionYear: 2024, admissionMethod: 'Điểm thi tốt nghiệp THPT', cutoffScore: 24.25, scoreScale: '30', sourceUrl: 'https://ctu.edu.vn' },

  // RMIT Việt Nam
  { universityId: 'RMIT', majorId: 'CNTT', majorNameInSchool: 'Công nghệ thông tin', admissionYear: 2024, admissionMethod: 'Xét tuyển học bạ + IELTS 6.5', cutoffScore: 7.0, scoreScale: '10', sourceUrl: 'https://rmit.edu.vn' },
  { universityId: 'RMIT', majorId: 'TKDH', majorNameInSchool: 'Thiết kế ứng dụng sáng tạo', admissionYear: 2024, admissionMethod: 'Xét tuyển học bạ + Portfolio', cutoffScore: 7.0, scoreScale: '10', sourceUrl: 'https://rmit.edu.vn' }
];

module.exports = {
  SEED_QUESTIONS,
  SEED_MAJORS,
  SEED_UNIVERSITIES,
  SEED_ADMISSION_SCORES
};

