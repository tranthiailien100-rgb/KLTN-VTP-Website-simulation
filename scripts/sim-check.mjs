// Kiểm thử nhanh engine mô phỏng (không cần trình duyệt): `npm run test:sim`
import assert from 'node:assert/strict';
import {
  simReducer, selectEta, selectLegacyRows, adminAvailability, selectLastMile, selectPosition, clockWarp,
} from '../src/sim/engine.js';
import { toastPolicy } from '../src/sim/toastPolicy.js';
import { TOAST, DEFAULT_SPEED } from '../src/config/pacing.js';
import { DEMO_CODES, findDemoCode, normalizeCode } from '../src/config/demoCodes.js';

const START = new Date(2026, 10, 12, 7, 30).getTime();
// mã đơn demo theo kịch bản (mã thật là chuỗi số trong demoCodes.js)
const CODE = {
  A: DEMO_CODES.find((d) => d.flow === 'A' && d.scenario === 'normal').code,
  B: DEMO_CODES.find((d) => d.flow === 'B' && d.scenario === 'normal').code,
  QUEN: DEMO_CODES.find((d) => d.scenario === 'forgot').code,
  GIAO: DEMO_CODES.find((d) => d.scenario === 'misdeliver').code,
};
const cfgFor = (key, extra = {}) => {
  const d = DEMO_CODES.find((x) => x.code === CODE[key]);
  return { code: d.code, flow: d.flow, scenario: d.scenario, startMs: START, freq: 120, ...extra };
};

function run(cfg, { dt = 5, max = 6000, before } = {}) {
  let s = simReducer(null, { type: 'START', cfg });
  let i = 0;
  while (!s.finished && i++ < max) {
    if (before) s = before(s) || s;
    s = simReducer(s, { type: 'TICK', dt });
  }
  return s;
}

const titles = (s) => s.events.map((e) => e.title);
const has = (s, text) => s.events.some((e) => e.title.includes(text));
let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
};

console.log('Mã đơn');
{
  test('mã đơn demo chỉ gồm 12 chữ số, không trùng', () => {
    for (const d of DEMO_CODES) assert.match(d.code, /^\d{12}$/);
    assert.equal(new Set(DEMO_CODES.map((d) => d.code)).size, DEMO_CODES.length);
  });
  test('tra cứu bỏ khoảng trắng / ký tự lạ, mã sai trả null', () => {
    assert.equal(normalizeCode(' 1839 2047-5610 '), '183920475610');
    assert.ok(findDemoCode('1839 2047 5610'));
    assert.equal(findDemoCode('DEMO-A'), null);
    assert.equal(findDemoCode('123'), null);
  });
}

console.log('Luồng A (thường)');
{
  const s = run(cfgFor('A'));
  test('kết thúc và có đủ 15 mốc', () => { assert.ok(s.finished); assert.equal(s.events.filter((e) => e.kind === 'step').length, 15); });
  test('thời gian các mốc không giảm', () => { for (let i = 1; i < s.events.length; i++) assert.ok(s.events[i].t >= s.events[i - 1].t, `mốc ${i}`); });
  test('không có cờ thiếu xác nhận', () => assert.ok(!s.events.some((e) => e.flags.includes('missing_confirm'))));
  test('có thông báo định kỳ khi chờ lâu', () => assert.ok(s.notifications.some((n) => n.kind === 'reminder')));
  test('giao diện cũ chỉ có 6 dòng', () => assert.equal(selectLegacyRows({ ...s, t: s.t + 1000 }).length, 6));
  test('mốc giao hàng có ảnh + chữ ký người nhận', () => { const d = s.events.find((e) => e.stepId === 'delivered'); assert.equal(d.photo.kind, 'delivery'); assert.equal(d.photo.signature, 'recipient'); });
  test('mốc lấy hàng có ảnh + chữ ký người gửi', () => { const p = s.events.find((e) => e.stepId === 'pickup_photo'); assert.equal(p.photo.kind, 'pickup'); assert.equal(p.photo.signature, 'sender'); });
  test('biên nhận cuối ghi "mã nhận hàng đã khớp"', () => {
    const done = s.events.find((e) => e.stepId === 'completed');
    assert.ok(done.detail.includes('mã nhận hàng đã khớp'));
    assert.equal(done.photo.method, 'otp');
  });
  test('ETA kết thúc = mốc giao thành công', () => {
    assert.ok(selectEta(s).done);
    assert.equal(selectEta(s).etaT, s.events.find((e) => e.stepId === 'delivered').t);
  });
  test('đầu nhận: mã nhận hàng chỉ gửi khi bưu tá ĐẾN NƠI (không phải lúc xuất phát), khớp mã rồi mới "Hoàn tất"', () => {
    assert.match(s.otp.code, /^\d{4}$/);
    const otpN = s.notifications.find((n) => n.kind === 'otp');
    const t = (id) => s.events.find((e) => e.stepId === id).t;
    assert.equal(otpN.t, t('arrived_recipient'));
    assert.ok(otpN.t > t('out_for_delivery'));
    assert.ok(t('arrived_recipient') < t('delivered'));
    assert.equal(s.deliverySource, 'otp');
    const ids = s.events.filter((e) => e.kind === 'step').map((e) => e.stepId);
    assert.equal(ids[ids.length - 1], 'completed');
    assert.ok(ids.indexOf('delivered') < ids.indexOf('completed'));
    assert.ok(!s.flags.deliveryIssue);
  });
  console.log('   tổng thời gian mô phỏng:', Math.round(s.t / 60), 'giờ; thông báo:', s.notifications.length);
}

