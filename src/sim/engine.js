// ============================================================================
// ENGINE MÔ PHỎNG (thuần, không phụ thuộc React) — dùng được cả trong Node để kiểm thử.
//
// Đồng hồ mô phỏng đo bằng PHÚT kể từ lúc tạo đơn. Giao diện gọi TICK(dt) liên tục;
// engine phát hành các mốc khi đến hạn, sinh thông báo, và xử lý các tình huống đặc biệt:
//   - xác nhận hai chiều ở đầu gửi (shipper rời đi mà chưa có ảnh → hỏi người gửi)
//   - khóa bước ở đầu gửi (bưu cục quét nhập mà thiếu mốc "đã lấy hàng" → gắn cờ + CSKH kiểm tra)
//   - mã nhận hàng chỉ gửi khi bưu tá đã đến đúng địa chỉ (GPS trùng); bưu tá báo giao ở chỗ lệch → không gửi mã, hỏi người nhận
//   - khóa bước ở đầu nhận (chưa có xác nhận nhận hàng → không "Hoàn tất", CSKH liên hệ, giao lại)
//   - báo định kỳ 2h/3h khi quá lâu không có mốc mới
//   - cảnh báo đơn đứng yên > 12h → chuyển CSKH
// ============================================================================
import { PLACES, ROUTES, buildScript, applyForgot, applyMisdeliver, redeliverSteps, deliveryEvidenceStep, normalDeliverySteps, pickupEvidenceStep, repickupSteps, STAGES, ORDER_INFO, STEP_PACE } from '../config/journeys.js';
import { PACE, HOLD_PACE } from '../config/pacing.js';
import { pointAlong, splitAlong, haversine, nearestNamed } from './geo.js';

export const STALL_MIN = 12 * 60; // 12 giờ
export const CSKH_CHECK_MIN = 180; // CSKH kiểm tra thiếu mốc mất 3 giờ mô phỏng
export const COMPLETE_GAP = 10; // phút từ lúc có xác nhận nhận hàng tới mốc "Hoàn tất"
export const CSKH_DELIVERY_MIN = 120;
export const CSKH_REPICKUP_MIN = 90; // CSKH liên hệ bưu tá quay lại lấy hàng khi người gửi báo "Chưa giao" // CSKH liên hệ bưu tá + người nhận khi giao chưa thành công
export const STALL_RESOLVE_MIN = 90; // CSKH xử lý đơn đứng yên sau 1,5 giờ kể từ lúc cảnh báo
export const STALL_WARP = 3; // khi "đứng yên 12h" đồng hồ chạy nhanh gấp 3 để không phải chờ lâu
export const DEFAULT_FREQ = 120; // phút; có thể là 120 | 180 | 'status'

// ---------------------------------------------------------------- helpers
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function clone(s) {
  return {
    ...s,
    events: [...s.events],
    notifications: [...s.notifications],
    delays: [...s.delays],
    flags: { ...s.flags },
    prompt: s.prompt ? { ...s.prompt } : null,
    otp: s.otp ? { ...s.otp } : null,
    hold: s.hold ? { ...s.hold } : null,
    cskh: s.cskh ? { ...s.cskh } : null,
  };
}

function jitter(seed, scale) {
  // số giả ngẫu nhiên ổn định theo seed (để GPS lệch nhẹ nhưng không đổi mỗi lần render)
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * scale;
}

function lastStepEvent(s) {
  for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].kind === 'step') return s.events[i];
  return null;
}

function tagIndex(s, tag) {
  return s.script.findIndex((st) => st.tag === tag);
}

function tagIndexById(s, id) {
  return s.script.findIndex((st) => st.id === id);
}

function sumGaps(script, from, to) {
  let a = 0;
  for (let i = from; i < to; i++) a += script[i].gap;
  return a;
}

// ---------------------------------------------------------------- khởi tạo
export function createInitialState({ code, flow, scenario, startMs, freq = DEFAULT_FREQ }) {
  const script = buildScript(flow, scenario);
  let s = {
    code,
    flow,
    scenario,
    startMs,
    script,
    t: 0,
    idx: 0,
    nextDue: 0,
    legStart: 0,
    events: [],
    notifications: [],
    seq: 0,
    nseq: 0,
    pickupConfirmed: false,
    pickupSource: null,
    deliveryConfirmed: false,
    deliverySource: null, // 'otp' | 'recipient'
    recipientConfirmed: false, // người nhận bấm "Đã nhận" (vẫn chờ bưu tá bổ sung ảnh + chữ ký)
    otpCount: 0, // số lần đã gửi mã (giao lại → mã mới)
    otp: null, // {code, sentAt}
    // {kind:'pickup'|'delivery', status:'open'|'dismissed'|'closed'|'expired', openedAt, shipper}
    prompt: null,
    hold: null, // {kind:'cskh'|'cskh_delivery'|'stall', startT, until, reason, warp}
    flags: { missingPickup: false, stalled: false, deliveryIssue: false, repickup: false },
    cskh: null, // {active, since, reason}
    delays: [], // {min, reason, t}
    lastEventT: 0,
    lastNoticeT: 0,
    freq,
    finished: false,
    baseDurationMin: sumGaps(script, 0, script.length),
    quiet: false,
  };
  s = clone(s);
  applyStep(s, s.script[0], 0);
  return s;
}

