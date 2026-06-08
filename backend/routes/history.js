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
    let total = 0;
    let rows = [];

    if (node_id && Number(node_id) === 2) {
      const conditions = [];
      const params     = [];
      if (from)    { conditions.push('created_at >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('created_at <= ?'); params.push(normalizeDateTime(to));   }

      const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [[{ total: bTotal }]] = await pool.execute(
        `SELECT COUNT(*) as total FROM sensor_bangunan ${where}`, params
      );
      total = bTotal;

      const [bRows] = await pool.execute(
        `SELECT
          id, created_at as timestamp, node_id,
          NULL as voltage, NULL as current_amp, NULL as frequency, NULL as power_kw, NULL as energy_kwh,
          NULL as temperature, NULL as humidity, NULL as pressure, NULL as water_pressure, NULL as co2_ppm,
          NULL as thermal_temp, NULL as uv_value,
          smoke_status, 'NORMAL' as flame_status, 'NORMAL' as heat_status, 'NORMAL' as thermal_status,
          NULL as water_level, 'CLOSED' as valve_status
        FROM sensor_bangunan ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)]
      );
      rows = bRows;
    } else {
      const conditions = [];
      const params     = [];

      if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
      if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to));   }

      const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [[{ total: sTotal }]] = await pool.execute(
        `SELECT COUNT(*) as total FROM sensor_readings ${where}`, params
      );
      total = sTotal;

      const [sRows] = await pool.execute(
        `SELECT
          id, timestamp, node_id, voltage, current_amp, frequency, power_kw,
          (energy_kwh - COALESCE((SELECT offset_kwh FROM energy_reset WHERE reset_at <= sensor_readings.timestamp ORDER BY reset_at DESC LIMIT 1), 0)) as energy_kwh,
          temperature, humidity, pressure, water_pressure, co2_ppm, thermal_temp, uv_value,
          smoke_status, flame_status, heat_status, thermal_status, water_level, valve_status
        FROM sensor_readings ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)]
      );
      rows = sRows;
    }

    res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    console.error('GET /history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/dates?node_id=&from=&to=&limit=&page=
// Daily summary grouped with local Indonesia date boundaries.
router.get('/dates', async (req, res) => {
  try {
    const { node_id, from, to, limit = 50, page = 1 } = req.query;
    const safeLimit = parseInt(limit);
    const safePage = parseInt(page);
    const offset = (safePage - 1) * safeLimit;
    let total = 0;
    let rows = [];

    if (node_id && Number(node_id) === 2) {
      const conditions = [];
      const params = [];
      if (from)    { conditions.push('created_at >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('created_at <= ?'); params.push(normalizeDateTime(to)); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [[{ total: bTotal }]] = await pool.execute(
        `SELECT COUNT(DISTINCT DATE(created_at)) as total FROM sensor_bangunan ${where}`,
        params
      );
      total = bTotal;

      const [bRows] = await pool.execute(
        `SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') as date,
          COUNT(*) as total_records,
          1 as node_count,
          MIN(created_at) as first_timestamp,
          MAX(created_at) as last_timestamp,
          NULL as voltage, NULL as current_amp, NULL as frequency, NULL as power_kw, NULL as energy_kwh,
          NULL as temperature, NULL as humidity, NULL as pressure, NULL as water_pressure, NULL as co2_ppm,
          NULL as thermal_temp, NULL as uv_value, NULL as water_level,
          CASE
            WHEN SUM(smoke_status = 'DANGER') > 0 THEN 'DANGER'
            WHEN SUM(smoke_status = 'WARNING') > 0 THEN 'WARNING'
            ELSE 'NORMAL'
          END as smoke_status,
          'NORMAL' as flame_status,
          'NORMAL' as heat_status,
          'NORMAL' as thermal_status,
          'CLOSED' as valve_status
        FROM sensor_bangunan
        ${where}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date DESC
        LIMIT ? OFFSET ?`,
        [...params, String(safeLimit), String(offset)]
      );
      rows = bRows;
    } else {
      const conditions = [];
      const params = [];

      if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
      if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to)); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [[{ total: sTotal }]] = await pool.execute(
        `SELECT COUNT(DISTINCT DATE(timestamp)) as total FROM sensor_readings ${where}`,
        params
      );
      total = sTotal;

      const [sRows] = await pool.execute(
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
      rows = sRows;
    }

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
    let rows = [];

    if (node_id && Number(node_id) === 2) {
      const bConditions = ['created_at >= ?', 'created_at < ?'];
      const bParams = [bounds.start, bounds.end];
      const [bRows] = await pool.execute(
        `SELECT
          node_id,
          COUNT(*) as total_records,
          MIN(created_at) as first_timestamp,
          MAX(created_at) as last_timestamp,
          NULL as voltage, NULL as current_amp, NULL as frequency, NULL as power_kw, NULL as energy_kwh,
          NULL as temperature, NULL as humidity, NULL as pressure, NULL as water_pressure, NULL as co2_ppm,
          NULL as thermal_temp, NULL as uv_value, NULL as water_level,
          CASE
            WHEN SUM(smoke_status = 'DANGER') > 0 THEN 'DANGER'
            WHEN SUM(smoke_status = 'WARNING') > 0 THEN 'WARNING'
            ELSE 'NORMAL'
          END as smoke_status,
          'NORMAL' as flame_status,
          'NORMAL' as heat_status,
          'NORMAL' as thermal_status,
          'CLOSED' as valve_status
        FROM sensor_bangunan
        WHERE ${bConditions.join(' AND ')}
        GROUP BY node_id`,
        bParams
      );
      rows = bRows;
    } else {
      const sConditions = ['timestamp >= ?', 'timestamp < ?'];
      const sParams = [bounds.start, bounds.end];
      if (node_id) { sConditions.push('node_id = ?'); sParams.push(node_id); }

      const [sRows] = await pool.execute(
        `SELECT
          node_id,
          COUNT(*) as total_records,
          MIN(timestamp) as first_timestamp,
          MAX(timestamp) as last_timestamp,
          ${AVG_COLUMNS},
          ${STATUS_COLUMNS}
        FROM sensor_readings
        WHERE ${sConditions.join(' AND ')}
        GROUP BY node_id`,
        sParams
      );
      rows = sRows;

      if (!node_id) {
        const bConditions = ['created_at >= ?', 'created_at < ?'];
        const bParams = [bounds.start, bounds.end];
        const [bRows] = await pool.execute(
          `SELECT
            node_id,
            COUNT(*) as total_records,
            MIN(created_at) as first_timestamp,
            MAX(created_at) as last_timestamp,
            NULL as voltage, NULL as current_amp, NULL as frequency, NULL as power_kw, NULL as energy_kwh,
            NULL as temperature, NULL as humidity, NULL as pressure, NULL as water_pressure, NULL as co2_ppm,
            NULL as thermal_temp, NULL as uv_value, NULL as water_level,
            CASE
              WHEN SUM(smoke_status = 'DANGER') > 0 THEN 'DANGER'
              WHEN SUM(smoke_status = 'WARNING') > 0 THEN 'WARNING'
              ELSE 'NORMAL'
            END as smoke_status,
            'NORMAL' as flame_status,
            'NORMAL' as heat_status,
            'NORMAL' as thermal_status,
            'CLOSED' as valve_status
          FROM sensor_bangunan
          WHERE ${bConditions.join(' AND ')}
          GROUP BY node_id`,
          bParams
        );
        if (bRows.length > 0) {
          const bRow = bRows[0];
          const existingIdx = rows.findIndex(r => r.node_id === 2);
          if (existingIdx !== -1) {
            const sRow = rows[existingIdx];
            rows[existingIdx] = {
              node_id: 2,
              total_records: sRow.total_records + bRow.total_records,
              first_timestamp: new Date(Math.min(new Date(sRow.first_timestamp), new Date(bRow.first_timestamp))),
              last_timestamp: new Date(Math.max(new Date(sRow.last_timestamp), new Date(bRow.last_timestamp))),
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
              water_level: null,
              smoke_status: (sRow.smoke_status === 'DANGER' || bRow.smoke_status === 'DANGER') ? 'DANGER' :
                            (sRow.smoke_status === 'WARNING' || bRow.smoke_status === 'WARNING') ? 'WARNING' : 'NORMAL',
              flame_status: 'NORMAL',
              heat_status: 'NORMAL',
              thermal_status: 'NORMAL',
              valve_status: 'CLOSED'
            };
          } else {
            rows.push(bRow);
          }
          rows.sort((a, b) => a.node_id - b.node_id);
        }
      }
    }

    res.json({ date: req.params.date, data: rows });
  } catch (err) {
    console.error('GET /history/dates/:date/nodes error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { node_id, from, to } = req.query;
    let rows = [];

    if (node_id && Number(node_id) === 2) {
      const conditions = [];
      const params = [];
      if (from)    { conditions.push('created_at >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('created_at <= ?'); params.push(normalizeDateTime(to)); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [bRows] = await pool.execute(
        `SELECT
          id, created_at as timestamp, node_id,
          NULL as voltage, NULL as current_amp, NULL as frequency, NULL as power_kw, NULL as energy_kwh,
          NULL as temperature, NULL as humidity, NULL as pressure, NULL as water_pressure, NULL as co2_ppm,
          NULL as thermal_temp, NULL as uv_value,
          smoke_status, 'NORMAL' as flame_status, 'NORMAL' as heat_status, 'NORMAL' as thermal_status,
          NULL as water_level, 'CLOSED' as valve_status
        FROM sensor_bangunan ${where} ORDER BY created_at DESC LIMIT 5000`,
        params
      );
      rows = bRows;
    } else {
      const conditions = [];
      const params     = [];

      if (node_id) { conditions.push('node_id = ?'); params.push(node_id); }
      if (from)    { conditions.push('timestamp >= ?'); params.push(normalizeDateTime(from)); }
      if (to)      { conditions.push('timestamp <= ?'); params.push(normalizeDateTime(to));   }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [sRows] = await pool.execute(
        `SELECT
          id, timestamp, node_id, voltage, current_amp, frequency, power_kw,
          (energy_kwh - COALESCE((SELECT offset_kwh FROM energy_reset WHERE reset_at <= sensor_readings.timestamp ORDER BY reset_at DESC LIMIT 1), 0)) as energy_kwh,
          temperature, humidity, pressure, water_pressure, co2_ppm, thermal_temp, uv_value,
          smoke_status, flame_status, heat_status, thermal_status, water_level, valve_status
        FROM sensor_readings ${where} ORDER BY timestamp DESC LIMIT 5000`,
        params
      );
      rows = sRows;
    }

    res.json({ data: rows });
  } catch (err) {
    console.error('GET /history/export error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
