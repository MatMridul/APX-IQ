-- =========================================================================
-- REVIEW 3: CONCURRENCY CONTROL (LOCKING) DEMONSTRATION
-- NOTE: YOU MUST OPEN TWO BLANK QUERY TABS in pgAdmin to do this!
-- =========================================================================

-- -------------------------------------------------------------
-- DEMONSTRATION A: ROW-LEVEL EXCLUSIVE LOCK
-- -------------------------------------------------------------

-- COPY AND PASTE THIS INTO TAB 1:
-- (Run this first to acquire the lock)
BEGIN;
SELECT * FROM drivers WHERE driver_id = 55 FOR UPDATE;

-- COPY AND PASTE THIS INTO TAB 2:
-- (Run this immediately after. It will freeze!)
UPDATE drivers SET nationality = 'Italian' WHERE driver_id = 55;

-- IN TAB 1 (Run this to release the lock, and watch Tab 2 unfreeze!):
COMMIT;


-- -------------------------------------------------------------
-- DEMONSTRATION B: TABLE-LEVEL LOCK
-- -------------------------------------------------------------

-- COPY AND PASTE THIS INTO TAB 1:
-- (Run this first to lock the entire table like a vault)
BEGIN;
LOCK TABLE laps IN ACCESS EXCLUSIVE MODE;

-- COPY AND PASTE THIS INTO TAB 2:
-- (Run this immediately after. Even a simple read query will freeze!)
SELECT * FROM laps LIMIT 5;

-- IN TAB 1 (Run this to release the vault doors):
COMMIT;
