-- APX IQ Database Schema
-- Version: 1.0 (Frozen Core)

-- (TimescaleDB Extension Removed for Local DBMS Review)

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

-- (Hypertable and Compression policies removed for Local DBMS Review)
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

-- ========================================================
-- INTELLIGENCE LAYER TABLES (Phase 3 Extension)
-- Additive only — no modifications to frozen core tables.
-- ========================================================

-- Ghost laps from real-world F1 (FastF1) or top sim players
CREATE TABLE ghost_laps (
    ghost_lap_id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,         -- 'fastf1' or 'sim_pool'
    year INT NOT NULL,
    gp_name VARCHAR(100) NOT NULL,       -- FastF1 GP name (e.g. 'Monaco')
    session_type VARCHAR(10) NOT NULL,   -- 'Q', 'R', 'FP1', etc.
    driver_code VARCHAR(5) NOT NULL,     -- 'VER', 'HAM', etc.
    lap_number INT,
    lap_time_ms INT,
    track_distance_m REAL,               -- Total track length in meters
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_ghost_year CHECK (year >= 2022)
);

-- Distance-indexed telemetry for ghost laps
-- Each row is a single data point at a specific distance from the start line
CREATE TABLE ghost_telemetry (
    ghost_lap_id INT REFERENCES ghost_laps(ghost_lap_id) ON DELETE CASCADE,
    distance_m REAL NOT NULL,            -- Meters from start line
    speed_kph REAL,
    throttle REAL,                       -- 0.0-1.0
    brake REAL,                          -- 0.0-1.0 (converted from bool for FastF1)
    gear INT,
    rpm INT,
    drs BOOLEAN,
    x REAL,                              -- World position X
    y REAL,                              -- World position Y
    z REAL,                              -- World position Z
    PRIMARY KEY (ghost_lap_id, distance_m)
);

-- User's recorded lap telemetry (distance-indexed)
-- Schema mirrors ghost_telemetry with additional steer column for hardware profiling
CREATE TABLE user_lap_telemetry (
    user_lap_id SERIAL,
    session_uid NUMERIC(20,0) NOT NULL,  -- Logical link to sessions table
    driver_id INT NOT NULL,
    lap_number INT NOT NULL,
    distance_m REAL NOT NULL,            -- Meters from start line
    speed_kph REAL,
    throttle REAL,                       -- 0.0-1.0
    brake REAL,                          -- 0.0-1.0
    steer REAL,                          -- -1.0 to 1.0 (crucial for hardware profiling)
    gear INT,
    rpm INT,
    drs BOOLEAN,
    x REAL,
    y REAL,
    z REAL,
    PRIMARY KEY (user_lap_id, distance_m)
);

-- Index for fast lookup by session + lap
CREATE INDEX idx_user_lap_session ON user_lap_telemetry (session_uid, lap_number);

-- Hardware profile detected per session
CREATE TABLE hardware_profiles (
    profile_id SERIAL PRIMARY KEY,
    session_uid NUMERIC(20,0) NOT NULL,
    detected_type VARCHAR(30) NOT NULL,  -- 'controller', 'wheel_entry', 'wheel_pro', etc.
    confirmed BOOLEAN DEFAULT FALSE,     -- User confirmed the auto-detection
    steer_variance REAL,                 -- Computed variance of steer derivative
    steer_frequency REAL,                -- Dominant frequency from FFT analysis
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed performance deltas between a user lap and a ghost lap
CREATE TABLE lap_deltas (
    delta_id SERIAL PRIMARY KEY,
    user_lap_id INT NOT NULL,
    ghost_lap_id INT REFERENCES ghost_laps(ghost_lap_id),
    distance_m REAL NOT NULL,            -- Distance point on the comparison grid
    speed_delta_kph REAL,                -- Speed difference in km/h (user - ghost)
    brake_delta_m REAL,                  -- Meters difference in brake point
    throttle_delta_abs REAL,             -- Throttle difference absolute (0.0-1.0 scale)
    time_delta_ms REAL,                  -- Cumulative time lost/gained at this distance
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast delta retrieval by user lap
CREATE INDEX idx_lap_deltas_user ON lap_deltas (user_lap_id);
