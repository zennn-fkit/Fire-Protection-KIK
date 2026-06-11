import { useMemo } from 'react';
import { Waves } from 'lucide-react';

function getLevelColor(level, maxLevel) {
  const pct = level / maxLevel;
  if (pct < 0.15) return '#ef4444';
  if (pct < 0.30) return '#f59e0b';
  if (pct < 0.85) return '#3b82f6';
  return '#f59e0b';
}

function getLevelStatus(level, maxLevel) {
  const pct = level / maxLevel;
  if (pct < 0.15) return { label: 'KRITIS', color: '#ef4444' };
  if (pct < 0.30) return { label: 'RENDAH', color: '#f59e0b' };
  if (pct < 0.85) return { label: 'NORMAL', color: '#3b82f6' };
  return { label: 'PENUH', color: '#f59e0b' };
}

/** Strip kompak tangki hydrant untuk panel gabung dashboard. */
export default function HydrantTankStrip({
  distanceCm = 0,
  maxDistanceCm = 200,
  title = 'Tangki Hydrant',
  embedded = false,
}) {
  const waterLevelCm = Math.max(0, maxDistanceCm - distanceCm);
  const clampedLevel = Math.max(0, Math.min(maxDistanceCm, waterLevelCm));
  const levelPct = clampedLevel / maxDistanceCm;
  const levelColor = getLevelColor(clampedLevel, maxDistanceCm);
  const status = getLevelStatus(clampedLevel, maxDistanceCm);

  const TANK_H = 92;
  const TANK_W = 46;

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 4; i++) {
      const y = TANK_H - (i / 4) * TANK_H;
      arr.push({ y, val: ((i / 4) * maxDistanceCm).toFixed(0) });
    }
    return arr;
  }, [maxDistanceCm, TANK_H]);

  return (
    <div
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingLeft: embedded ? 14 : 0,
        borderLeft: embedded ? '1px solid rgba(56,189,248,0.12)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Waves size={13} color="#38bdf8" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: '#e2e8f0',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {title}
            </div>
            <div style={{ fontSize: 7, color: '#64748b' }}>HC-SR04 • cm</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', background: '#10b981',
            boxShadow: '0 0 5px #10b981',
          }} />
          <span style={{ fontSize: 7, color: '#10b981', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
          <svg width="22" height={TANK_H + 4} style={{ overflow: 'visible' }}>
            {ticks.map((t, i) => (
              <text key={i} x="18" y={t.y + 4} textAnchor="end"
                fill="#475569" fontSize="5" fontFamily="'JetBrains Mono', monospace"
              >
                {t.val}
              </text>
            ))}
          </svg>
          <div style={{
            width: TANK_W, height: TANK_H, borderRadius: '3px 3px 8px 8px',
            border: `1.5px solid ${levelColor}45`, background: '#040b16',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${levelPct * 100}%`,
              background: `linear-gradient(180deg, ${levelColor}55, ${levelColor})`,
              transition: 'height 1s ease',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
                fontSize: 13, color: '#fff', lineHeight: 1,
              }}>
                {clampedLevel.toFixed(1)}
              </span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)' }}>cm</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
            padding: '3px 8px', borderRadius: 6,
            background: `${status.color}12`, border: `1px solid ${status.color}35`,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: status.color, boxShadow: `0 0 4px ${status.color}`,
            }} />
            <span style={{ fontSize: 8, color: status.color, fontWeight: 800 }}>{status.label}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {[
              { label: 'Tinggi', value: `${clampedLevel.toFixed(1)}`, unit: 'cm', color: levelColor },
              { label: 'Sonar', value: `${distanceCm.toFixed(1)}`, unit: 'cm', color: '#94a3b8' },
              { label: 'Isi', value: `${(levelPct * 100).toFixed(0)}`, unit: '%', color: levelColor },
            ].map(m => (
              <div key={m.label} style={{
                padding: '5px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(26,53,88,0.45)',
              }}>
                <div style={{ fontSize: 7, color: '#475569', fontWeight: 600, marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, color: m.color, lineHeight: 1.1 }}>
                  {m.value}<span style={{ fontSize: 7, fontWeight: 600, color: '#64748b', marginLeft: 2 }}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 7, color: '#475569', fontWeight: 600 }}>LEVEL</span>
              <span style={{ fontSize: 7, color: levelColor, fontWeight: 700 }}>{(levelPct * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: 4, background: '#0d1f38', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${levelPct * 100}%`, borderRadius: 99,
                background: `linear-gradient(90deg, #1d4ed8, ${levelColor})`,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
