import { useMemo, useRef, useEffect } from 'react';
import { Flame, CheckCircle } from 'lucide-react';

/**
 * Maps temperature (20–80°C) to a palette position and returns RGB.
 * Palette: dark-slate → dark-blue → blue → violet → purple → orange → red
 */
function getThermalColor(temp, minTemp = 20, maxTemp = 80) {
  const clamped = Math.max(minTemp, Math.min(maxTemp, Number(temp) || minTemp));
  const t = maxTemp - minTemp > 0 ? (clamped - minTemp) / (maxTemp - minTemp) : 0.0;

  const stops = [
    { at: 0.0, r: 30, g: 41, b: 59 },   // #1e293b  slate-800 (cool baseline)
    { at: 0.15, r: 30, g: 58, b: 95 },   // #1e3a5f  blue-dark
    { at: 0.35, r: 37, g: 99, b: 235 },  // #2563eb  blue-600
    { at: 0.50, r: 109, g: 40, b: 217 }, // #6d28d9  violet-700
    { at: 0.65, r: 124, g: 58, b: 237 }, // #7c3aed  violet-500
    { at: 0.75, r: 194, g: 65, b: 12 },  // #c2410c  orange-700
    { at: 0.85, r: 234, g: 88, b: 12 },  // #ea580c  orange-600
    { at: 1.0, r: 239, g: 68, b: 68 },   // #ef4444  red-500 (hottest zone)
  ];

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

  return {
    r: lerp(lower.r, upper.r),
    g: lerp(lower.g, upper.g),
    b: lerp(lower.b, upper.b),
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
  if (n < 60) return { label: 'Waspada', color: '#f59e0b' };
  return { label: 'Bahaya', color: '#ef4444' };
}

export default function ThermalGradientCard({ temperature = 20, pixels, status = 'ready' }) {
  const canvasRef = useRef(null);

  const centerTemp = Number(temperature) || 0;
  const tempStatus = useMemo(() => getThermalStatus(centerTemp), [centerTemp]);

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

  // Ensure pixels is a valid array of 64 floats, fallback to centerTemp if invalid/empty
  const validPixels = useMemo(() => {
    if (Array.isArray(pixels) && pixels.length === 64) {
      return pixels;
    }
    return Array(64).fill(centerTemp || 25.0);
  }, [pixels, centerTemp]);

  // Find min, max, and hottest index in the 8x8 grid
  const { maxTemp, minTemp, maxIndex } = useMemo(() => {
    let max = -Infinity;
    let min = Infinity;
    let maxIdx = 0;
    for (let i = 0; i < validPixels.length; i++) {
      const v = Number(validPixels[i]) || 0;
      if (v > max) {
        max = v;
        maxIdx = i;
      }
      if (v < min) {
        min = v;
      }
    }
    if (max === -Infinity) max = centerTemp || 25.0;
    if (min === Infinity) min = (centerTemp || 25.0) - 2.0;
    return { maxTemp: max, minTemp: min, maxIndex: maxIdx };
  }, [validPixels, centerTemp]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Create offscreen 8x8 buffer canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = 8;
    offscreen.height = 8;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(8, 8);
    const data = imgData.data;

    // Dynamic temperature scale mapping
    // Static base of 20°C, top ceiling is maxTemp (minimum 60°C to keep scale stable)
    const scaleMin = 20;
    const scaleMax = Math.max(60, maxTemp);

    for (let i = 0; i < 64; i++) {
      const temp = validPixels[i];
      const color = getThermalColor(temp, scaleMin, scaleMax);
      const pixelIdx = i * 4;
      data[pixelIdx] = color.r;
      data[pixelIdx + 1] = color.g;
      data[pixelIdx + 2] = color.b;
      data[pixelIdx + 3] = 255; // Alpha
    }

    offCtx.putImageData(imgData, 0, 0);

    // Clear main canvas and scale up buffer with bilinear smoothing
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, canvasWidth, canvasHeight);
  }, [validPixels, maxTemp]);

  // Always center the target crosshair in the middle of the thermal screen
  const crosshairLeft = 50;
  const crosshairTop = 50;

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
 
        {/* Center Column: Live Thermal Camera View (Canvas Heatmap) */}
        <div className="thermal-center-section">
          <div className="thermal-screen-box" style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
            {/* Main Canvas */}
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                borderRadius: '8px',
                background: '#1e293b'
              }}
            />
 
            {/* Screen Overlay Content */}
            <div className="thermal-screen-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Dynamic Hottest Point Crosshair */}
              <div 
                className="thermal-marker max-temp-marker"
                style={{
                  position: 'absolute',
                  left: `${crosshairLeft}%`,
                  top: `${crosshairTop}%`,
                  transform: 'translate(-50%, -50%)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'left 0.3s ease-out, top 0.3s ease-out'
                }}
              >
                <div style={{
                  color: tempStatus.color,
                  fontSize: '22px',
                  fontWeight: '800',
                  lineHeight: '1',
                  textShadow: '0 0 4px rgba(0,0,0,0.9)',
                  marginBottom: '-3px'
                }}>+</div>
                <span style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${tempStatus.color}73`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  color: '#f8fafc',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                }}>
                  {formatTemp(centerTemp)} °C
                </span>
              </div>

              {/* Bottom Left Minimum Temp Info */}
              <div style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#94a3b8',
                fontFamily: 'monospace',
                fontWeight: 600
              }}>
                MIN: {formatTemp(minTemp)} °C
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
