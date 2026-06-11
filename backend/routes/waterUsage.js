import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/db.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const CONFIG_PATH = join(__dirname, '../config/tankConfig.json');

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {
      shape: 'cylinder',
      maxDistanceCm: 200,
      cylinder:    { diameterCm: 120 },
      rectangle:   { lengthCm: 150, widthCm: 100 },
    };
  }
}

/**
 * Hitung volume air (m³) dari data ultrasonik + konfigurasi tangki.
 * @param {number} waterLevelCm  - Ketinggian air (cm) = maxDistance - jarak sensor
 * @param {object} config        - Tank config object
 * @returns {number} volume dalam m³ (dibulatkan 4 desimal)
 */
export function calcVolume(waterLevelCm, config) {
  if (waterLevelCm == null || waterLevelCm < 0) return 0;
  const h = waterLevelCm / 100; // cm → m

  if (config.shape === 'cylinder') {
    const r = (config.cylinder?.diameterCm ?? 120) / 2 / 100; // cm → m
    return +(Math.PI * r * r * h).toFixed(4);
  } else {
    const l = (config.rectangle?.lengthCm  ?? 150) / 100;
    const w = (config.rectangle?.widthCm   ?? 100) / 100;
    return +(l * w * h).toFixed(4);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/water-usage
 * Ambil 7 rekaman water_usage terbaru dari DB.
 * Jika DB gagal (sensor tidak terkoneksi), kirim data dummy.
 */
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, volume_m3, status, created_at
       FROM water_usage
       ORDER BY date DESC
       LIMIT 7`
    );
    res.json({ source: 'db', data: rows });
  } catch (err) {
    console.error('GET /water-usage error:', err.message);
    // Fallback dummy agar frontend tetap bisa tampil
    const dummy = generateDummy();
    res.json({ source: 'dummy', data: dummy });
  }
});

/**
 * GET /api/water-usage/config
 * Baca konfigurasi dimensi tangki dari file JSON.
 */
router.get('/config', (_req, res) => {
  res.json(readConfig());
});

/**
 * POST /api/water-usage/config
 * Simpan konfigurasi dimensi tangki ke file JSON.
 * Body: { shape, maxDistanceCm, cylinder: { diameterCm }, rectangle: { lengthCm, widthCm } }
 */
router.post('/config', (req, res) => {
  try {
    const { shape, maxDistanceCm, cylinder, rectangle } = req.body;
    if (!['cylinder', 'rectangle'].includes(shape)) {
      return res.status(400).json({ error: 'shape harus "cylinder" atau "rectangle"' });
    }
    const config = { shape, maxDistanceCm: Number(maxDistanceCm) || 200, cylinder, rectangle };
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    res.json({ ok: true, config });
  } catch (err) {
    console.error('POST /water-usage/config error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/water-usage/snapshot
 * Dipakai oleh cron job tengah malam (dan bisa dipanggil manual).
 * Body: { waterLevelCm }  ← dari latestSensorData
 */
router.post('/snapshot', async (req, res) => {
  try {
    const { waterLevelCm } = req.body;
    const config    = readConfig();
    const volume    = calcVolume(waterLevelCm, config);
    const today     = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

    // INSERT ... ON DUPLICATE KEY UPDATE  ← aman jika dijalankan >1x sehari
    await pool.execute(
      `INSERT INTO water_usage (date, volume_m3, status)
       VALUES (?, ?, 'SAVED')
       ON DUPLICATE KEY UPDATE volume_m3 = ?, status = 'SAVED'`,
      [today, volume, volume]
    );

    console.log(`💧 water_usage snapshot: ${today} → ${volume} m³`);
    res.json({ ok: true, date: today, volume_m3: volume });
  } catch (err) {
    console.error('POST /water-usage/snapshot error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

// ── Dummy generator (fallback) ─────────────────────────────────────────────
function generateDummy() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      id: i + 1,
      date: d.toISOString().slice(0, 10),
      volume_m3: +(0.8 + Math.random() * 0.5).toFixed(2),
      status: i === 0 ? 'PENDING' : 'SAVED',
    };
  });
}
