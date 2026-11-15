import { fmtCoord } from '../../sim/format.js';

/**
 * Ảnh bằng chứng MINH HỌA (SVG tự vẽ, không có người thật).
 * kind: 'pickup' | 'weigh' | 'hub_in' | 'delivery' | 'qr' | 'receipt'
 */
const LABEL = {
  pickup: 'ẢNH LẤY HÀNG',
  weigh: 'ẢNH CÂN HÀNG',
  hub_in: 'ẢNH NHẬP BƯU CỤC',
  delivery: 'ẢNH GIAO HÀNG',
  qr: 'MÃ QR ĐƠN HÀNG',
  receipt: 'BIÊN NHẬN ĐIỆN TỬ',
  receipt_delivered: 'BIÊN NHẬN GIAO HÀNG',
};
const labelOf = (photo) => LABEL[photo.kind === 'receipt' && photo.delivered ? 'receipt_delivered' : photo.kind];

/** Ô vuông kiểu QR, sinh cố định từ mã đơn (hình minh họa, không quét được). */
function PseudoQr({ x, y, size, seed }) {
  const n = 21;
  const c = size / n;
  let h = 2166136261;
  for (const ch of String(seed || '0')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const finder = (i, j) => (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
  const cells = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!finder(i, j) && rnd() < 0.48) cells.push(<rect key={`${i}-${j}`} x={x + j * c} y={y + i * c} width={c} height={c} />);
  const eye = (ex, ey) => (
    <g key={`${ex}-${ey}`}>
      <rect x={ex} y={ey} width={c * 7} height={c * 7} />
      <rect x={ex + c} y={ey + c} width={c * 5} height={c * 5} fill="#fff" />
      <rect x={ex + c * 2} y={ey + c * 2} width={c * 3} height={c * 3} />
    </g>
  );
  return (
    <g fill="#111827">
      <rect x={x - c} y={y - c} width={size + 2 * c} height={size + 2 * c} fill="#fff" />
      {cells}
      {eye(x, y)}
      {eye(x + c * (n - 7), y)}
      {eye(x, y + c * (n - 7))}
    </g>
  );
}

function Parcel({ x, y, w = 110, h = 80, label = true }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="#c99a63" />
      <rect x={x} y={y} width={w} height={h * 0.22} fill="#b8864f" />
      <rect x={x + w / 2 - 7} y={y} width="14" height={h} fill="#e9d9bb" opacity=".85" />
      {label && (
        <>
          <rect x={x + 10} y={y + h * 0.45} width={w * 0.34} height={h * 0.32} rx="2" fill="#fff" />
          <path d={`M${x + 14} ${y + h * 0.52}h${w * 0.26}M${x + 14} ${y + h * 0.6}h${w * 0.2}M${x + 14} ${y + h * 0.68}h${w * 0.26}`} stroke="#9ca3af" strokeWidth="1.5" />
        </>
      )}
    </g>
  );
}

