-- =========================================================================
-- REVIEW 3: NORMALIZATION DEMONSTRATION (1NF, 2NF, 3NF)
-- =========================================================================

-- -------------------------------------------------------------
-- PART A: Demonstrating the "Bad" Unnormalized Design (Anomalies)
-- -------------------------------------------------------------

-- Let's pretend we had a terrible database design:
CREATE TEMP TABLE bad_unnormalized_table (
    lap_id INT,
    lap_time INT,
    driver_id INT,
    driver_name VARCHAR(100),
    team_name VARCHAR(100) -- Transitive Dependency!
);

INSERT INTO bad_unnormalized_table VALUES 
(1, 91500, 1, 'Max Verstappen', 'Red Bull Racing'),
(2, 91100, 1, 'Max Verstappen', 'Red Bull Racing'),
(3, 92200, 4, 'Lando Norris', 'McLaren');

-- UPDATE ANOMALY DEMO
-- If Red Bull changes to "Oracle Red Bull", we must update multiple rows.
-- If we miss one, the data is corrupted.
UPDATE bad_unnormalized_table 
SET team_name = 'Oracle Red Bull' 
WHERE lap_id = 1;

-- Run this to show the teacher the corrupted data:
SELECT * FROM bad_unnormalized_table; 
-- Notice how Max has two different teams now because of the anomaly!


-- -------------------------------------------------------------
-- PART B: Demonstrating Our Perfect 3NF Design
-- -------------------------------------------------------------

-- Run this to show how our actual APX IQ database avoids anomalies.
-- We only update the team name ONCE in the 'teams' table.
UPDATE teams SET name = 'Oracle Red Bull Racing' WHERE team_id = 1;

-- And seamlessly retrieve perfect, uncorrupted data via Joins:
SELECT l.lap_id, l.lap_time_ms, d.name AS driver, t.name AS team
FROM laps l
JOIN drivers d ON l.driver_id = d.driver_id
JOIN teams t ON d.team_id = t.team_id
WHERE d.driver_id = 1;

-- Clean up
DROP TABLE bad_unnormalized_table;
