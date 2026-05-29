-- =========================================================================
-- REVIEW 3: TRANSACTION MANAGEMENT (ACID) DEMONSTRATION
-- =========================================================================

-- -------------------------------------------------------------
-- PART A: Demonstrating Durability (Successful Commit)
-- -------------------------------------------------------------
-- Highlight this entire block from BEGIN to COMMIT and hit Play.
BEGIN;

-- We update Lando Norris's nationality.
UPDATE drivers 
SET nationality = 'Australian' 
WHERE driver_id = 4;

-- The data is locked into the database hard drive forever.
COMMIT; 

-- Show the teacher the update was successful:
SELECT name, nationality FROM drivers WHERE driver_id = 4;


-- -------------------------------------------------------------
-- PART B: Demonstrating Atomicity & Consistency (Failed Rollback)
-- -------------------------------------------------------------
-- Highlight this entire block from BEGIN to ROLLBACK and hit Play.

BEGIN;

-- 1. We try to update George Russell's nationality.
UPDATE drivers 
SET nationality = 'French' 
WHERE driver_id = 63;

-- 2. But the app simultaneously crashes and sends a bad INSERT.
-- (This violates Foreign Key consistency because team_id 9999 doesn't exist).
INSERT INTO cars (team_id, model) VALUES (9999, 'Glitch Car');

-- Because step 2 failed Consistency, the database Aborts the transaction.
ROLLBACK;

-- Show the teacher that George Russell is STILL British. 
-- The database rolled back Step 1 to save us from partial data corruption! (Atomicity)
SELECT name, nationality FROM drivers WHERE driver_id = 63;
