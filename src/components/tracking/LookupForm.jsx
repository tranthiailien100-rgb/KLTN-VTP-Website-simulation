import { Icon } from '../ui/Icon.jsx';
import { DEMO_CODES, CODE_LENGTH, normalizeCode } from '../../config/demoCodes.js';

/** Hình minh họa tự vẽ (thay cho ảnh shipper của trang gốc). */
function ParcelIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 360 300" className={className} aria-hidden="true">
      <g fill="#eceff1">
        <rect x="60" y="48" width="74" height="62" rx="5" />
        <rect x="118" y="22" width="62" height="54" rx="5" />
        <rect x="40" y="96" width="60" height="52" rx="5" />
      </g>
      <g fill="#cfd8dc">
        <rect x="68" y="56" width="28" height="6" rx="2" />
        <rect x="126" y="30" width="24" height="6" rx="2" />
      </g>
      <g transform="rotate(-9 190 190)">
        <rect x="52" y="140" width="268" height="132" rx="16" fill="#37474f" />
        <rect x="64" y="150" width="244" height="112" rx="10" fill="#fff" />
        <path d="M84 238c40-6 56-44 100-40s50 24 100-8" fill="none" stroke="#ee0033" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" />
        <circle cx="84" cy="238" r="5" fill="#37474f" />
      </g>
      {/* kiện hàng đỏ */}
      <g transform="translate(150 96)">
        <rect width="86" height="64" rx="8" fill="#ee0033" />
        <rect x="0" y="0" width="86" height="16" rx="8" fill="#c8002b" />
        <rect x="36" y="0" width="14" height="64" fill="#ffb3c1" opacity=".8" />
      </g>
      {/* ghim vị trí */}
      <g transform="translate(274 68)">
        <path d="M18 0C8 0 0 8 0 18c0 14 18 30 18 30s18-16 18-30C36 8 28 0 18 0z" fill="#ee0033" />
        <circle cx="18" cy="18" r="7" fill="#fff" />
      </g>
      <g fill="#ee0033">
        <path d="M28 232c10-26 24-30 30-16-6 4-12 10-30 16z" />
        <path d="M312 150c14-18 30-16 34-4-10 0-22 4-34 4z" />
      </g>
    </svg>
  );
}

const RUN_BADGE = {
  none: { text: 'Chưa xem', cls: 'bg-gray-100 text-gray-500' },
  paused: { text: 'Đang xem dở', cls: 'bg-amber-100 text-amber-800' },
  running: { text: 'Đang xem', cls: 'bg-vt text-white' },
  done: { text: 'Hoàn tất', cls: 'bg-emerald-100 text-emerald-700' },
};

function runStatus(run, active) {
  if (!run) return 'none';
  if (run.finished) return 'done';
  return active ? 'running' : 'paused';
}

/**
 * Ô tra cứu + 4 thẻ đơn demo. Mỗi đơn chạy độc lập: bấm thẻ nào trước cũng được,
 * đơn đang xem dở giữ nguyên tiến độ khi chuyển sang đơn khác.
 */
export function LookupForm({ input, setInput, onSubmit, onPick, error, runs, activeCode }) {
  return (
    <section className="relative mx-auto max-w-[1140px] px-[15px] pb-4">
      <div className="relative min-h-[260px]">
        <div className="lg:w-1/2">
          {/* Thẻ đơn demo: mã + câu giải thích tình huống + trạng thái xem */}
          <div className="mb-5">
            <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-gray-500">Đơn hàng demo — bấm để xem, theo thứ tự nào cũng được</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_CODES.map((d) => {
                const active = activeCode === d.code;
                const b = RUN_BADGE[runStatus(runs[d.code], active)];
                return (
                  <button
                    key={d.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPick(d.code)}
                    className={`relative rounded-lg border px-3 py-2 text-left leading-tight transition ${
                      active ? 'border-vt bg-red-50 ring-1 ring-vt' : 'border-gray-300 bg-white hover:border-vt'
                    }`}
                  >
                    <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${b.cls}`}>{b.text}</span>
                    <span className={`block pr-20 text-[13px] font-extrabold ${active ? 'text-vt' : 'text-gray-900'}`}>{d.title}</span>
                    <span className="mt-0.5 block font-mono text-[13px] font-bold tracking-wider text-gray-700">{d.code}</span>
                    <span className="mt-1 block text-[12px] leading-snug text-gray-500">{d.story}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(input);
            }}
          >
            <label htmlFor="txtSearch" className="mb-[5px] block text-[20px] font-medium leading-[30px] text-ink">
              Mã phiếu gửi
            </label>
            <p className="mb-[5px] text-[14px] leading-[30px] text-ink">(Mã gồm {CODE_LENGTH} chữ số — bản demo tra cứu từng mã một)</p>
            <input
              id="txtSearch"
              value={input}
              // mã phiếu gửi chỉ gồm số: bỏ mọi ký tự khác ngay khi gõ / dán
              onChange={(e) => setInput(normalizeCode(e.target.value).slice(0, CODE_LENGTH))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={CODE_LENGTH}
              placeholder={`VD : ${DEMO_CODES[0].code}`}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'lookup-error' : undefined}
              className={`mb-2 block h-10 w-full rounded-md border px-2.5 font-mono text-[15px] tracking-wider text-gray-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${
                error ? 'border-vt' : 'border-[#ccc]'
              } bg-white`}
            />
            <p id="lookup-error" role="alert" className={`mb-3 min-h-5 text-[13px] font-semibold text-vt ${error ? '' : 'invisible'}`}>
              {error || ' '}
            </p>
            <button
              type="submit"
              className="relative mt-[5px] h-12 w-[174px] rounded-[5px] bg-vt px-[25px] text-left text-[16px] font-semibold uppercase text-white transition hover:bg-vt-dark"
            >
              Tra cứu
              <Icon name="arrow" className="absolute right-[22px] top-1/2 h-[22px] w-[22px] -translate-y-1/2" />
            </button>
          </form>
        </div>

        <ParcelIllustration className="pointer-events-none absolute right-0 top-0 hidden w-[360px] lg:block" />
      </div>
    </section>
  );
}
