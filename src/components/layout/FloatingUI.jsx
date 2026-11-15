import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useToast } from '../../state/ToastContext.jsx';

/**
 * Nút "Tiện ích" nhỏ ở mép phải — chỉ giữ hình thức như các nút ngoài phạm vi khác (bấm → toast).
 * Không còn bảng mở rộng: bảng cao ~550px che header, menu và nút "Đánh giá" trên cửa sổ thấp hoặc khi zoom.
 */
export function FloatingToolbar() {
  const { inert } = useToast();
  return (
    <button
      type="button"
      onClick={inert}
      aria-label="Tiện ích"
      title="Tiện ích"
      className="fixed top-1/2 z-[60] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-l-[5px] bg-toolbar text-white transition hover:bg-vt lg:grid"
      style={{ right: 'var(--admin-w, 0px)' }}
    >
      <Icon name="send" className="h-4 w-4" />
    </button>
  );
}

/**
 * Nút về đầu trang. Bản demo KHÔNG hiện nút chat (chỉ báo "ngoài phạm vi" mà lại che chữ trên điện thoại).
 * Nút nhỏ, không kèm chữ trên điện thoại để không đè lên nội dung.
 */
export function ChatAndTop() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const on = () => setShowTop(window.scrollY > 300);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  if (!showTop) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-4 z-[55] flex flex-col items-center sm:bottom-6"
      style={{ right: 'calc(var(--admin-w, 0px) + 14px)' }}
      aria-label="Về đầu trang"
      title="Về đầu trang"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow-lg ring-1 ring-black/10 sm:h-11 sm:w-11">
        <Icon name="arrow" className="h-5 w-5 -rotate-90" />
      </span>
    </button>
  );
}
