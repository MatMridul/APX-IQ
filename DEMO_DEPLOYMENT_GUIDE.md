# APX IQ Demo Deployment Guide

## Demo Setup Overview

### Testing Setup (Before Demo)
```
Friend's Laptop (F1 Game)  →  Your Laptop (Backend + Frontend)
     UDP Port 20777              View Dashboard
```

### Demo Day Setup
```
Your Laptop (F1 Game + Backend)  →  Teammate's Laptop (Frontend)
     UDP Port 20777                   View Dashboard
     Backend API :8000
```

---

## Network Architecture

### Option 1: Local Network (Recommended)
Both laptops on same WiFi network, communicate via local IP addresses.

### Option 2: Hotspot
Your laptop creates WiFi hotspot, teammate connects to it.

---

## Pre-Demo Testing Setup

### Your Laptop Configuration

#### 1. Find Your Local IP Address
```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100

# Mac/Linux
ifconfig
# Look for "inet" under your active network adapter
# Example: 192.168.1.100
```

#### 2. Start Backend
```bash
# From project root
python api/main.py
```

**Expected Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Important**: Backend binds to `0.0.0.0:8000` which means it accepts connections from any IP.

#### 3. Start Frontend
```bash
cd ui
npm run dev
```

**Expected Output**:
```
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000
```

**Note the Network URL** - this is what your friend will use.

#### 4. Test Backend Accessibility
From your laptop:
```bash
curl http://localhost:8000/health
```

From friend's laptop (replace with your IP):
```bash
curl http://192.168.1.100:8000/health
```

Should return:
```json
{
  "status": "online",
  "ingestion": "running",
  "session_active": false,
  "active_clients": 0
}
```

### Friend's Laptop (F1 Game) Configuration

