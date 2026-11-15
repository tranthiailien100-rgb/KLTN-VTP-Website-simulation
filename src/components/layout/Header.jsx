import { Icon } from '../ui/Icon.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { NotificationBell } from '../tracking/NotificationBell.jsx';

/** Logo chữ — KHÔNG dùng logo gốc của Viettel Post. */
function Wordmark() {
  const { inert } = useToast();
  return (
    <a href="#" onClick={inert} aria-label="Viettel Post" className="select-none leading-none text-white">
      <span className="block text-[32px] font-extrabold lowercase tracking-tight sm:text-[36px]">viettel</span>
      <span className="-mt-1 block pr-0.5 text-right text-[13px] font-bold lowercase tracking-wide opacity-95">post</span>
    </a>
  );
}

export function Header({ showBell }) {
  const { inert } = useToast();
  return (
    <header className="bg-vt">
      <div className="mx-auto flex w-[92%] max-w-[1400px] items-center justify-between py-4 lg:w-[90%] lg:py-[25px]">
        <Wordmark />
        <div className="flex items-center gap-2.5 sm:gap-4">
          {showBell && <NotificationBell />}
          <button
            type="button"
            onClick={inert}
            className="flex items-center gap-2 rounded-[5px] bg-ink px-3 py-[7px] text-white transition hover:bg-black/80"
            aria-label="Đăng ký / Đăng nhập"
          >
            <Icon name="door" className="h-[18px] w-[18px]" />
            <span className="hidden whitespace-nowrap text-[14px] font-semibold uppercase sm:inline">Đăng ký / Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={inert}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/50 text-[10px] font-extrabold text-white transition hover:bg-white/15"
            aria-label="English"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
