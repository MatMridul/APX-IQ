-- =========================================================================
-- APX IQ: DBMS Review 3 Execution Script
-- Contains: Transactions (ACID) and Concurrency (Locking) Demonstrations
-- =========================================================================

-- =========================================================================
-- 1. TRANSACTION MANAGEMENT (ACID Properties)
-- =========================================================================

-- Scenario: A driver is transferring teams, and we need to update their team
-- AND log it in the transfer logs AT THE EXACT SAME TIME. 
-- If one fails, both must fail (Atomicity).

-- STEP 1: Run this block to show a SUCCESSFUL Transaction (Commit)
BEGIN;

-- Part A: Update Max Verstappen to a new team
UPDATE drivers 
SET team_id = 3 -- Ferrari
WHERE driver_id = 1;

-- Part B: Log the transfer manually (assuming we didn't use trigger)
INSERT INTO driver_transfer_logs (driver_id, old_team_id, new_team_id)
VALUES (1, 1, 3);

COMMIT; -- This locks in ALL the changes permanently (Durability).

-- -------------------------------------------------------------------------
-- STEP 2: Show a FAILED Transaction (Rollback) showing Atomicity & Consistency
BEGIN;

-- Part A: Update Lewis Hamilton to a new team
UPDATE drivers 
SET team_id = 3
WHERE driver_id = 44;

-- Part B: Intentionally cause a Consistency error 
-- (Inserting a driver_id that doesn't exist to break a Foreign Key, or dividing by zero)
INSERT INTO driver_transfer_logs (driver_id, old_team_id, new_team_id)
VALUES (9999, 2, 3); -- Error: driver_id 9999 does not exist!

-- Because Part B hit an error, the database enters an aborted state.
ROLLBACK;
-- Result: Lewis Hamilton's team update from Part A was CANCELLED because Part B failed. Atomicity!


-- =========================================================================
-- 2. CONCURRENCY CONTROL (Locking)
-- NOTE for Mridul: You must run this using TWO SEPARATE QUERY TABS in pgAdmin 
-- to pretend to be two different users at the exact same moment.
-- =========================================================================

-- -------------------------------------------------------------
-- DEMO A: Row-Level Exclusive Lock (FOR UPDATE)
-- -------------------------------------------------------------
-- In TAB 1 (User A) run this:
BEGIN;
SELECT * FROM drivers WHERE driver_id = 16 FOR UPDATE;
-- Explain: Charles Leclerc's row is now locked exclusively to Tab 1. I am processing something.

-- In TAB 2 (User B) run this quickly:
UPDATE drivers SET nationality = 'French' WHERE driver_id = 16;
-- Explain: Notice how Tab 2 gets stuck "Executing" forever! It is forced to wait because Tab 1 owns the lock.

-- In TAB 1 (User A) run this:
COMMIT;
-- Explain: The lock unlocks, and magically Tab 2 instantly unfreezes and finishes its job!

-- -------------------------------------------------------------
-- DEMO B: Table-Level Lock
-- -------------------------------------------------------------
-- In TAB 1 (User A) run this:
BEGIN;
LOCK TABLE laps IN ACCESS EXCLUSIVE MODE;
-- Explain: Lock the entire laps table because we are doing bulk maintenance.

-- In TAB 2 (User B) run this:
SELECT * FROM laps LIMIT 5;
-- Explain: Even a simple SELECT read query freezes. No one can touch the table.

-- In TAB 1 (User A) run this:
COMMIT;
-- Explain: Laps table is released. Tab 2 immediately displays the laps.
