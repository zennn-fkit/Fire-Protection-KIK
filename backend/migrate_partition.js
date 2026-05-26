import pool from './config/db.js';

async function migratePartition() {
  try {
    console.log('🔄 Memulai migrasi partisi untuk tabel sensor_readings...');

    // 1. Mengubah Primary Key agar memasukkan timestamp
    // MySQL membutuhkan kolom partisi menjadi bagian dari Primary Key
    console.log('⏳ Mengubah Primary Key...');
    await pool.execute(`
      ALTER TABLE sensor_readings
      DROP PRIMARY KEY,
      ADD PRIMARY KEY (id, timestamp)
    `);
    console.log('✅ Primary Key diubah.');

    // 2. Membuat partisi awal (Tahun 2025-2027)
    console.log('⏳ Menerapkan Table Partitioning...');
    await pool.execute(`
      ALTER TABLE sensor_readings
      PARTITION BY RANGE (TO_DAYS(timestamp)) (
        PARTITION p_old VALUES LESS THAN (TO_DAYS('2025-01-01')),
        PARTITION p2025 VALUES LESS THAN (TO_DAYS('2026-01-01')),
        PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
        PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
        PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
        PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01')),
        PARTITION p202605 VALUES LESS THAN (TO_DAYS('2026-06-01')),
        PARTITION p202606 VALUES LESS THAN (TO_DAYS('2026-07-01')),
        PARTITION p202607 VALUES LESS THAN (TO_DAYS('2026-08-01')),
        PARTITION p202608 VALUES LESS THAN (TO_DAYS('2026-09-01')),
        PARTITION p202609 VALUES LESS THAN (TO_DAYS('2026-10-01')),
        PARTITION p202610 VALUES LESS THAN (TO_DAYS('2026-11-01')),
        PARTITION p202611 VALUES LESS THAN (TO_DAYS('2026-12-01')),
        PARTITION p202612 VALUES LESS THAN (TO_DAYS('2027-01-01')),
        PARTITION p2027 VALUES LESS THAN (TO_DAYS('2028-01-01'))
      )
    `);
    console.log('✅ Partisi tabel berhasil diterapkan.');
    
    console.log('🎉 Migrasi selesai!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal melakukan migrasi:', error.message);
    process.exit(1);
  }
}

migratePartition();
