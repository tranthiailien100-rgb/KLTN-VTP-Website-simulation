import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useSim } from '../../state/SimContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { useSession } from '../../state/SessionContext.jsx';
import { TrackingMap } from './TrackingMap.jsx';
import { Timeline } from './Timeline.jsx';
import { EventModal } from './Modals.jsx';
import { SimControls } from './SimControls.jsx';
import { selectEta, selectLastMile, selectPosition, selectStageIndex, selectStageLabels, selectStatusText } from '../../sim/engine.js';
import { fmtClock, fmtDay, fmtDistance, fmtDuration } from '../../sim/format.js';
import { COURIER, ORDER_INFO } from '../../config/journeys.js';

// Hai chế độ thông báo, khác nhau THẤY ĐƯỢC trong demo (2 giờ / 3 giờ không ai cảm nhận được trong ~25 giây).
const FREQ_OPTIONS = [
  { value: 120, label: 'Báo đầy đủ', hint: 'Mọi mốc mới + nhắc vị trí khi lâu không có cập nhật (ngoài đời: mỗi 2 giờ).' },
  { value: 'status', label: 'Chỉ khi đổi trạng thái', hint: 'Chỉ báo khi đơn sang bước mới trên thanh tiến trình (lấy hàng, nhập bưu cục, trung chuyển, đang giao, hoàn tất).' },
];

const BANNER_TONE = {
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  red: 'border-red-300 bg-red-50 text-red-900',
  green: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  sky: 'border-sky-300 bg-sky-50 text-sky-900',
};

