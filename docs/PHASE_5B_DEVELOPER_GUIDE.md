# Phase 5B Developer Guide: Real Telemetry Integration

## Quick Start for Next Developer

You're picking up where Phase 5A left off. The intelligence dashboard UI is complete and working with mock data. Your job is to connect it to real telemetry from the database and add lap/ghost selection features.

## Current State (Phase 5A Complete)

### What Works
✅ Intelligence dashboard page at `/dashboard/intelligence`  
✅ Backend health check button  
✅ Report generation with mock telemetry  
✅ Markdown rendering of AI reports  
✅ Loading states and error handling  
✅ Navigation from main dashboard  
✅ Multi-backend LLM support (Ollama/Gemini/Template)  

### What's Mock/Placeholder
❌ Telemetry data (currently 500 synthetic points)  
❌ Lap selection (no UI to choose which lap to analyze)  
❌ Ghost lap selection (no UI to browse FastF1 data)  
❌ Hardware profiling (no steering trace capture)  
❌ Report persistence (reports not saved to database)  

## Your Mission: Phase 5B

### Priority 1: Real Telemetry Integration

**Goal**: Replace mock telemetry with actual lap data from the database.

**Files to Modify**:
- `ui/src/app/dashboard/intelligence/page.tsx` (line 60-80: mock telemetry generation)

**Database Schema** (see `db/schema.sql`):
```sql
-- User lap telemetry
CREATE TABLE user_lap_telemetry (
    id SERIAL PRIMARY KEY,
    lap_id INTEGER REFERENCES laps(id),
    distance_m FLOAT,
    speed_kph FLOAT,
    throttle FLOAT,
    brake FLOAT,
    steer FLOAT,
    gear INTEGER,
    rpm INTEGER,
    drs BOOLEAN,
    x FLOAT,
    y FLOAT,
    z FLOAT,
    timestamp_ms BIGINT
);

-- Ghost lap telemetry (from FastF1)
CREATE TABLE ghost_laps (
    id SERIAL PRIMARY KEY,
    track_id INTEGER,
    year INTEGER,
    driver_code VARCHAR(3),
    lap_time_s FLOAT,
    session_type VARCHAR(10),
    telemetry JSONB  -- Full telemetry array
);
```

**Implementation Steps**:

1. **Create API endpoint to fetch user lap telemetry**:
```typescript
// Add to intelligence page
const fetchUserLapTelemetry = async (lapId: number) => {
    const response = await fetch(`http://localhost:8000/telemetry/lap/${lapId}`);
    return response.json();
};
```

2. **Add backend endpoint** (if not exists):
```python
# In api/main.py or new telemetry_router.py
@router.get("/telemetry/lap/{lap_id}")
async def get_lap_telemetry(lap_id: int):
    # Query user_lap_telemetry table
    # Return telemetry points in same format as mock data
    pass
```

3. **Replace mock data in intelligence page**:
```typescript
// OLD (line 60-80):
const mockTelemetry = {
    user_telemetry: Array.from({ length: 500 }, ...),
    ghost_telemetry: Array.from({ length: 500 }, ...),
    grid_points: 1000,
};

// NEW:
const userTelemetry = await fetchUserLapTelemetry(selectedLapId);
const ghostTelemetry = await fetchGhostLapTelemetry(selectedGhostId);
const telemetryData = {
    user_telemetry: userTelemetry,
    ghost_telemetry: ghostTelemetry,
    grid_points: 1000,
};
```

### Priority 2: Lap Selection UI

**Goal**: Add a dropdown to select which completed lap to analyze.

**UI Design**:
```
┌─────────────────────────────────────────┐
│ SELECT LAP TO ANALYZE                   │
├─────────────────────────────────────────┤
│ [Dropdown: Lap 5 - 1:23.456 (Best)]    │
│                                         │
│ Options:                                │
│ - Lap 1 - 1:28.123                     │
│ - Lap 2 - 1:25.789                     │
│ - Lap 3 - 1:24.567                     │
│ - Lap 4 - 1:23.890                     │
│ - Lap 5 - 1:23.456 (Best) ✓           │
└─────────────────────────────────────────┘
```

**Implementation**:

1. **Fetch available laps**:
```typescript
const [availableLaps, setAvailableLaps] = useState<Lap[]>([]);
const [selectedLapId, setSelectedLapId] = useState<number | null>(null);

