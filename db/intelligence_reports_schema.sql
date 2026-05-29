-- Intelligence Reports Table
-- Stores generated AI reports for lap analysis

CREATE TABLE IF NOT EXISTS intelligence_reports (
    report_id SERIAL PRIMARY KEY,
    user_lap_id INT,                    -- Reference to user_lap_telemetry (soft reference)
    ghost_lap_id INT,                   -- Reference to ghost_laps (soft reference)
    session_uid NUMERIC(20,0),          -- Session identifier
    lap_number INT,                     -- Lap number analyzed
    
    -- Report content
    report_type VARCHAR(50) NOT NULL,   -- 'lap_debrief', 'race_summary', 'corner_study'
    title TEXT NOT NULL,
    markdown TEXT NOT NULL,             -- Full report in markdown format
    summary TEXT,                       -- Executive summary
    key_findings JSONB,                 -- Array of key findings
    
    -- Generation metadata
    generated_by VARCHAR(50) NOT NULL,  -- 'ollama/gpt-oss:20b', 'gemini/gemini-2.0-flash', 'local_template'
    generation_time_ms INT,             -- Time taken to generate report
    
    -- Analysis metadata
    total_time_delta_ms REAL,           -- Total time difference vs ghost
    avg_speed_delta_kph REAL,           -- Average speed difference
    corner_count INT,                   -- Number of corners detected
    worst_corner_index INT,             -- Corner with most time loss
    best_corner_index INT,              -- Corner with most time gain
    
    -- Hardware profile at time of generation
    hardware_profile JSONB,             -- Hardware profile data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for fast retrieval
    CONSTRAINT chk_report_type CHECK (report_type IN ('lap_debrief', 'race_summary', 'corner_study'))
);

-- Index for fast lookup by session
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_session 
ON intelligence_reports (session_uid, lap_number);

-- Index for fast lookup by creation date
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_created 
ON intelligence_reports (created_at DESC);

-- Index for fast lookup by report type
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_type 
ON intelligence_reports (report_type);

-- Comments
COMMENT ON TABLE intelligence_reports IS 'Stores AI-generated lap analysis reports';
COMMENT ON COLUMN intelligence_reports.markdown IS 'Full report content in markdown format for rendering';
COMMENT ON COLUMN intelligence_reports.key_findings IS 'JSON array of actionable insights';
COMMENT ON COLUMN intelligence_reports.generated_by IS 'Backend that generated the report (ollama/gemini/template)';
COMMENT ON COLUMN intelligence_reports.hardware_profile IS 'Hardware profile JSON at time of generation';