// ---------------------------------------------------------------- tạo sự kiện / thông báo
function makeEvent(s, o) {
  const place = PLACES[o.placeKey];
  const seed = s.seq + 1;
  return {
    id: 'e' + (++s.seq),
    stepId: o.stepId || null,
    kind: o.kind || 'step', // 'step' | 'system'
    t: o.t,
    title: o.title,
    detail: o.detail || '',
    status: o.status || null,
    stage: o.stage ?? null,
    placeKey: o.placeKey,
    placeName: place.name,
    lat: place.lat + jitter(seed, 0.0006),
    lng: place.lng + jitter(seed + 7, 0.0006),
    actor: o.actor || null,
    // ảnh QR / biên nhận cần in mã đơn
    photo: o.photo ? { ...o.photo, ...(['qr', 'receipt'].includes(o.photo.kind) ? { code: s.code } : {}) } : null,
    handover: !!o.handover,
    flags: o.flags ? [...o.flags] : [],
    tone: o.tone || 'normal', // 'normal' | 'ok' | 'warn' | 'alert'
    legacy: o.legacy ? { ...o.legacy } : null,
    departure: !!o.departure,
  };
}

function currentPlaceKey(s) {
  const last = lastStepEvent(s);
  return last ? last.placeKey : 'sender';
}

function sysEvent(s, at, o) {
  const ev = makeEvent(s, { ...o, t: at, kind: 'system', placeKey: o.placeKey || currentPlaceKey(s) });
  s.events.push(ev);
  s.lastEventT = at;
  return ev;
}

const CHANNELS = ['Zalo', 'SMS'];

/**
 * kind: 'event' (mốc mới) | 'reminder' (báo định kỳ) | 'confirm' (hỏi người gửi) | 'warning' | 'alert' | 'cskh' | 'delay'
 * Chỉ các kind 'event' bị lọc theo chế độ tần suất 'status' và chế độ quiet.
 */
function notify(s, { kind, title, body, at, major = false, final = false, stageChange }) {
  if (kind === 'event') {
    if (s.quiet && !final) return null;
    // "Chỉ khi đổi trạng thái": chỉ báo khi đơn sang giai đoạn mới trên thanh tiến trình
    // (stageChange === false chỉ do applyStep truyền vào; thông báo khác — xác nhận, giao lại… — vẫn gửi)
    if (s.freq === 'status' && stageChange === false && !final) return null;
  }
  const n = {
    id: 'n' + (++s.nseq),
    t: at,
    kind,
    title,
    body,
    channel: CHANNELS[(s.nseq - 1) % CHANNELS.length],
    major: Boolean(major || final), // dùng để quyết định có bật toast không (xem sim/toastPolicy.js)
    read: false,
  };
  s.notifications.push(n);
  s.lastNoticeT = at;
  return n;
}

// ---------------------------------------------------------------- áp dụng một mốc
function applyStep(s, step, at) {
  const prevStep = lastStepEvent(s);
  const stageChange = !prevStep || prevStep.stage !== step.stage;
  const ev = makeEvent(s, {
    stepId: step.id,
    kind: 'step',
    t: at,
    title: step.title,
    // mốc "Hoàn tất" ghi đúng cách đã xác thực (mã nhận hàng / người nhận tự xác nhận)
    detail: (step.detailBy && step.detailBy[s.deliverySource]) || step.detail,
    status: step.status,
    stage: step.stage,
    placeKey: step.place,
    actor: step.actor,
    photo: step.photo && step.photo.kind === 'receipt' && step.photo.delivered ? { ...step.photo, method: s.deliverySource } : step.photo,
    handover: step.handover,
    tone: step.tone,
    legacy: step.legacy,
    departure: step.departure,
  });
  s.events.push(ev);
  s.lastEventT = at;
  s.flags.stalled = false;
  s.idx += 1;
  s.legStart = at;

  // lên lịch mốc kế tiếp
  const next = s.script[s.idx];
  if (next) {
    s.nextDue = at + next.gap + (next.delay ? next.delay.min : 0);
  } else {
    s.nextDue = Infinity;
  }

  // thông báo "có mốc mới là báo ngay" (mốc mở hộp hỏi có thông báo riêng bên dưới)
  if (!(step.fx || []).some((f) => f === 'open_prompt' || f === 'open_delivery_prompt')) {
    notify(s, {
      kind: step.tone === 'warn' ? 'warning' : 'event',
      title: step.title,
      body: step.detail,
      at,
      major: !!step.major,
      final: !!step.final,
      stageChange,
    });
  }

  // chậm trễ có lý do của chặng kế tiếp
  if (next && next.delay) {
    s.delays.push({ min: next.delay.min, reason: next.delay.reason, t: at });
    notify(s, {
      kind: 'delay',
      title: `Dự kiến giao chậm khoảng ${Math.round(next.delay.min / 60 * 10) / 10} giờ`,
      body: next.delay.reason,
      at,
    });
  }

  for (const fx of step.fx || []) {
    if (fx === 'pickup_confirm') {
      s.pickupConfirmed = true;
      s.flags.repickup = false;
      s.pickupSource = step.photo ? 'photo' : 'counter';
    } else if (fx === 'open_prompt') {
      s.prompt = { kind: 'pickup', status: 'open', openedAt: at, shipper: step.actor };
      notify(s, {
        kind: 'confirm',
        title: `Bạn đã giao hàng cho bưu tá ${step.actor.name} chưa?`,
        body: 'Hệ thống thấy bưu tá đã rời đi nhưng chưa có ảnh lấy hàng. Vui lòng xác nhận.',
        at,
      });
    } else if (fx === 'check_pickup') {
      if (!s.pickupConfirmed) {
        raiseMissingPickup(
          s, at, ev,
          s.flow === 'B'
            ? 'Bưu cục đã nhập kho nhưng chưa có ảnh cân hàng xác nhận đã nhận hàng tại quầy.'
            : 'Bưu cục đã quét nhập nhưng chưa có mốc "đã lấy hàng".',
        );
      }
    } else if (fx === 'send_otp') {
      // chỉ gửi khi bưu tá đã đứng đúng địa chỉ người nhận; giao lại → mã mới
      s.otpCount += 1;
      s.otp = { code: makeOtp(`${s.code}#${s.otpCount}`), sentAt: at };
      notify(s, {
        kind: 'otp',
        title: 'Bưu tá đã đến — đã gửi mã nhận hàng cho người nhận',
        body: `Mã gửi tới ${ORDER_INFO.receiver.name} (${ORDER_INFO.receiver.phone}). Người nhận kiểm tra hàng rồi cung cấp mã cho bưu tá nhập vào app — mã khớp mới ghi "giao thành công".`,
        at,
      });
    } else if (fx === 'delivery_confirm') {
      s.deliveryConfirmed = true;
      s.deliverySource = step.confirmBy || 'otp';
      s.flags.deliveryIssue = false;
    } else if (fx === 'open_delivery_prompt') {
      s.prompt = { kind: 'delivery', status: 'open', openedAt: at, shipper: step.actor };
      notify(s, {
        kind: 'confirm',
        title: 'Người nhận: bạn đã nhận được hàng chưa?',
        body: `Bưu tá ${step.actor.name} báo đã giao nhưng chưa có mã nhận hàng và GPS lệch địa chỉ. Hệ thống đang hỏi người nhận.`,
        at,
      });
    } else if (fx === 'finish') {
      s.finished = true;
      s.hold = null;
    }
  }
  return ev;
}