console.log('Luồng B (tự mang ra bưu cục)');
{
  const s = run(cfgFor('B'));
  test('kết thúc, có ảnh cân và biên nhận điện tử', () => {
    assert.ok(s.finished);
    assert.ok(has(s, 'Ảnh hàng trên cân'));
    assert.equal(s.events.find((e) => e.stepId === 'weigh_photo').photo.signature, 'sender');
    assert.ok(has(s, 'biên nhận điện tử'));
  });
  test('chặng Đà Nẵng → TP.HCM có chậm trễ kèm lý do', () => {
    assert.equal(s.delays.length, 1);
    assert.ok(s.notifications.some((n) => n.kind === 'delay'));
  });
  test('không có cờ thiếu xác nhận (đã có ảnh cân hàng)', () => assert.ok(!s.events.some((e) => e.flags.includes('missing_confirm'))));
  test('ảnh QR và biên nhận có in mã đơn', () => {
    assert.equal(s.events.find((e) => e.stepId === 'qr_scanned').photo.code, CODE.B);
    assert.equal(s.events.find((e) => e.stepId === 'e_receipt').photo.kind, 'receipt');
  });

  // khóa bước luồng B: quầy bỏ qua bước cân
  let b = simReducer(null, { type: 'START', cfg: cfgFor('B') });
  assert.ok(adminAvailability(b).forgot);
  b = simReducer(b, { type: 'ADMIN', cmd: 'forgot' });
  let bDone = b;
  for (let k = 0; !bDone.finished && k < 6000; k++) bDone = simReducer(bDone, { type: 'TICK', dt: 5 });
  test('luồng B thiếu ảnh cân → khóa bước gắn cờ, KHÔNG phát hành biên nhận, CSKH xác minh', () => {
    assert.ok(bDone.finished);
    assert.ok(has(bDone, 'chưa có ảnh cân hàng'));
    assert.ok(bDone.events.some((e) => e.flags.includes('missing_confirm')));
    assert.ok(!has(bDone, 'biên nhận điện tử'));
    // luồng B không có bưu tá lấy hàng → CSKH kiểm tra với bưu cục, không nói "liên hệ bưu tá"
    assert.ok(has(bDone, 'CSKH đã xác minh nhận hàng tại quầy'));
    assert.ok(!bDone.events.some((e) => e.detail.includes('liên hệ bưu tá')));
  });
}

