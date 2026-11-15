import { useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { InterfaceThumb } from './InterfaceThumb.jsx';
import { useSession } from '../../state/SessionContext.jsx';
import { CHOICE_OPTIONS, SURVEY_QUESTIONS, SURVEY_TEXT } from '../../config/surveyQuestions.js';
import { submitResult } from '../../lib/submitResult.js';

function ChoiceCard({ opt, selected, onSelect }) {
  return (
    <label
      className={`relative block cursor-pointer rounded-xl border-2 bg-white p-3 transition sm:p-4 ${
        selected ? 'border-vt shadow-[0_0_0_4px_rgba(238,0,51,.12)]' : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      <input type="radio" name="choice" value={opt.value} checked={selected} onChange={() => onSelect(opt.value)} className="peer sr-only" />
      <span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600" />
      <InterfaceThumb kind={opt.value} />
      <div className="mt-3 flex items-start gap-3">
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${selected ? 'border-vt bg-vt text-white' : 'border-gray-300 bg-white text-transparent'}`}>
          <Icon name="check" className="h-4 w-4" strokeWidth={3.5} />
        </span>
        <div>
          <p className="m-0 text-[16px] font-extrabold leading-snug text-gray-900">{opt.title}</p>
          <p className="m-0 mt-0.5 text-[13px] leading-snug text-gray-500">{opt.desc}</p>
        </div>
      </div>
    </label>
  );
}

function ScoreRow({ q, index, value, onChange, invalid }) {
  return (
    <fieldset className={`m-0 rounded-lg border p-3 sm:p-4 ${invalid ? 'border-vt bg-red-50/40' : 'border-gray-200 bg-white'}`}>
      <legend className="sr-only">{q.text}</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[15px] font-semibold leading-snug text-gray-900">
          <span className="mr-2 text-gray-400">{index + 1}.</span>
          {q.text}
        </p>
        <div className="flex gap-2" role="radiogroup" aria-label={q.text}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name={q.id} value={n} checked={value === n} onChange={() => onChange(q.id, n)} className="peer sr-only" />
              <span
                className={`grid h-11 w-11 place-items-center rounded-full border-2 text-[16px] font-extrabold transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 sm:h-12 sm:w-12 ${
                  value === n ? 'border-vt bg-vt text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-vt hover:text-vt'
                }`}
              >
                {n}
              </span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

const MODE_NAME = { current: 'Hiện tại', new: 'Mới' };
const fmtDur = (ms) => {
  const sec = Math.round((ms || 0) / 1000);
  const m = Math.floor(sec / 60);
  return m ? `${m} phút ${String(sec % 60).padStart(2, '0')} giây` : `${sec} giây`;
};

/** Mô tả cách người dùng đã xem, ghi vào cột "Thứ tự đã xem" của Google Sheet. */
function describeViewing(s) {
  const first = s.firstMode ? `${MODE_NAME[s.firstMode]} trước` : 'Chưa xem';
  const notif = s.notifPref === 'status' ? 'chỉ khi đổi trạng thái' : s.notifPref == null ? 'đầy đủ (mặc định)' : 'đầy đủ';
  return `${first} · chuyển ${s.switches} lần · hiện tại ${fmtDur(s.timeMs.current)} / mới ${fmtDur(s.timeMs.new)} · thông báo: ${notif}`;
}

function BackButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[14px] font-bold text-gray-600 transition hover:text-vt"
    >
      <Icon name="arrow" className="h-4 w-4 rotate-180" /> {label}
    </button>
  );
}

/** Màn đánh giá: chọn 1 trong 2 giao diện + chấm điểm 1–5, rồi gửi vào Google Sheet. */
export function EvaluationScreen() {
  const { session, markSubmitted, backToTracking } = useSession();
  const [choice, setChoice] = useState('');
  const [scores, setScores] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [showErrors, setShowErrors] = useState(false);

  const missing = SURVEY_QUESTIONS.filter((q) => !scores[q.id]);
  const ready = Boolean(choice) && missing.length === 0;

  const setScore = (id, n) => setScores((s) => ({ ...s, [id]: n }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (session.submitted || status === 'sending') return; // không gửi lại trong cùng phiên
    if (!ready) {
      setShowErrors(true);
      return;
    }
    setStatus('sending');
    const now = new Date();
    const payload = {
      timestamp: now.toISOString(),
      localTime: now.toLocaleString('vi-VN'),
      sessionId: session.id,
      choice,
      choiceLabel: CHOICE_OPTIONS.find((o) => o.value === choice)?.title || choice,
      scores,
      questions: Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.id, q.text])),
      // cột "Thứ tự đã xem": giao diện mở đầu tiên, số lần chuyển, thời gian xem mỗi giao diện
      order: describeViewing(session),
      demoCode: session.codes.join(', '), // các đơn đã xem, theo thứ tự lần đầu mở
    };
    try {
      const res = await submitResult(payload);
      markSubmitted(res.local);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="mx-auto max-w-[1000px] px-[15px] pb-14">
      <BackButton onClick={backToTracking} label="Quay lại tra cứu đơn hàng" />
      <form onSubmit={onSubmit} noValidate>
        <h2 className="m-0 text-[22px] font-extrabold text-gray-900">{SURVEY_TEXT.choiceTitle}</h2>
        <p className="mb-4 mt-1 text-[14px] text-gray-500">{SURVEY_TEXT.choiceHint}</p>
        <div role="radiogroup" aria-label={SURVEY_TEXT.choiceTitle} className="grid gap-4 sm:grid-cols-2">
          {CHOICE_OPTIONS.map((o) => (
            <ChoiceCard key={o.value} opt={o} selected={choice === o.value} onSelect={setChoice} />
          ))}
        </div>
        {showErrors && !choice && (
          <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-vt">Vui lòng chọn một giao diện.</p>
        )}

        <h2 className="m-0 mt-10 text-[22px] font-extrabold text-gray-900">{SURVEY_TEXT.scoresTitle}</h2>
        <p className="mb-1 mt-1 text-[14px] text-gray-500">{SURVEY_TEXT.scoresHint}</p>
        <p className="mb-4 flex flex-wrap justify-between gap-2 text-[12px] font-semibold text-gray-400">
          <span>{SURVEY_TEXT.scaleMin}</span>
          <span>{SURVEY_TEXT.scaleMax}</span>
        </p>
        <div className="space-y-3">
          {SURVEY_QUESTIONS.map((q, i) => (
            <ScoreRow key={q.id} q={q} index={i} value={scores[q.id]} onChange={setScore} invalid={showErrors && !scores[q.id]} />
          ))}
        </div>
        {showErrors && missing.length > 0 && (
          <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-vt">Vui lòng chấm điểm cho tất cả các câu ({missing.length} câu còn thiếu).</p>
        )}

        {status === 'error' && (
          <p role="alert" className="m-0 mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
            Chưa gửi được đánh giá (lỗi kết nối). Vui lòng kiểm tra mạng rồi bấm gửi lại.
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="submit"
            disabled={status === 'sending' || session.submitted}
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-vt px-8 py-3.5 text-[16px] font-extrabold text-white shadow transition hover:bg-vt-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'sending' ? 'Đang gửi…' : SURVEY_TEXT.submit}
            {status !== 'sending' && <Icon name="send" className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ThanksScreen() {
  const { session, backToTracking } = useSession();
  const showNote = session.localOnly && (import.meta.env.DEV || new URLSearchParams(window.location.search).get('admin') === '1');
  return (
    <section className="mx-auto max-w-[640px] px-[15px] pb-20 pt-4 text-center">
      <div className="animate-pop rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white">
          <Icon name="check" className="h-9 w-9" strokeWidth={3} />
        </span>
        <h2 className="m-0 text-[24px] font-extrabold text-emerald-900">{SURVEY_TEXT.thanks}</h2>
        <p className="mb-0 mt-2 text-[15px] text-emerald-800">Câu trả lời của bạn đã được ghi nhận.</p>
        <button
          type="button"
          onClick={backToTracking}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-vt px-6 py-3 text-[15px] font-extrabold text-white shadow transition hover:bg-vt-dark"
        >
          <Icon name="search" className="h-5 w-5" /> Quay lại tra cứu đơn hàng
        </button>
        <p className="mb-0 mt-2 text-[12.5px] text-emerald-800/80">Bạn có thể tiếp tục xem các đơn và hai giao diện; đánh giá chỉ gửi một lần.</p>
      </div>
      {showNote && (
        <p className="mt-4 text-[12px] text-gray-500">
          (Dành cho người trình bày: chưa đặt <code>VITE_APPS_SCRIPT_URL</code> nên kết quả chỉ được lưu tạm trong trình duyệt này.)
        </p>
      )}
    </section>
  );
}