/** Mã nhận hàng 4 số, cố định theo mã đơn (để hai lần xem cùng một đơn thấy cùng một mã). */
export function makeOtp(code) {
  let h = 7;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return String(1000 + h);
}

// ---------------------------------------------------------------- khóa bước / giữ đơn
function startHold(s, hold) {
  s.hold = { warp: 1, ...hold };
  s.delays.push({ min: hold.until - hold.startT, reason: hold.reason, t: hold.startT });
}

function raiseMissingPickup(s, at, ev, detail) {
  s.flags.missingPickup = true;
  if (ev) {
    ev.flags = [...ev.flags, 'missing_confirm'];
    ev.tone = 'warn';
  }
  if (s.prompt && s.prompt.status !== 'closed') s.prompt = { ...s.prompt, status: 'expired' };
  const reason = 'Thiếu mốc xác nhận lấy hàng – CSKH đang kiểm tra';
  sysEvent(s, at, {
    title: 'Thiếu mốc xác nhận',
    detail: `${detail} CSKH đang kiểm tra.`,
    tone: 'warn',
    flags: ['missing_confirm'],
  });
  notify(s, {
    kind: 'warning',
    title: 'Thiếu mốc xác nhận lấy hàng',
    body:
      s.flow === 'B'
        ? 'Đơn của bạn đã vào kho nhưng chưa có ảnh cân hàng tại quầy. CSKH đang kiểm tra.'
        : 'Đơn của bạn chưa có mốc "đã lấy hàng" nhưng đã vào bưu cục. CSKH đang kiểm tra.',
    at,
  });
  s.cskh = { active: true, since: at, reason };
  startHold(s, { kind: 'cskh', startT: at, until: at + CSKH_CHECK_MIN, reason, warp: 1 });
}

/**
 * Khóa bước ở đầu nhận: chưa có xác nhận nhận hàng (người nhận báo chưa nhận, hoặc không phản hồi)
 * → gắn cờ, báo người gửi, CSKH liên hệ bưu tá + người nhận, rồi bưu tá giao lại.
 * cause: 'denied' (người nhận báo chưa nhận) | 'timeout' (không phản hồi)
 */
function raiseDeliveryIssue(s, at, cause) {
  s.flags.deliveryIssue = true;
  if (s.prompt && s.prompt.kind === 'delivery' && s.prompt.status !== 'closed') {
    s.prompt = { ...s.prompt, status: cause === 'denied' ? 'closed' : 'expired' };
  }
  const reason = cause === 'denied'
    ? 'Người nhận báo chưa nhận được hàng – CSKH xác minh và sắp xếp giao lại'
    : 'Chưa có xác nhận nhận hàng – CSKH liên hệ người nhận';
  if (cause === 'denied') {
    sysEvent(s, at, {
      title: 'Người nhận báo CHƯA nhận được hàng',
      detail: 'Đơn chưa được tính là giao thành công. Hệ thống đã chuyển CSKH liên hệ bưu tá.',
      actor: { type: 'recipient', role: 'Người nhận', name: ORDER_INFO.receiver.name, code: null },
      tone: 'warn',
      flags: ['delivery_issue'],
    });
  } else {
    sysEvent(s, at, {
      title: 'Chưa có xác nhận nhận hàng',
      detail: 'Bưu tá báo đã giao ở chỗ lệch địa chỉ, chưa có mã nhận hàng và người nhận chưa phản hồi. Đơn chưa được tính là hoàn tất; CSKH đang liên hệ người nhận.',
      tone: 'warn',
      flags: ['delivery_issue'],
    });
  }
  notify(s, {
    kind: 'warning',
    title: 'Đơn chưa được xác nhận giao thành công',
    body: cause === 'denied'
      ? 'Người nhận báo chưa nhận được hàng. CSKH đang xác minh với bưu tá và sẽ sắp xếp giao lại.'
      : 'Chưa có xác nhận từ người nhận. CSKH đang liên hệ để xác minh việc giao hàng.',
    at,
  });
  // chèn "quay lại đến nơi (gửi mã mới)" + "giao lại khớp mã" ngay trước mốc "Hoàn tất"
  insertBeforeCompleted(s, redeliverSteps());
  s.nextDue = at + s.script[s.idx].gap;
  s.legStart = at;
  s.cskh = { active: true, since: at, reason };
  startHold(s, { kind: 'cskh_delivery', startT: at, until: at + CSKH_DELIVERY_MIN, reason, warp: 1 });
}

