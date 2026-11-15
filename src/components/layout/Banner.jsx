import { useMemo } from 'react';
import { useToast } from '../../state/ToastContext.jsx';

// Ảnh banner minh họa tự vẽ (đường chân trời lúc hoàng hôn) — không dùng ảnh của Viettel Post.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Skyline() {
  const { far, near, windows } = useMemo(() => {
    const rnd = mulberry32(20261112);
    const mk = (count, minH, maxH, minW, maxW, base) => {
      const arr = [];
      let x = -20;
      for (let i = 0; i < count && x < 1480; i++) {
        const w = minW + rnd() * (maxW - minW);
        const h = minH + rnd() * (maxH - minH);
        arr.push({ x, y: base - h, w, h });
        x += w + rnd() * 6;
      }
      return arr;
    };
    const far = mk(60, 40, 120, 22, 48, 235);
    const near = mk(48, 30, 150, 26, 62, 235);
    const windows = [];
    for (const b of near) {
      const cols = Math.floor(b.w / 9);
      const rows = Math.floor(b.h / 12);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() > 0.62) windows.push({ x: b.x + 4 + c * 9, y: b.y + 6 + r * 12, o: 0.35 + rnd() * 0.55 });
        }
      }
    }
    return { far, near, windows };
  }, []);

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 235" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1a3a" />
          <stop offset="0.55" stopColor="#3a3d7a" />
          <stop offset="0.85" stopColor="#c0577c" />
          <stop offset="1" stopColor="#f2a06a" />
        </linearGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.25" />
          <stop offset="1" stopColor="#000" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="1440" height="235" fill="url(#sky)" />
      {far.map((b, i) => (
        <rect key={`f${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="#2b2f63" opacity="0.7" />
      ))}
      {near.map((b, i) => (
        <rect key={`n${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="#0f1536" />
      ))}
      {windows.map((w, i) => (
        <rect key={`w${i}`} x={w.x} y={w.y} width="4" height="6" fill="#ffd98a" opacity={w.o} />
      ))}
      <rect width="1440" height="235" fill="url(#shade)" />
    </svg>
  );
}

export function Banner({ title = 'TRA CỨU HÀNH TRÌNH ĐƠN HÀNG', subtitle = '“Mạng chuyển phát nhanh rộng khắp"' }) {
  return (
    <section className="relative h-[130px] overflow-hidden sm:h-[180px] lg:h-[235px]">
      <Skyline />
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="m-0 mb-2 text-[15px] font-extrabold uppercase tracking-[2px] text-white sm:mb-4 sm:text-[22px] sm:tracking-[5px] lg:text-[26px] lg:tracking-[7px]">
            {title}
          </h1>
          <p className="m-0 text-[13px] text-white sm:text-[16px] sm:tracking-[2px] lg:text-[20px] lg:tracking-[5px]">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}

export function Breadcrumb({ current = 'Tra cứu hành trình đơn hàng' }) {
  const { inert } = useToast();
  return (
    <div className="mb-5 w-full bg-[#f0f0f0] px-0 py-2">
      <div className="mx-auto max-w-[1140px] px-[15px]">
        <p className="m-0 text-[14px] sm:text-[16px]">
          <a href="#" onClick={inert} className="text-black hover:text-vt">Trang chủ</a> » <span aria-current="page">{current}</span>
        </p>
      </div>
    </div>
  );
}
