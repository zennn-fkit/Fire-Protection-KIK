import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

const AVG_COLUMNS = `
  AVG(voltage) as voltage,
  AVG(current_amp) as current_amp,
  AVG(frequency) as frequency,
  AVG(power_kw) as power_kw,
  (MAX(CASE WHEN energy_kwh > 0 AND energy_kwh < 100000 THEN energy_kwh END) -
   MIN(CASE WHEN energy_kwh > 0 AND energy_kwh < 100000 THEN energy_kwh END)) as energy_kwh,
  AVG(temperature) as temperature,
  AVG(humidity) as humidity,
  AVG(pressure) as pressure,
  AVG(water_pressure) as water_pressure,
  AVG(co2_ppm) as co2_ppm,
  AVG(thermal_temp) as thermal_temp,
  AVG(uv_value) as uv_value,
  AVG(water_level) as water_level
`;

const STATUS_COLUMNS = `
  CASE
    WHEN SUM(smoke_status = 'DANGER') > 0 THEN 'DANGER'
    WHEN SUM(smoke_status = 'WARNING') > 0 THEN 'WARNING'
    ELSE 'NORMAL'
  END as smoke_status,
  CASE
    WHEN SUM(flame_status = 'DANGER') > 0 THEN 'DANGER'
    WHEN SUM(flame_status = 'WARNING') > 0 THEN 'WARNING'
    ELSE 'NORMAL'
  END as flame_status,
  CASE
    WHEN SUM(heat_status = 'DANGER') > 0 THEN 'DANGER'
    WHEN SUM(heat_status = 'WARNING') > 0 THEN 'WARNING'
    ELSE 'NORMAL'
  END as heat_status,
  CASE
    WHEN SUM(thermal_status = 'DANGER') > 0 THEN 'DANGER'
    WHEN SUM(thermal_status = 'WARNING') > 0 THEN 'WARNING'
    ELSE 'NORMAL'
  END as thermal_status,
  CASE
    WHEN SUM(valve_status = 'OPEN') > 0 THEN 'OPEN'
    WHEN SUM(valve_status = 'CLOSED') > 0 THEN 'CLOSED'
    ELSE NULL
  END as valve_status
`;

function normalizeDateTime(value) {
  return value ? String(value).replace('T', ' ') : value;
}

function getDateBounds(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + 1);

  return {
    start: `${date} 00:00:00`,
    end: `${next.toISOString().slice(0, 10)} 00:00:00`,
  };
}

// GET /api/history?node_id=&from=&to=&limit=&page=
router.get('/', async (req, res) => {
  try {
    const { node_id, from, to, limit = 100, page = 1 } = req.query;
    const conditions = [];
    const params     = [];

    if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
    if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
    if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to));   }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM sensor_readings ${where}`, params
    );

    const [rows] = await pool.execute(
      `SELECT
        id, timestamp, node_id, voltage, current_amp, frequency, power_kw,
        (energy_kwh - COALESCE((SELECT offset_kwh FROM energy_reset WHERE reset_at <= sensor_readings.timestamp ORDER BY reset_at DESC LIMIT 1), 0)) as energy_kwh,
        temperature, humidity, pressure, water_pressure, co2_ppm, thermal_temp, uv_value,
        smoke_status, flame_status, heat_status, thermal_status, water_level, valve_status
      FROM sensor_readings ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    console.error('GET /history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/export?node_id=&from=&to=  — No pagination, full data for export
// GET /api/history/dates?node_id=&from=&to=&limit=&page=
// Daily summary grouped with local Indonesia date boundaries.
router.get('/dates', async (req, res) => {
  try {
    const { node_id, from, to, limit = 50, page = 1 } = req.query;
    const conditions = [];
    const params = [];

    if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
    if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
    if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = parseInt(limit);
    const safePage = parseInt(page);
    const offset = (safePage - 1) * safeLimit;

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(DISTINCT DATE(timestamp)) as total FROM sensor_readings ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d') as date,
        COUNT(*) as total_records,
        COUNT(DISTINCT node_id) as node_count,
        MIN(timestamp) as first_timestamp,
        MAX(timestamp) as last_timestamp,
        ${AVG_COLUMNS},
        ${STATUS_COLUMNS}
      FROM sensor_readings
      ${where}
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d')
      ORDER BY date DESC
      LIMIT ? OFFSET ?`,
      [...params, String(safeLimit), String(offset)]
    );

    res.json({ total, page: safePage, limit: safeLimit, data: rows });
  } catch (err) {
    console.error('GET /history/dates error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/dates/:date/nodes?node_id=
// Node summary for one local Indonesia date.
router.get('/dates/:date/nodes', async (req, res) => {
  try {
    const bounds = getDateBounds(req.params.date);
    if (!bounds) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });

    const { node_id } = req.query;
    const conditions = ['timestamp >= ?', 'timestamp < ?'];
    const params = [bounds.start, bounds.end];

    if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }

    const [rows] = await pool.execute(
      `SELECT
        node_id,
        COUNT(*) as total_records,
        MIN(timestamp) as first_timestamp,
        MAX(timestamp) as last_timestamp,
        ${AVG_COLUMNS},
        ${STATUS_COLUMNS}
      FROM sensor_readings
      WHERE ${conditions.join(' AND ')}
      GROUP BY node_id
      ORDER BY node_id ASC`,
      params
    );

    res.json({ date: req.params.date, data: rows });
  } catch (err) {
    console.error('GET /history/dates/:date/nodes error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { node_id, from, to } = req.query;
    const conditions = [];
    const params     = [];

    if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
    if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
    if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to));   }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT
        id, timestamp, node_id, voltage, current_amp, frequency, power_kw,
        (energy_kwh - COALESCE((SELECT offset_kwh FROM energy_reset WHERE reset_at <= sensor_readings.timestamp ORDER BY reset_at DESC LIMIT 1), 0)) as energy_kwh,
        temperature, humidity, pressure, water_pressure, co2_ppm, thermal_temp, uv_value,
        smoke_status, flame_status, heat_status, thermal_status, water_level, valve_status
      FROM sensor_readings ${where} ORDER BY timestamp DESC LIMIT 5000`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    console.error('GET /history/export error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
