/**
 * Migrasi: Tambah kolom energy_kwh ke tabel sensor_readings
 * Jalankan sekali: node migrate_energy_kwh.js
 */
import pool from './config/db.js';

async function migrate() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Terhubung ke database:', process.env.DB_NAME || 'smart_fire_db');

    // Cek apakah kolom sudah ada
    const [cols] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sensor_readings'
        AND COLUMN_NAME = 'energy_kwh'
    `);

    if (cols.length > 0) {
      console.log('ℹ️  Kolom energy_kwh sudah ada, tidak perlu migrasi.');
    } else {
      await conn.execute(`
        ALTER TABLE sensor_readings
        ADD COLUMN energy_kwh FLOAT DEFAULT NULL
          COMMENT 'kWh - Akumulasi energi dari PZEM-004T'
          AFTER power_kw
      `);
      console.log('✅ Kolom energy_kwh berhasil ditambahkan ke tabel sensor_readings!');
    }

    // Tampilkan struktur tabel setelah migrasi
    const [desc] = await conn.execute('DESCRIBE sensor_readings');
    console.log('\n📋 Struktur tabel sensor_readings saat ini:');
    console.table(desc.map(r => ({ Field: r.Field, Type: r.Type, Default: r.Default })));

  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

migrate();
