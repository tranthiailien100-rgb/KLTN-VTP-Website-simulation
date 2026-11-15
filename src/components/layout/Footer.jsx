import { useMemo } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useToast } from '../../state/ToastContext.jsx';

/** Mã QR minh họa (ô vuông ngẫu nhiên cố định) — không phải mã QR thật. */
function FakeQr({ seed = 1, size = 110 }) {
  const cells = useMemo(() => {
    let a = seed * 9301 + 49297;
    const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    const n = 21;
    const out = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      if (!finder && rnd() > 0.52) out.push([x, y]);
    }
    return out;
  }, [seed]);
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" fill="#111" />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" fill="#111" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" className="rounded bg-white p-1" role="img" aria-label="Mã QR minh họa">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />)}
      <Finder x={0} y={0} /><Finder x={14} y={0} /><Finder x={0} y={14} />
    </svg>
  );
}

function Social({ children, label, onClick }) {
  return (
    <a href="#" onClick={onClick} aria-label={label} className="mr-5 grid h-[34px] w-[34px] place-items-center rounded-full border border-white/70 text-[14px] font-extrabold text-white transition hover:brightness-200">
      {children}
    </a>
  );
}

const ABOUT = ['Giới thiệu', 'Tin tức', 'Mạng lưới bưu cục', 'Tuyển dụng', 'Hợp tác', 'Kết nối API', 'Liên hệ'];
const SUPPORT = [
  'Chat online với CSKH', 'Hướng dẫn sử dụng dịch vụ', 'Câu hỏi thường gặp', 'Điều khoản sử dụng',
  'Chính sách Bảo vệ dữ liệu cá nhân', 'Biểu mẫu thực hiện quyền BM01', 'Biểu mẫu thực hiện quyền BM02',
  'Chính sách vận chuyển', 'Góp ý sản phẩm dịch vụ', 'Quy định về Bồi thường thiệt hại', 'Quy định hàng cấm gửi, gửi có điều kiện',
];

/**
 * Footer giữ BỐ CỤC giống trang tham chiếu nhưng mọi thông tin liên hệ (hotline, số điện thoại, email,
 * địa chỉ, số đăng ký kinh doanh) là MINH HỌA — để người xem link không gọi / gửi thư tới số thật.
 */
