import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import cron from 'node-cron';
import pool from './config/db.js';
import { evaluateAutoControl } from './utils/autoControl.js';

import sensorRoutes from './routes/sensor.js';
import historyRoutes from './routes/history.js';
import alertRoutes from './routes/alerts.js';
import controlRoutes from './routes/control.js';
import energyResetRoutes from './routes/energyReset.js';
import waterUsageRoutes, { calcVolume } from './routes/waterUsage.js';
import sensorsMasterRoutes from './routes/sensorsMaster.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TANK_CONFIG_PATH = join(__dirname, './config/tankConfig.json');

function readTankConfig() {
  try { return JSON.parse(readFileSync(TANK_CONFIG_PATH, 'utf8')); }
  catch { return { shape: 'cylinder', maxDistanceCm: 200, cylinder: { diameterCm: 120 }, rectangle: { lengthCm: 150, widthCm: 100 } }; }
}

dotenv.config();

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

function normalizeStatus(status) {
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

function binaryStatus(value) {
  if (value == null) return null;
  const normalized = normalizeStatus(value);
  if (normalized) return normalized;
  return Number(value) === 1 ? 'DANGER' : 'NORMAL';
}

const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ── MQTT Client ────────────────────────────────────────────────
const mqttClient = mqtt.connect('mqtt://broker.emqx.io');

mqttClient.on('connect', () => {
  console.log('🌐 Connected to MQTT Broker (broker.emqx.io)');
  const topics = [
    'projek_orange_pi/sensor/node1',
    'projek_orange_pi/sensor/node2',
    'projek_orange_pi/sensor/node3',
    'projek_orange_pi/sensor/master',
    'projek_orange_pi/sensor/env',
  ];
  mqttClient.subscribe(topics, (err) => {
    if (!err) {
      console.log(`📡 Subscribed to MQTT topics: ${topics.join(', ')}`);
    } else {
      console.error('❌ MQTT Subscribe error:', err);
    }
  });
});

// ── Cache Data Sensor ──────────────────────────────────────────
const MAX_BUFFER_SIZE = 10000;
let insertBuffer = [];

let latestSensorData = {
  ac_voltage: null,
  current_amp: null,
  frequency: null,
  power_kw: null,
  energy_kwh: null,      // ✅ Akumulasi energi listrik dari PZEM-004T
  temperature_sht: null,
  humidity: null,
  pressure: null,
  water_pressure: null,
  mq7_ppm: null,
  co2_ppm: null,
  max_temp: null,
  thermal_temp: null,
  thermal_pixels: null,
  uv_detected: null,
  smoke_status: 'NORMAL',
  flame_status: 'NORMAL',
  heat_status: 'NORMAL',
  thermal_status: 'NORMAL',
  water_level: null,
  valve_status: 'CLOSED'
};

mqttClient.on('message', async (topic, message) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (parseErr) {
    console.error('❌ MQTT JSON parse error:', parseErr.message);
    return;
  }

  // Tentukan node_id
  let nodeId = data.node_id;
  if (nodeId === undefined) {
    if (topic === 'projek_orange_pi/sensor/node1' || topic === 'projek_orange_pi/sensor/master' || topic === 'projek_orange_pi/sensor/env') {
      nodeId = 1;
    } else if (topic === 'projek_orange_pi/sensor/node2') {
      nodeId = 2;
    } else if (topic === 'projek_orange_pi/sensor/node3') {
      nodeId = 3;
    } else {
      nodeId = 99; // unknown
    }
  } else {
    nodeId = Number(nodeId);
  }
  data.node_id = nodeId;

  // Merge into global cache for partial updates (old behavior compatibility)
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      latestSensorData[key] = data[key];
    }
  });

  const {
    voltage, current_amp, frequency, power_kw, power_watt, energy_kwh,
    temperature, temperature_sht, humidity, thermal_temp, co2_ppm, uv_value,
    pressure, gas_pressure, valve_status, gas_valve_status,
    water_pressure, water_valve_status,
    water_level, uv_detected, smoke_status, flame_status, heat_status, thermal_status,
    ac_voltage, mq7_ppm, max_temp, state_smoke, thermal_pixels
  } = data; // use raw data from this payload

  const final_voltage = voltage ?? ac_voltage ?? null;
  // Karena ESP32 mengirim data Watt di dalam variabel power_kw, kita bagi 1000 agar menjadi kW yang sebenarnya.
  const final_power_kw = power_watt != null ? power_watt / 1000 : (power_kw != null ? power_kw / 1000 : null);
  const final_temp = temperature_sht ?? temperature ?? null;
  const final_pressure = gas_pressure ?? pressure ?? null;
  let final_valve = gas_valve_status ?? water_valve_status ?? valve_status ?? null;
  if (final_valve === 'TERBUKA' || final_valve === 'OPEN') final_valve = 'OPEN';
  if (final_valve === 'TERTUTUP' || final_valve === 'CLOSED') final_valve = 'CLOSED';

  const final_co2 = co2_ppm ?? mq7_ppm ?? null;
  
  // Hitung suhu tertinggi dari array thermal_pixels jika tersedia,
  // sebagai fallback gunakan thermal_temp atau max_temp
  const pixelArray = Array.isArray(thermal_pixels) ? thermal_pixels.map(Number).filter(n => !isNaN(n)) : [];
  const maxFromPixels = pixelArray.length === 64 ? Math.max(...pixelArray) : null;
  const final_thermal = maxFromPixels ?? thermal_temp ?? max_temp ?? null;

  const final_uv = uv_value ?? uv_detected ?? null;

  const effectiveSmokeStatus =
    (nodeId === 2 && state_smoke !== undefined)
      ? (Number(state_smoke) === 1 ? 'DANGER' : 'NORMAL')
      : (thresholdStatus(final_co2, GAS_WARNING, GAS_DANGER) ??
        normalizeStatus(smoke_status) ??
        'NORMAL');
  const effectiveFlameStatus =
    binaryStatus(final_uv ?? 0) ??
    normalizeStatus(flame_status) ??
    'NORMAL';
  const effectiveHeatStatus =
    thresholdStatus(final_temp, FIRE_TEMP_WARNING, FIRE_TEMP_DANGER) ??
    normalizeStatus(heat_status) ??
    'NORMAL';
  const effectiveThermalStatus =
    thresholdStatus(final_thermal, FIRE_TEMP_WARNING, FIRE_TEMP_DANGER) ??
    normalizeStatus(thermal_status) ??
    'NORMAL';

  let dbResult = null;
  let autoActions = [];
  let updatedActuators = {};
  let normalizedStatuses = {
    smoke_status: effectiveSmokeStatus,
    flame_status: effectiveFlameStatus,
    heat_status: effectiveHeatStatus,
    thermal_status: effectiveThermalStatus,
  };

  try {
    const rowData = [
      nodeId,
      final_voltage, current_amp ?? null, frequency ?? null, final_power_kw,
      energy_kwh ?? null, final_temp, humidity ?? null,
      final_pressure, water_pressure ?? null,
      final_co2, final_thermal, final_uv,
      effectiveSmokeStatus, effectiveFlameStatus, effectiveHeatStatus, effectiveThermalStatus,
      water_level ?? null, final_valve ?? 'CLOSED'
    ];

    // Node2 (smoke detector) disimpan ke tabel sensor_bangunan — skip sensor_readings
    if (nodeId !== 2) {
      if (insertBuffer.length < MAX_BUFFER_SIZE) {
        insertBuffer.push(rowData);
      } else {
        insertBuffer.shift();
        insertBuffer.push(rowData);
      }
    }

    const [states] = await pool.execute('SELECT device, status FROM actuator_state');
    const currentStates = Object.fromEntries(states.map(s => [s.device, s.status]));

    const normalizedData = {
      ...data,
      ...normalizedStatuses
    };

    const evalResult = evaluateAutoControl(normalizedData, currentStates);
    autoActions = evalResult.actions;
    const alerts = evalResult.alerts;

    for (const action of autoActions) {
      await pool.execute(
        `UPDATE actuator_state SET status=?, triggered_by='AUTO', last_updated=NOW() WHERE device=?`,
        [action.status, action.device]
      );
      await pool.execute(
        `INSERT INTO actuator_control (device, status, triggered_by, reason) VALUES (?, ?, 'AUTO', ?)`,
        [action.device, action.status, action.reason]
      );
    }

    for (const alert of alerts) {
      await pool.execute(
        `INSERT INTO alert_logs (node_id, alert_type, severity, message, value, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [nodeId, alert.alert_type, alert.severity, alert.message, alert.value ?? null, alert.unit ?? null]
      );
      io.emit('alert:new', { ...alert, timestamp: new Date(), node_id: nodeId });
    }

    const [updatedStates] = await pool.execute('SELECT device, status FROM actuator_state');
    updatedActuators = Object.fromEntries(updatedStates.map(s => [s.device, s.status]));

    // ── Simpan ke tabel sensor_bangunan (khusus node2 — smoke detector) ──
    if (nodeId === 2) {
      await pool.execute(
        `INSERT INTO sensor_bangunan (node_id, smoke_status) VALUES (?, ?)`,
        [nodeId, effectiveSmokeStatus]
      );
      // console.log(`🏢 sensor_bangunan: node_id=${nodeId}, smoke_status=${effectiveSmokeStatus}`);
    }

    console.log(`📥 MQTT Node ${nodeId} data saved.`);
  } catch (dbErr) {
    console.error('⚠️  MQTT DB error:', dbErr.message);
  }

  const emitPayload = {
    ...data,
    ...normalizedStatuses,
    voltage: final_voltage,
    power_kw: final_power_kw,
    power_watt: final_power_kw != null ? final_power_kw * 1000 : null,
    temperature_sht: final_temp,
    temperature: final_temp,
    pressure: final_pressure,
    gas_pressure: final_pressure,
    co2_ppm: final_co2,
    thermal_temp: final_thermal,
    thermal_pixels: thermal_pixels ?? null,
    uv_value: final_uv,
    valve_status: final_valve,
    gas_valve_status: final_valve,
    water_valve_status: final_valve
  };
  Object.keys(emitPayload).forEach(k => emitPayload[k] === undefined && delete emitPayload[k]);

  // Spesifik penyesuaian payload jika hardware pakai format lama
  if (topic === 'projek_orange_pi/sensor/master') {
    emitPayload.gas_pressure = emitPayload.pressure;
    emitPayload.gas_valve = emitPayload.valve_status;
  }

  io.emit('sensor:update', {
    ...emitPayload,
    id: dbResult?.insertId ?? null,
    timestamp: new Date(),
    actuators: updatedActuators,
    autoActions: autoActions,
  });
});

// ── Batch Insert Interval ──────────────────────────────────────
setInterval(async () => {
  if (insertBuffer.length === 0) return;

  const batch = insertBuffer.splice(0, insertBuffer.length);

  try {
    await pool.query(
      `INSERT INTO sensor_readings
       (node_id, voltage, current_amp, frequency, power_kw, energy_kwh, temperature, humidity,
        pressure, water_pressure, co2_ppm, thermal_temp, uv_value, smoke_status, flame_status, heat_status, thermal_status, water_level, valve_status)
       VALUES ?`,
      [batch]
    );
  } catch (error) {
    console.error('⚠️ Batch insert error:', error.message);
    const availableSpace = Math.max(0, MAX_BUFFER_SIZE - insertBuffer.length);
    const retryBatch = batch.slice(-availableSpace);
    if (retryBatch.length > 0) insertBuffer.unshift(...retryBatch);
  }
}, 1000);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/sensor', sensorRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/control', controlRoutes);
app.use('/api/water-usage', waterUsageRoutes);
app.use('/api/energy-reset', energyResetRoutes);
app.use('/api/sensors-master', sensorsMasterRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'OK', time: new Date() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Cron Job: Snapshot volume air setiap tengah malam ────────
// Format: '0 0 * * *' = jam 00:00 setiap hari
cron.schedule('0 0 * * *', async () => {
  try {
    const cfg = readTankConfig();
    const dist = latestSensorData.water_distance;   // jarak sensor (cm)
    const maxDist = cfg.maxDistanceCm || 200;
    const waterLevelCm = dist != null ? Math.max(0, maxDist - dist) : null;
    const volume = calcVolume(waterLevelCm, cfg);
    const today = new Date().toISOString().slice(0, 10);

    await pool.execute(
      `INSERT INTO water_usage (date, volume_m3, status)
       VALUES (?, ?, 'SAVED')
       ON DUPLICATE KEY UPDATE volume_m3 = ?, status = 'SAVED'`,
      [today, volume, volume]
    );
    console.log(`🕛 [CRON] water_usage snapshot: ${today} → ${volume} m³ (level: ${waterLevelCm?.toFixed(1)} cm)`);
  } catch (err) {
    console.error('🕛 [CRON] water_usage error:', err.message);
  }
}, { timezone: 'Asia/Jakarta' });

// ── Cron Job: Auto Partitioning setiap tanggal 25 ───────────
cron.schedule('0 1 25 * *', async () => {
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const year = nextMonth.getFullYear();
    const partitionName = `p${year}${month}`;

    const limitDate = new Date(year, nextMonth.getMonth() + 1, 1);
    const limitDateStr = limitDate.toISOString().slice(0, 10);

    await pool.query(
      `ALTER TABLE sensor_readings ADD PARTITION (PARTITION ${partitionName} VALUES LESS THAN (TO_DAYS('${limitDateStr}')))`
    );
    console.log(`🕛 [CRON] Created new partition: ${partitionName}`);
  } catch (err) {
    if (err.code !== 'ER_SAME_NAME_PARTITION') {
      console.error('🕛 [CRON] Partitioning error:', err.message);
    }
  }
}, { timezone: 'Asia/Jakarta' });

// ── Start Server ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`\n🔥 Smart Fire Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`📋 API Endpoints:`);
  console.log(`   POST  /api/sensor/data       — Receive sensor data from Orange Pi`);
  console.log(`   GET   /api/sensor/latest     — Latest readings`);
  console.log(`   GET   /api/history           — Historical data`);
  console.log(`   GET   /api/alerts            — Alert logs`);
  console.log(`   GET   /api/control           — Actuator states`);
  console.log(`   POST  /api/control           — Manual control`);
  console.log(`   GET   /api/water-usage       — Water usage (7 hari terakhir)`);
  console.log(`   GET   /api/water-usage/config — Tank config`);
  console.log(`   POST  /api/water-usage/config — Save tank config`);
  console.log(`🕛 Cron job aktif: snapshot volume air setiap tengah malam WIB\n`);
});
