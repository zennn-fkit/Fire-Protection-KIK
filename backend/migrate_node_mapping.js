import pool from './config/db.js';

async function runMigration() {
  try {
    console.log('Running node mapping migration...');
    
    // Add uv_value column
    try {
      await pool.query('ALTER TABLE sensor_readings ADD COLUMN uv_value FLOAT DEFAULT NULL COMMENT \'UV Sensor Value\'');
      console.log('Added uv_value column.');
    } catch (e) {
      console.log('uv_value column might already exist:', e.message);
    }
    
    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
