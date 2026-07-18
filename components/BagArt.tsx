/** كيس خزف مرسوم خطّياً — العنصر البصري البطل بكل المشاهد */
export default function BagArt({
  latin,
  accent = "var(--accent)",
  stroke = "currentColor",
  className = "",
}: {
  latin?: string;
  accent?: string;
  stroke?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 150"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* جسم الكيس */}
      <path d="M25 38 h70 v88 a12 12 0 0 1 -12 12 H37 a12 12 0 0 1 -12 -12 Z" />
      {/* طيّة الأعلى */}
      <path d="M25 38 L32 20 h56 l7 18" />
      <line x1="32" y1="20" x2="32" y2="38" opacity="0.35" />
      <line x1="88" y1="20" x2="88" y2="38" opacity="0.35" />
      {/* الملصق */}
      <rect x="38" y="62" width="44" height="44" rx="8" stroke={accent} />
      {/* فنجان + بخار */}
      <path
        d="M50 80 h16 v8 a8 8 0 0 1 -16 0 Z M66 82 h4 a4 4 0 0 1 0 8 h-4"
        stroke={accent}
        strokeWidth="2"
      />
      <path
        d="M55 73 q2 -3 0 -5 M61 73 q2 -3 0 -5"
        stroke={accent}
        strokeWidth="1.8"
        opacity="0.7"
      />
      {latin && (
        <text
          x="60"
          y="145"
          textAnchor="middle"
          fill={stroke}
          stroke="none"
          style={{
            font: "600 7px 'IBM Plex Mono', monospace",
            letterSpacing: "0.35em",
            opacity: 0.55,
          }}
        >
          {latin}
        </text>
      )}
    </svg>
  );
}