#### 1. Configure F1 Game UDP Output
1. Open F1 game
2. Go to **Settings** → **Telemetry Settings**
3. Set:
   - **UDP Telemetry**: ON
   - **UDP Broadcast Mode**: ON
   - **UDP IP Address**: `192.168.1.100` (YOUR laptop's IP)
   - **UDP Port**: `20777`
   - **UDP Send Rate**: 60Hz (maximum)
   - **UDP Format**: 2024 or 2025

#### 2. Test Connection
1. Start a race/practice session
2. Check your laptop's backend logs for:
```
INFO:     UDP Listener bound and ready.
DEBUG:    Received packet from 192.168.1.XXX
```

#### 3. Access Frontend
Open browser on friend's laptop:
```
http://192.168.1.100:3000/dashboard
```

You should see live telemetry updating.

---

## Demo Day Setup

### Your Laptop (F1 Game + Backend)

#### 1. Network Setup

**Option A: Both on Same WiFi (Easiest)**
1. Connect both laptops to same WiFi network
2. Find your IP: `ipconfig` or `ifconfig`
3. Note your IP (e.g., `192.168.1.100`)

**Option B: Create Hotspot (More Reliable)**
1. Create WiFi hotspot on your laptop:
   - **Windows**: Settings → Network & Internet → Mobile hotspot
   - **Mac**: System Preferences → Sharing → Internet Sharing
2. Set hotspot name: `APX-IQ-Demo`
3. Set password: `apxiq2024`
4. Your laptop will have IP: `192.168.137.1` (Windows) or `192.168.2.1` (Mac)
5. Teammate connects to your hotspot

#### 2. Configure F1 Game
1. Open F1 game
2. Go to **Settings** → **Telemetry Settings**
3. Set:
   - **UDP Telemetry**: ON
   - **UDP Broadcast Mode**: OFF (important!)
   - **UDP IP Address**: `127.0.0.1` (localhost, since game is on same machine)
   - **UDP Port**: `20777`
   - **UDP Send Rate**: 60Hz
   - **UDP Format**: 2024 or 2025

#### 3. Start Backend
```bash
# From project root
python api/main.py
```

**Verify it's accessible**:
```bash
# From your laptop
curl http://localhost:8000/health

# From teammate's laptop (replace with your IP)
curl http://192.168.1.100:8000/health
```

#### 4. Populate Test Data (Optional)
If you want to show intelligence features without playing:
```bash
python scripts/populate_test_laps.py
```

### Teammate's Laptop (Frontend Display)

#### 1. Connect to Network
- **Option A**: Connect to same WiFi as your laptop
- **Option B**: Connect to your laptop's hotspot

#### 2. Get Your Laptop's IP
Ask you for the IP address, or:
```bash
# Windows
ping YOUR-LAPTOP-NAME.local

# Mac
ping YOUR-LAPTOP-NAME.local
```

#### 3. Configure Frontend Environment

**Option A: Use Environment Variable (Recommended)**

Create `.env.local` in `ui/` directory:
```bash
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000
```

Then start frontend:
```bash
cd ui
npm run dev
```

**Option B: Quick Fix (For Demo)**

Edit `ui/src/app/dashboard/intelligence/page.tsx` temporarily:
```typescript
// At the top of the file, add:
const API_BASE = 'http://192.168.1.100:8000';

// Then replace all fetch URLs:
fetch(`${API_BASE}/intelligence/health`)
fetch(`${API_BASE}/telemetry/laps/completed`)
// etc.
```

**Option C: Build and Serve (Most Reliable)**

On your laptop, build the frontend:
```bash
cd ui
npm run build
npm run start
```

This runs on port 3000 and is more stable than dev mode.

Teammate accesses:
```
http://192.168.1.100:3000/dashboard
```

---

## Firewall Configuration

### Windows Firewall
```powershell
# Allow Python (backend)
netsh advfirewall firewall add rule name="APX IQ Backend" dir=in action=allow protocol=TCP localport=8000

# Allow Node (frontend)
netsh advfirewall firewall add rule name="APX IQ Frontend" dir=in action=allow protocol=TCP localport=3000

# Allow UDP (telemetry)
netsh advfirewall firewall add rule name="APX IQ Telemetry" dir=in action=allow protocol=UDP localport=20777
```

### Mac Firewall
```bash
# System Preferences → Security & Privacy → Firewall
# Click "Firewall Options"
# Add Python and Node to allowed apps
```

---

## Demo Day Checklist

### 1 Hour Before Demo

#### Your Laptop
- [ ] Fully charged + power adapter ready
- [ ] F1 game installed and tested
- [ ] Python environment activated
- [ ] Node.js and npm working
- [ ] Backend tested: `python api/main.py`
- [ ] Frontend tested: `cd ui && npm run dev`
- [ ] Know your IP address (write it down!)
- [ ] Firewall rules configured
- [ ] Test data populated (optional)

#### Teammate's Laptop
- [ ] Fully charged + power adapter ready
- [ ] Node.js installed (if running frontend locally)
- [ ] Browser tested (Chrome/Firefox recommended)
- [ ] Can ping your laptop
- [ ] Can access `http://YOUR-IP:8000/health`

### 30 Minutes Before Demo

#### Network Setup
- [ ] Both laptops connected to network
- [ ] IP addresses confirmed
- [ ] Ping test successful
- [ ] Backend accessible from teammate's laptop

#### Backend Startup
```bash
# Your laptop
cd /path/to/apx-iq-platform
python api/main.py
```

**Verify**:
- [ ] "Uvicorn running on http://0.0.0.0:8000"
- [ ] "UDP Listener bound and ready"
- [ ] No errors in console

#### Frontend Startup

**Option 1: Run on Your Laptop (Recommended)**
```bash
# Your laptop
cd ui
npm run build  # Takes 2-3 minutes
npm run start  # Production mode, more stable
```

Teammate accesses: `http://YOUR-IP:3000`

**Option 2: Run on Teammate's Laptop**
```bash
# Teammate's laptop
cd ui
# Edit .env.local with your IP
npm run dev
```

Access: `http://localhost:3000`

### 10 Minutes Before Demo

#### Full System Test
1. **Start F1 Game** (your laptop)
2. **Start Practice Session**
3. **Check Backend Logs** - should see UDP packets
4. **Open Dashboard** (teammate's laptop)
   - Navigate to `http://YOUR-IP:3000/dashboard`
5. **Verify Live Telemetry**
   - Speed updating
   - RPM updating
   - Lap times showing
6. **Test Intelligence Layer**
   - Navigate to Intelligence page
   - Check backend status
   - Generate a test report (if time)

---

## Demo Flow

### Act 1: Live Telemetry (5 minutes)
1. **Show Dashboard**
   - Teammate displays dashboard on projector
   - You start driving in F1 game
   - Point out live telemetry updates:
     - Speed trace
     - RPM graph
     - Lap timing
     - Pedal inputs
     - Tyre temperatures

2. **Complete a Lap**
   - Show lap time recording
   - Show sector times
   - Explain data capture

### Act 2: Intelligence Layer (5 minutes)
1. **Navigate to Intelligence Page**
   - Click "INTELLIGENCE" button in header

2. **Show Backend Status**
   - Click "CHECK STATUS"
   - Show LLM backend (Ollama/Gemini/Template)
   - Explain multi-tier backend

3. **Select Lap for Analysis**
   - Show lap selection dropdown
   - Select the lap you just completed
   - Show telemetry metadata

4. **Load Ghost Lap** (Optional)
   - Select year: 2024
   - Select track: Monaco (or current track)
   - Select driver: VER
   - Click "LOAD GHOST LAP"
   - Show ghost lap metadata

5. **Generate Report**
   - Click "GENERATE LAP DEBRIEF"
   - Show loading state (explain 30-60s for Ollama)
   - Display generated report:
     - Executive summary
     - Key findings
     - Corner-by-corner analysis
     - Coaching tips

6. **Show Hardware Profiling** (Optional)
   - Click "PROFILE HARDWARE"
   - Show detected hardware tier
   - Explain coaching tip scaling

### Act 3: Q&A (5 minutes)
- Show architecture diagram
- Explain technology stack
- Demonstrate any specific features requested

---

## Troubleshooting Guide

### Issue: Teammate Can't Access Backend

**Symptoms**: `curl http://YOUR-IP:8000/health` fails

**Solutions**:
1. Check firewall:
   ```bash
   # Windows
   netsh advfirewall show allprofiles state
   
   # Temporarily disable for testing
   netsh advfirewall set allprofiles state off
   ```

2. Verify backend is running:
   ```bash
   # Your laptop
   curl http://localhost:8000/health
   ```

3. Check IP address is correct:
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

4. Try different port:
   ```bash
   # Edit api/main.py
   uvicorn.run(app, host="0.0.0.0", port=8001)
   ```

### Issue: No Telemetry Data

**Symptoms**: Dashboard shows "NO SIGNAL"

**Solutions**:
1. Check F1 game UDP settings:
   - UDP Telemetry: ON
   - UDP Port: 20777
   - UDP IP: 127.0.0.1 (if game on same laptop as backend)

2. Check backend logs:
   ```
   Should see: "Received X bytes from..."
   ```

3. Restart backend:
   ```bash
   # Ctrl+C to stop
   python api/main.py
   ```

4. Check port not in use:
   ```bash
   # Windows
   netstat -ano | findstr :20777
   
   # Mac/Linux
   lsof -i :20777
   ```

### Issue: Frontend Won't Load

**Symptoms**: Browser shows "Cannot connect"

**Solutions**:
1. Check frontend is running:
   ```bash
   # Should see "Ready in X.Xs"
   ```

2. Try localhost first:
   ```
   http://localhost:3000
   ```

3. Check firewall allows port 3000

4. Try production build:
   ```bash
   npm run build
   npm run start
   ```

### Issue: Report Generation Fails

**Symptoms**: "Failed to generate report" error

**Solutions**:
1. Check backend logs for errors

2. Try with mock data:
   - Enable "Use mock data" checkbox
   - Generate report

3. Check LLM backend:
   ```bash
   # If using Ollama
   curl http://localhost:11434/api/tags
   ```

4. Fall back to template mode:
   - Backend will auto-fallback if Ollama/Gemini unavailable

### Issue: Slow Performance

**Symptoms**: Lag, stuttering, slow updates

**Solutions**:
1. Close unnecessary applications

2. Use production build:
   ```bash
   npm run build
   npm run start
   ```

3. Reduce F1 game graphics settings

4. Use wired connection instead of WiFi

5. Disable browser extensions

---

## Backup Plans

### Plan A: Everything Works (Ideal)
- Live telemetry from F1 game
- Real-time dashboard updates
- AI report generation
- Full demo as planned

### Plan B: Network Issues
- Run everything on your laptop
- Use screen sharing to teammate's laptop
- Or use HDMI cable to projector directly

### Plan C: Backend Issues
- Use pre-recorded video of working system
- Show code and architecture instead
- Walk through documentation

### Plan D: Complete Fallback
- Show populated test data
- Generate reports from test laps
- Demonstrate intelligence features without live game

---

## Quick Reference Card

### Your Laptop IP
```
Write here: ___________________
```

### URLs for Teammate
```
Backend Health:  http://YOUR-IP:8000/health
Frontend:        http://YOUR-IP:3000/dashboard
Intelligence:    http://YOUR-IP:3000/dashboard/intelligence
```

### F1 Game Settings
```
UDP Telemetry:    ON
UDP IP:           127.0.0.1
UDP Port:         20777
UDP Send Rate:    60Hz
```

### Emergency Commands
```bash
# Restart backend
Ctrl+C
python api/main.py

# Restart frontend
Ctrl+C
npm run start

# Check if ports are free
netstat -ano | findstr :8000
netstat -ano | findstr :3000
netstat -ano | findstr :20777
```

---

## Post-Demo

### Cleanup
- [ ] Stop backend (Ctrl+C)
- [ ] Stop frontend (Ctrl+C)
- [ ] Close F1 game
- [ ] Disconnect hotspot (if used)
- [ ] Re-enable firewall (if disabled)

### Backup Data
- [ ] Save generated reports
- [ ] Export lap data
- [ ] Take screenshots
- [ ] Record demo video (if possible)

---

## Tips for Smooth Demo

### Technical Tips
1. **Test Everything 1 Hour Before** - Full run-through
2. **Have Backup Plan** - Screen sharing ready
3. **Close Unnecessary Apps** - Free up resources
4. **Disable Notifications** - No popups during demo
5. **Charge Laptops** - Full battery + power adapters
6. **Use Wired Connection** - If possible, more stable
7. **Production Build** - More stable than dev mode

### Presentation Tips
1. **Start with Architecture** - Show the big picture
2. **Live Demo First** - Most impressive
3. **Explain as You Go** - Don't just show, explain
4. **Have Talking Points** - For loading times
5. **Show Code Briefly** - Highlight key features
6. **End with Q&A** - Engage the audience

### Demo Script
```
1. "Let me show you the live telemetry dashboard..."
   [Start driving, show real-time updates]

2. "Now let's analyze that lap with AI..."
   [Navigate to intelligence page]

3. "The system compares against professional F1 drivers..."
   [Load ghost lap, generate report]

4. "Here's the AI-generated coaching report..."
   [Show report, highlight key findings]

5. "The system detected my hardware and scaled the tips..."
   [Show hardware profile]

6. "Any questions?"
   [Q&A]
```

---

## Success Criteria

### Must Have (Critical)
- [ ] Live telemetry visible on dashboard
- [ ] At least one lap completed
- [ ] Intelligence page accessible
- [ ] One report generated successfully

### Should Have (Important)
- [ ] Ghost lap loaded
- [ ] Hardware profiling shown
- [ ] Multiple laps recorded
- [ ] Report history demonstrated

### Nice to Have (Bonus)
- [ ] All LLM backends demonstrated
- [ ] Real-time coaching tips
- [ ] Performance metrics shown
- [ ] Code walkthrough

---

**Good luck with your demo! 🏁**

Remember: The most important thing is showing that the system works end-to-end. Even if some features don't work perfectly, demonstrating the core functionality (live telemetry → AI analysis → coaching report) is impressive enough!
