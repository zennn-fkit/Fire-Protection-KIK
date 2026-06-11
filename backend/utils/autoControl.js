// ============================================================
// Auto-Control Logic
// Checks sensor values against thresholds and triggers actuators
// ============================================================

export const THRESHOLDS = {
  temperature: { warning: 80, danger: 100 },      // °C
  humidity: { low: 20, high: 80 },             // %RH
  pressure: { dangerLow: 6, warningLow: 10 },   // Bar
  voltage: { low: 180, high: 260 },            // V
  water_level: { low: 30 },                        // %
};

/**
 * Evaluate sensor data and return list of auto-control actions to take
 * @param {Object} data - Sensor reading object
 * @param {Object} currentStates - Current actuator states
 * @returns {Array} - List of { device, status, reason }
 */
export function evaluateAutoControl(data, currentStates) {
  const actions = [];
  const alerts = [];

  // --- FIRE/SMOKE DETECTION ---
  const fireDanger =
    data.smoke_status === 'DANGER' ||
    data.flame_status === 'DANGER' ||
    data.heat_status === 'DANGER' ||
    data.thermal_status === 'DANGER';

  if (fireDanger) {
    if (currentStates.SPRINKLER !== 'ON') {
      actions.push({ device: 'SPRINKLER', status: 'ON', reason: 'Fire/Smoke danger detected' });
    }
    if (currentStates.ALARM !== 'ON') {
      actions.push({ device: 'ALARM', status: 'ON', reason: 'Fire/Smoke danger detected' });
    }
    alerts.push({
      alert_type: 'FIRE_DANGER',
      severity: 'CRITICAL',
      message: `BAHAYA KEBAKARAN! ${data.smoke_status === 'DANGER' ? 'Asap' : ''} ${data.flame_status === 'DANGER' ? 'Api' : ''} ${data.heat_status === 'DANGER' ? 'Panas' : ''} terdeteksi.`,
    });
  }

  const fireWarning =
    data.smoke_status === 'WARNING' ||
    data.flame_status === 'WARNING' ||
    data.heat_status === 'WARNING' ||
    data.thermal_status === 'WARNING';

  if (fireWarning && !fireDanger) {
    alerts.push({
      alert_type: 'FIRE_WARNING',
      severity: 'WARNING',
      message: 'Peringatan: Indikator kebakaran terdeteksi pada level WARNING.',
    });
  }

  // --- TEMPERATURE ---
  if (data.temperature != null) {
    if (data.temperature >= THRESHOLDS.temperature.danger) {
      alerts.push({
        alert_type: 'HIGH_TEMPERATURE',
        severity: 'CRITICAL',
        message: `Suhu kritis: ${data.temperature}°C (Batas: ${THRESHOLDS.temperature.danger}°C)`,
        value: data.temperature, unit: '°C',
      });
    } else if (data.temperature >= THRESHOLDS.temperature.warning) {
      alerts.push({
        alert_type: 'HIGH_TEMPERATURE',
        severity: 'WARNING',
        message: `Suhu tinggi: ${data.temperature}°C (Batas: ${THRESHOLDS.temperature.warning}°C)`,
        value: data.temperature, unit: '°C',
      });
    }
  }

  // --- PRESSURE (HYDRANT) ---
  if (data.pressure != null) {
    if (data.pressure < THRESHOLDS.pressure.dangerLow) {
      if (currentStates.VALVE !== 'OPEN') {
        actions.push({ device: 'VALVE', status: 'OPEN', reason: `Tekanan hydrant kritis: ${data.pressure} Bar` });
      }
      alerts.push({
        alert_type: 'LOW_PRESSURE',
        severity: 'CRITICAL',
        message: `Tekanan hydrant kritis: ${data.pressure} Bar (Batas: ${THRESHOLDS.pressure.dangerLow} Bar)`,
        value: data.pressure, unit: 'Bar',
      });
    } else if (data.pressure < THRESHOLDS.pressure.warningLow) {
      alerts.push({
        alert_type: 'LOW_PRESSURE',
        severity: 'WARNING',
        message: `Tekanan hydrant rendah: ${data.pressure} Bar`,
        value: data.pressure, unit: 'Bar',
      });
    }
  }

  // --- WATER LEVEL ---
  if (data.water_level != null && data.water_level < THRESHOLDS.water_level.low) {
    alerts.push({
      alert_type: 'LOW_WATER_LEVEL',
      severity: 'WARNING',
      message: `Level air penampungan rendah: ${data.water_level}%`,
      value: data.water_level, unit: '%',
    });
  }

  // --- VOLTAGE ---
  // Menggunakan ac_voltage dari sensor PZEM (atau voltage sebagai fallback jika masih ada mock data)
  const currentVoltage = data.ac_voltage != null ? data.ac_voltage : data.voltage;

  if (currentVoltage != null) {
    if (currentVoltage === 0) {
      alerts.push({
        alert_type: 'POWER_OUTAGE',
        severity: 'CRITICAL',
        message: `MATI LISTRIK! Tegangan terdeteksi 0V`,
        value: currentVoltage, unit: 'V',
      });
    } else if (currentVoltage < THRESHOLDS.voltage.low || currentVoltage > THRESHOLDS.voltage.high) {
      alerts.push({
        alert_type: 'VOLTAGE_ABNORMAL',
        severity: 'WARNING',
        message: `Tegangan abnormal: ${currentVoltage}V (Normal: ${THRESHOLDS.voltage.low}–${THRESHOLDS.voltage.high}V)`,
        value: currentVoltage, unit: 'V',
      });
    }
  }

  return { actions, alerts };
}
