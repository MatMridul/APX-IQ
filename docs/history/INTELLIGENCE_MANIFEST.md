# APX IQ Intelligence Layer: Technical Manifest

## 🏁 Overview
The **Intelligence Layer** is the analytical core of the APX IQ platform. It transforms raw telemetry (Distance, Speed, Throttle, Brake) into human-readable coaching insights and AI-generated race debriefs.

### Core Mission
Provide **Zero-Cost, Privacy-First, Real-Time** telemetry analysis using a tiered backend system that prioritizes local LLMs (Ollama) over cloud services.

---

## 🏗️ System Architecture

### 1. The Data Pipeline
Telemetry flows through four distinct stages:
1.  **Alignment (`DistanceAligner`)**: Normalizes disparate data frequencies (User vs. Ghost) onto a common 1m-spaced grid.
2.  **Detection (`CornerDetector`)**: Identifies braking zones and apexes using speed minima and curvature analysis.
3.  **Inference (`DeltaEngine` / `CoachEngine`)**: Computes time loss per meter and generates rule-based coaching tips (e.g., "Earlier braking at T1").
4.  **Synthesis (`ReportGenerator`)**: Passes mathematical summaries to the GenAI layer for natural language report generation.

### 2. Multi-Tier GenAI Backend
The `ReportGenerator` follows a strict priority chain:
1.  **Ollama (Local)**: High priority. Uses `httpx` to query `http://localhost:11434`. Model: `gpt-oss:20b`.
2.  **Gemini (Cloud)**: Fallback. Uses `google-genai`. Requires `GEMINI_API_KEY`.
3.  **Template (Offline)**: Final fallback. Uses string formatting and predefined racing engineer logic to generate a report without any LLM.

---

## ✅ Completed Milestones

### Phase 1: Core Intelligence (Math)
- [x] Implemented `DistanceAligner` for sub-meter telemetry precision.
- [x] Built `DeltaEngine` to calculate cumulative time gain/loss.
- [x] Created `CornerDetector` to auto-segment tracks without GPS maps.

### Phase 2: Coaching & Heuristics
- [x] Built `CoachEngine` with racing logic (Late braking, Slow exits, Throttle application).
- [x] Implemented `BattlePredictor` for real-time overtake probability.

### Phase 3: GenAI & Infrastructure
- [x] **Refactored `ReportGenerator`**: Added Ollama REST support and auto-detection.
- [x] **API Integration**: Updated `/intelligence/health` and `/intelligence/report/lap` to handle multi-backend states.
- [x] **Audit**: Successfully passed 22/22 tests for backend switching and data integrity.

### Phase 5A: Frontend-Intelligence Integration ✅ COMPLETE
- [x] **Intelligence Dashboard Page**: Created `/dashboard/intelligence` with full UI
- [x] **Backend Health Check**: Button to verify intelligence layer connectivity
- [x] **Report Generation UI**: Button to generate AI-powered lap debriefs
- [x] **Markdown Rendering**: Integrated `react-markdown` for rich report display
- [x] **Loading States**: 30-60s warning for Ollama with animated loading indicators
- [x] **Backend Status Display**: Shows active LLM backend (Ollama/Gemini/Template)
- [x] **Navigation Integration**: Added "INTELLIGENCE" button to main dashboard header
- [x] **Error Handling**: User-friendly error messages for failed requests
- [x] **Mock Telemetry**: Demonstration data for testing without live session

### Phase 5B: Real Telemetry Integration ✅ COMPLETE
- [x] **Telemetry API Router**: Created `/telemetry/*` endpoints for lap data access
- [x] **Lap Selection UI**: Dropdown to choose from completed laps with metadata
- [x] **Real Telemetry Integration**: Report generation uses actual lap data from API
- [x] **Test Data Generator**: Script to populate sample laps for testing
- [x] **Ghost Lap Selection UI**: Year/track/driver browser for FastF1 data
- [x] **Hardware Profiling UI**: Steering trace capture and classification display
- [x] **Report Persistence**: Save reports to storage with history view

---

## 🛠️ Technical Reference for Agents

### Key Files
- `intelligence/report_generator.py`: Entry point for AI reports. Contains the fallback logic.
- `api/intelligence_router.py`: FastAPI endpoints.
- `requirements.txt`: Includes `google-genai` and `httpx`.

### Backend Configuration
Backends are detected at runtime. Check `gen.active_backend` to see what is currently running.
```python
# report_generator.py: Line 110 (Selection Logic)
if self._check_ollama():
    self.active_backend = "ollama"
elif self.api_key:
    self.active_backend = "gemini"
else:
    self.active_backend = "template"
```

### Prompt Engineering
The system uses **Structured Data Prompting**. We send the LLM a JSON-like summary of telemetry (deltas, corner stats, coaching tips) rather than raw CSV rows. This minimizes token usage and improves "Race Engineer" personality consistency.

---

## 🚀 Roadmap: Future Phases

### Phase 5B: Real Telemetry Integration (Next Priority)
*   **Lap Selection UI**: Dropdown to choose from completed laps stored in database
*   **Ghost Lap Browser**: UI to select year/track/driver for FastF1 ghost data
*   **Hardware Profile UI**: Steering trace upload and hardware tier confirmation
*   **Report Persistence**: Save generated reports to database with history view
*   **Real-Time Progress**: WebSocket streaming for long-running report generation

### Phase 6: Deep Telemetry Enrichment
*   **Thermal Analysis**: Integrate Tyre Temp and Brake Temp into `CoachEngine`.
    *   *Goal*: Explain time loss due to "Overheated rears on exit" or "Glazed brakes at T4".
*   **Energy Management (ERS)**: Track SOC (State of Charge) to see if time was lost due to "Derating" on straights.

### Phase 7: Sector-Specific Performance Profiles
*   **Track Topology**: Map performance to track characteristics (e.g., "Dominant in high-speed sectors, losing time in heavy braking zones").
*   **Setup Suggestions**: Use LLM to suggest aero/suspension changes based on telemetry patterns (e.g., "Understeer at apex suggests more front wing").

### Phase 8: Persistence & Career Tracking
*   **Database Integration**: Save generated reports to PostgreSQL/Supabase.
*   **Trend Analysis**: Track "Coaching Completion Rate" to see if the user is actually improving on specific corners over multiple sessions.

---

## 🛠️ Immediate Next Tasks for the Next Agent
1.  **Testing Phase 5B**: Run comprehensive tests using `TESTING_GUIDE_PHASE_5B.md`
2.  **Database Migration**: Replace in-memory storage with PostgreSQL persistence
3.  **Real-Time Integration**: Connect TelemetryRecorder to API for auto-saving laps
4.  **Session Tracking**: Integrate SessionManager with telemetry endpoints
5.  **Production Hardening**: Add authentication, rate limiting, and monitoring

---

## ⚠️ Known Gotchas
- **Ollama Warmup**: Large models (20B+) can take 30s-60s to load on first request. The `httpx` timeout is set to 90s to accommodate this.
- **FastF1 Normalization**: Always ensure lap times are converted to milliseconds before passing to `DeltaEngine`.
- **Backend Selection**: The system auto-detects backends. If Ollama is running but slow, it might timeout and fallback. Ensure the local Ollama instance has enough VRAM.
