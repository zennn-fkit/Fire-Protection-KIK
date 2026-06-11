import { useMemo } from 'react';
import { Gauge } from 'lucide-react';

const CX = 80, CY = 80;
const START = 140, SWEEP = 260;

function ptc(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [+(cx + r * Math.cos(rad)).toFixed(2), +(cy + r * Math.sin(rad)).toFixed(2)];
}

function arcD(r, startDeg, endDeg, cx = CX, cy = CY) {
  const [sx, sy] = ptc(cx, cy, r, startDeg);
  const [ex, ey] = ptc(cx, cy, r, endDeg);
  const span = ((endDeg - startDeg) + 360) % 360;
  const large = span > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

function getPressureColor(pressure, max) {
  const pct = pressure / max;
  if (pct < 0.2) return '#f8f541';
  if (pct < 0.5) return '#f59e0b';
  if (pct < 0.85) return '#10b981';
  return '#ef4444';
}

function getPressureStatus(pressure, max) {
  const pct = pressure / max;
  if (pct < 0.2) return { label: 'RENDAH', color: '#f8f541' };
  if (pct < 0.5) return { label: 'WASPADA', color: '#f59e0b' };
  if (pct < 0.85) return { label: 'NORMAL', color: '#10b981' };
  return { label: 'OVER', color: '#ef4444' };
}

export default function PressureSensorCard({
  pressure = 0,
  maxPressure = 10,
  title = 'Sensor Tekanan Air',
  subtitle = 'Pressure Transducer - Bar',
  iconColor = '#3b82f6',
  icon: Icon = Gauge
}) {
  const pct = Math.max(0, Math.min(1, pressure / maxPressure));
  const pressColor = getPressureColor(pressure, maxPressure);
  const status = getPressureStatus(pressure, maxPressure);
  const valueEndDeg = START + pct * SWEEP;
  const [dotX, dotY] = ptc(CX, CY, 58, valueEndDeg);

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 30; i++) {
      const f = i / 30;
      const deg = START + f * SWEEP;
      const isMajor = i % 5 === 0;
      const [ox, oy] = ptc(CX, CY, 50, deg);
      const [ix, iy] = ptc(CX, CY, isMajor ? 42 : 47, deg);
      arr.push({ ox, oy, ix, iy, isMajor });
    }
    return arr;
  }, []);

  const zones = [
    { label: 'OVER', color: '#ff4d4d' },
    { label: 'WASPADA', color: '#f59e0b' },
    { label: 'NORMAL', color: '#10b981' },
    { label: 'RENDAH', color: '#f8f541' },
  ];

  return (
    <div className="card pressure-sensor-card" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 360,
      padding: 0,
      background: `
        linear-gradient(rgba(13,31,56,0.82) 1px, transparent 1px),
        linear-gradient(90deg, rgba(13,31,56,0.7) 1px, transparent 1px),
        radial-gradient(circle at 50% 42%, rgba(59,130,246,0.08), transparent 34%),
        linear-gradient(135deg, #132444 0%, #071326 100%)
      `,
      backgroundSize: '3px 3px, 3px 3px, auto, auto',
      border: '1px solid rgba(59,130,246,0.55)',
      borderRadius: 18,
      boxShadow: 'inset 0 0 36px rgba(15,23,42,0.62), 0 12px 40px rgba(0,0,0,0.22)',
    }}>
      <div className="pressure-sensor-header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px 12px',
        borderBottom: '1px solid rgba(45,63,101,0.65)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${iconColor}1a`,
          border: `1px solid ${iconColor}4d`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 18px ${iconColor}20`,
        }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="pressure-sensor-title" style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#f8fafc',
            textTransform: 'uppercase',
            letterSpacing: 0,
            lineHeight: 1.15,
            textShadow: '0 2px 0 rgba(245,158,11,0.45)',
          }}>
            {title}
          </div>
          <div className="pressure-sensor-subtitle" style={{
            fontSize: 10,
            color: '#64748b',
            marginTop: 5,
            fontWeight: 600,
          }}>
            {subtitle}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 14px #10b981',
            animation: 'pressure-live-pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: 0 }}>LIVE</span>
        </div>
      </div>

      <div className="pressure-sensor-main" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) 200px',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        flex: 1,
        width: '100%',
        maxWidth: 660,
        margin: '0 auto',
        padding: '18px 34px 20px',
      }}>
        <div className="pressure-sensor-gauge-wrap" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 0,
        }}>
          <svg className="pressure-sensor-gauge" width="245" height="215" viewBox="-10 0 180 160" style={{ overflow: 'visible', maxWidth: '100%' }}>
            <defs>
              <filter id="ps-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="ps-text-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.1" floodColor="#000000" floodOpacity="0.9" />
              </filter>
              <linearGradient id="ps-track-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={pressColor} stopOpacity="0.5" />
                <stop offset="100%" stopColor={pressColor} stopOpacity="1" />
              </linearGradient>
            </defs>

            <path d={arcD(58, START, START + SWEEP)} fill="none"
              stroke="#0f2a53" strokeWidth="7" strokeLinecap="round"
            />

            {ticks.map((t, i) => (
              <line key={i} x1={t.ox} y1={t.oy} x2={t.ix} y2={t.iy}
                stroke="#3b4b63" strokeWidth={t.isMajor ? '1.6' : '1'} strokeLinecap="round"
              />
            ))}

            {pct > 0.01 && (
              <path d={arcD(58, START, valueEndDeg)} fill="none"
                stroke="url(#ps-track-grad)" strokeWidth="7" strokeLinecap="round"
                filter="url(#ps-glow)"
                style={{ transition: 'd 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            )}

            {pct > 0.01 && (
              <circle cx={dotX} cy={dotY} r={5} fill="#ffffff"
                filter="url(#ps-glow)"
                style={{ transition: 'cx 0.8s cubic-bezier(0.4, 0, 0.2, 1), cy 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            )}

            <text x={CX} y={CY + 12} textAnchor="middle" fill="#ffffff"
              fontSize="25" fontWeight="900" fontFamily="'Inter', sans-serif"
              filter="url(#ps-text-shadow)"
              style={{ textShadow: `0 0 10px ${pressColor}60` }}
            >
              {pressure.toFixed(2)}
            </text>

            <text x={CX} y={CY + 30} textAnchor="middle" fill="#94a3b8"
              fontSize="10" fontWeight="700"
            >
              Bar
            </text>
          </svg>

          <div style={{
            padding: '6px 18px',
            borderRadius: 999,
            backgroundColor: `${status.color}18`,
            border: `1px solid ${status.color}40`,
            color: status.color,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: -14,
            boxShadow: `0 0 16px ${status.color}18`,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: status.color,
              boxShadow: `0 0 10px ${status.color}`,
            }} />
            {status.label}
          </div>
        </div>

        <div className="pressure-sensor-zones" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zones.map(z => {
            const active = z.label === status.label;
            return (
              <div key={z.label} style={{
                position: 'relative',
                height: 40,
                borderRadius: 6,
                background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015)), ${z.color}0d`,
                border: `1px solid ${active ? `${z.color}80` : 'rgba(148,163,184,0.22)'}`,
                color: z.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 900,
                boxShadow: active
                  ? `0 0 22px ${z.color}24, inset 0 0 20px rgba(255,255,255,0.04)`
                  : 'inset 0 0 16px rgba(0,0,0,0.35)',
                textShadow: active ? `0 0 10px ${z.color}80` : 'none',
              }}>
                <span style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  width: 7,
                  height: 7,
                  transform: 'translateY(-50%)',
                  borderRadius: '50%',
                  background: '#030712',
                  border: '1px solid rgba(148,163,184,0.35)',
                  boxShadow: 'inset 0 0 3px rgba(0,0,0,0.9)',
                }} />
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: z.color,
                  boxShadow: `0 0 16px ${z.color}`,
                  opacity: active ? 1 : 0.75,
                }} />
                <span>{z.label}</span>
                <span style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  width: 7,
                  height: 7,
                  transform: 'translateY(-50%)',
                  borderRadius: '50%',
                  background: '#030712',
                  border: '1px solid rgba(148,163,184,0.35)',
                  boxShadow: 'inset 0 0 3px rgba(0,0,0,0.9)',
                }} />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pressure-live-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        @media (max-width: 900px) {
          .pressure-sensor-card {
            min-height: 0 !important;
          }

          .pressure-sensor-header {
            padding: 18px 20px 14px !important;
            gap: 12px !important;
          }

          .pressure-sensor-title {
            font-size: 14px !important;
          }

          .pressure-sensor-subtitle {
            font-size: 11px !important;
          }

          .pressure-sensor-main {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
            padding: 24px 20px 28px !important;
          }

          .pressure-sensor-gauge {
            width: min(330px, 100%) !important;
            height: auto !important;
          }

          .pressure-sensor-zones {
            width: min(360px, 100%) !important;
            margin: 0 auto !important;
          }
        }

        @media (max-width: 520px) {
          .pressure-sensor-header {
            align-items: flex-start !important;
          }

          .pressure-sensor-main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .pressure-sensor-zones > div {
            height: 48px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
