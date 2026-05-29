-- =========================================================================
-- APX IQ: DBMS Review 2 Execution Script
-- Contains: Constraints, Aggregates, Joins, Subqueries, Views, PL/pgSQL
-- =========================================================================


-- =========================================================================
-- 1. CONSTRAINTS (ALTERing existing tables to show explicit constraints)
-- =========================================================================

-- UNIQUE Constraint: Ensure team names are unique
ALTER TABLE teams ADD CONSTRAINT unique_team_name UNIQUE (name);

-- CHECK Constraint: Ensure a lap time is always positive
ALTER TABLE laps ADD CONSTRAINT check_positive_lap_time CHECK (lap_time_ms > 0);


-- =========================================================================
-- 2. AGGREGATE FUNCTIONS & SET OPERATIONS
-- =========================================================================

-- Aggregate with GROUP BY and HAVING:
-- Find drivers who have completed more than 10 valid laps, showing their average lap time
SELECT 
    d.name, 
    COUNT(l.lap_id) AS total_valid_laps, 
    AVG(l.lap_time_ms) AS avg_lap_time
FROM drivers d
JOIN laps l ON d.driver_id = l.driver_id
WHERE l.is_valid = TRUE
GROUP BY d.name
HAVING COUNT(l.lap_id) > 10;

-- SET OPERATION (UNION):
-- Get a list of IDs for both Drivers and Teams in a single column for auditing
SELECT driver_id AS entity_id, 'Driver' AS entity_type FROM drivers
UNION
SELECT team_id AS entity_id, 'Team' AS entity_type FROM teams;


-- =========================================================================
-- 3. COMPLEX QUERIES: JOINS & SUBQUERIES
-- =========================================================================

-- Multiple Joins (INNER and LEFT):
-- Get all drivers, their team, and their car model (if assigned)
SELECT 
    d.name AS driver_name,
    t.name AS team_name,
    c.model AS car_model
FROM drivers d
INNER JOIN teams t ON d.team_id = t.team_id
LEFT JOIN cars c ON t.team_id = c.team_id;

-- Nested Subquery:
-- Find the driver(s) who holds the absolute fastest valid lap time
SELECT name FROM drivers 
WHERE driver_id IN (
    SELECT driver_id FROM laps 
    WHERE lap_time_ms = (SELECT MIN(lap_time_ms) FROM laps WHERE is_valid = TRUE)
);

-- Correlated Subquery:
-- For each driver, find their fastest lap in the current database
SELECT l1.driver_id, l1.lap_time_ms 
FROM laps l1
WHERE l1.lap_time_ms = (
    SELECT MIN(l2.lap_time_ms) 
    FROM laps l2 
    WHERE l2.driver_id = l1.driver_id AND l2.is_valid = TRUE
);


-- =========================================================================
-- 4. VIEWS
-- =========================================================================

-- Create a View for Race Engineers (Hides complex joins and IDs)
CREATE OR REPLACE VIEW vw_race_engineer_dashboard AS
SELECT 
    s.track_name,
    d.name AS driver_name,
    t.name AS team_name,
    l.lap_number,
    l.lap_time_ms,
    l.is_valid
FROM laps l
JOIN drivers d ON l.driver_id = d.driver_id
JOIN teams t ON d.team_id = t.team_id
JOIN sessions s ON l.session_uid = s.session_uid;

-- Usage of view: SELECT * FROM vw_race_engineer_dashboard WHERE is_valid = TRUE;


-- =========================================================================
-- 5. PL/pgSQL: FUNCTIONS, CURSORS, EXCEPTION HANDLING
-- =========================================================================

-- Function using a CURSOR and EXCEPTION HANDLING
-- Goal: Calculate a driver's penalty score based on invalid laps.
CREATE OR REPLACE FUNCTION calculate_driver_penalty(p_driver_id INT) 
RETURNS TEXT AS $$
DECLARE
    lap_record RECORD;
    v_invalid_count INT := 0;
    v_penalty_score INT := 0;
    
    -- Defining a Cursor to iterate over all laps for this driver
    lap_cursor CURSOR FOR 
        SELECT lap_number, is_valid FROM laps 
        WHERE driver_id = p_driver_id;
BEGIN
    OPEN lap_cursor;
    
    LOOP
        FETCH lap_cursor INTO lap_record;
        EXIT WHEN NOT FOUND;
        
        IF lap_record.is_valid = FALSE THEN
            v_invalid_count := v_invalid_count + 1;
        END IF;
    END LOOP;
    
    CLOSE lap_cursor;
    
    -- Business Logic: 5 points for every invalid lap
    v_penalty_score := v_invalid_count * 5;
    
    -- Simulated Exception Handling (Division by Zero check just to prove concept)
    IF v_invalid_count = 0 THEN
        RETURN 'No penalties, clean driver.';
    END IF;

    RETURN 'Penalty Score: ' || v_penalty_score;

EXCEPTION
    WHEN OTHERS THEN
        RETURN 'An error occurred during calculation: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT calculate_driver_penalty(1);


-- =========================================================================
-- 6. PL/pgSQL: TRIGGERS
-- =========================================================================

-- Table to log driver team transfers
CREATE TABLE driver_transfer_logs (
    log_id SERIAL PRIMARY KEY,
    driver_id INT,
    old_team_id INT,
    new_team_id INT,
    transfer_date TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger Function
CREATE OR REPLACE FUNCTION trg_log_driver_transfer() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the team_id was updated
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
        INSERT INTO driver_transfer_logs (driver_id, old_team_id, new_team_id)
        VALUES (NEW.driver_id, OLD.team_id, NEW.team_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger attaching the function to the drivers table
CREATE TRIGGER after_driver_team_update
AFTER UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION trg_log_driver_transfer();

-- Usage to trigger it: 
-- UPDATE drivers SET team_id = 2 WHERE driver_id = 1;
-- SELECT * FROM driver_transfer_logs;