function Scene({ kind, weight, code, delivered, method }) {
  if (kind === 'qr') {
    return (
      <>
        <rect width="400" height="300" fill="#d9dee3" />
        <rect y="200" width="400" height="100" fill="#8d6b4b" />
        <rect y="200" width="400" height="12" fill="#a98563" />
        {/* điện thoại người gửi */}
        <rect x="140" y="22" width="120" height="228" rx="16" fill="#1f2937" />
        <rect x="148" y="38" width="104" height="196" rx="6" fill="#fff" />
        <text x="200" y="58" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#374151">MÃ GỬI TẠI QUẦY</text>
        <PseudoQr x={160} y={68} size={80} seed={code} />
        <text x="200" y="172" textAnchor="middle" fontSize="10" fontWeight="800" fill="#111827" fontFamily="monospace">{code}</text>
        <rect x="160" y="184" width="80" height="16" rx="8" fill="#ee0033" />
        <text x="200" y="195" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">ĐÃ QUÉT</text>
        {/* máy quét */}
        <path d="M282 150l46-28 12 20-46 28z" fill="#374151" />
        <path d="M282 150l-40 0" stroke="#ef4444" strokeWidth="2" opacity=".7" />
      </>
    );
  }
  if (kind === 'receipt') {
    return (
      <>
        <rect width="400" height="300" fill="#e5e7eb" />
        <g transform="rotate(-3 200 150)">
          <rect x="92" y="24" width="216" height="236" rx="4" fill="#fff" stroke="#d1d5db" />
          <text x="200" y="50" textAnchor="middle" fontSize="12" fontWeight="800" fill="#111827">{delivered ? 'BIÊN NHẬN GIAO HÀNG' : 'BIÊN NHẬN GỬI HÀNG'}</text>
          <text x="200" y="64" textAnchor="middle" fontSize="8" fill="#6b7280">(bản điện tử — minh họa)</text>
          <path d="M108 74h184" stroke="#e5e7eb" strokeWidth="2" />
          <text x="108" y="90" fontSize="9" fill="#6b7280">Mã phiếu gửi</text>
          <text x="292" y="90" textAnchor="end" fontSize="10" fontWeight="800" fill="#111827" fontFamily="monospace">{code}</text>
          <text x="108" y="108" fontSize="9" fill="#6b7280">Khối lượng</text>
          <text x="292" y="108" textAnchor="end" fontSize="10" fontWeight="700" fill="#111827">1,2 kg</text>
          <text x="108" y="126" fontSize="9" fill="#6b7280">{delivered ? 'Xác thực' : 'Dịch vụ'}</text>
          <text x="292" y="126" textAnchor="end" fontSize="10" fontWeight="700" fill="#111827">{delivered ? (method === 'recipient' ? 'Người nhận xác nhận + chữ ký' : 'Mã nhận hàng + chữ ký') : 'Chuyển phát nhanh'}</text>
          <path d="M108 140h184M108 152h150M108 164h170" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />
          <g transform="rotate(-12 236 210)">
            <rect x="186" y="186" width="104" height="44" rx="8" fill="none" stroke={delivered ? '#059669' : '#ee0033'} strokeWidth="3" />
            <text x="238" y="214" textAnchor="middle" fontSize="14" fontWeight="900" fill={delivered ? '#059669' : '#ee0033'}>{delivered ? 'ĐÃ NHẬN' : 'ĐÃ GỬI'}</text>
          </g>
          <PseudoQr x={110} y={184} size={52} seed={`${code}r`} />
        </g>
      </>
    );
  }
  if (kind === 'weigh') {
    return (
      <>
        <rect width="400" height="300" fill="#dfe7ec" />
        <rect y="215" width="400" height="85" fill="#c8d2d9" />
        <rect x="95" y="205" width="210" height="26" rx="8" fill="#4b5563" />
        <rect x="95" y="196" width="210" height="14" rx="6" fill="#6b7280" />
        <rect x="155" y="232" width="90" height="38" rx="6" fill="#374151" />
        <rect x="167" y="241" width="66" height="20" rx="3" fill="#0b3d2e" />
        <text x="200" y="256" textAnchor="middle" fontSize="15" fontWeight="800" fill="#7CFFB0" fontFamily="monospace">{(weight ?? 1.2).toFixed(1).replace('.', ',')} kg</text>
        <Parcel x={145} y={118} w={110} h={78} />
      </>
    );
  }
  if (kind === 'hub_in') {
    return (
      <>
        <rect width="400" height="300" fill="#e7e5e0" />
        {/* kệ phía sau */}
        <rect x="20" y="40" width="360" height="110" fill="#cbd5db" />
        <rect x="20" y="95" width="360" height="6" fill="#9aa7b0" />
        <Parcel x={36} y={52} w={62} h={42} label={false} />
        <Parcel x={110} y={56} w={50} h={38} label={false} />
        <Parcel x={260} y={50} w={70} h={44} label={false} />
        <Parcel x={42} y={106} w={72} h={44} label={false} />
        <Parcel x={300} y={108} w={64} h={42} label={false} />
        {/* quầy */}
        <rect y="190" width="400" height="110" fill="#8d6b4b" />
        <rect y="190" width="400" height="14" fill="#a98563" />
        <Parcel x={135} y={112} w={130} h={92} />
        <rect x="285" y="140" width="62" height="46" rx="4" fill="#1f2937" />
        <rect x="291" y="146" width="50" height="26" rx="2" fill="#86efac" opacity=".85" />
      </>
    );
  }
  if (kind === 'delivery') {
    return (
      <>
        <rect width="400" height="300" fill="#e9e2d3" />
        <rect x="120" y="20" width="160" height="210" rx="6" fill="#8a5a44" />
        <rect x="136" y="36" width="128" height="86" rx="4" fill="#a1705a" />
        <rect x="136" y="132" width="128" height="86" rx="4" fill="#a1705a" />
        <circle cx="258" cy="146" r="6" fill="#e5c07b" />
        <rect x="172" y="8" width="56" height="18" rx="3" fill="#fff" />
        <text x="200" y="21" textAnchor="middle" fontSize="12" fontWeight="800" fill="#374151">45</text>
        <rect y="230" width="400" height="70" fill="#b9b2a3" />
        <rect x="90" y="236" width="220" height="30" rx="4" fill="#5b6b4f" opacity=".85" />
        <Parcel x={155} y={186} w={90} h={62} />
      </>
    );
  }
  // pickup
  return (
    <>
      <rect width="400" height="300" fill="#e9e6df" />
      <rect x="40" y="20" width="150" height="200" rx="6" fill="#9c7b5b" />
      <rect x="54" y="34" width="122" height="172" rx="4" fill="#b08d6b" />
      <circle cx="162" cy="124" r="5" fill="#e5c07b" />
      <rect y="220" width="400" height="80" fill="#c4bcae" />
      <rect x="230" y="150" width="46" height="70" rx="4" fill="#3f7d4a" />
      <ellipse cx="253" cy="150" rx="40" ry="26" fill="#4f9a5c" />
      <Parcel x={95} y={168} w={120} h={86} />
    </>
  );
}

