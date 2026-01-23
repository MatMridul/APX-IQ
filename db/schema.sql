-- APX IQ Database Schema
-- Version: 1.0 (Frozen Core)

-- Enable TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ========================================================
-- RELATIONAL CORE TABLES
-- ========================================================

CREATE TABLE teams (
    team_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g. "Red Bull Racing"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drivers (
    driver_id INT PRIMARY KEY, -- Official F1 Driver ID (e.g. 1 = Carlos Sainz)
    name VARCHAR(100) NOT NULL,
    team_id INT REFERENCES teams(team_id),
    nationality VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cars (
    car_id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(team_id),
    model VARCHAR(100), -- "RB20"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    session_uid NUMERIC(20,0) PRIMARY KEY, -- Using m_sessionUID (uint64)
    session_type INT, -- Enum
    track_id INT,
    track_name VARCHAR(100),
    weather INT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE laps (
    lap_id SERIAL PRIMARY KEY,
    session_uid NUMERIC(20,0) REFERENCES sessions(session_uid),
    driver_id INT REFERENCES drivers(driver_id),
    lap_number INT NOT NULL,
    lap_time_ms INT, -- milliseconds
    sector_1_time_ms INT,
    sector_2_time_ms INT,
    sector_3_time_ms INT,
    is_valid BOOLEAN DEFAULT TRUE
);

CREATE TABLE pit_stops (
    pit_id SERIAL PRIMARY KEY,
    session_uid NUMERIC(20,0) REFERENCES sessions(session_uid),
    driver_id INT REFERENCES drivers(driver_id),
    lap_number INT,
    duration_ms INT
);

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    session_uid NUMERIC(20,0) REFERENCES sessions(session_uid),
    event_type VARCHAR(10), -- "BUTN", "SSTA", etc.
    event_details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- TIME-SERIES TELEMETRY (HYPERTABLES)
-- ========================================================

CREATE TABLE telemetry_raw (
    time TIMESTAMPTZ NOT NULL,
    session_uid NUMERIC(20,0) NOT NULL, -- No FK constraint for perf, logical link
    driver_id INT NOT NULL,
    
    speed_kph INT,
    throttle REAL, -- 0.0-1.0
    brake REAL,
    steer REAL,
    gear INT,
    rpm INT,
    drs BOOLEAN,
    
    tire_temp_fl INT,
    tire_temp_fr INT,
    tire_temp_rl INT,
    tire_temp_rr INT,
    
    tire_surface_temp_fl INT,
    tire_surface_temp_fr INT,
    tire_surface_temp_rl INT,
    tire_surface_temp_rr INT
);

-- Convert to Hypertable partitioned by time
SELECT create_hypertable('telemetry_raw', 'time');

-- Compression Policy (Compress after 7 days)
ALTER TABLE telemetry_raw SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'session_uid, driver_id'
);
SELECT add_compression_policy('telemetry_raw', INTERVAL '7 days');

-- ========================================================
-- ANALYTICS TABLES
-- ========================================================

CREATE TABLE driver_metrics (
    session_uid NUMERIC(20,0),
    driver_id INT,
    consistency_score REAL,
    aggression_score REAL,
    avg_lap_time_ms INT,
    PRIMARY KEY (session_uid, driver_id)
);
