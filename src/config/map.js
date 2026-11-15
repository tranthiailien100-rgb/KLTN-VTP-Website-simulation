// ============================================================================
// NGUỒN BẢN ĐỒ NỀN — đổi nguồn ở đây.
//
// Không dùng tile chuẩn của OpenStreetMap vì lớp tile đó vẽ cả "đường chín đoạn" (đường lưỡi bò) ở Biển Đông.
// Các nguồn Esri bên dưới (không cần API key) không vẽ đường này ở khu vực Biển Đông.
//
// Thêm nguồn mới: thêm một mục vào BASEMAPS rồi trỏ BASEMAP_BY_VIEW tới khóa của nó.
// Nhớ kiểm tra bằng mắt vùng Biển Đông (và nhãn trên bản đồ) trước khi dùng nguồn mới.
// ============================================================================
const ESRI_ATTR =
  'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS User Community';

export const BASEMAPS = {
  // Nền xám nhạt, ít nhãn → tuyến màu đỏ nổi bật. Zoom gốc tối đa 16.
  'esri-light-gray': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 16,
    attribution: ESRI_ATTR,
  },
  // Bản đồ đường phố đầy đủ màu và nhãn tên đường.
  'esri-street': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
    attribution: ESRI_ATTR,
  },
  // Ảnh vệ tinh, không có nhãn hay đường ranh giới nào.
  'esri-imagery': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

// Nền dùng cho từng cấp bản đồ: 'route' = toàn tuyến, 'lastmile' = chặng cuối.
export const BASEMAP_BY_VIEW = {
  route: 'esri-light-gray',
  lastmile: 'esri-street',
};

// Zoom nhỏ nhất cho phép: không cho thu nhỏ ra xa hơn mức thấy cả tuyến Hà Nội – TP.HCM.
export const MAP_MIN_ZOOM = 5;
