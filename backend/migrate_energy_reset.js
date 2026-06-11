/**
 * Migrasi: Buat tabel energy_reset untuk menyimpan history reset energy kWh
 * Jalankan sekali: node migrate_energy_reset.js
 */
import pool from './config/db.js';

async function migrate() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Terhubung ke database:', process.env.DB_NAME || 'smart_fire_db');

    // Cek apakah tabel sudah ada
    const [tables] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_reset'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Tabel energy_reset sudah ada, tidak perlu migrasi.');
    } else {
      await conn.execute(`
        CREATE TABLE energy_reset (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          reset_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          offset_kwh   FLOAT NOT NULL COMMENT 'Nilai energy_kwh saat reset dilakukan (snapshot)',
          period_kwh   FLOAT DEFAULT NULL COMMENT 'Pemakaian kWh sejak reset sebelumnya',
          note         VARCHAR(255) DEFAULT NULL COMMENT 'Catatan dari user, misal: Mei 2026',
          INDEX idx_reset_at (reset_at)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Tabel energy_reset berhasil dibuat!');
    }

    // Tampilkan struktur tabel
    const [desc] = await conn.execute('DESCRIBE energy_reset');
    console.log('\n📋 Struktur tabel energy_reset:');
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