export function Footer() {
  const { inert } = useToast();
  const li = 'text-[14px] leading-8 text-white hover:text-[#e03]';
  return (
    <footer className="relative bg-footer">
      <div className="h-[7px] w-full bg-vt" />
      <section className="relative border-b border-[#cacaca] pb-10 pt-12 text-white lg:pt-[70px]">
        <div className="mx-auto max-w-[1140px] px-[15px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-0">
            {/* Cột trái */}
            <div className="lg:w-5/12 lg:pr-[50px]">
              <h3 className="mb-2 text-[16px] font-bold leading-[22px]">TỔNG CÔNG TY CỔ PHẦN BƯU CHÍNH VIETTEL</h3>
              <p className="mb-4 text-[14px] leading-5">
                Viettel Post là doanh nghiệp Logistics Công nghệ cung cấp giải pháp chuỗi cung ứng logistics toàn trình từ DỊCH VỤ GIAO NHẬN - VẬN TẢI - KHO VẬN ĐẾN THƯƠNG MẠI, LOGISTICS XUYÊN BIÊN GIỚI, hướng tới là nền tảng hạ tầng logistics quốc gia và khu vực
              </p>
              <p className="mb-4 flex gap-2.5 text-[14px] leading-5"><Icon name="send" className="mt-1 h-3.5 w-3.5 shrink-0 text-vt" />Giấy chứng nhận Đăng ký Kinh doanh số: 01xxxxxxxx (thông tin minh họa)</p>
              <p className="mb-4 flex gap-2.5 text-[14px] leading-5"><Icon name="send" className="mt-1 h-3.5 w-3.5 shrink-0 text-vt" /><a href="#" onClick={inert}>Giấy phép bưu chính</a></p>
              <p className="mb-4 flex gap-2.5 text-[14px] leading-5"><Icon name="send" className="mt-1 h-3.5 w-3.5 shrink-0 text-vt" /><a href="#" onClick={inert}>Văn bản xác nhận thông báo hoạt động bưu chính</a></p>

              <h3 className="mb-2 mt-[30px] text-[16px] font-bold leading-[22px]">THÔNG TIN LIÊN HỆ</h3>
              <p className="mb-4 flex gap-2.5 text-[14px] leading-5"><Icon name="pin" className="mt-1 h-3.5 w-3.5 shrink-0 text-vt" />Địa chỉ trụ sở: Phường Cầu Giấy, Thành phố Hà Nội (thông tin minh họa)</p>
              <p className="mb-4 flex items-center gap-2.5 text-[14px] leading-5"><Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-vt" /><a href="#" onClick={inert}>cskh@example.com</a></p>
              <p className="mb-4 flex items-center gap-2 text-[30px] leading-5 lg:text-[36px]"><Icon name="phone" className="h-5 w-5 text-vt" /><a href="#" onClick={inert}>19001234</a></p>

              <h4 className="mb-[15px] mt-6 text-[18px] font-medium">Kết nối cùng ViettelPost</h4>
              <div className="flex items-center">
                <Social label="Facebook" onClick={inert}>f</Social>
                <Social label="Email" onClick={inert}><Icon name="mail" className="h-4 w-4" /></Social>
                <Social label="Zalo" onClick={inert}>Z</Social>
                <Social label="LinkedIn" onClick={inert}>in</Social>
              </div>
            </div>

            {/* Cột phải */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 lg:w-7/12 lg:gap-0 lg:pl-0">
              <div className="sm:col-span-4 lg:col-span-2">
                <h6 className="mb-2 text-[16px] font-bold">Về ViettelPost</h6>
                <ul className="m-0 list-none p-0">
                  {ABOUT.map((t) => <li key={t} className={li}><a href="#" onClick={inert}>{t}</a></li>)}
                </ul>
              </div>
              <div className="sm:col-span-8 lg:col-span-3">
                <h6 className="mb-2 text-[16px] font-bold">Hỗ trợ khách hàng</h6>
                <ul className="m-0 list-none p-0">
                  {SUPPORT.map((t) => <li key={t} className={li}><a href="#" onClick={inert}>{t}</a></li>)}
                </ul>
              </div>
              <div className="sm:col-span-12 lg:col-span-7">
                <div className="mb-4">
                  <h6 className="mb-2 text-[16px] font-bold">Hợp tác khách hàng doanh nghiệp, kết nối API</h6>
                  <a href="#" onClick={inert} className="flex items-center gap-2 whitespace-nowrap text-[16px] leading-6"><Icon name="phone" className="h-4 w-4 text-vt" /><span>08xx xxx xxx</span></a>
                  <a href="#" onClick={inert} className="flex items-center gap-2 text-[16px] leading-6"><Icon name="mail" className="h-4 w-4 text-vt" /><span>doanhnghiep@example.com</span></a>
                </div>
                <div>
                  <h6 className="mb-2 text-[16px] font-bold">Hợp tác Khách hàng Cá nhân, Shop Online</h6>
                  <a href="#" onClick={inert} className="flex items-center gap-2 whitespace-nowrap text-[16px] leading-6"><Icon name="phone" className="h-4 w-4 text-vt" /><span>09xx xxx xxx</span></a>
                  <a href="#" onClick={inert} className="flex items-center gap-2 text-[16px] leading-6"><Icon name="mail" className="h-4 w-4 text-vt" /><span>kinhdoanh@example.com</span></a>
                </div>
                <div className="flex items-center justify-between pt-[15px]">
                  <div className="text-center"><p className="mb-1 text-[14px]">Liên hệ ngay</p><FakeQr seed={3} /><p className="mb-0 mt-1 text-[11px] text-white/60">(mã minh họa)</p></div>
                  <div className="text-center"><p className="mb-1 text-[14px]">Tải app ViettelPost</p><FakeQr seed={11} /><p className="mb-0 mt-1 text-[11px] text-white/60">(mã minh họa)</p></div>
                </div>
                <div className="flex max-w-[70%] items-center justify-between gap-3 pt-6">
                  <span className="flex items-center gap-1.5 rounded border border-white/50 px-2 py-1 text-[11px] font-bold leading-tight"><Icon name="shield" className="h-4 w-4 text-sky-300" />Tín nhiệm mạng</span>
                  <span className="flex items-center gap-1.5 rounded border border-white/50 px-2 py-1 text-[11px] font-bold leading-tight"><Icon name="check" className="h-4 w-4 text-sky-300" />Đã thông báo Bộ Công Thương</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="px-3 py-3 text-center text-[12px] text-white/80">
        <div className="mx-auto max-w-[1140px] px-[15px]">
          Bản mô phỏng phục vụ nghiên cứu khóa luận – không phải website chính thức của Viettel Post
        </div>
      </section>
    </footer>
  );
}
