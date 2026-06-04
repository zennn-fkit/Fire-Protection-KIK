import { useMemo } from 'react';
import { Flame, CheckCircle } from 'lucide-react';

/**
 * Maps temperature (20–225°C) to a palette position and CSS colors.
 * Palette: dark-gray → blue → purple → orange → red
 */
function getThermalStyle(temp) {
  const clamped = Math.max(20, Math.min(225, Number(temp) || 20));
  const t = (clamped - 20) / (225 - 20); // 0..1

  // Color stops for the gradient palette (dark-theme compatible)
  const stops = [
    { at: 0.0, r: 30, g: 41, b: 59 },   // #1e293b  slate-800
    { at: 0.15, r: 30, g: 58, b: 95 },   // #1e3a5f  blue-dark
    { at: 0.35, r: 37, g: 99, b: 235 },  // #2563eb  blue-600
    { at: 0.50, r: 109, g: 40, b: 217 }, // #6d28d9  violet-700
    { at: 0.65, r: 124, g: 58, b: 237 }, // #7c3aed  violet-500
    { at: 0.75, r: 194, g: 65, b: 12 },  // #c2410c  orange-700
    { at: 0.85, r: 234, g: 88, b: 12 },  // #ea580c  orange-600
    { at: 1.0, r: 239, g: 68, b: 68 },   // #ef4444  red-500
  ];

  // Find surrounding stops and interpolate
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].at && t <= stops[i + 1].at) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.at - lower.at || 1;
  const ratio = (t - lower.at) / range;
  const lerp = (a, b) => Math.round(a + (b - a) * ratio);

  const hotR = lerp(lower.r, upper.r);
  const hotG = lerp(lower.g, upper.g);
  const hotB = lerp(lower.b, upper.b);
  const hotColor = `rgb(${hotR}, ${hotG}, ${hotB})`;

  // Secondary glow — slightly lighter / more saturated version
  const glowR = Math.min(255, hotR + 40);
  const glowG = Math.min(255, hotG + 20);
  const glowB = Math.min(255, hotB + 30);
  const glowColor = `rgb(${glowR}, ${glowG}, ${glowB})`;

  // Hotspot vertical position: 85% (bottom) when cold → 30% (upper-center) when hot
  const hotspotY = 85 - t * 55;
  // Hotspot size: small when cold → large when hot
  const hotspotSize = 25 + t * 45; // 25% → 70%

  // Opacity of gradient overlay: subtle when cold → strong when hot
  const intensity = 0.3 + t * 0.7; // 0.3 → 1.0

  // Glow shadow intensity
  const glowOpacity = t * 0.6; // 0 → 0.6

  return {
    hotColor,
    glowColor,
    hotspotY,
    hotspotSize,
    intensity,
    glowOpacity,
    t,
  };
}

function formatTemp(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : '-';
}

/**
 * Status label based on temperature range
 */
function getThermalStatus(temp) {
  const n = Number(temp) || 0;
  if (n < 40) return { label: 'Aman', color: '#10b981' };
  if (n < 70) return { label: 'Hangat', color: '#3b82f6' };
  if (n < 100) return { label: 'Perhatian', color: '#8b5cf6' };
  if (n < 150) return { label: 'Warning', color: '#f59e0b' };
  return { label: 'Bahaya', color: '#ef4444' };
}

export default function ThermalGradientCard({ temperature = 20, status = 'ready' }) {
  const thermal = useMemo(() => getThermalStyle(temperature), [temperature]);
  const tempStatus = useMemo(() => getThermalStatus(temperature), [temperature]);

  const centerTemp = Number(temperature) || 0;
  const maxTemp = centerTemp + 0.8;
  const minTemp = centerTemp - 2.4;

  const READY_TONES = {
    ready: {
      label: 'READY',
      text: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.32)',
    },
    pending: {
      label: 'BELUM READY',
      text: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.32)',
    },
  };

  const tone = READY_TONES[status] || READY_TONES.ready;
  const isAman = centerTemp < 40;

  return (
    <div className="card thermal-gradient-card">
      <div className="thermal-card-layout">
        
        {/* Left Column: Icon + Status Text Info */}
        <div className="thermal-left-section">
          <div
            className="thermal-status-icon-box"
            style={{
              color: tempStatus.color,
              borderColor: `${tempStatus.color}40`,
              background: `${tempStatus.color}12`,
            }}
          >
            {isAman ? <CheckCircle size={20} /> : <Flame size={20} />}
          </div>
          
          <div className="thermal-text-info">
            <span className="thermal-status-title">Thermal Status</span>
            <span className="thermal-status-value" style={{ color: tempStatus.color }}>
              {tempStatus.label}
            </span>
            <p className="thermal-status-desc">Pendukung validasi panas area.</p>
          </div>
        </div>

        {/* Center Column: Thermal Camera View Box (Confined Gradient) */}
        <div className="thermal-center-section">
          <div
            className="thermal-screen-box"
            style={{
              '--hot-color': thermal.hotColor,
              '--glow-color': thermal.glowColor,
              '--hotspot-y': `${thermal.hotspotY}%`,
              '--hotspot-size': `${thermal.hotspotSize}%`,
              '--intensity': thermal.intensity,
            }}
          >
            {/* Screen Background layers (The same dynamic gradient colors) */}
            <div className="thermal-screen-bg" aria-hidden="true">
              <div className="thermal-screen-hotspot" />
              <div className="thermal-screen-diffuse" />
            </div>

            {/* Screen Overlay Content */}
            <div className="thermal-screen-overlay">
              {/* Max temp marker (top left) */}
              <div className="thermal-marker max-temp-marker">
                <span className="thermal-marker-dot max-dot" />
                <span>{formatTemp(maxTemp)} °C</span>
              </div>

              {/* Center temp crosshair */}
              <div className="thermal-center-crosshair">
                <span className="thermal-crosshair-icon">+</span>
                <span className="thermal-crosshair-text">{formatTemp(centerTemp)} °C</span>
              </div>

              {/* Min temp marker (bottom right) */}
              <div className="thermal-marker min-temp-marker">
                <span className="thermal-marker-dot min-dot" />
                <span>{formatTemp(minTemp)} °C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Readiness Badge */}
        <div className="thermal-right-section">
          <span
            className="thermal-readiness-badge"
            style={{
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.text,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tone.text,
                boxShadow: `0 0 8px ${tone.text}`,
              }}
            />
            {tone.label}
          </span>
        </div>

      </div>
    </div>
  );
}
