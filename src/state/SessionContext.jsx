import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SessionCtx } from './contexts.js';

// Phiên khảo sát lưu trong sessionStorage: refresh vẫn giữ, đóng tab thì bắt đầu phiên mới.
// Thêm `?reset=1` vào URL để xóa phiên (dùng khi nhiều người dùng chung một máy).
// v3: người dùng tự chọn và chuyển qua lại giữa hai giao diện, xem các đơn theo thứ tự bất kỳ.
const KEY = 'vtp-demo-session-v3';

/** Giao diện mở ở lần tra cứu đầu tiên (giống trang tra cứu thật); sau đó người dùng tự chuyển. */
export const DEFAULT_MODE = 'current';

const uid = () =>
  (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));

function newSession() {
  return {
    id: uid(),
    mode: DEFAULT_MODE, // giao diện đang xem: 'current' | 'new'
    firstMode: null, // giao diện người dùng thực sự xem đầu tiên (khi có đơn hiển thị)
    seen: { current: false, new: false }, // đã xem một đơn ở giao diện này chưa
    switches: 0, // số lần chuyển giao diện
    timeMs: { current: 0, new: 0 }, // thời gian xem đơn ở mỗi giao diện
    codes: [], // các mã đơn đã tra cứu, theo thứ tự lần đầu xem
    notifPref: null, // chế độ thông báo người dùng tự chọn: 120 ("Báo đầy đủ") | 'status'; null = chưa đổi (mặc định đầy đủ)
    screen: 'tracking', // 'tracking' | 'evaluation' | 'thanks'
    submitted: false,
    startedAt: new Date().toISOString(),
  };
}

function load() {
  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get('reset') === '1') {
      sessionStorage.removeItem(KEY);
      params.delete('reset');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.id && s.seen && s.timeMs) return s;
    }
  } catch {
    /* sessionStorage có thể bị chặn — dùng phiên trong bộ nhớ */
  }
  return newSession();
}

export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(load);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* bỏ qua */
    }
  }, [session]);

  /** Chuyển giao diện (nút gạt "Giao diện hiện tại | Giao diện mới"). */
  const setMode = useCallback((mode) => {
    setSession((s) => (s.mode === mode ? s : { ...s, mode, switches: s.switches + 1 }));
  }, []);

  /** Ghi nhận người dùng đang thực sự xem một đơn ở giao diện hiện tại. */
  const markSeen = useCallback((mode, code) => {
    setSession((s) => {
      const seenChanged = !s.seen[mode];
      const codeNew = code && !s.codes.includes(code);
      if (!seenChanged && !codeNew && s.firstMode) return s;
      return {
        ...s,
        seen: seenChanged ? { ...s.seen, [mode]: true } : s.seen,
        firstMode: s.firstMode || mode,
        codes: codeNew ? [...s.codes, code] : s.codes,
      };
    });
  }, []);

  /** Người dùng chọn chế độ thông báo — áp dụng cho mọi đơn trong phiên và ghi vào Sheet. */
  const setNotifPref = useCallback((pref) => {
    setSession((s) => (s.notifPref === pref ? s : { ...s, notifPref: pref }));
  }, []);

  /** Cộng thời gian xem (ms) cho một giao diện. */
  const addTime = useCallback((mode, ms) => {
    setSession((s) => ({ ...s, timeMs: { ...s.timeMs, [mode]: (s.timeMs[mode] || 0) + ms } }));
  }, []);

  const goEvaluation = useCallback(() => {
    setSession((s) => ({ ...s, screen: 'evaluation' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const backToTracking = useCallback(() => {
    setSession((s) => ({ ...s, screen: 'tracking' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const markSubmitted = useCallback((localOnly = false) => {
    setSession((s) => ({ ...s, submitted: true, localOnly: Boolean(localOnly), screen: 'thanks' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const restart = useCallback(() => {
    setSession(newSession());
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(
    () => ({
      session,
      mode: session.screen === 'tracking' ? session.mode : null,
      canEvaluate: session.seen.current && session.seen.new,
      setMode,
      markSeen,
      addTime,
      setNotifPref,
      goEvaluation,
      backToTracking,
      markSubmitted,
      restart,
    }),
    [session, setMode, markSeen, addTime, setNotifPref, goEvaluation, backToTracking, markSubmitted, restart],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