useEffect(() => {
    const fetchLaps = async () => {
        const response = await fetch('http://localhost:8000/laps/completed');
        const laps = await response.json();
        setAvailableLaps(laps);
        // Auto-select best lap
        const bestLap = laps.reduce((best, lap) => 
            lap.lap_time < best.lap_time ? lap : best
        );
        setSelectedLapId(bestLap.id);
    };
    fetchLaps();
}, []);
```

2. **Add dropdown component**:
```typescript
<CarbonPanel title="LAP SELECTION">
    <select 
        value={selectedLapId || ''} 
        onChange={(e) => setSelectedLapId(Number(e.target.value))}
        className="w-full bg-black border border-gold/50 text-white p-2 rounded"
    >
        {availableLaps.map(lap => (
            <option key={lap.id} value={lap.id}>
                Lap {lap.lap_number} - {formatLapTime(lap.lap_time)}
                {lap.is_best && ' (Best)'}
            </option>
        ))}
    </select>
</CarbonPanel>
```

3. **Backend endpoint**:
```python
@router.get("/laps/completed")
async def get_completed_laps():
    # Query laps table where lap_time IS NOT NULL
    # Return list of laps with id, lap_number, lap_time, is_best
    pass
```

### Priority 3: Ghost Lap Selection UI

**Goal**: Add UI to browse and select ghost laps from FastF1 data.

**UI Design**:
```
┌─────────────────────────────────────────┐
│ SELECT GHOST LAP                        │
├─────────────────────────────────────────┤
│ Year:   [2024 ▼]                       │
│ Track:  [Monaco ▼]                     │
│ Driver: [VER ▼]                        │
│                                         │
│ Ghost Lap: 1:12.345                    │
│ [LOAD GHOST LAP]                       │
└─────────────────────────────────────────┘
```

**Implementation**:

1. **Add state for ghost selection**:
```typescript
const [ghostYear, setGhostYear] = useState(2024);
const [ghostTrack, setGhostTrack] = useState<number>(0);
const [ghostDriver, setGhostDriver] = useState('VER');
const [ghostLapData, setGhostLapData] = useState<any>(null);
```

2. **Fetch ghost lap**:
```typescript
const loadGhostLap = async () => {
    const response = await fetch(
        `http://localhost:8000/intelligence/ghost/${ghostTrack}?year=${ghostYear}&driver=${ghostDriver}`
    );
    const data = await response.json();
    setGhostLapData(data);
};
```

3. **Add dropdowns**:
```typescript
<CarbonPanel title="GHOST LAP SELECTION">
    <div className="space-y-4">
        <div>
            <label className="text-xs text-silver/60">YEAR</label>
            <select value={ghostYear} onChange={(e) => setGhostYear(Number(e.target.value))}>
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
        </div>
        <div>
            <label className="text-xs text-silver/60">TRACK</label>
            <select value={ghostTrack} onChange={(e) => setGhostTrack(Number(e.target.value))}>
                {Object.entries(TRACK_IDS).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                ))}
            </select>
        </div>
        <div>
            <label className="text-xs text-silver/60">DRIVER</label>
            <select value={ghostDriver} onChange={(e) => setGhostDriver(e.target.value)}>
                {['VER', 'HAM', 'LEC', 'NOR', 'PER', 'SAI'].map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                ))}
            </select>
        </div>
        <button onClick={loadGhostLap} className="w-full bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded p-2">
            LOAD GHOST LAP
        </button>
        {ghostLapData && (
            <div className="text-sm text-silver">
                Loaded: {ghostLapData.driver} - {ghostLapData.lap_time_s.toFixed(3)}s
            </div>
        )}
    </div>