console.log('Kịch bản giao sai (bưu tá báo giao, người nhận chưa nhận)');
{
  const answer = (ans) => (st) => (st.prompt && st.prompt.kind === 'delivery' && st.prompt.status === 'open' ? simReducer(st, { type: 'PROMPT_ANSWER', answer: ans }) : null);
  const no = run(cfgFor('GIAO'), { before: answer('no') });
  test('người nhận báo "Chưa nhận" → gắn cờ, CSKH, giao lại đúng OTP, rồi mới hoàn tất', () => {
    assert.ok(no.finished);
    assert.ok(has(no, 'CHƯA nhận được hàng'));
    assert.ok(no.events.some((e) => e.flags.includes('delivery_issue')));
    assert.ok(has(no, 'CSKH đã xác minh — bưu tá quay lại'));
    const ids = no.events.map((e) => e.stepId);
    // giao lại đi đúng trình tự: đến đúng nơi (gửi mã MỚI) → khớp mã
    assert.ok(ids.indexOf('redeliver_arrived') > ids.indexOf('delivered_mismatch'));
    assert.ok(ids.indexOf('redelivered') > ids.indexOf('redeliver_arrived'));
    assert.equal(no.otpCount, 1);
    assert.ok(!no.flags.deliveryIssue, 'CSKH xử lý xong thì gỡ cờ sự cố');
    assert.equal(no.notifications.find((n) => n.kind === 'otp').t, no.events.find((e) => e.stepId === 'redeliver_arrived').t);
    assert.equal(ids[ids.length - 1], 'completed');
    assert.equal(selectEta(no).etaT, no.events.find((e) => e.stepId === 'redelivered').t);
    const t = (id) => no.events.find((e) => e.stepId === id).t;
    assert.ok(t('completed') - t('redelivered') <= 15, 'hoàn tất ngay sau khi giao lại');
    assert.ok(no.notifications.some((n) => n.kind === 'warning' && n.title.includes('chưa được xác nhận giao')));
  });
  const yes = run(cfgFor('GIAO'), { before: answer('yes') });
  test('người nhận báo "Đã nhận" → bưu tá vẫn phải bổ sung ảnh + chữ ký rồi mới hoàn tất, không giao lại', () => {
    assert.ok(yes.finished);
    assert.equal(yes.deliverySource, 'recipient');
    assert.ok(!yes.events.some((e) => e.stepId === 'redelivered'));
    assert.ok(!yes.flags.deliveryIssue);
    const ev = yes.events.find((e) => e.stepId === 'delivery_evidence');
    assert.ok(ev, 'có mốc bổ sung bằng chứng');
    assert.equal(ev.photo.signature, 'recipient');
    const conf = yes.events.find((e) => e.title.includes('Người nhận xác nhận đã nhận')).t;
    const done = yes.events.find((e) => e.stepId === 'completed');
    assert.ok(conf < ev.t && ev.t < done.t);
    assert.ok(done.t - conf <= 40, 'hoàn tất ngay sau khi có đủ bằng chứng');
    // biên nhận ghi đúng cách đã xác thực — không nói "mã đã khớp"
    assert.ok(done.detail.includes('tự xác nhận') && !done.detail.includes('mã nhận hàng đã khớp'));
    assert.equal(done.photo.method, 'recipient');
    assert.equal(yes.otp, null, 'không gửi mã vì bưu tá không ở đúng địa chỉ');
  });
  const ignore = run(cfgFor('GIAO'));
  test('không ai trả lời → khóa bước đầu nhận: chưa "Hoàn tất", CSKH liên hệ, giao lại', () => {
    assert.ok(ignore.finished);
    assert.ok(has(ignore, 'Chưa có xác nhận nhận hàng'));
    assert.ok(ignore.events.some((e) => e.stepId === 'redelivered'));
    assert.equal(ignore.prompt.status, 'expired');
  });
  test('giao diện cũ vẫn ghi "Giao hàng thành công" ngay khi bưu tá báo (khoảng mù đầu nhận)', () => {
    const rows = selectLegacyRows({ ...ignore, t: ignore.t + 1000 }).map((r) => r.text);
    assert.equal(rows.filter((r) => r === 'Giao hàng thành công').length, 1);
    const row = selectLegacyRows({ ...ignore, t: ignore.t + 1000 }).find((r) => r.text === 'Giao hàng thành công');
    assert.equal(row.t, ignore.events.find((e) => e.stepId === 'delivered_mismatch').t);
    assert.ok(!row.placeName.includes('cách địa chỉ'), 'giao diện cũ không được lộ vị trí lệch');
  });
  test('chặng cuối: bưu tá dừng lệch địa chỉ, còn khoảng cách tới người nhận', () => {
    let s = simReducer(null, { type: 'START', cfg: cfgFor('GIAO') });
    let k = 0;
    while (!(s.prompt && s.prompt.kind === 'delivery') && k++ < 6000) s = simReducer(s, { type: 'TICK', dt: 5 });
    const lm = selectLastMile(s);
    assert.ok(!lm.delivered);
    assert.ok(lm.remainingM > 800, String(lm.remainingM));
    assert.equal(s.otp, null, 'GPS lệch → chưa gửi mã nhận hàng');
  });
}