/**
 * Ô chữ ký minh họa (nét vẽ tay, không phải chữ ký thật).
 * who: 'sender' — người gửi ký lúc bàn giao lấy hàng (góc trên bên phải, không đè lên cân / chậu cây);
 *      'recipient' (hoặc true) — người nhận ký lúc nhận hàng (góc dưới bên phải).
 */
function Signature({ who }) {
  const sender = who === 'sender';
  const y = sender ? 40 : 206;
  return (
    <g>
      <rect x="262" y={y} width="124" height="68" rx="6" fill="#fff" stroke="#d1d5db" />
      <text x="270" y={y + 15} fontSize="9" fontWeight="700" fill="#6b7280">{sender ? 'CHỮ KÝ NGƯỜI GỬI' : 'CHỮ KÝ NGƯỜI NHẬN'}</text>
      {sender ? (
        <path d={`M274 ${y + 52}c6-18 14-26 18-16s-8 20 2 18 10-26 18-22-4 18 4 16 8-14 14-10 4 10 12 4 14-6 24-2`} fill="none" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d={`M272 ${y + 50}c8-22 16-30 20-20s-10 26-2 24 14-30 20-26-6 22 2 20 12-12 16-8 6 8 14 2 16-4 22-2`} fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </g>
  );
}

export function Photo({ event, className = '', large = false }) {
  const { photo } = event;
  if (!photo) return null;
  const clock = event.timeLabel || '';
  return (
    <figure className={`m-0 ${className}`}>
      <svg viewBox="0 0 400 300" className="block h-auto w-full rounded-md" role="img" aria-label={`${labelOf(photo) || 'Ảnh'} (minh họa)`}>
        <Scene kind={photo.kind} weight={photo.weight} code={photo.code} delivered={photo.delivered} method={photo.method} />
        {photo.signature && <Signature who={photo.signature} />}
        <rect x="10" y="10" width="86" height="20" rx="10" fill="#000" opacity=".55" />
        <text x="53" y="24" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">Ảnh minh họa</text>
        <rect y="268" width="400" height="32" fill="#000" opacity=".55" />
        <text x="12" y="282" fontSize={large ? 11 : 10} fontWeight="800" fill="#fff">{labelOf(photo)}{clock ? ` • ${clock}` : ''}</text>
        <text x="12" y="294" fontSize="9" fill="#e5e7eb" fontFamily="monospace">GPS {fmtCoord(event.lat, event.lng)}</text>
      </svg>
    </figure>
  );
}