</CarbonPanel>
```

### Priority 4: Hardware Profiling UI

**Goal**: Add steering trace capture and hardware classification.

**UI Design**:
```
┌─────────────────────────────────────────┐
│ HARDWARE PROFILING                      │
├─────────────────────────────────────────┤
│ Status: Not Profiled                    │
│                                         │
│ [CAPTURE STEERING TRACE]                │
│                                         │
│ Instructions:                           │
│ 1. Complete a full lap                  │
│ 2. System will analyze steering inputs │
│ 3. Coaching tips will be scaled         │
└─────────────────────────────────────────┘
```

**Implementation**:

1. **Capture steering trace from telemetry**:
```typescript
const captureSteeringTrace = async () => {
    // Get last completed lap's steering data
    const response = await fetch(`http://localhost:8000/telemetry/lap/${selectedLapId}/steering`);
    const steerTrace = await response.json();
    
    // Send to hardware profiler
    const profileResponse = await fetch('http://localhost:8000/intelligence/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steer_trace: steerTrace }),
    });
    
    const profile = await profileResponse.json();
    setHardwareProfile(profile);
};
```

2. **Display hardware profile**:
```typescript
{hardwareProfile && (
    <div className="space-y-2">
        <div className="text-gold font-bold">{hardwareProfile.tier_label}</div>
        <div className="text-xs text-silver/60">
            Confidence: {(hardwareProfile.confidence * 100).toFixed(0)}%
        </div>
        <div className="text-xs text-silver/60">
            Brake Threshold: {hardwareProfile.brake_threshold_m.toFixed(1)}m
        </div>
    </div>
)}
```

### Priority 5: Report Persistence

**Goal**: Save generated reports to database and add history view.

**Database Schema**:
```sql
CREATE TABLE intelligence_reports (
    id SERIAL PRIMARY KEY,
    user_lap_id INTEGER REFERENCES laps(id),
    ghost_lap_id INTEGER REFERENCES ghost_laps(id),
    report_type VARCHAR(50),
    title TEXT,
    markdown TEXT,
    summary TEXT,
    key_findings JSONB,
    generated_by VARCHAR(50),
    hardware_profile JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation**:

1. **Save report after generation**:
```typescript
const saveReport = async (report: LapReport) => {
    await fetch('http://localhost:8000/intelligence/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_lap_id: selectedLapId,
            ghost_lap_id: selectedGhostId,
            report_type: 'lap_debrief',
            title: report.title,
            markdown: report.markdown,
            summary: report.summary,
            key_findings: report.key_findings,
            generated_by: report.generated_by,
            hardware_profile: hardwareProfile,
        }),
    });
};
```

2. **Add report history view**:
```typescript
const [reportHistory, setReportHistory] = useState<Report[]>([]);

const fetchReportHistory = async () => {
    const response = await fetch('http://localhost:8000/intelligence/reports/history');
    const reports = await response.json();
    setReportHistory(reports);
};

// UI
<CarbonPanel title="REPORT HISTORY">
    <div className="space-y-2">
        {reportHistory.map(report => (
            <div key={report.id} className="p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10"
                 onClick={() => setReport(report)}>
                <div className="text-sm text-white">{report.title}</div>
                <div className="text-xs text-silver/60">
                    {new Date(report.created_at).toLocaleString()}
                </div>
            </div>
        ))}
    </div>
</CarbonPanel>
```

## Testing Checklist

### Real Telemetry
- [ ] User lap telemetry loads from database
- [ ] Ghost lap telemetry loads from FastF1
- [ ] Telemetry format matches backend expectations
- [ ] Report generation works with real data

### Lap Selection
- [ ] Dropdown shows all completed laps
- [ ] Best lap is auto-selected
- [ ] Lap times are formatted correctly
- [ ] Selection updates report generation

### Ghost Selection
- [ ] Year/track/driver dropdowns populate
- [ ] Ghost lap loads successfully
- [ ] Ghost lap metadata displays
- [ ] Invalid selections show error messages

### Hardware Profiling
- [ ] Steering trace captures from telemetry
- [ ] Hardware classification returns valid tier
- [ ] Profile displays in UI
- [ ] Coaching tips scale to hardware tier

### Report Persistence
- [ ] Reports save to database
- [ ] Report history loads correctly
- [ ] Clicking history item loads report
- [ ] Reports include all metadata

## Common Pitfalls

### 1. Telemetry Format Mismatch
**Problem**: Backend expects different field names than database provides.

**Solution**: Create a mapper function:
```typescript
const mapTelemetryToBackendFormat = (dbTelemetry: any[]) => {
    return dbTelemetry.map(point => ({
        distance_m: point.distance,
        speed_kph: point.speed,
        throttle: point.throttle / 100, // Convert percentage to 0-1
        brake: point.brake / 100,
        steer: point.steer,
        gear: point.gear,
        rpm: point.rpm,
        drs: point.drs === 1,
        x: point.x,
        y: point.y,
        z: point.z,
    }));
};
```

### 2. Missing Telemetry Data
**Problem**: Not all laps have full telemetry recorded.

**Solution**: Filter laps with complete telemetry:
```python
@router.get("/laps/completed")
async def get_completed_laps():
    # Only return laps with telemetry_count > 500
    query = """
        SELECT l.*, COUNT(t.id) as telemetry_count
        FROM laps l
        LEFT JOIN user_lap_telemetry t ON l.id = t.lap_id
        WHERE l.lap_time IS NOT NULL
        GROUP BY l.id
        HAVING COUNT(t.id) > 500
    """
```

### 3. Ghost Lap Not Found
**Problem**: FastF1 doesn't have data for requested year/track/driver combo.

**Solution**: Add fallback logic:
```typescript
const loadGhostLap = async () => {
    try {
        const response = await fetch(...);
        if (response.status === 404) {
            setError('Ghost lap not found. Try a different driver or year.');
            return;
        }
        // ...
    } catch (err) {
        setError('Failed to load ghost lap. Using default.');
        // Load a default ghost lap
    }
};
```

### 4. Report Generation Timeout
**Problem**: Ollama takes too long, request times out.

**Solution**: Increase timeout and add progress updates:
```typescript
const generateReport = async () => {
    setIsGenerating(true);
    setProgress('Aligning telemetry...');
    
    try {
        const response = await fetch('...', {
            // Increase timeout to 120s
            signal: AbortSignal.timeout(120000),
        });
        // ...
    } catch (err) {
        if (err.name === 'TimeoutError') {
            setError('Report generation timed out. Try using Gemini backend.');
        }
    }
};
```

## File Reference

### Frontend Files to Modify
- `ui/src/app/dashboard/intelligence/page.tsx` - Main intelligence dashboard
- `ui/src/hooks/useTelemetry.ts` - May need to add lap selection logic
- `ui/src/utils/constants.ts` - Add driver codes, track mappings

### Backend Files to Modify
- `api/intelligence_router.py` - Already has most endpoints
- `api/main.py` - May need to add telemetry router
- `intelligence/telemetry_recorder.py` - Check if lap storage is implemented

### Database Files
- `db/schema.sql` - Check table structure
- `db/seed.sql` - May need sample data for testing

## Resources

### Existing Code to Reference
- Mock telemetry generation: `ui/src/app/dashboard/intelligence/page.tsx` lines 60-80
- Backend endpoints: `api/intelligence_router.py`
- Telemetry format: `intelligence/alignment.py` (see expected DataFrame columns)

### Documentation
- `INTELLIGENCE_MANIFEST.md` - Technical architecture
- `INTELLIGENCE_UI_GUIDE.md` - User-facing guide
- `docs/Data Output from F1 25 v3.txt` - Telemetry packet structure

### Testing
- Use `scripts/simulate_udp_25.py` to generate test telemetry
- Check `test_intelligence_audit.py` for backend testing examples

## Success Criteria

Phase 5B is complete when:
- [ ] Real telemetry replaces mock data
- [ ] Users can select which lap to analyze
- [ ] Users can browse and load ghost laps
- [ ] Hardware profiling works from steering trace
- [ ] Reports are saved to database
- [ ] Report history is viewable
- [ ] All features work end-to-end with live session
- [ ] No TypeScript errors
- [ ] Backend tests pass

## Estimated Effort

- **Real Telemetry Integration**: 2-3 hours
- **Lap Selection UI**: 1-2 hours
- **Ghost Selection UI**: 2-3 hours
- **Hardware Profiling**: 1-2 hours
- **Report Persistence**: 2-3 hours
- **Testing & Polish**: 2-3 hours

**Total**: 10-16 hours

## Questions?

If you get stuck:
1. Check the backend logs for detailed error messages
2. Review the intelligence layer tests: `test_intelligence_audit.py`
3. Look at how the main dashboard fetches telemetry: `ui/src/hooks/useTelemetry.ts`
4. Check the database schema: `db/schema.sql`

Good luck! 🏁