console.log('Kịch bản quên xác nhận lúc lấy hàng');
{
  const ignore = run(cfgFor('QUEN'));
  test('bỏ qua hộp hỏi → khóa bước gắn cờ + CSKH kiểm tra + xác minh', () => {
    assert.ok(ignore.finished);
    assert.ok(has(ignore, 'Thiếu mốc xác nhận'));
    assert.ok(has(ignore, 'CSKH đã xác minh lấy hàng'));
    assert.ok(ignore.notifications.some((n) => n.kind === 'warning' && n.title.includes('Thiếu mốc')));
  });
  test('giao diện cũ KHÔNG có mốc nhận hàng tại bưu cục gửi (khoảng mù)', () => {
    const rows = selectLegacyRows({ ...ignore, t: ignore.t + 1000 }).map((r) => r.text);
    assert.ok(!rows.includes('Nhận hàng tại bưu cục gửi'));
    assert.equal(rows.length, 5);
  });

  // trả lời "Đã giao"
  let s = simReducer(null, { type: 'START', cfg: cfgFor('QUEN') });
  let guard = 0;
  while (!(s.prompt && s.prompt.status === 'open') && guard++ < 1000) s = simReducer(s, { type: 'TICK', dt: 5 });
  test('hộp hỏi người gửi được mở khi shipper rời đi chưa có ảnh', () => assert.equal(s.prompt.status, 'open'));
  s = simReducer(s, { type: 'PROMPT_ANSWER', answer: 'yes' });
  const yes = run({ ...cfgFor('QUEN') }, { before: (st) => (st.prompt && st.prompt.status === 'open' ? simReducer(st, { type: 'PROMPT_ANSWER', answer: 'yes' }) : null) });
  test('trả lời "Đã giao" → có mốc, KHÔNG gắn cờ, bưu tá vẫn tải lên ảnh + chữ ký (đối xứng đầu giao)', () => {
    assert.ok(yes.finished);
    assert.ok(has(yes, 'Người gửi xác nhận đã giao hàng'));
    assert.ok(!yes.events.some((e) => e.flags.includes('missing_confirm')));
    const ev = yes.events.find((e) => e.stepId === 'pickup_evidence');
    assert.ok(ev && ev.photo.signature === 'sender');
    const ids = yes.events.map((e) => e.stepId);
    assert.ok(ids.indexOf('pickup_evidence') < ids.indexOf('hub_in_a'));
  });
  const no = run({ ...cfgFor('QUEN') }, { before: (st) => (st.prompt && st.prompt.status === 'open' ? simReducer(st, { type: 'PROMPT_ANSWER', answer: 'no' }) : null) });
  test('trả lời "Chưa giao" → hàng vẫn ở nhà người gửi: CSKH, bưu tá QUAY LẠI lấy (ảnh + chữ ký), rồi mới vào bưu cục', () => {
    assert.ok(no.finished);
    assert.ok(has(no, 'CHƯA giao hàng'));
    assert.ok(!no.events.some((e) => e.detail.includes('xác nhận hàng đã được lấy')), 'không được kết luận "đã lấy" trái với lời người gửi');
    const ids = no.events.map((e) => e.stepId);
    assert.ok(ids.indexOf('repickup_arrived') >= 0 && ids.indexOf('repickup_photo') > ids.indexOf('repickup_arrived'));
    assert.ok(ids.indexOf('hub_in_a') > ids.indexOf('repickup_photo'), 'hàng vào bưu cục SAU khi lấy lại');
    assert.equal(no.events.find((e) => e.stepId === 'repickup_photo').photo.signature, 'sender');
    assert.ok(!no.events.some((e) => e.flags.includes('missing_confirm')), 'không gắn cờ thiếu mốc khi nhập bưu cục');
    assert.ok(!no.flags.repickup);
  });
}