/** Chèn các mốc vào ngay trước mốc kế tiếp; `regap` đổi khoảng chờ của các mốc phía sau (theo id). */
function insertAtNext(s, steps, regap = {}) {
  s.script = [
    ...s.script.slice(0, s.idx),
    ...steps,
    ...s.script.slice(s.idx).map((st) => (st.id in regap ? { ...st, gap: regap[st.id] } : st)),
  ];
}

/** Chèn các mốc vào ngay trước mốc kế tiếp; mốc "Hoàn tất" sau đó chạy ngay (không chờ người nhận nữa). */
function insertBeforeCompleted(s, steps) {
  s.script = [
    ...s.script.slice(0, s.idx),
    ...steps,
    ...s.script.slice(s.idx).map((st) => (st.id === 'completed' ? { ...st, gap: COMPLETE_GAP } : st)),
  ];
}

function endHold(s) {
  const h = s.hold;
  if (!h) return;
  const at = h.until;
  const dur = h.until - h.startT;
  // dịch lịch của mốc kế tiếp đúng bằng thời gian bị giữ
  if (Number.isFinite(s.nextDue)) s.nextDue += dur;
  s.legStart += dur;
  s.hold = null;
  s.lastEventT = at;
  if (h.kind === 'cskh') {
    s.pickupConfirmed = true;
    s.pickupSource = 'cskh';
    s.flags.missingPickup = false;
    if (s.cskh) s.cskh = { ...s.cskh, active: false };
    // luồng B không có bưu tá lấy hàng — CSKH kiểm tra với bưu cục
    sysEvent(s, at, s.flow === 'B'
      ? { title: 'CSKH đã xác minh nhận hàng tại quầy', detail: 'CSKH đã kiểm tra với Bưu cục Cầu Giấy và xác nhận hàng đã được nhận tại quầy. Hành trình tiếp tục.', tone: 'ok' }
      : { title: 'CSKH đã xác minh lấy hàng', detail: 'CSKH đã liên hệ bưu tá và xác nhận hàng đã được lấy. Hành trình tiếp tục.', tone: 'ok' });
    notify(s, { kind: 'cskh', title: 'CSKH đã xác minh', body: 'Đơn hàng đã được xác nhận nhận hàng và tiếp tục hành trình.', at });
  } else if (h.kind === 'cskh_pickup') {
    if (s.cskh) s.cskh = { ...s.cskh, active: false };
    sysEvent(s, at, {
      title: 'CSKH đã liên hệ — bưu tá sẽ quay lại lấy hàng',
      detail: 'CSKH đã làm việc với bưu tá. Bưu tá đang quay lại địa chỉ người gửi để lấy hàng.',
      tone: 'ok',
      placeKey: 'sender',
    });
    notify(s, { kind: 'cskh', title: 'Bưu tá sẽ quay lại lấy hàng', body: 'CSKH đã sắp xếp; bưu tá đang quay lại địa chỉ của bạn.', at });
  } else if (h.kind === 'cskh_delivery') {
    // CSKH đã xử lý xong → gỡ cờ sự cố (bưu tá đang quay lại giao; thẻ mã nhận hàng sẽ hiện khi đến nơi)
    s.flags.deliveryIssue = false;
    if (s.cskh) s.cskh = { ...s.cskh, active: false };
    sysEvent(s, at, {
      title: 'CSKH đã xác minh — bưu tá quay lại giao hàng',
      detail: 'CSKH đã liên hệ bưu tá và người nhận. Bưu tá đang quay lại giao đúng địa chỉ.',
      tone: 'ok',
    });
    notify(s, { kind: 'cskh', title: 'CSKH đã sắp xếp giao lại', body: 'Bưu tá đang quay lại giao hàng cho người nhận.', at });
  } else if (h.kind === 'stall') {
    s.flags.stalled = false;
    if (s.cskh) s.cskh = { ...s.cskh, active: false };
    sysEvent(s, at, {
      title: 'CSKH đã xử lý — hàng tiếp tục hành trình',
      detail: 'CSKH đã làm việc với bưu cục và đẩy đơn hàng đi tiếp.',
      tone: 'ok',
    });
    notify(s, { kind: 'cskh', title: 'Đơn hàng đã di chuyển trở lại', body: 'CSKH đã xử lý, hàng tiếp tục hành trình.', at });
  }
}

function checkStall(s) {
  if (s.finished || s.flags.stalled) return;
  if (s.t - s.lastEventT < STALL_MIN) return;
  const at = s.lastEventT + STALL_MIN;
  s.flags.stalled = true;
  s.cskh = { active: true, since: at, reason: 'Đơn đứng yên quá 12 giờ' };
  const where = PLACES[currentPlaceKey(s)].name;
  sysEvent(s, at, {
    title: 'Đơn hàng đứng yên quá 12 giờ',
    detail: `Không ghi nhận di chuyển tại ${where} trong hơn 12 giờ. Đã chuyển CSKH.`,
    tone: 'alert',
    flags: ['stalled'],
  });
  notify(s, {
    kind: 'alert',
    title: 'Đơn hàng chưa di chuyển hơn 12 giờ',
    body: `Đơn đang đứng yên tại ${where}. Đã chuyển CSKH để xử lý.`,
    at,
  });
  if (s.hold && s.hold.kind === 'stall') s.hold.alerted = true;
}

