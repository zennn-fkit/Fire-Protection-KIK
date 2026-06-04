import { useMemo } from 'react';
import hydrantSvg from '../../assets/hydrant.svg';

const CX = 75, CY = 75;
const START = 140, SWEEP = 260;

function ptc(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [+(cx + r * Math.cos(rad)).toFixed(2), +(cy + r * Math.sin(rad)).toFixed(2)];
}

function arcD(r, startDeg, endDeg, cx = CX, cy = CY) {
  const [sx, sy] = ptc(cx, cy, r, startDeg);
  const [ex, ey] = ptc(cx, cy, r, endDeg);
  const span  = ((endDeg - startDeg) + 360) % 360;
  const large = span > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

const VALVE_STATUS = {
  OPEN:   { color: '#10b981', label: 'TERBUKA',  bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  CLOSED: { color: '#f87171', label: 'TERTUTUP', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
};

export default function HydrantPanel({ pressure = 0, valve_status = 'CLOSED', maxPressure = 12 }) {
  const vs  = VALVE_STATUS[valve_status] || VALVE_STATUS.CLOSED;
  const pct = Math.max(0, Math.min(1, pressure / maxPressure));
  const pressColor = pressure < 2 ? '#f87171' : pressure < 4 ? '#f59e0b' : '#10b981';

  const valueEndDeg = START + pct * SWEEP;
  const [dotX, dotY] = ptc(CX, CY, 54, valueEndDeg);

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 30; i++) {
      const f = i / 30;
      const deg = START + f * SWEEP;
      const isMajor = i % 5 === 0;
      const [ox, oy] = ptc(CX, CY, 46, deg);
      const [ix, iy] = ptc(CX, CY, isMajor ? 40 : 43, deg);
      arr.push({ ox, oy, ix, iy, isMajor });
    }
    return arr;
  }, []);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 150 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 12px 0 12px', marginBottom: 8 }}>
        🚒 Smart Hydrant Monitoring
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1, paddingBottom: 12 }}>

        {/* Left: Hydrant Icon + Valve */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={hydrantSvg} alt="Hydrant" width={22} height={22} style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.6)) brightness(1.8)' }} />
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800,
            color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`,
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
          }}>
            {vs.label}
          </div>
          <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Status Katup
          </div>
        </div>

        {/* Right: Speedometer Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 }}>
            Tekanan Hydrant
          </div>
          
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <svg width="250" height="250" viewBox="0 10 150 110" style={{ overflow: 'visible' }}>
              <defs>
                <filter id="hy-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <linearGradient id="hy-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={pressColor} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={pressColor} stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Background Track */}
              <path d={arcD(54, START, START + SWEEP)} fill="none"
                stroke="#1a2b4c" strokeWidth="4" strokeLinecap="round"
              />

              {/* Ticks */}
              {ticks.map((t, i) => (
                <line key={i} x1={t.ox} y1={t.oy} x2={t.ix} y2={t.iy}
                  stroke="#334155" strokeWidth={t.isMajor ? "1.2" : "0.9"} strokeLinecap="round"
                />
              ))}

              {/* Active Value Track */}
              {pct > 0.01 && (
                <path d={arcD(54, START, valueEndDeg)} fill="none"
                  stroke="url(#hy-grad)" strokeWidth="4" strokeLinecap="round"
                  filter="url(#hy-glow)"
                  style={{ transition: 'd 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}

              {/* Value Dot (Thumb) */}
              {pct > 0.01 && (
                <circle cx={dotX} cy={dotY} r={3.5} fill="#ffffff"
                  filter="url(#hy-glow)"
                  style={{ transition: 'cx 0.8s cubic-bezier(0.4, 0, 0.2, 1), cy 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}

              {/* Value Text */}
              <text x={CX} y={CY + 12} textAnchor="middle" fill="#ffffff"
                fontSize="18" fontWeight="800" fontFamily="'Inter', sans-serif"
                style={{ textShadow: `0 0 10px ${pressColor}60` }}
              >
                {pressure.toFixed(1)}
              </text>

              {/* Unit Text */}
              <text x={CX} y={CY + 28} textAnchor="middle" fill="#94a3b8"
                fontSize="8" fontWeight="600"
              >
                Bar
              </text>
            </svg>
          </div>

          {/* Status Pill */}
          <div style={{
            marginTop: 2,
            padding: '2px 8px',
            borderRadius: 999,
            backgroundColor: `${pressColor}20`,
            border: `1px solid ${pressColor}40`,
            color: pressColor,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: pressColor, boxShadow: `0 0 6px ${pressColor}` }} />
            {pressure < 2 ? 'BAHAYA' : pressure < 4 ? 'WASPADA' : 'NORMAL'}
          </div>
        </div>

      </div>
    </div>
  );
}
