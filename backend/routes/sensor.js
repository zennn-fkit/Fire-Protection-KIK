import express from 'express';
import pool from '../config/db.js';
import { evaluateAutoControl } from '../utils/autoControl.js';

const router = express.Router();

// POST /api/sensor/data  — Orange Pi sends data here
router.post('/data', async (req, res) => {
  try {
    const io = req.app.get('io');
    const data = req.body;

    const {
      node_id,
      voltage, current_amp, frequency, power_kw, power_watt, energy_kwh,
      temperature, temperature_sht, humidity, thermal_temp, co2_ppm, uv_value,
      pressure, gas_pressure, valve_status, gas_valve_status,
      water_pressure, water_valve_status,
      smoke_status, flame_status, heat_status, thermal_status,
      water_level, state_smoke, thermal_pixels
    } = data;

    const final_power_kw = power_watt != null ? power_watt / 1000 : (power_kw ?? null);
    const final_temp = temperature_sht ?? temperature ?? null;
    const final_pressure = gas_pressure ?? pressure ?? null;
    const final_valve = gas_valve_status ?? water_valve_status ?? valve_status ?? null;
    const final_smoke_status =
      (node_id === 2 && state_smoke !== undefined)
        ? (Number(state_smoke) === 1 ? 'DANGER' : 'NORMAL')
        : (smoke_status ?? 'NORMAL');

    // Hitung suhu tertinggi dari array thermal_pixels jika tersedia
    const pixelArray = Array.isArray(thermal_pixels) ? thermal_pixels.map(Number).filter(n => !isNaN(n)) : [];
    const maxFromPixels = pixelArray.length === 64 ? Math.max(...pixelArray) : null;
    const final_thermal = maxFromPixels ?? thermal_temp ?? null;

    if (!node_id) return res.status(400).json({ error: 'node_id is required' });

    // Insert reading
    let result;
    if (node_id === 2) {
      [result] = await pool.execute(
        `INSERT INTO sensor_bangunan (node_id, smoke_status) VALUES (?, ?)`,
        [node_id, final_smoke_status]
      );
    } else {
      [result] = await pool.execute(
        `INSERT INTO sensor_readings
         (node_id, voltage, current_amp, frequency, power_kw, energy_kwh, temperature, humidity,
          pressure, water_pressure, co2_ppm, thermal_temp, uv_value, valve_status, smoke_status, flame_status, heat_status, thermal_status, water_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          node_id,
          voltage    ?? null, current_amp  ?? null, frequency ?? null, final_power_kw, energy_kwh ?? null,
          final_temp, humidity    ?? null,
          final_pressure, water_pressure ?? null, co2_ppm ?? null, final_thermal, uv_value ?? null, final_valve,
          final_smoke_status, flame_status  ?? 'NORMAL',
          heat_status   ?? 'NORMAL', thermal_status ?? 'NORMAL',
          water_level   ?? null,
        ]
      );
    }

    // Get current actuator states
    const [states] = await pool.execute('SELECT device, status FROM actuator_state');
    const currentStates = Object.fromEntries(states.map(s => [s.device, s.status]));

    // Evaluate auto-control
    const { actions, alerts } = evaluateAutoControl({ ...data, smoke_status: final_smoke_status }, currentStates);

    // Apply auto actions
    for (const action of actions) {
      await pool.execute(
        `UPDATE actuator_state SET status=?, triggered_by='AUTO', last_updated=NOW() WHERE device=?`,
        [action.status, action.device]
      );
      await pool.execute(
        `INSERT INTO actuator_control (device, status, triggered_by, reason) VALUES (?, ?, 'AUTO', ?)`,
        [action.device, action.status, action.reason]
      );
    }

    // Save alerts to DB and emit
    for (const alert of alerts) {
      await pool.execute(
        `INSERT INTO alert_logs (node_id, alert_type, severity, message, value, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [node_id, alert.alert_type, alert.severity, alert.message, alert.value ?? null, alert.unit ?? null]
      );
      if (io) io.emit('alert:new', { ...alert, timestamp: new Date(), node_id });
    }

    // Emit new sensor data to all connected clients
    if (io) {
      const [updatedStates] = await pool.execute('SELECT device, status FROM actuator_state');
      io.emit('sensor:update', {
        ...data,
        smoke_status: final_smoke_status,
        thermal_temp: final_thermal,
        thermal_pixels: thermal_pixels ?? null,
        id: result.insertId,
        timestamp: new Date(),
        actuators: Object.fromEntries(updatedStates.map(s => [s.device, s.status])),
        autoActions: actions,
      });
    }

    res.json({ success: true, id: result.insertId, autoActions: actions });
  } catch (err) {
    console.error('POST /sensor/data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor/latest — Get latest reading per node
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*
      FROM sensor_readings r
      INNER JOIN (
        SELECT node_id, MAX(id) AS max_id
        FROM sensor_readings
        GROUP BY node_id
      ) latest ON r.node_id = latest.node_id AND r.id = latest.max_id
      ORDER BY r.node_id
    `);

    // Fetch node 2 latest reading from sensor_bangunan
    const [bRows] = await pool.execute(
      `SELECT id, created_at as timestamp, node_id, smoke_status FROM sensor_bangunan ORDER BY id DESC LIMIT 1`
    );
    if (bRows.length > 0) {
      const node2Row = {
        id: bRows[0].id,
        timestamp: bRows[0].timestamp,
        node_id: 2,
        voltage: null,
        current_amp: null,
        frequency: null,
        power_kw: null,
        energy_kwh: null,
        temperature: null,
        humidity: null,
        pressure: null,
        water_pressure: null,
        co2_ppm: null,
        thermal_temp: null,
        uv_value: null,
        smoke_status: bRows[0].smoke_status,
        flame_status: 'NORMAL',
        heat_status: 'NORMAL',
        thermal_status: 'NORMAL',
        water_level: null,
        valve_status: 'CLOSED'
      };
      const existingIdx = rows.findIndex(r => r.node_id === 2);
      if (existingIdx !== -1) {
        rows[existingIdx] = { ...rows[existingIdx], ...node2Row };
      } else {
        rows.push(node2Row);
      }
      rows.sort((a, b) => a.node_id - b.node_id);
    }

    const [states] = await pool.execute('SELECT device, status, last_updated, triggered_by FROM actuator_state');
    const [waterRows] = await pool.execute(
      'SELECT * FROM water_usage ORDER BY date DESC LIMIT 5'
    );

    res.json({
      nodes: rows,
      actuators: Object.fromEntries(states.map(s => [s.device, { status: s.status, last_updated: s.last_updated, triggered_by: s.triggered_by }])),
      water_usage: waterRows,
    });
  } catch (err) {
    console.error('GET /sensor/latest error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
