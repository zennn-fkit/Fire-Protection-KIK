import { useMemo, useState } from 'react';
import { getStatus, STATUS_COLORS } from '../../utils/thresholds';

const CX = 100, CY = 100;
const START = 140, SWEEP = 260; // Slightly narrower sweep for a cleaner look

function ptc(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [+(cx + r * Math.cos(rad)).toFixed(2), +(cy + r * Math.sin(rad)).toFixed(2)];
}

function arcD(r, startDeg, endDeg) {
  const [sx, sy] = ptc(CX, CY, r, startDeg);
  const [ex, ey] = ptc(CX, CY, r, endDeg);
  const span = ((endDeg - startDeg) + 360) % 360;
  const large = span > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

/**
 * Komponen kartu presentasi visual pengukur radial (Gauge Card).
 * 
 * @component
 * @param {object} props
 * @param {string} props.label - Nama atau judul data sensor (misal: "Tegangan").
 * @param {number} props.value - Nilai aktual sensor yang diukur.
 * @param {string|number} [props.displayValue] - Nilai yang diformat khusus untuk ditampilkan di dalam gauge.
 * @param {number} [props.min=0] - Nilai minimum skala gauge.
 * @param {number} [props.max=100] - Nilai maksimum skala gauge.
 * @param {string} props.unit - Satuan metrik sensor (misal: "Volt AC", "kWh").
 * @param {string} [props.threshKey] - Kunci pencocokan batas toleransi bahaya di file thresholds.js.
 * @param {number} [props.decimals=1] - Jumlah desimal pembulatan angka display.
 * @param {boolean} [props.showReset=false] - Menampilkan tombol reset di bagian bawah (khusus meteran energi).
 * @param {Function} [props.onReset] - Fungsi callback saat tombol reset diklik.
 * @param {React.ComponentType} [props.icon] - Ikon dari lucide-react untuk dipasang di judul kartu.
 */
export default function GaugeCard({
  label, value, displayValue, min = 0, max = 100, unit,
  threshKey, decimals = 1,
  showReset = false, onReset,
  icon: Icon,
}) {
  const [hovered, setHovered] = useState(false);
  const status = threshKey ? getStatus(threshKey, value) : 'normal';
  const sc = STATUS_COLORS[status];
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const id = `gauge-${(label + unit).replace(/[^a-zA-Z0-9]/g, '')}`;

  const valueEndDeg = START + pct * SWEEP;
  const [dotX, dotY] = ptc(CX, CY, 74, valueEndDeg);

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      const deg = START + f * SWEEP;
      const isMajor = i % 4 === 0;
      const [ox, oy] = ptc(CX, CY, 64, deg);
      const [ix, iy] = ptc(CX, CY, isMajor ? 56 : 60, deg);
      arr.push({ ox, oy, ix, iy, isMajor });
    }
    return arr;
  }, []);

  return (
    <div
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 12px',
        height: '100%',
        minHeight: 160,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ...(hovered ? {
          borderColor: sc.stroke,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px ${sc.stroke}35`,
        } : {})
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {Icon && <Icon size={14} color={sc.stroke} style={{ opacity: 0.9 }} />}
        <span>{label}</span>
      </div>

      <div style={{ position: 'relative', marginTop: 10, display: 'flex', justifyContent: 'center' }}>
        <svg width="100%" height="100" viewBox="0 10 200 150" style={{ overflow: 'visible' }}>
          <defs>
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={sc.stroke} stopOpacity="0.6" />
              <stop offset="100%" stopColor={sc.stroke} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path d={arcD(74, START, START + SWEEP)} fill="none"
            stroke="#1a2b4c" strokeWidth="5" strokeLinecap="round"
          />

          {/* Ticks */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.ox} y1={t.oy} x2={t.ix} y2={t.iy}
              stroke="#334155" strokeWidth={t.isMajor ? "2" : "1"} strokeLinecap="round"
            />
          ))}

          {/* Active Value Track */}
          {pct > 0.01 && (
            <path d={arcD(74, START, valueEndDeg)} fill="none"
              stroke={`url(#${id}-grad)`} strokeWidth="5"
              strokeLinecap="round"
              filter={`url(#${id}-glow)`}
              style={{ transition: 'd 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}

          {/* Value Dot (Thumb) */}
          {pct > 0.01 && (
            <circle cx={dotX} cy={dotY} r={4} fill="#ffffff"
              filter={`url(#${id}-glow)`}
              style={{ transition: 'cx 0.8s cubic-bezier(0.4, 0, 0.2, 1), cy 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}

          {/* Value Text */}
          <text x={CX} y={CY + 15} textAnchor="middle" fill="#ffffff"
            fontSize={displayValue && typeof displayValue === 'string' && displayValue.length > 8 ? "18" : "24"} fontWeight="800" fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: `0 0 12px ${sc.stroke}60`, letterSpacing: '-0.02em' }}
          >
            {displayValue !== undefined ? displayValue : (typeof value === 'number' ? value.toFixed(decimals) : value)}
          </text>

          {/* Unit Text */}
          <text x={CX} y={CY + 35} textAnchor="middle" fill="#94a3b8"
            fontSize="13" fontWeight="600"
          >
            {unit}
          </text>
        </svg>
      </div>

      {/* Status Pill */}
      {label?.toUpperCase() !== 'ENERGY' && (
        <div style={{
          marginTop: 8,
          padding: '3px 10px',
          borderRadius: 999,
          backgroundColor: sc.bg,
          border: `1px solid ${sc.stroke}40`,
          color: sc.stroke,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: sc.stroke, boxShadow: `0 0 6px ${sc.stroke}` }} />
          {sc.label.toUpperCase()}
        </div>
      )}

      {/* Reset Button (only for Energy gauge) */}
      {showReset && onReset && (
        <button
          onClick={onReset}
          title="Reset energy meter"
          style={{
            marginTop: 8,
            padding: '4px 12px',
            borderRadius: 8,
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.25)',
            color: '#fb923c',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.25s ease',
            letterSpacing: '0.03em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(249,115,22,0.2)';
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.5)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(249,115,22,0.1)';
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🔄 RESET
        </button>
      )}
    </div>
  );
}
