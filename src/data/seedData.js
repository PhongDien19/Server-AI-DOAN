/**
 * Dữ liệu hạt giống (Seed Data) chuẩn hóa cho Hệ thống trắc nghiệm hướng nghiệp
 * Tuân thủ theo các yêu cầu và đặc tả trong tài liệu:
 * - 24 câu hỏi Tính cách 4 chiều (forced-choice, 6 câu/chiều, không vi phạm bản quyền MBTI)
 * - 18 câu hỏi Holland RIASEC (3 câu/nhóm, thang Likert 1-5)
 * - 8 câu hỏi Ngoại ngữ (Đánh giá kỹ năng & kiểm tra năng lực)
 * - 5 câu hỏi Cơ hội việc làm (Dành riêng cho sinh viên năm 1)
 * - 5 câu hỏi Profile (Môn học, năng lực học tập, mục tiêu)
 * - Danh mục trường, ngành, hồ sơ ngành và điểm chuẩn được quản lý trong database.sql
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

module.exports = { SEED_QUESTIONS };