console.log('Bảng điều khiển (admin)');
{
  // Đơn đứng yên quá 12h
  let s = simReducer(null, { type: 'START', cfg: cfgFor('A') });
  for (let i = 0; i < 100; i++) s = simReducer(s, { type: 'TICK', dt: 5 });
  assert.ok(adminAvailability(s).stall);
  s = simReducer(s, { type: 'ADMIN', cmd: 'stall' });
  let g = 0;
  while (s.hold && g++ < 2000) s = simReducer(s, { type: 'TICK', dt: 5 });
  test('đơn đứng yên quá 12h → cảnh báo + chuyển CSKH + tiếp tục', () => {
    assert.ok(has(s, 'đứng yên quá 12 giờ'));
    assert.ok(has(s, 'CSKH đã xử lý'));
    assert.ok(s.notifications.some((n) => n.kind === 'alert'));
    assert.ok(selectEta(s).delayMin >= 12 * 60);
  });
  const done = (() => { let x = s; let k = 0; while (!x.finished && k++ < 6000) x = simReducer(x, { type: 'TICK', dt: 5 }); return x; })();
  test('sau khi xử lý, đơn vẫn giao thành công', () => assert.ok(done.finished));

  // Presenter: "Shipper quên xác nhận" rồi "Bưu cục quét nhập"
  s = simReducer(null, { type: 'START', cfg: cfgFor('A') });
  assert.ok(adminAvailability(s).forgot);
  s = simReducer(s, { type: 'ADMIN', cmd: 'forgot' });
  test('"Shipper quên xác nhận" → mở hộp hỏi', () => assert.equal(s.prompt.status, 'open'));
  assert.ok(adminAvailability(s).hubScan);
  s = simReducer(s, { type: 'ADMIN', cmd: 'hub_scan' });
  test('"Bưu cục quét nhập" khi chưa xác nhận → gắn cờ thiếu mốc', () => {
    assert.ok(s.flags.missingPickup);
    assert.ok(s.hold && s.hold.kind === 'cskh');
    assert.ok(s.events.some((e) => e.flags.includes('missing_confirm')));
  });

  // Presenter: shipper cập nhật ảnh muộn
  s = simReducer(null, { type: 'START', cfg: cfgFor('A') });
  s = simReducer(s, { type: 'ADMIN', cmd: 'forgot' });
  assert.ok(adminAvailability(s).pickupPhoto);
  s = simReducer(s, { type: 'ADMIN', cmd: 'pickup_photo' });
  test('shipper cập nhật ảnh muộn → có mốc, đóng hộp hỏi', () => {
    assert.ok(s.pickupConfirmed);
    assert.equal(s.prompt.status, 'closed');
    s = simReducer(s, { type: 'ADMIN', cmd: 'hub_scan' });
    assert.ok(!s.flags.missingPickup);
  });

  // Presenter: "Bưu tá báo giao nhưng chưa giao" ở đơn thường
  s = simReducer(null, { type: 'START', cfg: cfgFor('A') });
  assert.ok(adminAvailability(s).misdeliver);
  s = simReducer(s, { type: 'ADMIN', cmd: 'misdeliver' });
  let m = 0;
  while (!(s.prompt && s.prompt.kind === 'delivery') && m++ < 100) s = simReducer(s, { type: 'TICK', dt: 5 });
  test('"Bưu tá báo giao nhưng chưa giao" → hỏi người nhận', () => {
    assert.equal(s.prompt.kind, 'delivery');
    assert.equal(s.prompt.status, 'open');
    assert.ok(!adminAvailability(s).misdeliver);
  });
  s = simReducer(s, { type: 'ADMIN', cmd: 'deliver' });
  test('"Giao thành công" khi đang hỏi người nhận → giao lại đúng OTP rồi hoàn tất', () => {
    assert.ok(s.finished);
    assert.ok(s.deliveryConfirmed);
    assert.ok(s.events.some((e) => e.stepId === 'redelivered'));
  });

  // Bấm "Giao thành công" ở Đơn 4 từ đầu → phải giao đúng nơi + khớp mã, KHÔNG được hoàn tất qua mốc giao sai
  s = simReducer(null, { type: 'START', cfg: cfgFor('GIAO') });
  s = simReducer(s, { type: 'ADMIN', cmd: 'deliver' });
  test('"Giao thành công" ở Đơn 4 từ đầu → giao bình thường (đúng nơi, khớp mã), không qua mốc giao sai', () => {
    assert.ok(s.finished);
    const ids = s.events.map((e) => e.stepId);
    assert.ok(!ids.includes('delivered_mismatch'));
    assert.ok(ids.indexOf('arrived_recipient') < ids.indexOf('delivered'));
    assert.equal(s.deliverySource, 'otp');
  });
  // Mọi cách tua nhanh: "Hoàn tất" luôn đi sau một mốc có ảnh + chữ ký người nhận
  for (const [label, key, answer] of [['Đơn 4 · Đã nhận rồi tua', 'GIAO', 'yes'], ['Đơn 4 · bỏ qua hộp hỏi rồi tua', 'GIAO', null]]) {
    let x = simReducer(null, { type: 'START', cfg: cfgFor(key) });
    let g = 0;
    while (!(x.prompt && x.prompt.kind === 'delivery') && g++ < 5000) x = simReducer(x, { type: 'TICK', dt: 5 });
    if (answer) x = simReducer(x, { type: 'PROMPT_ANSWER', answer });
    x = simReducer(x, { type: 'ADMIN', cmd: 'deliver' });
    test(`${label} → "Hoàn tất" có bằng chứng giao (ảnh + chữ ký)`, () => {
      assert.ok(x.finished);
      const ev = x.events.filter((e) => e.photo && e.photo.kind === 'delivery');
      assert.ok(ev.length >= 1 && ev.every((e) => e.photo.signature === 'recipient'));
      assert.ok(x.deliveryConfirmed);
    });
  }

  // Giao thành công ngay
  s = simReducer(null, { type: 'START', cfg: cfgFor('B') });
  s = simReducer(s, { type: 'ADMIN', cmd: 'deliver' });
  test('"Giao thành công" → kết thúc ngay', () => { assert.ok(s.finished); assert.ok(has(s, 'Giao hàng thành công')); });
}

