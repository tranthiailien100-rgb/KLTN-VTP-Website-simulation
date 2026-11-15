import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { kindStyle } from '../../state/ToastContext.jsx';
import { useSim } from '../../state/SimContext.jsx';
import { fmtDateTime } from '../../sim/format.js';

/** Chuông thông báo trên header — chỉ xuất hiện ở chế độ tracking mới. */
export function NotificationBell() {
  const sim = useSim();
  const st = sim.state;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const list = st ? [...st.notifications].reverse() : [];
  const unread = list.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) sim.markRead();
      return !o;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/15"
        aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
        aria-expanded={open}
      >
        <Icon name="bell" className="h-[22px] w-[22px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold leading-none text-vt shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1000] mt-2 w-[min(92vw,360px)] animate-pop overflow-hidden rounded-lg bg-white text-gray-900 shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="m-0 text-[15px] font-extrabold">Thông báo</p>
            <p className="m-0 text-[11px] font-semibold text-gray-400">Gửi qua Zalo/SMS (mô phỏng)</p>
          </div>
          <ul className="slim-scroll m-0 max-h-[420px] list-none overflow-y-auto p-0">
            {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">Chưa có thông báo. Hãy tra cứu một mã demo.</li>}
            {list.map((n) => {
              const k = kindStyle(n.kind);
              return (
                <li key={n.id} className="flex gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${k.iconWrap}`}>
                    <Icon name={k.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-bold leading-snug">{n.title}</p>
                    <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-gray-600">{n.body}</p>
                    <p className="m-0 mt-1 text-[11px] font-semibold text-gray-400">
                      {fmtDateTime(st.startMs, n.t)} · {n.channel}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
