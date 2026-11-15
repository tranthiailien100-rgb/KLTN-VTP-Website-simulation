import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { LookupForm } from './LookupForm.jsx';
import { LegacyResult } from './LegacyResult.jsx';
import { RealtimeResult } from './RealtimeResult.jsx';
import { ConfirmModal } from './Modals.jsx';
import { useSession } from '../../state/SessionContext.jsx';
import { useSim } from '../../state/SimContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { findDemoCode, normalizeCode, CODE_LENGTH, NOT_FOUND_MESSAGE } from '../../config/demoCodes.js';
import { DEFAULT_FREQ } from '../../sim/engine.js';

const MODES = [
  { id: 'current', label: 'Giao diện tra cứu hiện tại', short: 'GD hiện tại', icon: 'list' },
  { id: 'new', label: 'Giao diện tracking mới', short: 'GD mới', icon: 'map' },
];
const modeLabel = (id) => MODES.find((m) => m.id === id).label;
// Chiều cao phần dính đầu trang (dải thông báo + menu chính chỉ dính trên màn hình lớn) + khoảng thở
const stickyOffset = () => (window.innerWidth >= 1024 ? 112 : 64);

/** Thanh trên cùng: hướng dẫn ngắn + đã xem giao diện nào + nút "Đánh giá trải nghiệm". */
function EvaluateBar() {
  const { session, canEvaluate, goEvaluation } = useSession();
  const Tick = ({ ok, children }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
      <Icon name={ok ? 'check' : 'clock'} className="h-3.5 w-3.5" strokeWidth={ok ? 3 : 2} />
      {children}
    </span>
  );
  return (
    <section className="mx-auto max-w-[1140px] px-[15px] pb-5">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14px] font-bold leading-snug text-gray-900">
            Chọn một đơn hàng bên dưới, xem ở cả hai giao diện (chuyển qua lại thoải mái), rồi cho chúng tôi biết bạn thích giao diện nào.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Tick ok={session.seen.current}>Đã xem giao diện hiện tại</Tick>
            <Tick ok={session.seen.new}>Đã xem giao diện mới</Tick>
          </div>
        </div>
        {session.submitted ? (
          <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-100 px-5 py-2.5 text-[14px] font-extrabold text-emerald-800">
            <Icon name="check" className="h-4 w-4" strokeWidth={3} /> Đã gửi đánh giá
          </span>
        ) : (
          <div className="shrink-0 sm:text-right">
            <button
              type="button"
              onClick={goEvaluation}
              disabled={!canEvaluate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vt px-5 py-2.5 text-[14px] font-extrabold text-white shadow transition hover:bg-vt-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:w-auto"
            >
              <Icon name="star" className="h-4 w-4" /> Đánh giá trải nghiệm
            </button>
            {!canEvaluate && <p className="m-0 mt-1 text-[11.5px] text-gray-500">Hãy xem thử cả hai giao diện trước khi đánh giá.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

/** Nút gạt chuyển giao diện — cùng một đơn, cùng thời điểm, chỉ đổi cách hiển thị. */
function ModeSwitch({ mode, onChange, compact = false }) {
  return (
    <div role="tablist" aria-label="Chọn giao diện" className={`inline-flex rounded-xl bg-gray-100 p-1 ${compact ? '' : 'w-full sm:w-auto'}`}>
      {MODES.map((m) => {
        const on = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(m.id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg font-extrabold transition sm:flex-none ${
              compact ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2.5 text-[14px]'
            } ${on ? 'bg-vt text-white shadow' : 'text-gray-600 hover:bg-white hover:text-vt'}`}
          >
            <Icon name={m.icon} className="h-4 w-4 shrink-0" />
            {compact ? (
              m.short
            ) : (
              <>
                <span className="sm:hidden">{m.short}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Màn tra cứu. Người dùng tự chọn đơn (theo thứ tự bất kỳ) và tự chuyển qua lại giữa
 * giao diện hiện tại và giao diện mới; hai giao diện hiển thị CÙNG một bản mô phỏng của đơn.
 */
export function TrackingScreen({ initialCode = '' }) {
  const { session, setMode, markSeen, addTime } = useSession();
  const sim = useSim();
  const st = sim.state;
  const mode = session.mode;

  const [input, setInput] = useState(() => (sim.activeCode || normalizeCode(initialCode)).slice(0, CODE_LENGTH));
  const [error, setError] = useState('');
  const switchRef = useRef(null);
  const cardsRef = useRef(null);
  const scrollToResult = useRef(false); // vừa chọn đơn → cuộn xuống kết quả sau khi hiển thị
  const [switchVisible, setSwitchVisible] = useState(true);
  const { clearNotifs } = useToast();

  // Vào lại màn tra cứu (sau khi đánh giá) → mở lại đơn đang xem dở; rời màn → dừng đồng hồ, giữ tiến độ
  const { stop, resumeLast } = sim;
  useEffect(() => {
    resumeLast();
    return () => {
      stop();
      clearNotifs(); // toast của đơn đang xem không theo sang màn đánh giá
    };
  }, [resumeLast, stop, clearNotifs]);

  // Chuyển về giao diện cũ thì dọn toast còn sót của giao diện mới
  useEffect(() => {
    if (mode === 'current') clearNotifs();
  }, [mode, clearNotifs]);

  // Sau khi chọn đơn: cuộn tới thanh chuyển giao diện (ngay trên kết quả) — nhất là trên điện thoại,
  // kết quả nằm dưới 4 thẻ đơn nên nếu không cuộn người dùng tưởng chưa có gì xảy ra
  useEffect(() => {
    if (!scrollToResult.current || !switchRef.current) return;
    scrollToResult.current = false;
    const top = switchRef.current.getBoundingClientRect().top + window.scrollY - stickyOffset();
    window.scrollTo({ top, behavior: 'smooth' });
  }, [sim.activeCode, sim.runKey]);

  // Chế độ thông báo người dùng đã chọn áp dụng cho cả đơn mở lại (mỗi đơn là một bản mô phỏng riêng)
  const { setFreq } = sim;
  const pref = session.notifPref;
  const activeFreq = st ? st.freq : null;
  useEffect(() => {
    if (pref != null && activeFreq != null && activeFreq !== pref) setFreq(pref);
  }, [pref, activeFreq, setFreq]);

  // Ô mã luôn hiện đơn đang xem
  useEffect(() => {
    if (sim.activeCode) setInput(sim.activeCode);
  }, [sim.activeCode]);

  // Ghi nhận "đã xem giao diện này" + thời gian xem mỗi giao diện (chỉ khi có đơn hiển thị và tab đang mở)
  const code = st ? st.code : null;
  useEffect(() => {
    if (code) markSeen(mode, code);
  }, [code, mode, markSeen]);
  useEffect(() => {
    if (!code) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') addTime(mode, 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [code, mode, addTime]);

  // Khi đã cuộn xuống quá nút gạt chính → hiện nút gạt nhỏ nổi ở cuối màn hình
  useEffect(() => {
    const el = switchRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    // chỉ hiện nút nổi khi đã cuộn QUA nút gạt chính (nút chính nằm phía trên màn hình)
    const io = new IntersectionObserver(([e]) => setSwitchVisible(e.isIntersecting || e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [code]);

  const handleInput = (v) => {
    setInput(v);
    if (error) setError('');
  };

  const openCode = (raw) => {
    const c = normalizeCode(raw);
    if (!c) return setError('Vui lòng nhập mã phiếu gửi.');
    if (c.length !== CODE_LENGTH) return setError(`Mã phiếu gửi gồm ${CODE_LENGTH} chữ số (bạn đã nhập ${c.length}).`);
    const d = findDemoCode(c);
    if (!d) return setError(NOT_FOUND_MESSAGE);
    setError('');
    setInput(d.code);
    if (d.code === sim.activeCode && switchRef.current) {
      // bấm lại đúng đơn đang xem → chỉ cuộn tới kết quả
      window.scrollTo({ top: switchRef.current.getBoundingClientRect().top + window.scrollY - stickyOffset(), behavior: 'smooth' });
      return null;
    }
    scrollToResult.current = true;
    sim.open({ code: d.code, flow: d.flow, scenario: d.scenario, freq: session.notifPref ?? DEFAULT_FREQ });
    return null;
  };

  const other = mode === 'new' ? 'current' : 'new';

  return (
    <>
      <EvaluateBar />
      <div ref={cardsRef} className="scroll-mt-20" />
      <LookupForm
        input={input}
        setInput={handleInput}
        onSubmit={openCode}
        onPick={openCode}
        error={error}
        runs={sim.runs}
        activeCode={sim.activeCode}
      />

      {st && (
        <section className={`mx-auto px-[15px] pb-2 ${mode === 'new' ? 'max-w-[1280px]' : 'max-w-[1140px]'}`}>
          <div ref={switchRef} className="flex flex-col gap-2 rounded-xl border-2 border-vt/20 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-[13.5px] leading-snug text-gray-700">
                Bạn đang xem đơn <b className="font-mono text-gray-900">{st.code}</b> ở <b className="text-vt">{modeLabel(mode).toLowerCase()}</b>.{' '}
                <button
                  type="button"
                  onClick={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="font-bold text-sky-700 underline-offset-2 hover:underline"
                >
                  Đổi đơn
                </button>
              </p>
              <p className="m-0 text-[12.5px] leading-snug text-gray-500">Chuyển giao diện bất cứ lúc nào để so sánh — đơn hàng vẫn chạy tiếp, không bắt đầu lại.</p>
            </div>
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
        </section>
      )}

      {st && (mode === 'new' ? <RealtimeResult /> : <LegacyResult />)}
      {mode === 'new' && <ConfirmModal />}

      {st && st.finished && (
        <section className="mx-auto max-w-[1140px] px-[15px] pb-12">
          <div className="animate-pop rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center sm:p-6">
            <p className="m-0 text-[17px] font-extrabold text-emerald-900">Đơn này đã chạy hết hành trình.</p>
            <p className="m-0 mt-1 text-[14px] text-emerald-800">
              Bạn có thể xem lại ở giao diện còn lại, chọn đơn khác, hoặc bấm “Chạy lại” để xem lại từ đầu.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode(other);
                  sim.restart();
                  window.scrollTo({ top: switchRef.current ? switchRef.current.getBoundingClientRect().top + window.scrollY - 120 : 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-vt px-5 py-2.5 text-[14px] font-extrabold text-white shadow transition hover:bg-vt-dark"
              >
                <Icon name="replay" className="h-4 w-4" /> Chạy lại đơn này ở {modeLabel(other).toLowerCase()}
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-extrabold text-gray-700 transition hover:border-vt hover:text-vt"
              >
                <Icon name="list" className="h-4 w-4" /> Chọn đơn khác / đánh giá
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Nút gạt nổi khi đã cuộn xuống xem kết quả */}
      {st && !switchVisible && (
        <div className="fixed bottom-4 left-1/2 z-[1100] -translate-x-1/2 animate-pop rounded-2xl bg-white/95 p-1.5 shadow-2xl ring-1 ring-black/10 backdrop-blur">
          <ModeSwitch mode={mode} onChange={setMode} compact />
        </div>
      )}
    </>
  );
}