function AlertBanner({ tone, icon, title, children, action }) {
  return (
    <div role="status" className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 animate-pop ${BANNER_TONE[tone]}`}>
      <Icon name={icon} className="h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[14px] font-extrabold leading-snug">{title}</p>
        {children && <p className="m-0 mt-0.5 text-[13px] leading-snug opacity-90">{children}</p>}
      </div>
      {action}
    </div>
  );
}

function StageBar({ labels, current, finished }) {
  return (
    <ol className="m-0 flex list-none items-start p-0" aria-label="Tiến trình đơn hàng">
      {labels.map((l, i) => {
        const done = i < current || (finished && i === current);
        const active = i === current && !finished;
        return (
          <li key={l} className="flex min-w-0 flex-1 flex-col items-center text-center sm:min-w-[78px]">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || active ? 'bg-vt' : 'bg-gray-200'}`} />
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ring-2 sm:h-7 sm:w-7 sm:text-[12px] ${
                  done ? 'bg-vt text-white ring-vt' : active ? 'bg-white text-vt ring-vt' : 'bg-white text-gray-400 ring-gray-200'
                }`}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === labels.length - 1 ? 'opacity-0' : done ? 'bg-vt' : 'bg-gray-200'}`} />
            </div>
            <span className={`mt-1.5 px-0.5 text-[10px] font-bold leading-tight sm:px-1 sm:text-[11.5px] ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** GIAO DIỆN TRACKING MỚI: realtime, bản đồ hai cấp, ảnh bằng chứng, thông báo chủ động. */
export function RealtimeResult() {
  const sim = useSim();
  const { showInfo } = useToast();
  const { setNotifPref } = useSession();
  const st = sim.state;
  const [view, setView] = useState('route');
  const [selected, setSelected] = useState(null);
  const autoSwitched = useRef(false);
  const lmStarted = Boolean(st && st.events.some((e) => e.stepId === 'out_for_delivery'));

  useEffect(() => {
    setView('route');
    autoSwitched.current = false;
    setSelected(null);
  }, [sim.runKey]);

  // Tự chuyển sang bản đồ chặng cuối khi bưu tá xuất phát (người dùng vẫn đổi tay được)
  useEffect(() => {
    if (lmStarted && !autoSwitched.current) {
      autoSwitched.current = true;
      setView('lastmile');
    }
  }, [lmStarted]);

  if (!st) return null;

  const eta = selectEta(st);
  const pos = selectPosition(st);
  const lm = selectLastMile(st);
  const labels = selectStageLabels(st);
  const stage = selectStageIndex(st);
  const status = selectStatusText(st);
  const link = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(st.code)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showInfo('Đã sao chép liên kết theo dõi');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showInfo('Đã sao chép liên kết theo dõi'); } catch { showInfo(link); }
      ta.remove();
    }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Theo dõi đơn ${st.code}`, text: 'Theo dõi đơn hàng của tôi (bản demo)', url: link }); return; } catch { /* người dùng hủy */ }
    }
    copyLink();
  };

  const stalled = st.flags.stalled;
  const missing = st.flags.missingPickup;
  const deliveryIssue = st.flags.deliveryIssue;
  const dismissed = st.prompt && st.prompt.status === 'dismissed';
  const dismissedDelivery = dismissed && st.prompt.kind === 'delivery';
  const otpMasked = st.otp ? `••${st.otp.code.slice(-2)}` : '';

  return (
    <section className="mx-auto mt-2 max-w-[1280px] space-y-4 px-[15px] pb-10">
      {/* ---------- Tóm tắt ---------- */}
      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
            <span>Mã phiếu gửi</span>
            <b className="rounded bg-gray-100 px-2 py-0.5 text-[13px] tracking-wide text-gray-900">{st.code}</b>
            <span>· {ORDER_INFO.parcel.service} · {String(ORDER_INFO.parcel.weightKg).replace('.', ',')} kg</span>
          </div>
          <h2 className="m-0 mt-2 flex items-center gap-2.5 text-[22px] font-extrabold leading-tight text-gray-900 sm:text-[26px]">
            {!st.finished && <span className="relative grid h-3 w-3 shrink-0 place-items-center"><span className="absolute inset-0 animate-pulse-ring rounded-full bg-vt" /><span className="relative h-3 w-3 rounded-full bg-vt" /></span>}
            {st.finished && <Icon name="check" className="h-7 w-7 text-emerald-600" strokeWidth={3} />}
            {status}
          </h2>
          <p className="m-0 mt-2 flex items-start gap-1.5 text-[14px] leading-snug text-gray-600">
            <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-vt" />
            <span>{pos.sentence}</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[300px] lg:items-end">
          <div className="lg:text-right">
            <p className="m-0 text-[12px] font-bold uppercase tracking-wide text-gray-400">{eta.done ? 'Đã giao lúc' : 'Giờ giao dự kiến'}</p>
            <p className="m-0 text-[26px] font-extrabold leading-tight tabular-nums text-gray-900">
              {fmtClock(st.startMs, eta.etaT)} <span className="text-[15px] font-bold text-gray-500">· {fmtDay(st.startMs, eta.etaT)}</span>
            </p>
            {eta.delayMin > 0 && !eta.done && (
              <p className="m-0 mt-1 inline-flex max-w-[360px] items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-left text-[12.5px] leading-snug text-amber-900 ring-1 ring-amber-200">
                <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <b>Chậm khoảng {fmtDuration(eta.delayMin)}</b> so với dự kiến ban đầu ({fmtClock(st.startMs, eta.baseEtaT)} · {fmtDay(st.startMs, eta.baseEtaT)}). Lý do: {eta.reasons.join('; ')}.
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-bold text-gray-700 transition hover:border-vt hover:text-vt">
              <Icon name="copy" className="h-4 w-4" /> Sao chép link theo dõi
            </button>
            <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-md bg-vt px-3 py-1.5 text-[13px] font-bold text-white transition hover:bg-vt-dark">
              <Icon name="share" className="h-4 w-4" /> Chia sẻ cho người nhận
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Tiến trình ---------- */}
      <div className="rounded-xl border border-gray-200 bg-white px-2 py-4 shadow-sm sm:px-4">
        <StageBar labels={labels} current={stage} finished={st.finished} />
      </div>

      {/* ---------- Cảnh báo ---------- */}
      {dismissed && (
        <AlertBanner
          tone="amber"
          icon="help"
          title={dismissedDelivery ? 'Người nhận chưa xác nhận đã nhận được hàng' : `Bạn chưa xác nhận đã giao hàng cho bưu tá ${st.prompt.shipper.name}`}
          action={<button type="button" onClick={sim.reopenPrompt} className="rounded-md bg-amber-600 px-3 py-1.5 text-[13px] font-extrabold text-white hover:bg-amber-700">Xác nhận ngay</button>}
        >
          {dismissedDelivery
            ? 'Nếu không có xác nhận, đơn sẽ không được tính là hoàn tất và CSKH sẽ liên hệ người nhận.'
            : 'Nếu không xác nhận, bưu cục quét nhập sẽ bị gắn cờ “Thiếu mốc xác nhận”.'}
        </AlertBanner>
      )}
      {st.otp && !st.finished && !deliveryIssue && (
        <AlertBanner tone="sky" icon="lock" title={st.deliveryConfirmed ? 'Mã nhận hàng đã khớp' : `Bưu tá đã đến — đã gửi mã nhận hàng (${otpMasked}) cho người nhận`}>
          {st.deliveryConfirmed
            ? 'Bưu tá đã nhập đúng mã người nhận cung cấp. Hệ thống đang gửi biên nhận giao hàng cho bạn và người nhận.'
            : `GPS bưu tá trùng địa chỉ người nhận nên mã mới được gửi tới ${ORDER_INFO.receiver.name} (${ORDER_INFO.receiver.phone}). Người nhận kiểm tra hàng rồi cung cấp mã cho bưu tá nhập vào app — mã khớp mới ghi “giao thành công”.`}
        </AlertBanner>
      )}
      {st.flags.repickup && (
        <AlertBanner tone="amber" icon="alert" title="Bạn báo chưa giao hàng — bưu tá sẽ quay lại lấy">
          {st.hold && st.hold.kind === 'cskh_pickup'
            ? 'CSKH đang liên hệ bưu tá. Đơn chưa được tính là đã lấy hàng cho tới khi có ảnh và chữ ký của bạn.'
            : 'Bưu tá đang quay lại địa chỉ của bạn. Khi lấy hàng sẽ chụp ảnh và xin chữ ký của bạn.'}
        </AlertBanner>
      )}
      {deliveryIssue && (
        <AlertBanner tone="amber" icon="alert" title="Đơn chưa được tính là giao thành công — CSKH đang xử lý">
          Bưu tá báo đã giao nhưng chưa có xác nhận của người nhận. CSKH đang liên hệ bưu tá và người nhận để giao lại.
        </AlertBanner>
      )}
      {stalled && (
        <AlertBanner tone="red" icon="alert" title="Đơn đứng yên quá 12 giờ — Đã chuyển CSKH">
          Hệ thống không ghi nhận di chuyển trong hơn 12 giờ. CSKH đang xử lý và sẽ cập nhật cho bạn.
        </AlertBanner>
      )}
      {missing && !stalled && (
        <AlertBanner tone="amber" icon="alert" title="Thiếu mốc xác nhận — CSKH đang kiểm tra">
          {st.flow === 'B'
            ? 'Đơn đã vào kho nhưng chưa có ảnh cân hàng tại quầy. Hành trình tạm giữ cho đến khi CSKH xác minh xong.'
            : 'Đơn đã vào bưu cục nhưng chưa có mốc “đã lấy hàng”. Hành trình tạm giữ cho đến khi CSKH xác minh xong.'}
        </AlertBanner>
      )}
      {st.finished && (
        <AlertBanner tone="green" icon="check" title="Hoàn tất — người nhận đã nhận hàng">
          {st.deliverySource === 'recipient'
            ? 'Người nhận đã tự xác nhận nhận hàng và bưu tá đã tải lên ảnh giao hàng, chữ ký người nhận. Biên nhận đã gửi cho bạn và người nhận.'
            : 'Mã nhận hàng khớp, có ảnh giao hàng và chữ ký người nhận. Biên nhận đã gửi cho bạn và người nhận.'}
        </AlertBanner>
      )}

      {/* ---------- Bản đồ + hành trình + tần suất ----------
           Máy tính: bản đồ & tần suất bên trái, hành trình bên phải.
           Điện thoại (xếp chồng theo thứ tự DOM): bản đồ → hành trình → tần suất (hành trình có ảnh quan trọng hơn phần cài đặt). */}
      <div className="grid gap-4 lg:grid-cols-5 lg:grid-rows-[auto_1fr]">
        <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div role="tablist" aria-label="Cấp bản đồ" className="inline-flex rounded-lg bg-gray-100 p-1">
                {[
                  { id: 'route', label: 'Toàn tuyến', icon: 'map' },
                  { id: 'lastmile', label: 'Chặng cuối', icon: 'truck' },
                ].map((t) => {
                  const disabled = t.id === 'lastmile' && !lmStarted;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={view === t.id}
                      disabled={disabled}
                      title={disabled ? 'Mở khi bưu tá bắt đầu đi giao' : undefined}
                      onClick={() => setView(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold transition ${
                        view === t.id ? 'bg-white text-vt shadow' : 'text-gray-600 hover:text-gray-900'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <Icon name={t.icon} className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-[11.5px] text-gray-500">
                <span className="inline-flex items-center gap-1"><span className="h-1 w-5 rounded bg-vt" />Đã đi</span>
                <span className="inline-flex items-center gap-1"><span className="h-0 w-5 border-t-2 border-dashed border-slate-400" />Sắp tới</span>
              </div>
            </div>

            <div className="relative">
              <TrackingMap view={view} state={st} />
              {view === 'lastmile' && lm ? (
                <div className="absolute bottom-3 left-3 z-[800] max-w-[calc(100%-24px)] rounded-lg bg-white/95 px-3 py-2 text-[12.5px] shadow-lg ring-1 ring-black/10 backdrop-blur">
                  <p className="m-0 font-extrabold text-gray-900">{COURIER.name} <span className="font-semibold text-gray-500">· {COURIER.code}</span></p>
                  {lm.delivered ? (
                    <p className="m-0 mt-0.5 text-emerald-700">Đã giao hàng thành công lúc <b className="tabular-nums">{fmtClock(st.startMs, lm.etaT)}</b></p>
                  ) : lm.etaT == null && lm.remainingM < 50 ? (
                    <p className="m-0 mt-0.5 text-sky-700">Đã đến địa chỉ người nhận · đang chờ người nhận cung cấp mã</p>
                  ) : lm.etaT == null ? (
                    <p className="m-0 mt-0.5 text-amber-700">
                      Bưu tá đang dừng, cách địa chỉ người nhận <b className="tabular-nums">{fmtDistance(lm.remainingM)}</b>
                    </p>
                  ) : (
                    <p className="m-0 mt-0.5 text-gray-700">
                      Còn <b className="tabular-nums">{fmtDistance(lm.remainingM)}</b> · giao dự kiến <b className="tabular-nums">{fmtClock(st.startMs, lm.etaT)}</b>
                    </p>
                  )}
                </div>
              ) : (
                <div className="absolute bottom-3 left-3 z-[800] max-w-[calc(100%-24px)] rounded-lg bg-white/95 px-3 py-2 text-[12.5px] leading-snug text-gray-700 shadow-lg ring-1 ring-black/10 backdrop-blur">
                  {pos.sentence}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 flex items-center gap-2 text-[16px] font-extrabold text-gray-900">
                <Icon name="list" className="h-4 w-4 text-vt" /> Hành trình đơn hàng
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{st.events.length} mốc</span>
            </div>
            <div className="slim-scroll max-h-[520px] overflow-y-auto pr-1 lg:max-h-[780px]">
              <Timeline state={st} onSelect={setSelected} />
            </div>
          </div>
        </div>

        <div className="self-start lg:col-span-3 lg:col-start-1 lg:row-start-2">
          {/* Tần suất thông báo */}
          <fieldset className="m-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <legend className="float-left mb-2 flex items-center gap-2 p-0 text-[14px] font-extrabold text-gray-900">
              <Icon name="bell" className="h-4 w-4 text-vt" /> Thông báo cho tôi
            </legend>
            <div className="clear-both flex flex-wrap gap-2">
              {FREQ_OPTIONS.map((o) => (
                <label
                  key={String(o.value)}
                  className={`flex min-w-0 flex-1 basis-[220px] cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition ${
                    st.freq === o.value ? 'border-vt bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="freq"
                    className="mt-1 accent-[#ee0033]"
                    checked={st.freq === o.value}
                    onChange={() => {
                      sim.setFreq(o.value);
                      setNotifPref(o.value);
                    }}
                  />
                  <span>
                    <span className={`block text-[13px] font-bold ${st.freq === o.value ? 'text-vt' : 'text-gray-800'}`}>{o.label}</span>
                    <span className="block text-[12px] leading-snug text-gray-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="m-0 mt-2 text-[12px] leading-snug text-gray-500">
              Gửi qua Zalo/SMS (mô phỏng). Cảnh báo quan trọng (thiếu xác nhận, đơn đứng yên, giao chậm, mã nhận hàng) luôn được gửi.
            </p>
          </fieldset>
        </div>
      </div>

      <SimControls />
      <EventModal event={selected} startMs={st.startMs} onClose={() => setSelected(null)} />
    </section>
  );
}
