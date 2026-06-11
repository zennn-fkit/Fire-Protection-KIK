-- ============================================================
-- Smart Fire Protection System - Database Schema
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS smart_fire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE smart_fire_db;

-- ------------------------------------------------------------
-- Table: sensor_readings
-- Stores all realtime sensor data from the nodes with table partitioning
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensor_readings (
  id              BIGINT AUTO_INCREMENT,
  timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  node_id         TINYINT UNSIGNED NOT NULL COMMENT '1=Power/Env, 2=Gas Pressure, 3=Hydrant Pressure, 4=Inactive',

  -- Node 1: Power Sensor
  voltage         FLOAT    DEFAULT NULL COMMENT 'Volt AC',
  current_amp     FLOAT    DEFAULT NULL COMMENT 'Ampere',
  frequency       FLOAT    DEFAULT NULL COMMENT 'Hz',
  power_kw        FLOAT    DEFAULT NULL COMMENT 'kW',
  energy_kwh      FLOAT    DEFAULT NULL COMMENT 'kWh - Akumulasi energi dari PZEM-004T',

  -- Node 1: SHT Temperature/Humidity
  temperature     FLOAT    DEFAULT NULL COMMENT 'Celsius',
  humidity        FLOAT    DEFAULT NULL COMMENT 'Percent RH',

  -- Node 2 & 3: Pressure Sensors
  pressure        FLOAT    DEFAULT NULL COMMENT 'Bar (Gas Pressure)',
  water_pressure  FLOAT    DEFAULT NULL COMMENT 'Bar (Hydrant Pressure)',
  valve_status    ENUM('OPEN','CLOSED') DEFAULT 'CLOSED',

  -- Additional Sensors from Node 1
  co2_ppm         FLOAT    DEFAULT NULL COMMENT 'PPM',
  thermal_temp    FLOAT    DEFAULT NULL COMMENT 'Celsius',
  uv_value        FLOAT    DEFAULT NULL COMMENT 'UV Sensor Value',

  -- Fire Detectors (shared, sent by any node or gateway)
  smoke_status    ENUM('NORMAL','WARNING','DANGER') DEFAULT 'NORMAL',
  flame_status    ENUM('NORMAL','WARNING','DANGER') DEFAULT 'NORMAL',
  heat_status     ENUM('NORMAL','WARNING','DANGER') DEFAULT 'NORMAL',
  thermal_status  ENUM('NORMAL','WARNING','DANGER') DEFAULT 'NORMAL',

  -- Water Tank Level (%)
  water_level     FLOAT    DEFAULT NULL COMMENT 'Percent 0-100',

  PRIMARY KEY (id, timestamp),
  INDEX idx_timestamp (timestamp),
  INDEX idx_node_id   (node_id),
  INDEX idx_node_time (node_id, timestamp)
) ENGINE=InnoDB
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
);

-- ------------------------------------------------------------
-- Table: alert_logs
-- Stores all triggered alerts/events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
  node_id     TINYINT UNSIGNED,
  alert_type  VARCHAR(60) NOT NULL COMMENT 'FIRE,SMOKE,HIGH_TEMP,LOW_PRESSURE,etc',
  severity    ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  message     TEXT,
  value       FLOAT       DEFAULT NULL COMMENT 'The sensor value that triggered alert',
  unit        VARCHAR(20) DEFAULT NULL,
  resolved    BOOLEAN     DEFAULT FALSE,
  resolved_at DATETIME    DEFAULT NULL,

  INDEX idx_timestamp (timestamp),
  INDEX idx_severity  (severity),
  INDEX idx_resolved  (resolved)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: water_usage
-- Stores daily water usage records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_usage (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  volume_m3   FLOAT NOT NULL DEFAULT 0,
  status      ENUM('SAVED','PENDING') DEFAULT 'PENDING',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_date (date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: actuator_control
-- Stores all actuator state changes (sprinkler, alarm, valve)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actuator_control (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
  device       ENUM('SPRINKLER','ALARM','VALVE') NOT NULL,
  status       ENUM('ON','OFF','OPEN','CLOSED') NOT NULL,
  triggered_by ENUM('AUTO','MANUAL') DEFAULT 'MANUAL',
  reason       VARCHAR(255) DEFAULT NULL COMMENT 'Why it was triggered automatically',
  operator     VARCHAR(100) DEFAULT 'System',

  INDEX idx_timestamp (timestamp),
  INDEX idx_device    (device)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: actuator_state
-- Current state of each actuator (single row per device)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actuator_state (
  device       ENUM('SPRINKLER','ALARM','VALVE') PRIMARY KEY,
  status       ENUM('ON','OFF','OPEN','CLOSED') NOT NULL DEFAULT 'OFF',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  triggered_by ENUM('AUTO','MANUAL') DEFAULT 'MANUAL'
) ENGINE=InnoDB;

-- Default actuator states
INSERT IGNORE INTO actuator_state (device, status) VALUES
  ('SPRINKLER', 'OFF'),
  ('ALARM',     'OFF'),
  ('VALVE',     'CLOSED');

-- ------------------------------------------------------------
-- Table: energy_reset
-- Stores energy kWh reset history for monthly tracking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS energy_reset (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  reset_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  offset_kwh   FLOAT NOT NULL COMMENT 'Nilai energy_kwh saat reset dilakukan (snapshot)',
  period_kwh   FLOAT DEFAULT NULL COMMENT 'Pemakaian kWh sejak reset sebelumnya',
  note         VARCHAR(255) DEFAULT NULL COMMENT 'Catatan dari user, misal: Mei 2026',

  INDEX idx_reset_at (reset_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: sensor_bangunan
-- Stores building/room sensor log, specifically for Node 2 (Smoke Detector)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensor_bangunan (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  node_id       INT NOT NULL DEFAULT 2,
  smoke_status  ENUM('NORMAL','WARNING','DANGER') NOT NULL DEFAULT 'NORMAL',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_node_id (node_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: sensors
-- Stores active/registered smoke & heat sensors catalog
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensors (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sensor_id   VARCHAR(50) NOT NULL UNIQUE,
  type        ENUM('SMOKE','HEAT') NOT NULL,
  zone_name   VARCHAR(100) DEFAULT NULL,
  floor       VARCHAR(50) DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sample data for testing (remove in production if not needed)
-- ------------------------------------------------------------
-- INSERT INTO sensor_readings (node_id, voltage, current_amp, frequency, power_kw, temperature, humidity, pressure, valve_status, smoke_status, flame_status, heat_status, thermal_status, water_level)
-- VALUES
--   (1, 220.5, 148.2, 50.1, 1.8, NULL, NULL, NULL, NULL, 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 78),
--   (3, NULL,  NULL,  NULL, NULL, 30.1, 57.8, NULL, NULL, 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', NULL),
--   (4, NULL,  NULL,  NULL, NULL, NULL, NULL, 5.2, 'CLOSED', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', NULL);
