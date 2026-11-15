// ============================================================================
// CÂU HỎI ĐÁNH GIÁ — sửa file này để đổi câu hỏi (thang điểm 1–5).
// Mỗi câu cần một `id` duy nhất (dùng làm tên cột trong Google Sheet) và `text`.
// Đổi `id` giữa chừng sẽ tạo cột mới trong Sheet, nên cố gắng giữ nguyên sau khi đã thu dữ liệu.
// ============================================================================
export const SURVEY_QUESTIONS = [
  { id: 'q1', text: 'Tôi biết rõ đơn hàng đang ở đâu' },
  { id: 'q2', text: 'Tôi bớt lo lắng khi chờ hàng' },
  { id: 'q3', text: 'Tôi tin tưởng dịch vụ' },
  { id: 'q4', text: 'Tôi muốn tiếp tục sử dụng' },
];

export const SURVEY_TEXT = {
  choiceTitle: 'Bạn thích giao diện nào hơn?',
  choiceHint: 'Chọn một trong hai giao diện bạn vừa trải nghiệm.',
  scoresTitle: 'Mức độ đồng ý của bạn',
  scoresHint: 'Chấm từ 1 đến 5 cho giao diện bạn đã chọn ở trên.',
  scaleMin: '1 = Hoàn toàn không đồng ý',
  scaleMax: '5 = Hoàn toàn đồng ý',
  submit: 'Gửi đánh giá',
  thanks: 'Cảm ơn bạn đã tham gia khảo sát',
};

export const CHOICE_OPTIONS = [
  { value: 'current', title: 'Giao diện tra cứu hiện tại', desc: 'Danh sách trạng thái dạng chữ' },
  { value: 'new', title: 'Giao diện tracking mới', desc: 'Bản đồ, ảnh bằng chứng và thông báo chủ động' },
];
