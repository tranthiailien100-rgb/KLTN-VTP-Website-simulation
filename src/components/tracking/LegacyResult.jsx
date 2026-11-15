import { useSim } from '../../state/SimContext.jsx';
import { SimControls } from './SimControls.jsx';
import { selectLegacyRows } from '../../sim/engine.js';
import { fmtDateTime } from '../../sim/format.js';
import { ORDER_INFO } from '../../config/journeys.js';

/**
 * GIAO DIỆN TRA CỨU HIỆN TẠI: bảng trạng thái dạng chữ, cập nhật thưa và chậm,
 * không ảnh, không bản đồ, không thông báo.
 */
export function LegacyResult() {
  const { state: st } = useSim();
  if (!st) return null;
  const rows = selectLegacyRows(st).slice().reverse(); // mới nhất ở trên
  const lastVisible = rows.length ? rows[0] : null;

  return (
    <section className="mx-auto mt-2 max-w-[1140px] px-[15px] pb-10">
      <div className="rounded border border-[#dedede] bg-[#f5f5f5] p-4 sm:p-6">
        <h2 className="m-0 mb-4 border-b-2 border-dotted border-vt pb-2.5 text-[20px] font-semibold text-vt">Hành trình đơn hàng</h2>

        <div className="mb-4 grid gap-x-8 gap-y-1 text-[14px] text-ink sm:grid-cols-2">
          <p className="m-0"><span className="font-bold">Mã phiếu gửi:</span> {st.code}</p>
          <p className="m-0"><span className="font-bold">Dịch vụ:</span> {ORDER_INFO.parcel.service}</p>
          <p className="m-0"><span className="font-bold">Người gửi:</span> {ORDER_INFO.sender.name}</p>
          <p className="m-0"><span className="font-bold">Người nhận:</span> {ORDER_INFO.receiver.name}</p>
          <p className="m-0"><span className="font-bold">Trọng lượng:</span> {String(ORDER_INFO.parcel.weightKg).replace('.', ',')} kg</p>
          <p className="m-0"><span className="font-bold">Cập nhật lần cuối:</span> {lastVisible ? fmtDateTime(st.startMs, lastVisible.t) : '—'}</p>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-[#44494d] text-white">
                <th className="px-3 py-2.5 font-semibold">Ngày giờ</th>
                <th className="px-3 py-2.5 font-semibold">Trạng thái</th>
                <th className="px-3 py-2.5 font-semibold">Bưu cục / Địa điểm</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-[#e5e5e5] ${i === 0 ? 'font-bold text-ink' : 'text-gray-700'}`}>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtDateTime(st.startMs, r.t)}</td>
                  <td className="px-3 py-2.5">{r.text}</td>
                  <td className="px-3 py-2.5">{r.placeName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <SimControls />
      </div>
    </section>
  );
}
