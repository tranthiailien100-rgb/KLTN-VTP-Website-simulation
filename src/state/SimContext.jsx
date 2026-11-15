import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { SimCtx } from './contexts.js';
import { simReducer, clockWarp, DEFAULT_FREQ } from '../sim/engine.js';
import { makeSimStart } from '../sim/format.js';

// Tốc độ cơ bản (phút mô phỏng / giây thực) và nhịp từng chặng: src/config/pacing.js
import { DEFAULT_SPEED } from '../config/pacing.js';

export { DEFAULT_SPEED };
export const SPEED_OPTIONS = [
  { label: '0,5×', value: 25 },
  { label: '1×', value: DEFAULT_SPEED },
  { label: '2×', value: 100 },
  { label: '4×', value: 200 },
];

export const useSim = () => useContext(SimCtx);

// ----------------------------------------------------------------------------
// Mỗi mã đơn có một bản mô phỏng RIÊNG (runs[code]) và giữ nguyên tiến độ khi người dùng
// chuyển sang đơn khác. Chỉ đơn đang xem (active) mới chạy đồng hồ; các đơn khác tạm dừng.
// Hai giao diện (cũ / mới) chỉ là hai cách hiển thị CÙNG một bản mô phỏng.
// ----------------------------------------------------------------------------
const EMPTY = { active: null, last: null, runs: {}, cfgs: {}, seq: 0 };

function multiReducer(w, action) {
  switch (action.type) {
    case 'START': {
      const { cfg } = action;
      const seq = w.seq + 1;
      const st = { ...simReducer(null, { type: 'START', cfg }), runId: `${cfg.code}#${seq}` };
      return { ...w, seq, active: cfg.code, last: cfg.code, runs: { ...w.runs, [cfg.code]: st }, cfgs: { ...w.cfgs, [cfg.code]: cfg } };
    }
    case 'SELECT':
      if (!w.runs[action.code]) return w;
      return { ...w, active: action.code, last: action.code };
    case 'STOP': // rời màn tra cứu: dừng đồng hồ nhưng giữ tiến độ các đơn
      return w.active ? { ...w, active: null } : w;
    case 'RESET_ALL':
      return { ...EMPTY, seq: w.seq };
    default: {
      const cur = w.active && w.runs[w.active];
      if (!cur) return w;
      const next = simReducer(cur, action);
      if (next === cur) return w;
      return { ...w, runs: { ...w.runs, [w.active]: { ...next, runId: cur.runId } } };
    }
  }
}

export function SimProvider({ children }) {
  const [w, dispatch] = useReducer(multiReducer, EMPTY);
  const state = w.active ? w.runs[w.active] : null;
  const [paused, setPaused] = useState(false); // người dùng bấm "Tạm dừng"
  const [modalPaused, setModalPaused] = useState(false); // hộp hỏi xác nhận đang mở
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const stateRef = useRef(state);
  const wRef = useRef(w);
  const pausedRef = useRef(false);
  const speedRef = useRef(DEFAULT_SPEED);
  stateRef.current = state;
  wRef.current = w;
  pausedRef.current = paused || modalPaused;
  speedRef.current = speed;

  // Vòng lặp đồng hồ mô phỏng (chỉ đơn đang xem)
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const realMs = Math.min(now - last, 1000); // chặn nhảy vọt khi tab bị treo
      last = now;
      const st = stateRef.current;
      if (!st || st.finished || pausedRef.current) return;
      dispatch({ type: 'TICK', dt: (realMs / 1000) * speedRef.current * clockWarp(st) });
    }, 100);
    return () => clearInterval(id);
  }, []);

  /** Mở một đơn: đã có bản mô phỏng thì xem tiếp, chưa có thì bắt đầu mới. */
  const open = useCallback((cfg) => {
    setPaused(false);
    setModalPaused(false);
    if (wRef.current.runs[cfg.code]) dispatch({ type: 'SELECT', code: cfg.code });
    else dispatch({ type: 'START', cfg: { startMs: makeSimStart(), freq: DEFAULT_FREQ, ...cfg } });
  }, []);

  /** Chạy lại đơn đang xem từ đầu (giữ tần suất thông báo đã chọn). */
  const restart = useCallback(() => {
    const cur = wRef.current;
    const cfg = cur.active && cur.cfgs[cur.active];
    if (!cfg) return;
    const freq = cur.runs[cur.active] ? cur.runs[cur.active].freq : DEFAULT_FREQ;
    setPaused(false);
    setModalPaused(false);
    dispatch({ type: 'START', cfg: { ...cfg, startMs: makeSimStart(), freq } });
  }, []);

  const stop = useCallback(() => {
    setModalPaused(false);
    dispatch({ type: 'STOP' });
  }, []);

  /** Quay lại màn tra cứu: mở lại đơn đang xem dở. */
  const resumeLast = useCallback(() => {
    const cur = wRef.current;
    if (!cur.active && cur.last && cur.runs[cur.last]) dispatch({ type: 'SELECT', code: cur.last });
  }, []);

  const resetAll = useCallback(() => {
    setPaused(false);
    setModalPaused(false);
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const value = useMemo(
    () => ({
      state,
      runs: w.runs,
      activeCode: w.active,
      runKey: state ? state.runId : null,
      paused,
      speed,
      setSpeed,
      open,
      stop,
      restart,
      resumeLast,
      resetAll,
      togglePause: () => setPaused((p) => !p),
      setModalPaused,
      setFreq: (freq) => dispatch({ type: 'SET_FREQ', freq }),
      markRead: () => dispatch({ type: 'MARK_READ' }),
      answerPrompt: (answer) => dispatch({ type: 'PROMPT_ANSWER', answer }),
      dismissPrompt: () => dispatch({ type: 'PROMPT_DISMISS' }),
      reopenPrompt: () => dispatch({ type: 'PROMPT_REOPEN' }),
      admin: (cmd) => dispatch({ type: 'ADMIN', cmd }),
    }),
    [state, w.runs, w.active, paused, speed, open, stop, restart, resumeLast, resetAll],
  );

  return <SimCtx.Provider value={value}>{children}</SimCtx.Provider>;
}
