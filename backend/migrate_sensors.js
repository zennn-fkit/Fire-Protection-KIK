import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_fire_db'
    });
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sensor_id VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('SMOKE', 'HEAT') NOT NULL,
        zone_name VARCHAR(100) DEFAULT NULL,
        floor VARCHAR(50) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    
    console.log('✅ sensors table created successfully.');
    await connection.end();
  } catch (err) {
    console.error('❌ Error creating sensors table:', err);
  }
}
run();
