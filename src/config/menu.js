// Thanh menu chính (chỉ giữ hình thức, bấm vào chỉ hiện toast "ngoài phạm vi demo").
// `mega: true` = menu nhiều cột; `children` của mega là các cột { title, items:[...] }.
export const MAIN_MENU = [
  { label: 'Trang chủ' },
  {
    label: 'Dịch vụ',
    mega: true,
    columns: [
      { title: 'Dịch vụ trong nước', items: ['Chuyển phát Hỏa tốc', 'Giao ngay Nội tỉnh', 'Chuyển phát Nhanh', 'Chuyển phát Tiêu chuẩn', 'Chuyển phát Hàng nặng', 'Phân loại hàng hóa đặc biệt', 'Dịch vụ cộng thêm', 'Quản lý chất lượng dịch vụ'], more: true },
      { title: 'Dịch vụ quốc tế', items: ['Tin mới nhất', 'Chuyển phát Quốc tế UPS', 'Chuyển phát Quốc tế DHL', 'Chuyển phát Quốc tế VQN', 'Dịch vụ thông quan'], more: true },
      { title: 'Dịch vụ Kho vận', items: ['Cho thuê kho bãi / Fulfillment', 'Vận chuyển từ kho', 'Tư vấn giải pháp'] },
      { title: 'Thương mại điện tử', items: ['Dịch vụ bán vé máy bay (VTBay)'] },
      { title: 'Vận tải Logistics', items: ['Dịch vụ vận tải'] },
    ],
  },
  { label: 'Viettel++', items: ['Giới thiệu Viettel++', 'Tiêu chí xét hạng', 'Quyền lợi hội viên'] },
  { label: 'Tin tức', items: ['Tin hoạt động', 'Tin khuyến mãi', 'Bí kíp triệu đơn'] },
  { label: 'Ứng dụng số', items: ['ViettelPost App', 'Hướng dẫn sử dụng'] },
  { label: 'Hỗ trợ khách hàng', items: ['Hướng dẫn sử dụng', 'Gửi thông tin khiếu nại', 'Góp ý sản phẩm dịch vụ', 'Liên hệ', 'Thông tin hỗ trợ khách hàng'] },
  {
    label: 'Quan hệ cổ đông',
    mega: true,
    columns: [
      { title: 'Thông tin cổ đông', items: ['Điều lệ tổng công ty', 'Đại hội đồng cổ đông', 'Tin cổ đông', 'Báo cáo tài chính', 'Báo cáo thường niên', 'Báo cáo quản trị công ty'] },
      { title: 'Tin tức doanh nghiệp', items: ['Tin doanh nghiệp', 'Thông tin báo chí'] },
    ],
  },
  { label: 'Về Viettel Post' },
  { label: 'Tuyển dụng' },
];
