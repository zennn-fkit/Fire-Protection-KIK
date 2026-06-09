import { createContext, useContext, useReducer, useCallback } from 'react';

const FIRE_TEMP_WARNING = 40;
const FIRE_TEMP_DANGER = 60;
const GAS_WARNING = 1;
const GAS_DANGER = 1.5;

const STATUS_ALIASES = {
  NORMAL: 'NORMAL',
  AMAN: 'NORMAL',
  OK: 'NORMAL',
  SAFE: 'NORMAL',
  WARNING: 'WARNING',
  WARN: 'WARNING',
  WASPADA: 'WARNING',
  DANGER: 'DANGER',
  BAHAYA: 'DANGER',
  CRITICAL: 'DANGER',
};

// ── Helpers ───────────────────────────────────────────────────
// Durasi timeout (ms): jika tidak ada data real dalam waktu ini, kembali ke mock
const REAL_TIMEOUT_MS = 15000;

function isFresh(timestamps, key) {
  const ts = timestamps?.[key];
  return ts && (Date.now() - ts) < REAL_TIMEOUT_MS;
}

function normalizeDetectorStatus(status) {
  if (status == null) return null;
  return STATUS_ALIASES[String(status).trim().toUpperCase()] ?? null;
}

function thresholdStatus(value, warning, danger) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue >= danger) return 'DANGER';
  if (numberValue >= warning) return 'WARNING';
  return 'NORMAL';
}

function binaryDangerStatus(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const normalized = normalizeDetectorStatus(value);
    if (normalized) return normalized;
  }
  return Number(value) === 1 ? 'DANGER' : 'NORMAL';
}

function make3Phase(baseValue, delta = 2, decimals = 1) {
  const val = Number(baseValue);
  const r = val + (Math.random() - 0.5) * delta;
  const s = val + (Math.random() - 0.5) * delta;
  const t = val + (Math.random() - 0.5) * delta;
  return {
    r: Number(r.toFixed(decimals)),
    s: Number(s.toFixed(decimals)),
    t: Number(t.toFixed(decimals)),
  };
}

// ── Initial State ─────────────────────────────────────────────
const initialState = {
  connected: false,
  lastUpdate: null,
  // Sensor data
  panelData: null,
  node2: null,
  node3: null,
  node4: null,
  detectors: null,
  water_level: null,
  water_pressure: null,     // Bar  — pressure transducer
  water_distance: null,     // cm   — ultrasonik HC-SR04 (jarak dari sensor ke permukaan air)
  // Actuators & alerts
  actuators: { SPRINKLER: 'OFF', ALARM: 'OFF', VALVE: 'CLOSED' },
  alerts: [],
  energyHistory: [],
  // Mock internals
  mockTickCount: 0,
  mockInitialized: false,
  // Timestamps kapan terakhir masing-masing field mendapat data REAL dari sensor
  // Struktur: { master: number, node2: number, node3: number, node4: number, detectors: number,
  //             water_level: number, water_pressure: number, water_distance: number }
  realDataTimestamps: {},
  // Energy reset offset
  energyOffset: 0,
};

