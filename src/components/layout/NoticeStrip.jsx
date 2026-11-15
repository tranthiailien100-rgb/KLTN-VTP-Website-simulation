import { useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon.jsx';

/** Dải thông báo cố định (luôn dính ở đầu trang khi cuộn). */
export function NoticeStrip() {
  const ref = useRef(null);

  // Cho các phần tử sticky khác biết chiều cao dải này
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = () => document.documentElement.style.setProperty('--notice-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="note"
      className="sticky top-0 z-[1000] flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-3 py-1.5 text-center text-[12px] font-semibold leading-snug text-amber-900 sm:text-[13px]"
    >
      <Icon name="info" className="hidden h-4 w-4 shrink-0 sm:block" />
      <span>Bản mô phỏng phục vụ nghiên cứu khóa luận – không phải website chính thức của Viettel Post</span>
    </div>
  );
}
