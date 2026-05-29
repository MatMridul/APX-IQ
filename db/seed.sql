-- =========================================================================
-- APX IQ: DBMS Review 2 SEED DATA
-- Purpose: Insert mock data into the database to demonstrate queries live
-- =========================================================================

-- 1. Insert Teams
INSERT INTO teams (team_id, name) VALUES 
(1, 'Red Bull Racing'),
(2, 'Mercedes'),
(3, 'Ferrari'),
(4, 'McLaren');

-- 2. Insert Drivers
INSERT INTO drivers (driver_id, name, team_id, nationality) VALUES 
(1, 'Max Verstappen', 1, 'Dutch'),
(11, 'Sergio Perez', 1, 'Mexican'),
(44, 'Lewis Hamilton', 2, 'British'),
(63, 'George Russell', 2, 'British'),
(16, 'Charles Leclerc', 3, 'Monegasque'),
(55, 'Carlos Sainz', 3, 'Spanish'),
(4, 'Lando Norris', 4, 'British'),
(81, 'Oscar Piastri', 4, 'Australian');

-- 3. Insert Cars
INSERT INTO cars (team_id, model) VALUES 
(1, 'RB20'),
(2, 'W15'),
(3, 'SF-24'),
(4, 'MCL38');

-- 4. Insert Sessions
INSERT INTO sessions (session_uid, session_type, track_id, track_name, weather) VALUES 
(1001, 1, 1, 'Bahrain International Circuit', 0),
(1002, 1, 2, 'Jeddah Corniche Circuit', 0);

-- 5. Insert Laps (Some invalid ones for Penalty testing)
INSERT INTO laps (session_uid, driver_id, lap_number, lap_time_ms, is_valid) VALUES 
-- Max Verstappen (Fast laps, all valid)
(1001, 1, 1, 91500, TRUE),
(1001, 1, 2, 91100, TRUE),
(1001, 1, 3, 90800, TRUE),

-- Charles Leclerc (Fast laps, one invalid)
(1001, 16, 1, 91800, TRUE),
(1001, 16, 2, 91300, TRUE),
(1001, 16, 3, 90500, FALSE), -- Amazing lap but invalid

-- Lando Norris (Consistent laps)
(1001, 4, 1, 92200, TRUE),
(1001, 4, 2, 91500, TRUE),
(1001, 4, 3, 91200, TRUE),

-- Lewis Hamilton (Lots of invalid laps for penalty trigger)
(1001, 44, 1, 92000, FALSE),
(1001, 44, 2, 91900, FALSE),
(1001, 44, 3, 91000, FALSE),
(1001, 44, 4, 91100, TRUE);

-- 6. Insert Pit Stops
INSERT INTO pit_stops (session_uid, driver_id, lap_number, duration_ms) VALUES 
(1001, 1, 2, 2100), -- Red Bull fast stop
(1001, 16, 2, 2300), 
(1001, 44, 3, 2800);
