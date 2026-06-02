import { Droplets, Waves, Gauge } from 'lucide-react';
import Wave from 'react-wavify';

export default function WaterTankPanel({ level = 78, pressure = 0, distanceCm = 0, isReady = true }) {
  const levelColor   = level < 10 ? '#ef4444' : level < 20 ? '#f59e0b' : '#3b82f6';
  const clampedLevel = Math.max(0, Math.min(100, level));
  const statusLabel  = level < 10 ? 'KRITIS' : level < 20 ? 'RENDAH' : 'NORMAL';
  const levelPct = clampedLevel / 100;
  
  const TANK_W = 60;
  const TANK_H = 120;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 16px', minHeight: 180, position: 'relative' }}>
      {!isReady && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(10, 22, 40, 0.6)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'inherit'
        }}>
          <div style={{
            padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            BELUM READY
          </div>
        </div>
      )}
      {/* Title */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        💧 Water Tank Monitoring
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flex: 1 }}>
        {/* Left: Tank Visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            {/* Main tank body (Glassmorphism) */}
            <div style={{
              width: TANK_W, height: TANK_H,
              borderRadius: '14px',
              border: `1px solid rgba(255,255,255,0.15)`,
              borderTop: `1px solid rgba(255,255,255,0.3)`,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: `0 8px 24px 0 rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(255,255,255,0.05)`,
            }}>
              {/* Water fill */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${levelPct * 100}%`,
                background: `linear-gradient(180deg, ${levelColor}90 0%, ${levelColor}D0 100%)`,
                transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `inset 0 0 16px ${levelColor}80, 0 -4px 12px ${levelColor}40`,
              }}>
                {/* Dynamic Wave surface */}
                <div style={{ position: 'absolute', top: -12, left: 0, width: '100%', height: 20, pointerEvents: 'none' }}>
                  <Wave
                    fill={levelColor}
                    paused={false}
                    options={{
                      height: 5,
                      amplitude: 3,
                      speed: 0.2,
                      points: 3
                    }}
                    style={{ position: 'absolute', top: 0, opacity: 0.9 }}
                  />
                  <Wave
                    fill="#ffffff"
                    paused={false}
                    options={{
                      height: 5,
                      amplitude: 5,
                      speed: 0.15,
                      points: 4
                    }}
                    style={{ position: 'absolute', top: 4, opacity: 0.2 }}
                  />
                </div>

                {/* Glowing bubbles */}
                {levelPct > 0.05 && [0, 1, 2, 3].map((i) => {
                  const size = 2 + (i % 2);
                  const leftPct = 20 + (i * 25) % 60;
                  const delay = i * 0.8;
                  const dur = 2 + (i % 2);
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      bottom: '-10px',
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.6)',
                      boxShadow: `0 0 6px rgba(255,255,255,0.8)`,
                      animation: `bubbleRise ${dur}s ease-in ${delay}s infinite`,
                      opacity: 0,
                    }} />
                  );
                })}
              </div>

              {/* Glass Reflection Overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(105deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.1) 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />

              {/* Vertical Light Highlight */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '10%', width: '15%',
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />

              {/* Level text overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                zIndex: 3,
                pointerEvents: 'none',
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 900,
                  fontSize: 16, color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 16px rgba(255,255,255,0.3)',
                }}>
                  {clampedLevel.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metrics list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
          
          {/* Level Metric */}
          <div style={{ 
            background: 'rgba(59,130,246,0.02)', 
            border: '1px solid rgba(59,130,246,0.08)', 
            borderRadius: 8, 
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Level Air
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>
                {clampedLevel.toFixed(0)}%
              </div>
            </div>
            <div style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 8, fontWeight: 800,
              color: levelColor, background: `${levelColor}15`, border: `1px solid ${levelColor}30`,
              letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: levelColor, boxShadow: `0 0 4px ${levelColor}` }} />
              {statusLabel}
            </div>
          </div>

          {/* Height Metric */}
          <div style={{ 
            background: 'rgba(56,189,248,0.02)', 
            border: '1px solid rgba(56,189,248,0.08)', 
            borderRadius: 8, 
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Waves size={14} color="#38bdf8" />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
                Ketinggian Air
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>
                  {distanceCm !== null && distanceCm !== undefined ? Number(distanceCm).toFixed(1) : '—'}
                </span>
                <span style={{ fontSize: 8, color: '#475569', fontWeight: 700 }}>cm</span>
              </div>
            </div>
          </div>

          {/* Pressure Metric */}
          <div style={{ 
            background: 'rgba(59,130,246,0.02)', 
            border: '1px solid rgba(59,130,246,0.08)', 
            borderRadius: 8, 
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gauge size={14} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
                Tekanan Transducer
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}>
                  {pressure !== null && pressure !== undefined ? Number(pressure).toFixed(2) : '—'}
                </span>
                <span style={{ fontSize: 8, color: '#475569', fontWeight: 700 }}>Bar</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes bubbleRise { 
          0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; } 
          20% { opacity: 1; } 
          80% { opacity: 0.8; }
          100% { transform: translateY(-90px) translateX(-6px) scale(1.3); opacity: 0; } 
        }
      `}</style>
    </div>
  );
}
