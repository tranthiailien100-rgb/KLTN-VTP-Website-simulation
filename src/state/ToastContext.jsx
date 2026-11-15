import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon.jsx';
import { ToastCtx } from './contexts.js';
import { TOAST } from '../config/pacing.js';

export const useToast = () => useContext(ToastCtx);

const KIND_STYLE = {
  event: { icon: 'bell', bar: 'bg-vt', iconWrap: 'bg-red-50 text-vt' },
  reminder: { icon: 'clock', bar: 'bg-sky-500', iconWrap: 'bg-sky-50 text-sky-600' },
  confirm: { icon: 'help', bar: 'bg-amber-500', iconWrap: 'bg-amber-50 text-amber-600' },
  warning: { icon: 'alert', bar: 'bg-amber-500', iconWrap: 'bg-amber-50 text-amber-600' },
  alert: { icon: 'alert', bar: 'bg-red-700', iconWrap: 'bg-red-50 text-red-700' },
  cskh: { icon: 'shield', bar: 'bg-emerald-500', iconWrap: 'bg-emerald-50 text-emerald-600' },
  delay: { icon: 'clock', bar: 'bg-amber-500', iconWrap: 'bg-amber-50 text-amber-600' },
  otp: { icon: 'lock', bar: 'bg-sky-500', iconWrap: 'bg-sky-50 text-sky-600' },
};
export const kindStyle = (kind) => KIND_STYLE[kind] || KIND_STYLE.event;

export function ToastProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const infoTimer = useRef(null);

  const showInfo = useCallback((msg) => {
    setInfo({ id: Date.now(), msg });
    clearTimeout(infoTimer.current);
    infoTimer.current = setTimeout(() => setInfo(null), 2200);
  }, []);

  /** Dùng cho mọi nút/menu/link không nằm trong phạm vi demo. */
  const inert = useCallback(
    (e) => {
      if (e && e.preventDefault) e.preventDefault();
      showInfo('Chức năng không nằm trong phạm vi demo');
    },
    [showInfo],
  );

  const timers = useRef({});
  const dismissNotif = useCallback((key) => {
    clearTimeout(timers.current[key]);
    delete timers.current[key];
    setNotifs((p) => p.filter((n) => n.key !== key));
  }, []);

  /**
   * Bật một toast. Toast có `slot` (vd 'reminder') dùng chung một ô: toast mới cùng slot
   * thay nội dung tại chỗ thay vì xếp chồng. Số toast cùng lúc và thời gian đứng: TOAST trong config/pacing.js.
   */
  const pushNotif = useCallback(
    (n) => {
      const key = n.slot ? `slot:${n.slot}` : n.id;
      const item = { ...n, key };
      const max = window.innerWidth < 640 ? TOAST.maxMobile : TOAST.maxDesktop;
      setNotifs((p) => {
        const i = p.findIndex((x) => x.key === key);
        if (i >= 0) {
          const next = [...p];
          next[i] = item;
          return next;
        }
        const next = [...p, item];
        // toast bị đẩy ra thì hủy hẹn giờ của nó
        next.slice(0, Math.max(0, next.length - max)).forEach((x) => {
          clearTimeout(timers.current[x.key]);
          delete timers.current[x.key];
        });
        return next.slice(-max);
      });
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => dismissNotif(key), TOAST.durationMs);
    },
    [dismissNotif],
  );

  /** Xóa mọi toast thông báo (khi rời màn tra cứu hoặc chuyển về giao diện cũ). */
  const clearNotifs = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setNotifs([]);
  }, []);

  const value = useMemo(() => ({ showInfo, inert, pushNotif, clearNotifs }), [showInfo, inert, pushNotif, clearNotifs]);

  return (
    <ToastCtx.Provider value={value}>
      {children}

      {/* Toast thông báo (chế độ tracking mới) — dưới cùng (điện thoại: cả bề ngang; máy tính: góc phải),
          nằm trên nút gạt giao diện nổi, không đè thanh chuyển giao diện và khối tóm tắt đơn */}
      <div
        className="pointer-events-none fixed bottom-[76px] left-3 z-[1120] flex flex-col gap-2 sm:left-auto sm:w-[360px]"
        style={{ right: 'calc(var(--admin-w, 0px) + 12px)' }}
        aria-live="polite"
      >
        {notifs.map((n) => {
          const st = kindStyle(n.kind);
          return (
            <div key={n.key} className="pointer-events-auto relative animate-toast-in overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/10">
              <span className={`absolute inset-y-0 left-0 w-1.5 ${st.bar}`} />
              <div className="flex gap-3 py-3 pl-4 pr-3">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${st.iconWrap}`}>
                  <Icon name={st.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-snug text-gray-900">{n.title}</p>
                    <button type="button" onClick={() => dismissNotif(n.key)} className="-mr-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-700" aria-label="Đóng thông báo">
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-gray-600">{n.body}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                    <Icon name="send" className="h-3 w-3" />
                    Đã gửi qua {n.channel} (mô phỏng) · {n.timeLabel}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast nhỏ cho chức năng ngoài phạm vi — giữa dưới */}
      {info && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1300] flex justify-center px-4">
          <div key={info.id} role="status" className="animate-pop rounded-full bg-gray-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {info.msg}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}