// ── Reducer ───────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    // ── Real sensor data arriving from backend via Socket.io ──
    case 'SENSOR_UPDATE': {
      const d = action.payload;
      const now = new Date();
      const nowMs = now.getTime();
      const newState = { ...state, lastUpdate: now };
      const rts = { ...state.realDataTimestamps };

      if (d.node_id === 1 || d.node_id === 'master' || d.node_id === 'env') {
        rts.master = nowMs;
        const incomingVoltage = d.voltage;
        const isRealACVoltage = incomingVoltage != null;

        const newThermalTemp = d.thermal_temp ?? d.max_temp;
        const newCo2Ppm = d.co2_ppm ?? d.mq7_ppm;
        const hasUvReading = d.uv_value !== undefined || d.uv_detected !== undefined;
        let newUvDetected = hasUvReading ? (d.uv_value ?? d.uv_detected) : 0;
        const explicitFlameStatus = normalizeDetectorStatus(d.flame_status);

        newState.panelData = {
          voltage: isRealACVoltage ? incomingVoltage : (state.panelData?.voltage ?? 220),
          current_amp: d.current_amp ?? (state.panelData?.current_amp ?? 0),
          power_kw: d.power_kw ?? (state.panelData?.power_kw ?? 0),
          power_watt: d.power_watt ?? ((d.power_kw ?? (state.panelData?.power_kw ?? 0)) * 1000),
          energy_kwh: d.energy_kwh ?? (state.panelData?.energy_kwh ?? 0),
          temperature_sht: d.temperature_sht ?? d.temperature ?? (state.panelData?.temperature_sht ?? 25),
          humidity: d.humidity ?? (state.panelData?.humidity ?? 50),
          thermal_temp: newThermalTemp ?? (state.panelData?.thermal_temp ?? 25),
          co2_ppm: newCo2Ppm ?? (state.panelData?.co2_ppm ?? 0),
          uv_value: newUvDetected,
          frequency: d.frequency ?? (state.panelData?.frequency ?? 50),
        };
        const baseKw = d.power_kw ?? (state.panelData?.power_kw ?? 0);
        const baseWatt = d.power_watt ?? (state.panelData?.power_watt ?? 0);
        const baseVoltage = isRealACVoltage ? incomingVoltage : (state.panelData?.voltage ?? 220);
        const baseAmp = d.current_amp ?? (state.panelData?.current_amp ?? 0);

        const kw3 = make3Phase(baseKw, 0.1, 2);
        const watt3 = make3Phase(baseWatt, 100, 0);
        const volt3 = make3Phase(baseVoltage, 4, 1);
        const amp3 = make3Phase(baseAmp, 2, 1);

        const newPoint = {
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          kw_r: kw3.r, kw_s: kw3.s, kw_t: kw3.t,
          watt_r: watt3.r, watt_s: watt3.s, watt_t: watt3.t,
          voltage_r: volt3.r, voltage_s: volt3.s, voltage_t: volt3.t,
          amp_r: amp3.r, amp_s: amp3.s, amp_t: amp3.t,
          hz: d.frequency ?? (state.panelData?.frequency ?? 50),
        };
        newState.energyHistory = [...(state.energyHistory || []).slice(-29), newPoint];

        const explicitSmokeStatus = normalizeDetectorStatus(d.smoke_status);
        const explicitHeatStatus = normalizeDetectorStatus(d.heat_status);
        const explicitThermalStatus = normalizeDetectorStatus(d.thermal_status);
        const smokeFromGas = newCo2Ppm != null ? thresholdStatus(newCo2Ppm, GAS_WARNING, GAS_DANGER) : null;
        const flameFromUv = hasUvReading || explicitFlameStatus ? binaryDangerStatus(newUvDetected) : null;
        const heatFromTemp = newState.panelData.temperature_sht != null
          ? thresholdStatus(newState.panelData.temperature_sht, FIRE_TEMP_WARNING, FIRE_TEMP_DANGER)
          : null;
        const thermalFromTemp = newThermalTemp != null
          ? thresholdStatus(newState.panelData.thermal_temp, FIRE_TEMP_WARNING, FIRE_TEMP_DANGER)
          : null;
        const hasDetectorInput = [
          explicitSmokeStatus, explicitFlameStatus, explicitHeatStatus, explicitThermalStatus,
          smokeFromGas, flameFromUv, heatFromTemp, thermalFromTemp,
        ].some(Boolean);

        if (hasDetectorInput) {
          rts.detectors = nowMs;
          newState.detectors = {
            smoke: smokeFromGas ?? explicitSmokeStatus ?? (state.detectors?.smoke ?? 'NORMAL'),
            flame: flameFromUv ?? explicitFlameStatus ?? (state.detectors?.flame ?? 'NORMAL'),
            heat: heatFromTemp ?? explicitHeatStatus ?? (state.detectors?.heat ?? 'NORMAL'),
            thermal: thermalFromTemp ?? explicitThermalStatus ?? (state.detectors?.thermal ?? 'NORMAL'),
          };
        }
      }
      if (d.node_id === 2) {
        rts.node2 = nowMs;
        newState.node2 = {
          gas_pressure: d.gas_pressure ?? d.pressure ?? (state.node2?.gas_pressure ?? 0),
          gas_valve_status: d.gas_valve_status ?? d.valve_status ?? (state.node2?.gas_valve_status ?? 'CLOSED'),
          smoke_status: d.smoke_status ?? (d.state_smoke !== undefined ? (Number(d.state_smoke) === 1 ? 'DANGER' : 'NORMAL') : (state.node2?.smoke_status ?? 'NORMAL')),
        };
      }
      if (d.node_id === 3) {
        rts.node3 = nowMs;
        newState.node3 = {
          water_pressure: d.water_pressure ?? (state.node3?.water_pressure ?? 0),
          water_valve_status: d.water_valve_status ?? d.valve_status ?? (state.node3?.water_valve_status ?? 'CLOSED'),
        };
      }
      if (d.node_id === 4) {
        rts.node4 = nowMs;
        // Inactive - abaikan atau simpan jika diperlukan
        newState.node4 = state.node4 || { inactive: true };
      }
      if (d.water_level != null) { rts.water_level = nowMs; newState.water_level = d.water_level; }
      // Terima water_pressure dari field asli
      if (d.water_pressure != null) {
        rts.water_pressure = nowMs;
        newState.water_pressure = d.water_pressure;
      }
      if (d.water_distance != null) { rts.water_distance = nowMs; newState.water_distance = d.water_distance; }
      // Status katup dari hardware ESP32 (valve_status_hw)
      if (d.valve_status_hw != null) {
        // Update actuators state
        newState.actuators = {
          ...state.actuators,
          VALVE: d.valve_status_hw === 'TERBUKA' ? 'OPEN' : 'CLOSED',
        };
      }
      if (d.actuators) newState.actuators = { ...state.actuators, ...d.actuators };

      newState.realDataTimestamps = rts;
      return newState;
    }

    case 'ALERT_NEW':
      return { ...state, alerts: [action.payload, ...state.alerts].slice(0, 50) };

    case 'CONTROL_UPDATE':
      return {
        ...state,
        actuators: action.payload.states
          ? Object.fromEntries(Object.entries(action.payload.states).map(([k, v]) => [k, v.status]))
          : { ...state.actuators, [action.payload.device]: action.payload.status },
      };

    // ── Mock tick: jalan terus tiap 3 detik, tapi skip field yang punya data real fresh ──
    case 'MOCK_TICK': {
      const now = new Date();
      const rts = state.realDataTimestamps || {};

      // ── FASE 1: Inisialisasi awal (2 tick pertama hanya counter) ──
      if (!state.mockInitialized) {
        const tickCount = (state.mockTickCount || 0) + 1;
        if (tickCount < 2) {
          return { ...state, mockTickCount: tickCount, lastUpdate: now };
        }
        // Tick ke-2: langsung inisialisasi semua nilai mock awal
        return {
          ...state,
          mockInitialized: true,
          lastUpdate: now,
          // Hanya inisialisasi field yang belum dapat data real
          panelData: isFresh(rts, 'master') ? state.panelData : {
            voltage: 220.5, current_amp: 150.2, power_kw: 1.8, power_watt: 1800, energy_kwh: 1245.5,
            temperature_sht: 28.35, humidity: 54.2, thermal_temp: 27.2, co2_ppm: 0.014, uv_value: 0,
          },
          node2: isFresh(rts, 'node2') ? state.node2
            : { gas_pressure: 5.2, gas_valve_status: 'CLOSED', smoke_status: 'NORMAL' },
          node3: isFresh(rts, 'node3') ? state.node3
            : { water_pressure: 4.8, water_valve_status: 'CLOSED' },
          node4: isFresh(rts, 'node4') ? state.node4
            : { inactive: true },
          detectors: isFresh(rts, 'detectors') ? state.detectors
            : { smoke: 'NORMAL', flame: 'NORMAL', heat: 'NORMAL', thermal: 'NORMAL' },
          water_level: isFresh(rts, 'water_level') ? state.water_level : 78,
          water_pressure: isFresh(rts, 'water_pressure') ? state.water_pressure : 4.8,
          water_distance: isFresh(rts, 'water_distance') ? state.water_distance : 62.0,
          energyHistory: isFresh(rts, 'master') ? state.energyHistory : Array.from({ length: 20 }, (_, i) => {
            const baseKw = 1.4 + Math.random() * 0.8;
            const baseWatt = baseKw * 1000;
            const baseVoltage = 218 + Math.random() * 6;
            const baseAmp = 148 + Math.random() * 2;
            const kw3 = make3Phase(baseKw, 0.1, 2);
            const watt3 = make3Phase(baseWatt, 100, 0);
            const volt3 = make3Phase(baseVoltage, 4, 1);
            const amp3 = make3Phase(baseAmp, 2, 1);
            return {
              time: new Date(Date.now() - (19 - i) * 30000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              kw_r: kw3.r, kw_s: kw3.s, kw_t: kw3.t,
              watt_r: watt3.r, watt_s: watt3.s, watt_t: watt3.t,
              voltage_r: volt3.r, voltage_s: volt3.s, voltage_t: volt3.t,
              amp_r: amp3.r, amp_s: amp3.s, amp_t: amp3.t,
              hz: +(50 + Math.random() * 0.4).toFixed(2),
            };
          }),
        };
      }

      // ── FASE 2: Update berkala — skip field yang data real-nya masih segar ──
      const nextState = { ...state, lastUpdate: now };

      // panelData + energyHistory (sumber: master node)
      if (!isFresh(rts, 'master') && state.panelData) {
        const baseKw = state.panelData.power_kw + (Math.random() - 0.5) * 0.1;
        const baseWatt = state.panelData.power_watt + (Math.random() - 0.5) * 100;
        const baseVoltage = state.panelData.voltage + (Math.random() - 0.5) * 1;
        const baseAmp = state.panelData.current_amp + (Math.random() - 0.5) * 2;

        const kw3 = make3Phase(baseKw, 0.1, 2);
        const watt3 = make3Phase(baseWatt, 100, 0);
        const volt3 = make3Phase(baseVoltage, 4, 1);
        const amp3 = make3Phase(baseAmp, 2, 1);

        const newPoint = {
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          kw_r: kw3.r, kw_s: kw3.s, kw_t: kw3.t,
          watt_r: watt3.r, watt_s: watt3.s, watt_t: watt3.t,
          voltage_r: volt3.r, voltage_s: volt3.s, voltage_t: volt3.t,
          amp_r: amp3.r, amp_s: amp3.s, amp_t: amp3.t,
          hz: 50,
        };
        nextState.panelData = {
          voltage: +(state.panelData.voltage + (Math.random() - 0.5) * 1.5).toFixed(1),
          current_amp: +(state.panelData.current_amp + (Math.random() - 0.5) * 2).toFixed(1),
          power_kw: +(state.panelData.power_kw + (Math.random() - 0.5) * 0.1).toFixed(2),
          power_watt: +(state.panelData.power_watt + (Math.random() - 0.5) * 100).toFixed(0),
          energy_kwh: +(state.panelData.energy_kwh + 0.01).toFixed(2),
          temperature_sht: +(state.panelData.temperature_sht + (Math.random() - 0.5) * 0.1).toFixed(2),
          humidity: +(state.panelData.humidity + (Math.random() - 0.5) * 0.5).toFixed(1),
          thermal_temp: +(state.panelData.thermal_temp + (Math.random() - 0.5) * 0.1).toFixed(1),
          co2_ppm: +(Math.max(0, state.panelData.co2_ppm + (Math.random() - 0.5) * 0.002)).toFixed(3),
          uv_value: Math.random() > 0.95
            ? (state.panelData.uv_value === 1 ? 0 : 1)
            : state.panelData.uv_value,
        };
        nextState.energyHistory = [...state.energyHistory.slice(-29), newPoint];
      }

      if (!isFresh(rts, 'node2') && state.node2) {
        nextState.node2 = {
          ...state.node2,
          gas_pressure: +(Math.max(0, state.node2.gas_pressure + (Math.random() - 0.5) * 0.1)).toFixed(2),
          smoke_status: state.node2.smoke_status ?? 'NORMAL',
        };
      }

      if (!isFresh(rts, 'node3') && state.node3) {
        nextState.node3 = {
          ...state.node3,
          water_pressure: +(Math.max(0, state.node3.water_pressure + (Math.random() - 0.5) * 0.1)).toFixed(2),
        };
      }

      if (!isFresh(rts, 'node4') && state.node4) {
        nextState.node4 = state.node4;
      }

      // water_level (persentase tangki)
      if (!isFresh(rts, 'water_level') && state.water_level != null) {
        nextState.water_level = +(
          Math.max(0, Math.min(100, state.water_level + (Math.random() - 0.5) * 0.3))
        ).toFixed(1);
      }

      // water_pressure (pressure transducer — Bar)
      if (!isFresh(rts, 'water_pressure') && state.water_pressure != null) {
        nextState.water_pressure = +(
          Math.max(0, Math.min(10, state.water_pressure + (Math.random() - 0.5) * 0.12))
        ).toFixed(2);
      }

      // water_distance (ultrasonik — cm dari sensor ke air)
      if (!isFresh(rts, 'water_distance') && state.water_distance != null) {
        nextState.water_distance = +(
          Math.max(0, Math.min(200, state.water_distance + (Math.random() - 0.5) * 0.4))
        ).toFixed(1);
      }

      return nextState;
    }

    case 'SET_ENERGY_OFFSET':
      return { ...state, energyOffset: action.payload };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
const SensorContext = createContext(null);

export function SensorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setConnected = useCallback(v => dispatch({ type: 'SET_CONNECTED', payload: v }), []);
  const sensorUpdate = useCallback(d => dispatch({ type: 'SENSOR_UPDATE', payload: d }), []);
  const alertNew = useCallback(d => dispatch({ type: 'ALERT_NEW', payload: d }), []);
  const controlUpdate = useCallback(d => dispatch({ type: 'CONTROL_UPDATE', payload: d }), []);
  const mockTick = useCallback(() => dispatch({ type: 'MOCK_TICK' }), []);
  const setEnergyOffset = useCallback(v => dispatch({ type: 'SET_ENERGY_OFFSET', payload: v }), []);

  return (
    <SensorContext.Provider value={{ state, setConnected, sensorUpdate, alertNew, controlUpdate, mockTick, setEnergyOffset }}>
      {children}
    </SensorContext.Provider>
  );
}

export const useSensor = () => useContext(SensorContext);