// ---------------------------------------------------------------- xử lý theo thời gian
function processTime(s) {
  let guard = 0;
  while (guard++ < 200) {
    let again = false;
    if (s.hold && s.t >= s.hold.until) {
      endHold(s);
      again = true;
    }
    checkStall(s);
    if (!s.hold && !s.finished && s.idx < s.script.length && s.t >= s.nextDue) {
      const step = s.script[s.idx];
      if (step.needs === 'delivery' && !s.deliveryConfirmed) raiseDeliveryIssue(s, s.nextDue, 'timeout');
      else applyStep(s, step, s.nextDue);
      again = true;
    }
    if (!again) break;
  }
  emitReminders(s);
}

function emitReminders(s) {
  if (s.finished || typeof s.freq !== 'number') return;
  let guard = 0;
  while (s.t - s.lastNoticeT >= s.freq && guard++ < 10) {
    const at = s.lastNoticeT + s.freq;
    const desc = describe(s, at);
    let title = 'Cập nhật vị trí đơn hàng';
    let body = desc.sentence;
    if (s.hold && s.hold.kind === 'stall') {
      title = 'Đơn hàng vẫn chưa di chuyển';
      if (s.flags.stalled) body = `${desc.sentence} Đã chuyển CSKH.`;
    }
    notify(s, { kind: 'reminder', title, body, at });
  }
}

