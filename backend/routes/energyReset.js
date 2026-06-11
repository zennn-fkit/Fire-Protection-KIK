import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/energy-reset — Ambil offset terbaru + history semua reset
router.get('/', async (req, res) => {
  try {
    // Ambil semua history reset, diurutkan dari terbaru
    const [history] = await pool.execute(
      'SELECT id, reset_at, offset_kwh, period_kwh, note FROM energy_reset ORDER BY id DESC'
    );

    // Offset terbaru (baris pertama) atau 0 jika belum pernah reset
    const currentOffset = history.length > 0 ? history[0].offset_kwh : 0;
    const lastReset = history.length > 0 ? history[0].reset_at : null;

    res.json({
      current_offset: currentOffset,
      last_reset: lastReset,
      history,
    });
  } catch (err) {
    console.error('GET /energy-reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/energy-reset — Simpan reset baru (snapshot offset)
router.post('/', async (req, res) => {
  try {
    const { current_kwh, note } = req.body;

    if (current_kwh == null || !Number.isFinite(Number(current_kwh))) {
      return res.status(400).json({ error: 'current_kwh is required and must be a valid number' });
    }

    const kwhValue = Number(current_kwh);

    // Ambil offset terakhir untuk menghitung period_kwh
    const [last] = await pool.execute(
      'SELECT offset_kwh FROM energy_reset ORDER BY id DESC LIMIT 1'
    );
    const prevOffset = last.length > 0 ? last[0].offset_kwh : 0;
    const periodKwh = +(kwhValue - prevOffset).toFixed(2);

    // Insert reset baru
    const [result] = await pool.execute(
      'INSERT INTO energy_reset (offset_kwh, period_kwh, note) VALUES (?, ?, ?)',
      [kwhValue, periodKwh, note || null]
    );

    console.log(`⚡ Energy reset: offset=${kwhValue} kWh, period=${periodKwh} kWh, note=${note || '-'}`);

    res.json({
      success: true,
      id: result.insertId,
      offset_kwh: kwhValue,
      period_kwh: periodKwh,
    });
  } catch (err) {
    console.error('POST /energy-reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