console.log('Tần suất thông báo');
{
  const r2 = run(cfgFor('A', { freq: 120 }));
  const r3 = run(cfgFor('A', { freq: 180 }));
  const st = run(cfgFor('A', { freq: 'status' }));
  const count = (s, k) => s.notifications.filter((n) => n.kind === k).length;
  test('mỗi 2h báo nhiều hơn mỗi 3h; "chỉ khi đổi trạng thái" không báo định kỳ', () => {
    assert.ok(count(r2, 'reminder') > count(r3, 'reminder'), `${count(r2, 'reminder')} vs ${count(r3, 'reminder')}`);
    assert.equal(count(st, 'reminder'), 0);
    assert.ok(st.notifications.length < r2.notifications.length);
  });
  console.log('   2h:', count(r2, 'reminder'), '| 3h:', count(r3, 'reminder'), '| status:', count(st, 'reminder'), 'nhắc định kỳ');
}

console.log('Vị trí & chặng cuối');
{
  let s = simReducer(null, { type: 'START', cfg: cfgFor('A') });
  let k = 0;
  while (!s.events.some((e) => e.stepId === 'out_for_delivery') && k++ < 6000) s = simReducer(s, { type: 'TICK', dt: 5 });
  const lm0 = selectLastMile(s);
  for (let i = 0; i < 5; i++) s = simReducer(s, { type: 'TICK', dt: 5 });
  const lm1 = selectLastMile(s);
  test('bưu tá di chuyển và khoảng cách giảm dần ở chặng cuối', () => { assert.ok(lm0 && lm1); assert.ok(lm1.remainingM < lm0.remainingM); });
  test('vị trí hàng được mô tả khi đi trên tuyến', () => assert.ok(selectPosition(s).sentence.length > 5));
}

