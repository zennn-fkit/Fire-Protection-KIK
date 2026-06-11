import pool from './config/db.js';

async function runMigration() {
  try {
    console.log('Running migration...');
    await pool.query('ALTER TABLE sensor_readings ADD COLUMN co2_ppm FLOAT DEFAULT NULL COMMENT \'PPM\'');
    console.log('Added co2_ppm column.');
  } catch (e) {
    console.log('co2_ppm column might already exist:', e.message);
  }

  try {
    await pool.query('ALTER TABLE sensor_readings ADD COLUMN thermal_temp FLOAT DEFAULT NULL COMMENT \'Celsius\'');
    console.log('Added thermal_temp column.');
  } catch (e) {
    console.log('thermal_temp column might already exist:', e.message);
  }

  try {
    await pool.query('ALTER TABLE sensor_readings ADD COLUMN water_pressure FLOAT DEFAULT NULL COMMENT \'Bar\'');
    console.log('Added water_pressure column.');
  } catch (e) {
    console.log('water_pressure column might already exist:', e.message);
  }

  console.log('Migration complete.');
  process.exit(0);
}

runMigration();