// ---------------------------------------------------------------- mô tả vị trí
function fmtClockLocal(s, minutes) {
  const d = new Date(s.startMs + minutes * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Vị trí & ngữ cảnh của hàng tại thời điểm `at` (mặc định: hiện tại). */
export function describe(s, at = s.t) {
  const lastEv = lastStepEvent(s);
  const place = PLACES[lastEv.placeKey];
  const next = s.script[s.idx];
  if (s.finished || !next) {
    return { lat: place.lat, lng: place.lng, travelling: false, place, sentence: 'Đơn hàng đã giao thành công và người nhận đã xác nhận.' };
  }
  if (next.travel) {
    const route = ROUTES[next.travel];
    const effT = s.hold ? Math.min(at, s.hold.startT) : at;
    const span = Math.max(1, s.nextDue - s.legStart);
    const f = clamp01((effT - s.legStart) / span);
    const pos = pointAlong(route, f);
    const near = nearestNamed(route, pos);
    const from = PLACES[lastEv.placeKey];
    const to = PLACES[next.place];
    const etaTxt = fmtClockLocal(s, s.hold ? s.nextDue + (s.hold.until - s.hold.startT) : s.nextDue);
    const sentence =
      next.travel === 'lastmile'
        ? `Bưu tá đang trên đường giao hàng${near ? `, hiện ở ${near}` : ''}. Dự kiến giao lúc ${etaTxt}.`
        : `Hàng đang trên đường ${from.short} → ${to.short}${near ? `, hiện ở gần ${near}` : ''}. Dự kiến đến lúc ${etaTxt}.`;
    return { lat: pos.lat, lng: pos.lng, travelling: true, route, fraction: f, from, to, near, place, sentence, routeKey: next.travel };
  }
  const dueTxt = fmtClockLocal(s, s.hold ? s.nextDue + (s.hold.until - s.hold.startT) : s.nextDue);
  let sentence;
  if (s.hold && s.hold.kind === 'stall') {
    sentence = `Đơn hàng vẫn đang ở ${place.name}, chưa di chuyển.`;
  } else if (s.hold && s.hold.kind === 'cskh') {
    sentence = `CSKH vẫn đang kiểm tra đơn tại ${place.name}.`;
  } else if (s.hold && s.hold.kind === 'cskh_delivery') {
    sentence = 'Đơn chưa được tính là giao thành công. CSKH đang liên hệ bưu tá và người nhận.';
  } else if (s.hold && s.hold.kind === 'cskh_pickup') {
    sentence = 'Người gửi báo chưa giao hàng. CSKH đang liên hệ để bưu tá quay lại lấy hàng.';
  } else if (next.id === 'repickup_arrived') {
    sentence = 'Bưu tá đang quay lại địa chỉ người gửi để lấy hàng.';
  } else if (next.id === 'pickup_evidence') {
    sentence = 'Người gửi đã xác nhận giao hàng; bưu tá đang tải lên ảnh lấy hàng và chữ ký.';
  } else if (next.id === 'completed') {
    sentence = s.deliveryConfirmed
      ? 'Hàng đã được giao, hệ thống đang gửi biên nhận cho người gửi và người nhận.'
      : 'Bưu tá báo đã giao, hệ thống đang chờ người nhận xác nhận.';
  } else if (next.id === 'delivered' || next.id === 'redelivered') {
    sentence = 'Bưu tá đã đến địa chỉ người nhận, đang chờ người nhận cung cấp mã nhận hàng.';
  } else if (next.id === 'delivery_evidence') {
    sentence = 'Người nhận đã xác nhận nhận hàng; bưu tá đang tải lên ảnh giao hàng và chữ ký.';
  } else if (next.departure) {
    sentence = `Hàng đang ở ${place.name}. Giờ xuất kho dự kiến: ${dueTxt}.`;
  } else {
    sentence = `Hàng đang ở ${place.name}. Cập nhật tiếp theo dự kiến lúc ${dueTxt}.`;
  }
  return { lat: place.lat, lng: place.lng, travelling: false, place, sentence };
}

// ---------------------------------------------------------------- selectors (dùng cho giao diện)
const DELIVERY_STEPS = ['delivered', 'redelivered', 'delivered_mismatch'];

/** Mốc giao hàng được tính (giao lại > giao đúng OTP > giao sai nhưng người nhận xác nhận). */
function deliveryEvent(s) {
  if (!s.deliveryConfirmed) return null;
  const evs = s.events.filter((e) => DELIVERY_STEPS.includes(e.stepId));
  return evs[evs.length - 1] || null;
}

export function selectEta(s) {
  if (s.finished) {
    const last = s.events[s.events.length - 1];
    return { etaT: deliveryEvent(s)?.t ?? last.t, baseEtaT: s.baseDurationMin, delayMin: 0, reasons: [], done: true };
  }
  const remaining = sumGaps(s.script, s.idx + 1, s.script.length);
  const holdExtra = s.hold ? s.hold.until - s.hold.startT : 0;
  const etaT = s.nextDue + holdExtra + remaining;
  const baseEtaT = s.baseDurationMin;
  const delayMin = Math.max(0, Math.round(etaT - baseEtaT));
  const reasons = [];
  for (const d of s.delays) if (!reasons.includes(d.reason)) reasons.push(d.reason);
  return { etaT, baseEtaT, delayMin, reasons, done: false };
}

export function selectStageIndex(s) {
  const last = lastStepEvent(s);
  return last ? last.stage : 0;
}

export function selectStageLabels(s) {
  return STAGES[s.flow];
}

export function selectStatusText(s) {
  const last = lastStepEvent(s);
  if (s.hold && s.hold.kind === 'cskh') return 'CSKH đang kiểm tra đơn';
  if (s.hold && s.hold.kind === 'stall' && s.flags.stalled) return 'Đơn đứng yên — đã chuyển CSKH';
  if (s.hold && s.hold.kind === 'cskh_delivery') return 'Chưa giao thành công — CSKH đang xử lý';
  if (s.hold && s.hold.kind === 'cskh_pickup') return 'Chờ lấy hàng lại — CSKH đang xử lý';
  if (s.flags.repickup) return 'Bưu tá đang quay lại lấy hàng';
  if (s.prompt && (s.prompt.status === 'open' || s.prompt.status === 'dismissed')) {
    return s.prompt.kind === 'delivery' ? 'Chờ người nhận xác nhận đã nhận hàng' : 'Chờ người gửi xác nhận lấy hàng';
  }
  return last.status;
}

/** Các dòng của giao diện tra cứu CŨ: thưa, chậm, chỉ chữ. */
export function selectLegacyRows(s) {
  return s.events
    // khi đơn đã kết thúc thì đồng hồ dừng, nên hiện nốt các dòng còn đang "chờ cập nhật"
    .filter((e) => e.kind === 'step' && e.legacy && (s.finished || s.t >= e.t + e.legacy.lag))
    .map((e) => ({ id: e.id, t: e.t, text: e.legacy.text, placeName: e.legacy.place ? PLACES[e.legacy.place].name : e.placeName }));
}

/** Vị trí đồ họa của hàng trên bản đồ. */
export function selectPosition(s) {
  return describe(s, s.t);
}

/** Thông tin chặng cuối (bưu tá di chuyển trực tiếp). Có thể gồm nhiều đoạn (giao sai rồi giao lại). */
export function selectLastMile(s) {
  const outIdx = s.events.findIndex((e) => e.stepId === 'out_for_delivery');
  if (outIdx < 0) return null;
  const dest = PLACES.recipient;
  const startIdx = s.script.findIndex((st) => st.id === 'out_for_delivery');
  // các đoạn chặng cuối đã đi xong + đoạn đang đi (nếu có)
  const legs = s.script.slice(startIdx + 1).filter((st) => st.travel);
  const doneLegs = legs.filter((st) => s.events.some((e) => e.stepId === st.id));
  const next = s.script[s.idx];
  const current = !s.finished && next && next.travel && legs.includes(next) ? next : null;

  const done = [];
  for (const st of doneLegs) done.push(...ROUTES[st.travel]);
  let point;
  let rest = [];
  if (current) {
    const effT = s.hold ? Math.min(s.t, s.hold.startT) : s.t;
    const span = Math.max(1, s.nextDue - s.legStart);
    const f = clamp01((effT - s.legStart) / span);
    const part = splitAlong(ROUTES[current.travel], f);
    done.push(...part.done);
    rest = part.rest;
    point = part.point;
  } else if (done.length) {
    point = done[done.length - 1];
  } else {
    point = PLACES.poB;
  }
  const delivered = deliveryEvent(s);
  const remainingM = delivered ? 0 : current ? haversineAlong(rest) : haversine(point, dest);
  const etaT = delivered
    ? delivered.t
    : current
      ? s.nextDue + (s.hold ? s.hold.until - s.hold.startT : 0)
      : null;
  return {
    pos: { lat: point.lat, lng: point.lng },
    done,
    rest,
    remainingM,
    etaT,
    dest,
    started: true,
    delivered: Boolean(delivered),
    finished: s.finished,
  };
}

function haversineAlong(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

/** Tập các hub đã đi qua (để tô trên bản đồ). */
export function selectVisitedPlaces(s) {
  const set = new Set();
  for (const e of s.events) if (e.kind === 'step') set.add(e.placeKey);
  return set;
}

/** Nút nào của bảng điều khiển đang khả dụng. */
export function adminAvailability(s) {
  if (!s || s.finished) return { pickupPhoto: false, hubScan: false, forgot: false, stall: false, misdeliver: false, deliver: false };
  const pickupIdx = tagIndex(s, 'pickup');
  const hubIdx = tagIndex(s, 'hubin');
  const lateForPhoto = !!s.prompt && !s.pickupConfirmed && ['open', 'dismissed'].includes(s.prompt.status);
  const pickupIsNoPhotoStep = ['departed_no_photo', 'weigh_skipped'].includes(s.script[pickupIdx]?.id);
  return {
    // Ở kịch bản "quên xác nhận" chỉ cho shipper cập nhật ảnh MUỘN (sau khi hộp hỏi đã bật).
    pickupPhoto: ((s.idx <= pickupIdx && !pickupIsNoPhotoStep) || lateForPhoto) && !s.pickupConfirmed,
    hubScan: s.idx <= hubIdx,
    forgot: ['pickup_photo', 'weigh_photo'].includes(s.script[pickupIdx]?.id) && s.idx <= pickupIdx,
    stall: !s.hold,
    misdeliver: s.idx <= tagIndexById(s, 'arrived_recipient') && !s.hold,
    deliver: true,
  };
}

// ---------------------------------------------------------------- tua nhanh (dùng cho bảng điều khiển)
function fastForward(s, lastIdx) {
  s.quiet = true;
  let guard = 0;
  while (s.idx <= lastIdx && s.idx < s.script.length && guard++ < 100) {
    if (s.hold) {
      s.t = Math.max(s.t, s.hold.until);
      endHold(s);
    }
    s.t = Math.max(s.t, s.nextDue);
    const step = s.script[s.idx];
    if (step.needs === 'delivery' && !s.deliveryConfirmed) {
      // tua nhanh KHÔNG được bỏ qua khóa bước đầu nhận: bổ sung bằng chứng / giao lại đúng trình tự trước "Hoàn tất"
      if (s.prompt && s.prompt.status !== 'closed') s.prompt = { ...s.prompt, status: 'closed' };
      const extra = s.recipientConfirmed ? [deliveryEvidenceStep()] : redeliverSteps();
      insertBeforeCompleted(s, extra);
      lastIdx += extra.length;
      continue;
    }
    applyStep(s, step, s.t);
  }
  s.quiet = false;
  s.lastNoticeT = s.t;
}

function adminCommand(state, cmd) {
  const s = clone(state);
  const av = adminAvailability(s);
  if (cmd === 'pickup_photo' && av.pickupPhoto) {
    const hasPrompt = !!s.prompt && !s.pickupConfirmed;
    if (hasPrompt) {
      // shipper cập nhật ảnh muộn → có mốc, đóng hộp hỏi
      s.prompt = { ...s.prompt, status: 'closed' };
      s.pickupConfirmed = true;
      s.pickupSource = 'photo';
      const at = s.t;
      const ev = sysEvent(s, at, {
        title: 'Bưu tá tải lên muộn ảnh lấy hàng và chữ ký người gửi',
        detail: 'Ảnh hàng và chữ ký người gửi đã lấy lúc bàn giao nhưng bưu tá chưa cập nhật; nay tải lên.',
        actor: s.prompt.shipper,
        photo: { kind: 'pickup', signature: 'sender' },
        handover: true,
        tone: 'ok',
        placeKey: 'sender',
      });
      notify(s, { kind: 'event', title: ev.title, body: ev.detail, at, major: true });
    } else {
      fastForward(s, tagIndex(s, 'pickup'));
    }
  } else if (cmd === 'hub_scan' && av.hubScan) {
    fastForward(s, tagIndex(s, 'hubin'));
  } else if (cmd === 'forgot' && av.forgot) {
    // luồng A: tua tới lúc shipper đến nơi; luồng B: tua tới lúc quầy quét QR
    const beforeIdx = tagIndex(s, 'pickup') - 1;
    if (s.idx <= beforeIdx) fastForward(s, beforeIdx);
    s.script = applyForgot(s.script);
    s.scenario = 'forgot';
    s.baseDurationMin = sumGaps(s.script, 0, s.script.length);
    // lên lịch lại mốc kế tiếp (chính là mốc "rời đi chưa có ảnh") ngay bây giờ
    s.nextDue = s.t;
    s.quiet = false;
    processTime(s);
  } else if (cmd === 'stall' && av.stall) {
    s.lastEventT = s.t;
    startHold(s, {
      kind: 'stall',
      startT: s.t,
      until: s.t + STALL_MIN + STALL_RESOLVE_MIN,
      reason: 'Đơn đứng yên quá 12 giờ – CSKH xử lý',
      warp: STALL_WARP,
    });
  } else if (cmd === 'misdeliver' && av.misdeliver) {
    const outIdx = tagIndexById(s, 'out_for_delivery');
    if (s.idx <= outIdx) fastForward(s, outIdx);
    s.script = applyMisdeliver(s.script);
    s.scenario = 'misdeliver';
    s.baseDurationMin = sumGaps(s.script, 0, s.script.length);
    // bưu tá đi lệch tuyến rồi bấm "giao" — rút ngắn chặng để thấy ngay
    s.nextDue = s.t + 15;
    s.legStart = s.t;
    s.quiet = false;
    processTime(s);
  } else if (cmd === 'deliver' && av.deliver) {
    s.prompt = s.prompt ? { ...s.prompt, status: 'closed' } : null;
    // chưa tới lúc báo giao sai → giao bình thường: đến đúng nơi, gửi mã, khớp mã
    const mis = s.script.findIndex((st, i) => i >= s.idx && st.id === 'delivered_mismatch');
    if (mis >= 0) s.script = [...s.script.slice(0, mis), ...normalDeliverySteps(), ...s.script.slice(mis + 1)];
    // (giao sai đã xảy ra → fastForward tự chèn bổ sung bằng chứng / giao lại trước "Hoàn tất")
    s.nextDue = Math.min(s.nextDue, s.t);
    if (s.hold) {
      s.t = Math.max(s.t, s.hold.until);
      endHold(s);
    }
    fastForward(s, s.script.length - 1);
  }
  return s;
}

// ---------------------------------------------------------------- reducer
export function simReducer(state, action) {
  switch (action.type) {
    case 'START':
      return createInitialState(action.cfg);
    case 'STOP':
      return null;
    default:
      break;
  }
  if (!state) return state;

  switch (action.type) {
    case 'TICK': {
      if (state.finished) return state;
      const s = clone(state);
      s.t += action.dt;
      processTime(s);
      return s;
    }
    case 'SET_FREQ': {
      const s = clone(state);
      s.freq = action.freq;
      // tránh báo dồn một loạt khi đổi từ chế độ "chỉ khi đổi trạng thái" sang 2h/3h
      s.lastNoticeT = Math.max(s.lastNoticeT, s.lastEventT);
      return s;
    }
    case 'MARK_READ': {
      if (!state.notifications.some((n) => !n.read)) return state;
      const s = clone(state);
      s.notifications = s.notifications.map((n) => (n.read ? n : { ...n, read: true }));
      return s;
    }
    case 'PROMPT_DISMISS': {
      if (!state.prompt || state.prompt.status !== 'open') return state;
      const s = clone(state);
      s.prompt.status = 'dismissed';
      return s;
    }
    case 'PROMPT_REOPEN': {
      if (!state.prompt || state.prompt.status !== 'dismissed') return state;
      const s = clone(state);
      s.prompt.status = 'open';
      return s;
    }
    case 'PROMPT_ANSWER': {
      if (!state.prompt || !['open', 'dismissed'].includes(state.prompt.status)) return state;
      const s = clone(state);
      const at = s.t;
      const shipper = s.prompt.shipper;
      if (s.prompt.kind === 'delivery') {
        if (action.answer === 'yes') {
          s.prompt = { ...s.prompt, status: 'closed' };
          s.recipientConfirmed = true;
          const ev = sysEvent(s, at, {
            title: 'Người nhận xác nhận đã nhận được hàng',
            detail: 'Không có mã nhận hàng vì bưu tá không ở đúng địa chỉ; người nhận tự xác nhận. Bưu tá phải tải lên ảnh giao hàng và chữ ký người nhận (lấy lúc bàn giao) thì đơn mới hoàn tất.',
            actor: { type: 'recipient', role: 'Người nhận', name: ORDER_INFO.receiver.name, code: null },
            handover: true,
            tone: 'ok',
          });
          notify(s, { kind: 'event', title: 'Người nhận đã xác nhận nhận hàng', body: ev.detail, at, major: true });
          // chèn bước bưu tá tải lên ảnh + chữ ký trước "Hoàn tất"
          insertBeforeCompleted(s, [deliveryEvidenceStep()]);
          s.nextDue = at + s.script[s.idx].gap;
        } else {
          raiseDeliveryIssue(s, at, 'denied');
        }
        return s;
      }
      s.prompt = { ...s.prompt, status: 'closed' };
      if (action.answer === 'yes') {
        s.pickupConfirmed = true;
        s.pickupSource = 'sender';
        const ev = sysEvent(s, at, {
          title: `Người gửi xác nhận đã giao hàng cho bưu tá ${shipper.name}`,
          detail: 'Mốc lấy hàng được ghi nhận theo xác nhận hai chiều của người gửi.',
          actor: { type: 'sender', role: 'Người gửi', name: 'Bạn', code: null },
          handover: true,
          tone: 'ok',
          placeKey: 'sender',
        });
        notify(s, { kind: 'event', title: 'Đã ghi nhận mốc lấy hàng', body: ev.detail, at, major: true });
        // đối xứng đầu giao: bưu tá vẫn phải tải lên ảnh + chữ ký đã lấy lúc bàn giao; hàng vào bưu cục sau đó ~1 giờ
        insertAtNext(s, [pickupEvidenceStep()], { hub_in_a: 60 });
        s.nextDue = at + s.script[s.idx].gap;
      } else {
        // hàng VẪN Ở NHÀ người gửi → CSKH liên hệ, bưu tá quay lại lấy hàng, rồi hàng mới vào bưu cục
        s.flags.repickup = true;
        sysEvent(s, at, {
          title: `Người gửi báo CHƯA giao hàng cho bưu tá ${shipper.name}`,
          detail: 'Hàng vẫn ở chỗ người gửi. Hệ thống đã chuyển CSKH liên hệ bưu tá quay lại lấy hàng.',
          actor: { type: 'sender', role: 'Người gửi', name: 'Bạn', code: null },
          tone: 'warn',
          flags: ['pickup_issue'],
          placeKey: 'sender',
        });
        const reason = 'Người gửi báo chưa giao hàng – CSKH sắp xếp bưu tá quay lại lấy';
        notify(s, { kind: 'warning', title: 'Đã chuyển CSKH', body: 'CSKH đang liên hệ bưu tá quay lại lấy hàng.', at });
        insertAtNext(s, repickupSteps(), { hub_in_a: 60 });
        s.nextDue = at + s.script[s.idx].gap;
        s.legStart = at;
        s.cskh = { active: true, since: at, reason };
        startHold(s, { kind: 'cskh_pickup', startT: at, until: at + CSKH_REPICKUP_MIN, reason, warp: 1 });
      }
      return s;
    }
    case 'ADMIN':
      return adminCommand(state, action.cmd);
    default:
      return state;
  }
}

/**
 * Hệ số tốc độ đồng hồ (nhân với tốc độ cơ bản):
 *  - đang giữ đơn: đơn đứng yên 12h dùng warp riêng (chạy nhanh), CSKH xử lý chạy nhịp thường;
 *  - còn lại: nhịp của khoảng chờ trước mốc kế tiếp (STEP_PACE trong journeys.js).
 */
export function clockWarp(s) {
  if (!s) return 1;
  if (s.hold) return s.hold.kind === 'stall' ? s.hold.warp : HOLD_PACE;
  const next = s.script[s.idx];
  const pace = next && (next.pace || STEP_PACE[next.id]);
  return PACE[pace] || PACE.normal;
}