console.log('Nhịp độ demo (đồng hồ co giãn + toast)');
{
  // Mô phỏng thời gian THỰC như trên trình duyệt: mỗi nhịp 0,1 giây, tốc độ = DEFAULT_SPEED × clockWarp.
  // Mô phỏng đúng cách NotificationBridge bật toast: nhắc định kỳ bị chặn thì giữ chờ, đủ khoảng lặng mới bật.
  const realRun = (key, extra = {}) => {
    let s = simReducer(null, { type: 'START', cfg: cfgFor(key, extra) });
    let real = 0;
    let lastToast = -1e9;
    let toasts = 0;
    let reminders = 0;
    let pending = false;
    let seen = 0;
    while (!s.finished && real < 600) {
      if (s.prompt && s.prompt.status === 'open') s = simReducer(s, { type: 'PROMPT_ANSWER', answer: 'yes' });
      s = simReducer(s, { type: 'TICK', dt: 0.1 * DEFAULT_SPEED * clockWarp(s) });
      real += 0.1;
      for (const n of s.notifications.slice(seen)) {
        const p = toastPolicy(n);
        if (p === 'skip') continue;
        if (p === 'reminder' && (real - lastToast) * 1000 < TOAST.reminderQuietMs) { pending = true; continue; }
        toasts++; lastToast = real;
        if (p === 'reminder') reminders++;
        else pending = false;
      }
      seen = s.notifications.length;
      if (pending && !s.finished && s.freq !== 'status' && (real - lastToast) * 1000 >= TOAST.reminderQuietMs) {
        toasts++; reminders++; lastToast = real; pending = false;
      }
      // thời điểm thực mỗi dòng giao diện cũ xuất hiện
      for (const r of selectLegacyRows(s)) if (!s.legacySeenAt?.[r.id]) s = { ...s, legacySeenAt: { ...(s.legacySeenAt || {}), [r.id]: real } };
    }
    const times = Object.values(s.legacySeenAt || {}).sort((x, y) => x - y);
    const maxGap = Math.max(...times.slice(1).map((t, i) => t - times[i]));
    return { s, real, toasts, reminders, maxGap, notifs: s.notifications.length };
  };
  {
    const full = realRun('A', { freq: 120 });
    const status = realRun('A', { freq: 'status' });
    test('"Báo đầy đủ" thật sự hiện nhắc vị trí; "Chỉ khi đổi trạng thái" thì không — khác nhau thấy được', () => {
      assert.ok(full.reminders >= 1, `nhắc hiện ra: ${full.reminders}`);
      assert.equal(status.reminders, 0);
      assert.ok(status.toasts < full.toasts, `${status.toasts} vs ${full.toasts}`);
    });
    console.log(`   Báo đầy đủ: ${full.toasts} toast (${full.reminders} nhắc vị trí) · Chỉ khi đổi trạng thái: ${status.toasts} toast`);
  }
  for (const key of ['A', 'B', 'QUEN', 'GIAO']) {
    const r = realRun(key);
    test(`đơn ${key}: ~15–35 giây thực, ≤ 14 toast, giao diện cũ không chờ quá 12 giây liền`, () => {
      assert.ok(r.s.finished);
      assert.ok(r.real >= 15 && r.real <= 35, `${r.real.toFixed(1)} giây`);
      assert.ok(r.toasts <= 14, `${r.toasts} toast`);
      assert.ok(r.maxGap <= 12, `chờ ${r.maxGap.toFixed(1)} giây`);
    });
    console.log(`   ${key}: ${r.real.toFixed(1)} giây thực · ${r.toasts} toast / ${r.notifs} thông báo trong chuông · giao diện cũ chờ lâu nhất ${r.maxGap.toFixed(1)} giây`);
  }
}

console.log(`\n${passed} kiểm tra đạt${process.exitCode ? ' — CÓ LỖI' : ''}`);
