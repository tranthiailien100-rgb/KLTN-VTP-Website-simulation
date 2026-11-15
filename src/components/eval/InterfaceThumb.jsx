/** Ảnh thu nhỏ minh họa hai giao diện (vẽ bằng SVG). */
export function InterfaceThumb({ kind }) {
  if (kind === 'current') {
    return (
      <svg viewBox="0 0 320 200" className="block h-auto w-full rounded-lg border border-gray-200 bg-white" role="img" aria-label="Ảnh thu nhỏ giao diện tra cứu hiện tại">
        <rect width="320" height="26" fill="#ee0033" />
        <rect x="12" y="8" width="44" height="10" rx="3" fill="#fff" opacity=".9" />
        <rect x="250" y="8" width="58" height="10" rx="5" fill="#44494d" />
        <rect y="26" width="320" height="22" fill="#fff" />
        <g fill="#cbd5e1"><rect x="12" y="34" width="34" height="6" rx="3" /><rect x="56" y="34" width="28" height="6" rx="3" /><rect x="94" y="34" width="38" height="6" rx="3" /><rect x="142" y="34" width="30" height="6" rx="3" /></g>
        <rect y="48" width="320" height="34" fill="#3a3d7a" />
        <rect x="90" y="60" width="140" height="8" rx="4" fill="#fff" />
        <rect y="82" width="320" height="14" fill="#f0f0f0" />
        <rect x="14" y="110" width="292" height="78" rx="3" fill="#f5f5f5" stroke="#dedede" />
        <rect x="24" y="118" width="70" height="7" rx="3" fill="#ee0033" />
        <rect x="24" y="130" width="272" height="10" fill="#44494d" />
        <g fill="#9ca3af">
          <rect x="30" y="146" width="40" height="5" rx="2" /><rect x="100" y="146" width="80" height="5" rx="2" /><rect x="220" y="146" width="60" height="5" rx="2" />
          <rect x="30" y="158" width="40" height="5" rx="2" /><rect x="100" y="158" width="70" height="5" rx="2" /><rect x="220" y="158" width="50" height="5" rx="2" />
          <rect x="30" y="170" width="40" height="5" rx="2" /><rect x="100" y="170" width="90" height="5" rx="2" /><rect x="220" y="170" width="60" height="5" rx="2" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 200" className="block h-auto w-full rounded-lg border border-gray-200 bg-white" role="img" aria-label="Ảnh thu nhỏ giao diện tracking mới">
      <rect width="320" height="26" fill="#ee0033" />
      <rect x="12" y="8" width="44" height="10" rx="3" fill="#fff" opacity=".9" />
      <circle cx="238" cy="13" r="7" fill="#fff" opacity=".9" /><circle cx="243" cy="8" r="3.5" fill="#fff" stroke="#ee0033" />
      <rect x="254" y="8" width="54" height="10" rx="5" fill="#44494d" />
      <rect x="10" y="34" width="300" height="34" rx="6" fill="#fff" stroke="#e5e7eb" />
      <rect x="18" y="42" width="110" height="9" rx="4" fill="#111827" />
      <rect x="18" y="55" width="150" height="5" rx="2" fill="#9ca3af" />
      <rect x="222" y="42" width="80" height="11" rx="4" fill="#ee0033" opacity=".9" />
      <g>
        <rect x="10" y="74" width="182" height="116" rx="6" fill="#e0f2e9" stroke="#e5e7eb" />
        <path d="M24 170c30-6 40-40 70-44s40 22 80-30" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="5 5" />
        <path d="M24 170c30-6 40-40 70-44s28 10 50-12" fill="none" stroke="#ee0033" strokeWidth="4" strokeLinecap="round" />
        <circle cx="144" cy="114" r="8" fill="#ee0033" stroke="#fff" strokeWidth="3" />
        <circle cx="24" cy="170" r="5" fill="#fff" stroke="#ee0033" strokeWidth="2" /><circle cx="174" cy="96" r="5" fill="#fff" stroke="#9ca3af" strokeWidth="2" />
      </g>
      <g>
        <rect x="198" y="74" width="112" height="116" rx="6" fill="#fff" stroke="#e5e7eb" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(0 ${i * 28})`}>
            <circle cx="212" cy="90" r="6" fill={i === 0 ? '#ee0033' : '#fff'} stroke={i === 0 ? '#ee0033' : '#cbd5e1'} strokeWidth="2" />
            <rect x="224" y="84" width="70" height="6" rx="3" fill="#374151" />
            <rect x="224" y="95" width="54" height="4" rx="2" fill="#cbd5e1" />
            {i % 2 === 0 && <rect x="272" y="94" width="24" height="16" rx="3" fill="#d6c3a5" />}
          </g>
        ))}
      </g>
    </svg>
  );
}
