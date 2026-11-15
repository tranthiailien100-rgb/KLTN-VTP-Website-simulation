import { Icon } from '../ui/Icon.jsx';
import { useSim } from '../../state/SimContext.jsx';
import { fmtDateTime } from '../../sim/format.js';

/** Tạm dừng / Chạy lại + đồng hồ mô phỏng. Dùng ở cả hai giao diện để so sánh công bằng. */
export function SimControls() {
  const sim = useSim();
  const st = sim.state;
  if (!st) return null;
  const finished = st.finished;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] shadow-sm">
      <button
        type="button"
        onClick={sim.togglePause}
        disabled={finished}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 transition hover:border-vt hover:text-vt disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700"
      >
        <Icon name={sim.paused ? 'play' : 'pause'} className="h-3.5 w-3.5" />
        {sim.paused ? 'Chạy tiếp' : 'Tạm dừng'}
      </button>
      <button
        type="button"
        onClick={sim.restart}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 transition hover:border-vt hover:text-vt"
      >
        <Icon name="replay" className="h-3.5 w-3.5" />
        Chạy lại
      </button>
      <span className="ml-auto flex items-center gap-2 text-gray-600">
        <Icon name="clock" className="h-4 w-4 text-gray-400" />
        <span>
          Thời gian mô phỏng: <b className="tabular-nums text-gray-900">{fmtDateTime(st.startMs, st.t)}</b>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
            finished ? 'bg-emerald-100 text-emerald-700' : sim.paused ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {finished ? 'Hoàn tất' : sim.paused ? 'Tạm dừng' : 'Đang chạy · tua nhanh'}
        </span>
      </span>
    </div>
  );
}
