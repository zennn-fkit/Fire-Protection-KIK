/**
 * Migration Guide:
 * Cara update komponen yang sudah pakai getStatus lama:
 * 1. Dulu: getStatus('voltage', 220)
 * 2. Sekarang direkomendasikan: getStatus('electrical', 'voltage', 220)
 * Fungsi ini masih mendukung (backward compatible) pemanggilan getStatus(key, value)
 * dengan mencari ke seluruh namespace, namun disarankan untuk migrasi bertahap.
 */

// Definisi kunci dan nilai untuk sensor UV (Flame Detector)
export const UV_SENSOR_KEYS = {
  DATA_KEY: 'uv_value',        // key di panelData dari backend
  FLAME_ACTIVE_VALUE: 1,       // nilai sensor ketika api terdeteksi
  FLAME_INACTIVE_VALUE: 0,     // nilai sensor ketika aman
};

// Sensor value thresholds for color/status determination
export const THRESHOLDS = {
  electrical: {
    voltage:         { min: 200, max: 240, warn_lo: 210, warn_hi: 245 },
    current_amp:     { min: 0,   max: 180, warn_hi: 150, danger_hi: 165 },
    frequency:       { min: 45,  max: 55,  warn_lo: 49,  warn_hi: 51 },
    power_kw:        { min: 0,   max: 4000,   warn_hi: 2000, danger_hi: 3000 },
    energy_kwh:      { min: 0,   max: 10000 },
  },
  fire: {
    temperature_sht: { min: 0,   max: 90,  warn_hi: 40,  danger_hi: 60 },
    thermal_temp:    { min: 0,   max: 200, warn_hi: 50,  danger_hi: 75 },
    co2_ppm:         { min: 0,   max: 2,   warn_hi: 1,   danger_hi: 1.5 },
    [UV_SENSOR_KEYS.DATA_KEY]: { min: 0,   max: 1 },
  },
  environment: {
    temperature:     { min: 0,   max: 90,  warn_hi: 40,  danger_hi: 60 },
    humidity:        { min: 0,   max: 100, warn_lo: 20,  warn_hi: 80 },
    pressure:        { min: 0,   max: 12,  warn_lo: 10,   danger_lo: 6 },
  },
  water: {
    water_level:     { min: 0,   max: 100, warn_lo: 30,  danger_lo: 10 },
  }
};

/**
 * Get status string for a value based on thresholds
 * @returns {'normal'|'warning'|'danger'}
 */
export function getStatus(...args) {
  let namespace, key, value;
  if (args.length === 3) {
    [namespace, key, value] = args;
  } else {
    [key, value] = args;
    namespace = Object.keys(THRESHOLDS).find(ns => THRESHOLDS[ns][key]);
  }

  const t = namespace ? THRESHOLDS[namespace]?.[key] : null;
  if (!t) return 'normal';

  // Defensive programming: Guard clause untuk nilai invalid
  if (value === null || value === undefined) return 'unknown';
  if (isNaN(Number(value))) return 'unknown';

  if (t.danger_hi && value >= t.danger_hi) return 'danger';
  if (t.danger_lo && value <= t.danger_lo) return 'danger';
  if (t.warn_hi   && value >= t.warn_hi)   return 'warning';
  if (t.warn_lo   && value <= t.warn_lo)   return 'warning';
  return 'normal';
}

/** Map status string to palette from design system */
export const STATUS_COLORS = {
  normal:  { text: '#10B981', bg: 'rgba(16,185,129,0.12)',  stroke: '#10B981', label: 'Normal'  },
  warning: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  stroke: '#f59e0b', label: 'Warning' },
  danger:  { text: '#f87171', bg: 'rgba(248,113,113,0.12)', stroke: '#f87171', label: 'Bahaya'  },
  unknown: { text: '#6b7280', bg: 'rgba(107,114,128,0.12)', stroke: '#6b7280', label: 'No Data'   },
};

/** Get color for a gauge based on value and thresholds */
export function getGaugeColor(...args) {
  const status = getStatus(...args);
  return STATUS_COLORS[status]?.stroke ?? '#6b7280';
}

/**
 * Validasi untuk memastikan threshold yang krusial untuk deteksi api tersedia.
 * Mencegah penggunaan nilai fallback statis (hardcode) di dalam custom hooks.
 */
export function validateFireThresholds(thresholds) {
  const requiredKeys = [
    { sensor: 'temperature_sht', key: 'danger_hi' },
    { sensor: 'thermal_temp', key: 'danger_hi' },
    { sensor: 'co2_ppm', key: 'danger_hi' }
  ];

  const fireThresholds = thresholds.fire;
  if (!fireThresholds) throw new Error('[FireDetection] Missing fire namespace in thresholds');

  for (const { sensor, key } of requiredKeys) {
    if (!fireThresholds[sensor] || fireThresholds[sensor][key] === undefined) {
      throw new Error(`[FireDetection] Missing threshold: ${sensor}.${key}`);
    }
  }
}
