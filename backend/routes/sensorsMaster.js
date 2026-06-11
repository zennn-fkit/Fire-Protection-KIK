import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET all sensors
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensors ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /sensors-master error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST add new sensor
router.post('/', async (req, res) => {
  const { sensor_id, type, zone_name, floor } = req.body;
  if (!sensor_id || !type) {
    return res.status(400).json({ error: 'sensor_id and type are required' });
  }
  
  try {
    await pool.query(
      `INSERT INTO sensors (sensor_id, type, zone_name, floor) VALUES (?, ?, ?, ?)`,
      [sensor_id, type, zone_name || null, floor || null]
    );
    res.json({ success: true, message: 'Sensor added successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Sensor ID already exists' });
    }
    console.error('POST /sensors-master error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update sensor
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { sensor_id, type, zone_name, floor } = req.body;
  
  try {
    await pool.query(
      `UPDATE sensors SET sensor_id = ?, type = ?, zone_name = ?, floor = ? WHERE id = ?`,
      [sensor_id, type, zone_name || null, floor || null, id]
    );
    res.json({ success: true, message: 'Sensor updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Sensor ID already exists' });
    }
    console.error('PUT /sensors-master error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE sensor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sensors WHERE id = ?', [id]);
    res.json({ success: true, message: 'Sensor deleted successfully' });
  } catch (err) {
    console.error('DELETE /sensors-master error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
