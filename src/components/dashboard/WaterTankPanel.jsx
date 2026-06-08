import { Gauge, Waves } from 'lucide-react';
import Wave from 'react-wavify';

export default function WaterTankPanel({ level, pressure, distanceCm, isReady = true }) {
  const displayLevel = (level !== undefined && level !== null) ? Number(level) : 78;
  const displayPressure = (pressure !== undefined && pressure !== null) ? Number(pressure) : 5.31;


  // Exact color matching from dashboard (UltrasonicSensorCard)
  const getLevelColor = (lvl) => {
    const pct = lvl / 100;
    if (pct < 0.15) return '#ef4444';   // merah
    if (pct < 0.30) return '#f59e0b';   // amber
    if (pct < 0.85) return '#3b82f6';   // biru (dashboard matching)
    return '#f59e0b';                    // amber
  };

  const getLevelStatusLabel = (lvl) => {
    const pct = lvl / 100;
    if (pct < 0.15) return 'KRITIS';
    if (pct < 0.30) return 'RENDAH';
    if (pct < 0.85) return 'NORMAL';
    return 'HAMPIR PENUH';
  };

  const levelColor = getLevelColor(displayLevel);
  const statusLabel = getLevelStatusLabel(displayLevel);
  const levelPct = Math.max(0, Math.min(100, displayLevel)) / 100;

  const TANK_W = 120;
  const TANK_H = 200;

  return (
    <div className="card water-tank-card" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 280,
      position: 'relative'
    }}>
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

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        paddingBottom: '16px'
      }}>
        {/* Left Side: Title & Status Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: "'Outfit', sans-serif"
          }}>
            WATER TANK MONITORING
          </span>
          <div style={{ display: 'flex', gap: '5px', marginLeft: '6px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: levelColor,
              boxShadow: `0 0 8px ${levelColor}`
            }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </div>
        </div>

        {/* Right Side: Status Button */}
        <div style={{
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 800,
          color: displayLevel < 10 ? '#f87171' : displayLevel < 20 ? '#f59e0b' : '#00F2FF',
          background: displayLevel < 10 ? 'rgba(248, 113, 113, 0.06)' : displayLevel < 20 ? 'rgba(245, 158, 11, 0.06)' : 'rgba(0, 242, 255, 0.06)',
          border: displayLevel < 10 ? '1px solid rgba(248, 113, 113, 0.3)' : displayLevel < 20 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(0, 242, 255, 0.3)',
          boxShadow: displayLevel < 10 ? '0 0 12px rgba(248, 113, 113, 0.15)' : displayLevel < 20 ? '0 0 12px rgba(245, 158, 11, 0.15)' : '0 0 12px rgba(0, 242, 255, 0.15)',
          letterSpacing: '0.08em',
          fontFamily: "'Outfit', sans-serif"
        }}>
          STATUS: {statusLabel}
        </div>
      </div>

      {/* Main Content */}
      <div className="water-tank-layout" style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1, width: '100%' }}>
        {/* Left Column: Water Tank Capsule */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            {/* 3D Glass capsule */}
            <div style={{
              width: TANK_W,
              height: TANK_H,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderTop: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.05)',
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${levelPct * 100}%`,
                background: `linear-gradient(180deg, ${levelColor}B0 0%, ${levelColor} 100%)`, // Higher opacity gradient for uniform color
                transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: 'inherit', // Menyamakan lekukan bawah air dengan lekukan tandon
                boxShadow: `inset 0 0 24px ${levelColor}80, 0 -4px 16px ${levelColor}40`, // Inset blue glow
              }}>
                {/* Dynamic Wave surface */}
                <div style={{ position: 'absolute', top: -14, left: 0, width: '100%', height: 24, pointerEvents: 'none' }}>
                  <Wave
                    fill={levelColor}
                    paused={false}
                    options={{ height: 6, amplitude: 4, speed: 0.2, points: 3 }}
                    style={{ position: 'absolute', top: 0, opacity: 0.9 }}
                  />
                </div>

                {/* Bubbles Container (overflow hidden, so bubbles pop at the water surface!) */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  borderRadius: '0px', // Flat bottom
                  pointerEvents: 'none',
                  zIndex: 2
                }}>
                  {/* Glowing bubbles */}
                  {levelPct > 0.05 && [0, 1, 2, 3, 4, 5].map((i) => {
                    const size = 3 + (i % 2);
                    const leftPct = 15 + (i * 18) % 70;
                    const delay = i * 0.4;
                    const dur = 2.0 + (i % 3) * 0.4;
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        bottom: '0px',
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.65)',
                        boxShadow: `0 0 6px rgba(255,255,255,0.8)`,
                        animation: `bubbleRise ${dur}s ease-in ${delay}s infinite`,
                        opacity: 0,
                      }} />
                    );
                  })}
                </div>
              </div>

              {/* Glass Reflection Overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(105deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.15) 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />

              {/* Vertical Light Highlight */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '8%', width: '12%',
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />

              {/* Level text overlay (matches Dashboard visual layout) */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 900,
                  fontSize: 28, color: '#fff',
                  textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3)',
                }}>
                  {displayLevel.toFixed(1)}
                </span>
                <span style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600,
                  letterSpacing: '0.1em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}>
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#475569',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: "'Outfit', sans-serif"
          }}>
            LAST UPDATED: 2 mins ago
          </div>
        </div>

        {/* Right Column: Data Metrics (borderless rows, plenty of breathing room) */}
        <div className="water-tank-metrics">
          {/* Row 1: Level */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            width: '100%'
          }}>
            <Waves size={22} color="#00f2ff" style={{ strokeWidth: 1.5 }} />
            <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: "'Outfit', sans-serif" }}>
              <span style={{ fontSize: '15px', color: '#94a3b8', marginRight: '6px', fontWeight: 500 }}>Level:</span>
              <span style={{ fontSize: '26px', color: '#ffffff', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                {displayLevel.toFixed(0)}
              </span>
              <span style={{ fontSize: '13px', color: '#475569', marginLeft: '2px', fontWeight: 600 }}>%</span>
            </div>
          </div>

          {/* Row 2: Pressure */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 0',
            width: '100%'
          }}>
            <Gauge size={22} color="#3b82f6" style={{ strokeWidth: 1.5 }} />
            <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: "'Outfit', sans-serif" }}>
              <span style={{ fontSize: '15px', color: '#94a3b8', marginRight: '6px', fontWeight: 500 }}>Pressure:</span>
              <span style={{ fontSize: '26px', color: '#ffffff', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                {displayPressure.toFixed(2)}
              </span>
              <span style={{ fontSize: '13px', color: '#475569', marginLeft: '4px', fontWeight: 600 }}>Bar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Sparkle at bottom right */}
      <div style={{ position: 'absolute', bottom: '16px', right: '16px', opacity: 0.25, pointerEvents: 'none' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" fill="#3b82f6" />
        </svg>
      </div>

      <style>{`
        @keyframes bubbleRise { 
          0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; } 
          5% { opacity: 1; } 
          90% { opacity: 0.8; }
          100% { transform: translateY(-220px) translateX(-6px) scale(1.3); opacity: 0; } 
        }
      `}</style>
    </div>
  );
}
