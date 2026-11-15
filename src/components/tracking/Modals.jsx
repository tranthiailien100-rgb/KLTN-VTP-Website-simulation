import { useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { Photo } from '../ui/Photo.jsx';
import { useSim } from '../../state/SimContext.jsx';
import { fmtDateTime, fmtCoord } from '../../sim/format.js';
import { eventIcon } from './Timeline.jsx';
import { ORDER_INFO } from '../../config/journeys.js';

/**
 * Hộp hỏi xác nhận hai chiều.
 *  - kind 'pickup'  : hỏi người gửi "Bạn đã giao hàng cho bưu tá X chưa?"
 *  - kind 'delivery': hỏi người nhận "Bạn đã nhận được hàng chưa?" (người tham gia trả lời thay người nhận)
 */
export function ConfirmModal() {
  const sim = useSim();
  const st = sim.state;
  const open = Boolean(st && st.prompt && st.prompt.status === 'open');
  const firstBtn = useRef(null);
  const { setModalPaused, dismissPrompt, answerPrompt } = sim;

  // Đồng hồ mô phỏng tạm dừng trong lúc người dùng suy nghĩ
  useEffect(() => {
    setModalPaused(open);
    if (open && firstBtn.current) firstBtn.current.focus();
    return () => setModalPaused(false);
  }, [open, setModalPaused]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && dismissPrompt();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissPrompt]);

  if (!open) return null;
  const shipper = st.prompt.shipper;
  const when = fmtDateTime(st.startMs, st.prompt.openedAt);
  const delivery = st.prompt.kind === 'delivery';

  const text = delivery
    ? {
        eyebrow: 'Câu hỏi gửi tới người nhận',
        title: 'Bạn đã nhận được hàng chưa?',
        body: (
          <>
            Bưu tá <b>{shipper.name}</b> ({shipper.code}) báo đã giao lúc <b className="tabular-nums">{when}</b>, nhưng vị trí GPS lúc báo giao cách địa chỉ của bạn
            khoảng 1,3 km.
          </>
        ),
        note: 'Nếu bạn đã nhận, bưu tá vẫn phải tải lên ảnh giao hàng và chữ ký bạn đã ký lúc nhận. Nếu chưa nhận hoặc không trả lời, đơn không được tính là hoàn tất và CSKH sẽ liên hệ lại.',
        yes: 'Đã nhận được hàng',
        no: 'Chưa nhận được',
      }
    : {
        eyebrow: 'Cần xác nhận từ bạn',
        title: `Bạn đã giao hàng cho bưu tá ${shipper.name} chưa?`,
        body: (
          <>
            Hệ thống ghi nhận bưu tá <b>{shipper.name}</b> ({shipper.code}) đã rời địa chỉ lấy hàng lúc <b className="tabular-nums">{when}</b> nhưng chưa có ảnh xác
            nhận lấy hàng.
          </>
        ),
        note: 'Đã giao: ghi nhận mốc lấy hàng, bưu tá tải lên ảnh và chữ ký sau. Chưa giao: bưu tá sẽ quay lại lấy hàng.',
        yes: 'Đã giao hàng',
        no: 'Chưa giao',
      };

  return (
    <div className="fixed inset-0 z-[1150] grid place-items-center bg-black/55 p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md animate-pop rounded-xl bg-white p-6 shadow-2xl">
        {delivery && (
          <p className="-mt-1 mb-3 rounded-md bg-sky-50 px-3 py-2 text-[12.5px] leading-snug text-sky-900 ring-1 ring-sky-200">
            <b>Bạn đang trả lời thay người nhận</b> ({ORDER_INFO.receiver.name}). Ngoài đời, câu hỏi này được gửi tới điện thoại người nhận qua Zalo/SMS.
          </p>
        )}
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
            <Icon name={delivery ? 'box' : 'help'} className="h-6 w-6" />
          </span>
          <div>
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-wide text-amber-600">{text.eyebrow}</p>
            <h2 id="confirm-title" className="m-0 text-[18px] font-extrabold leading-snug text-gray-900">
              {text.title}
            </h2>
          </div>
        </div>
        <p className="mb-1 text-[14px] leading-relaxed text-gray-600">{text.body}</p>
        {delivery && (
          <p className="my-3 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-[13px] leading-snug text-gray-600">
            <Icon name="lock" className="h-5 w-5 shrink-0 text-vt" />
            <span>
              <b className="text-gray-800">Hệ thống chưa gửi mã nhận hàng</b> vì vị trí bưu tá không khớp địa chỉ của bạn. Mã chỉ được gửi khi bưu tá đứng đúng
              địa chỉ nhận hàng.
            </span>
          </p>
        )}
        <p className="mb-5 text-[13px] text-gray-500">{text.note}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button ref={firstBtn} type="button" onClick={() => answerPrompt('yes')} className="flex-1 rounded-lg bg-vt px-4 py-2.5 text-[14px] font-extrabold text-white transition hover:bg-vt-dark">
            {text.yes}
          </button>
          <button type="button" onClick={() => answerPrompt('no')} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-extrabold text-gray-700 transition hover:border-vt hover:text-vt">
            {text.no}
          </button>
        </div>
        <button type="button" onClick={dismissPrompt} className="mx-auto mt-3 block text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline">
          Để sau
        </button>
      </div>
    </div>
  );
}

/** Chi tiết một mốc: ảnh phóng to, người phụ trách, GPS. */
export function EventModal({ event, startMs, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!event) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    if (closeRef.current) closeRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [event, onClose]);

  if (!event) return null;
  const label = fmtDateTime(startMs, event.t);
  return (
    <div className="fixed inset-0 z-[1150] grid place-items-center overflow-y-auto bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="relative my-6 w-full max-w-2xl animate-pop rounded-xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100">
          <Icon name="x" className="h-5 w-5" />
        </button>

        <div className="mb-3 flex items-start gap-3 pr-10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-vt">
            <Icon name={eventIcon(event)} className="h-5 w-5" />
          </span>
          <div>
            <p className="m-0 text-[12px] font-bold tabular-nums text-gray-500">{label}</p>
            <h3 className="m-0 text-[18px] font-extrabold leading-snug text-gray-900">{event.title}</h3>
          </div>
        </div>

        {event.photo ? (
          <Photo event={{ ...event, timeLabel: label }} large className="mb-4" />
        ) : (
          <p className="mb-4 rounded-lg bg-gray-50 px-3 py-4 text-center text-[13px] text-gray-500">Mốc này không có ảnh đính kèm.</p>
        )}

        {event.detail && <p className="mb-3 text-[14px] leading-relaxed text-gray-700">{event.detail}</p>}

        <dl className="m-0 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">Địa điểm</dt>
            <dd className="m-0 font-semibold text-gray-800">{event.placeName}</dd>
          </div>
          {event.actor && (
            <div>
              <dt className="text-gray-400">Người / đơn vị phụ trách</dt>
              <dd className="m-0 font-semibold text-gray-800">
                {event.actor.role}: {event.actor.name}
                {event.actor.code ? ` (${event.actor.code})` : ''}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Vị trí GPS</dt>
            <dd className="m-0 font-mono font-semibold text-gray-800">{fmtCoord(event.lat, event.lng)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Loại mốc</dt>
            <dd className="m-0 font-semibold text-gray-800">{event.handover ? 'Bàn giao hàng (có bằng chứng)' : 'Cập nhật hành trình'}</dd>
          </div>
        </dl>
        <p className="mb-0 mt-4 text-[11px] text-gray-400">Ảnh và dữ liệu trong bản demo đều là minh họa, không phải dữ liệu thật.</p>
      </div>
    </div>
  );
}
