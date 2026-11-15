import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useSim, SPEED_OPTIONS } from '../../state/SimContext.jsx';
import { useSession } from '../../state/SessionContext.jsx';
import { adminAvailability, selectStatusText } from '../../sim/engine.js';
import { fmtDateTime } from '../../sim/format.js';

const PANEL_W = 300;

// cmd = tên lệnh gửi cho engine; key = tên trường trong adminAvailability()
const COMMANDS = [
  { cmd: 'pickup_photo', key: 'pickupPhoto', label: 'Shipper cập nhật ảnh lấy hàng', icon: 'camera', hint: 'Luồng A: tua tới mốc lấy hàng có ảnh. Nếu đang chờ xác nhận: shipper bổ sung ảnh muộn.' },
  { cmd: 'hub_scan', key: 'hubScan', label: 'Bưu cục quét nhập', icon: 'hub', hint: 'Tua tới mốc nhập bưu cục. Nếu chưa có mốc lấy hàng → gắn cờ “Thiếu mốc xác nhận”.' },
  { cmd: 'forgot', key: 'forgot', label: 'Quên xác nhận lấy hàng', icon: 'alert', hint: 'Luồng A: shipper rời đi mà chưa có ảnh → hộp hỏi người gửi. Luồng B: quầy bỏ qua bước cân → khóa bước khi nhập kho.' },
  { cmd: 'stall', key: 'stall', label: 'Đơn đứng yên quá 12h', icon: 'clock', hint: 'Giữ đơn 12 giờ mô phỏng → cảnh báo + chuyển CSKH.' },
  { cmd: 'misdeliver', key: 'misdeliver', label: 'Bưu tá báo giao nhưng chưa giao', icon: 'box', hint: 'Bưu tá bấm “giao thành công” lệch địa chỉ, không có OTP → hỏi người nhận; nếu chưa nhận hoặc không trả lời → CSKH, giao lại.' },
  { cmd: 'deliver', key: 'deliver', label: 'Giao thành công', icon: 'check', hint: 'Tua nhanh tới mốc hoàn tất (giao đúng mã OTP).' },
];

/** Bảng điều khiển cho người thuyết trình — mở bằng ?admin=1. */
export function AdminPanel() {
  const sim = useSim();
  const { session, restart } = useSession();
  const [open, setOpen] = useState(true);
  const st = sim.state;
  const av = st ? adminAvailability(st) : {};
  const mode = session.screen === 'tracking' ? session.mode : null;
  const fmtMin = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('admin-open');
    root.style.setProperty('--admin-w', open ? `${PANEL_W}px` : '0px');
    return () => {
      root.classList.remove('admin-open');
      root.style.removeProperty('--admin-w');
    };
  }, [open]);

  const modeLabel = mode === 'new' ? 'Tracking mới' : mode === 'current' ? 'Tra cứu hiện tại' : '—';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/3 z-[1200] flex items-center gap-1.5 rounded-l-lg bg-slate-900 px-3 py-2 text-[12px] font-bold text-white shadow-lg"
      >
        <Icon name="sliders" className="h-4 w-4" /> Điều khiển
      </button>
    );
  }

  return (
    <aside
      aria-label="Bảng điều khiển mô phỏng"
      className="fixed right-0 top-0 z-[1200] flex h-full flex-col overflow-y-auto bg-slate-900 text-slate-100 shadow-2xl"
      style={{ width: PANEL_W }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="m-0 flex items-center gap-2 text-[14px] font-extrabold">
          <Icon name="sliders" className="h-4 w-4 text-vt" /> Bảng điều khiển mô phỏng
        </p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Thu gọn bảng điều khiển" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1 border-b border-white/10 px-4 py-3 text-[12.5px] leading-snug">
        <p className="m-0 text-slate-400">Giao diện hiện tại: <b className="text-white">{modeLabel}</b></p>
        <p className="m-0 text-slate-400">
          Đã xem: <b className="text-white">cũ {session.seen.current ? '✓' : '–'} · mới {session.seen.new ? '✓' : '–'}</b> · chuyển <b className="text-white">{session.switches}</b> lần
        </p>
        <p className="m-0 text-slate-400">
          Thời gian xem: <b className="tabular-nums text-white">cũ {fmtMin(session.timeMs.current)} · mới {fmtMin(session.timeMs.new)}</b>
        </p>
        {st ? (
          <>
            <p className="m-0 text-slate-400">Đơn: <b className="text-white">{st.code}</b> · luồng {st.flow}</p>
            <p className="m-0 text-slate-400">Trạng thái: <b className="text-white">{selectStatusText(st)}</b></p>
            <p className="m-0 text-slate-400">Giờ mô phỏng: <b className="tabular-nums text-white">{fmtDateTime(st.startMs, st.t)}</b></p>
          </>
        ) : (
          <p className="m-0 text-amber-300">Chưa có đơn nào đang chạy — hãy tra cứu một mã demo.</p>
        )}
      </div>

      <div className="space-y-2 border-b border-white/10 px-4 py-3">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Tình huống</p>
        {COMMANDS.map((c) => {
          const enabled = Boolean(st) && Boolean(av[c.key]);
          return (
            <button
              key={c.cmd}
              type="button"
              disabled={!enabled}
              onClick={() => sim.admin(c.cmd)}
              title={enabled ? c.hint : st ? 'Không khả dụng ở thời điểm này' : 'Cần tra cứu một mã trước'}
              className="flex w-full items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2.5 text-left text-[13px] font-bold transition hover:bg-vt disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/10"
            >
              <Icon name={c.icon} className="h-4 w-4 shrink-0" />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 border-b border-white/10 px-4 py-3">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Tốc độ đồng hồ</p>
        <div className="flex gap-1.5">
          {SPEED_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => sim.setSpeed(o.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-extrabold ${sim.speed === o.value ? 'bg-vt text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button type="button" disabled={!st || st.finished} onClick={sim.togglePause} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 text-[12px] font-bold hover:bg-white/20 disabled:opacity-35">
            <Icon name={sim.paused ? 'play' : 'pause'} className="h-3.5 w-3.5" /> {sim.paused ? 'Chạy tiếp' : 'Tạm dừng'}
          </button>
          <button type="button" disabled={!st} onClick={sim.restart} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 text-[12px] font-bold hover:bg-white/20 disabled:opacity-35">
            <Icon name="replay" className="h-3.5 w-3.5" /> Chạy lại
          </button>
        </div>
      </div>

      <div className="min-h-[120px] flex-1 overflow-y-auto px-4 py-3">
        <p className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Nhật ký sự kiện</p>
        {st ? (
          <ol className="m-0 list-none space-y-1.5 p-0 text-[12px] leading-snug">
            {[...st.events].reverse().slice(0, 8).map((e) => (
              <li key={e.id} className="rounded bg-white/5 px-2 py-1.5">
                <span className="mr-1.5 tabular-nums text-slate-400">{fmtDateTime(st.startMs, e.t)}</span>
                {e.title}
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-[12px] text-slate-500">—</p>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            sim.resetAll();
            restart();
          }}
          className="w-full rounded-lg border border-white/30 px-3 py-2 text-[12.5px] font-bold text-slate-200 hover:bg-white/10"
        >
          Bắt đầu phiên khảo sát mới
        </button>
        <p className="m-0 mt-2 text-[11px] leading-snug text-slate-500">Thêm <code>?reset=1</code> vào URL để xóa phiên cũ khi dùng chung máy.</p>
      </div>
    </aside>
  );
}
