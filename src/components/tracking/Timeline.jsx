import { Icon } from '../ui/Icon.jsx';
import { Photo } from '../ui/Photo.jsx';
import { fmtDateTime, fmtCoord } from '../../sim/format.js';

const STEP_ICON = {
  created: 'list',
  assigned: 'user',
  arrived: 'pin',
  pickup_photo: 'camera',
  departed_no_photo: 'alert',
  hub_in_a: 'hub',
  qr_scanned: 'qr',
  weigh_photo: 'scale',
  e_receipt: 'receipt',
  ttkt_hn: 'hub',
  depart_hn: 'truck',
  arrive_dn: 'hub',
  depart_dn: 'truck',
  arrive_hcm: 'hub',
  arrive_pob: 'hub',
  out_for_delivery: 'truck',
  delivered: 'check',
  weigh_skipped: 'alert',
  hub_in_b: 'hub',
  delivered_mismatch: 'alert',
  redelivered: 'check',
  arrived_recipient: 'pin',
  redeliver_arrived: 'pin',
  delivery_evidence: 'camera',
  pickup_evidence: 'camera',
  repickup_arrived: 'pin',
  repickup_photo: 'camera',
  completed: 'shield',
};

export function eventIcon(e) {
  if (e.tone === 'alert' || e.tone === 'warn') return 'alert';
  if (e.kind === 'system') return e.photo ? 'camera' : 'shield';
  return STEP_ICON[e.stepId] || 'pin';
}

const TONE = {
  normal: 'bg-white text-gray-500 ring-gray-300',
  ok: 'bg-emerald-50 text-emerald-600 ring-emerald-300',
  warn: 'bg-amber-50 text-amber-600 ring-amber-300',
  alert: 'bg-red-50 text-red-600 ring-red-300',
};

function Badge({ children, className }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${className}`}>{children}</span>;
}

/** Dòng thời gian hành trình (mới nhất ở trên). Bấm vào mốc để xem chi tiết / ảnh phóng to. */
export function Timeline({ state, onSelect }) {
  const events = [...state.events].reverse();
  return (
    <ol className="m-0 list-none p-0">
      {events.map((e, i) => {
        const latest = i === 0;
        const last = i === events.length - 1;
        const tone = TONE[e.tone] || TONE.normal;
        const label = fmtDateTime(state.startMs, e.t);
        const flagged = e.flags.includes('missing_confirm');
        const stalled = e.flags.includes('stalled');
        const deliveryIssue = e.flags.includes('delivery_issue');
        const pickupIssue = e.flags.includes('pickup_issue');
        return (
          <li key={e.id} className="relative animate-pop pb-4 pl-11 last:pb-0">
            {!last && <span className="absolute left-[17px] top-9 -bottom-0 w-px bg-gray-200" aria-hidden="true" />}
            <span className={`absolute left-0 top-1 grid h-9 w-9 place-items-center rounded-full ring-2 ${latest ? 'bg-vt text-white ring-red-200' : tone}`}>
              {latest && !state.finished && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-vt" aria-hidden="true" />}
              <Icon name={eventIcon(e)} className="relative h-[18px] w-[18px]" />
            </span>

            <button
              type="button"
              onClick={() => onSelect(e)}
              className={`block w-full rounded-lg border p-3 text-left transition hover:border-vt hover:shadow-md ${latest ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white'}`}
              aria-label={`${e.title}, ${label}. Bấm để xem chi tiết`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[12px] font-bold tabular-nums text-gray-500">{label}</span>
                {latest && <Badge className="bg-vt text-white">Mới nhất</Badge>}
                {e.handover && <Badge className="bg-violet-100 text-violet-700">Bàn giao</Badge>}
                {e.photo && <Badge className="bg-sky-100 text-sky-700">Có ảnh</Badge>}
                {flagged && <Badge className="bg-amber-100 text-amber-800">Thiếu mốc xác nhận</Badge>}
                {stalled && <Badge className="bg-red-100 text-red-700">Đứng yên &gt; 12h</Badge>}
                {deliveryIssue && <Badge className="bg-amber-100 text-amber-800">Chưa xác nhận nhận hàng</Badge>}
                {pickupIssue && <Badge className="bg-amber-100 text-amber-800">Chưa lấy hàng</Badge>}
              </div>
              <p className="m-0 mt-1 text-[14px] font-bold leading-snug text-gray-900">{e.title}</p>
              {e.detail && <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-gray-600">{e.detail}</p>}
              <p className="m-0 mt-1.5 flex items-start gap-1 text-[12px] leading-snug text-gray-600">
                <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>{e.placeName}</span>
              </p>
              {e.actor && (
                <p className="m-0 mt-0.5 flex items-start gap-1 text-[12px] leading-snug text-gray-600">
                  <Icon name="user" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span>
                    {e.actor.role}: <b className="font-semibold text-gray-800">{e.actor.name}</b>
                    {e.actor.code ? ` (${e.actor.code})` : ''}
                  </span>
                </p>
              )}
              <p className="m-0 mt-0.5 flex items-center gap-1 font-mono text-[11px] text-gray-400">
                <Icon name="nav" className="h-3 w-3" />
                GPS {fmtCoord(e.lat, e.lng)}
              </p>
              {e.photo && <Photo event={{ ...e, timeLabel: label }} className="mt-2 w-44 max-w-full" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
