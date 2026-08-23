# APX IQ Demo Day Cheat Sheet

## 🚀 Quick Setup (30 mins before)

### Your Laptop (Game + Backend)
```bash
# 1. Find your IP
ipconfig  # Windows
# Write it down: ___________________

# 2. Start Backend
python api/main.py
# Wait for: "Uvicorn running on http://0.0.0.0:8000"

# 3. Start Frontend (Production)
cd ui
npm run build  # Takes 2-3 min
npm run start
# Note: http://YOUR-IP:3000

# 4. Configure F1 Game
Settings → Telemetry:
- UDP: ON
- IP: 127.0.0.1
- Port: 20777
- Rate: 60Hz
```

### Teammate's Laptop (Display)
```bash
# Open browser:
http://YOUR-IP:3000/dashboard

# Verify backend:
http://YOUR-IP:8000/health
```

---

## 🎬 Demo Script (15 mins)

### Part 1: Live Telemetry (5 min)
1. Show dashboard on projector
2. Start driving in F1
3. Point out:
   - ✅ Speed/RPM graphs updating
   - ✅ Lap times recording
   - ✅ Pedal inputs
   - ✅ Tyre temps
4. Complete 1-2 laps

### Part 2: AI Analysis (7 min)
1. Click "INTELLIGENCE" button
2. Click "CHECK STATUS" → Show LLM backend
3. Select lap from dropdown
4. (Optional) Load ghost lap:
   - Year: 2024
   - Track: Monaco
   - Driver: VER
5. Click "GENERATE LAP DEBRIEF"
6. Wait 30-60s (explain architecture)
7. Show report:
   - Executive summary
   - Key findings
   - Corner analysis
   - Coaching tips

### Part 3: Q&A (3 min)
- Show architecture
- Explain tech stack
- Answer questions

---

## 🔧 Emergency Fixes

### No Telemetry?
```bash
# Check backend logs for "Received X bytes"
# Restart backend: Ctrl+C, python api/main.py
# Check F1 UDP settings
```

### Can't Connect?
```bash
# Disable firewall temporarily:
netsh advfirewall set allprofiles state off

# Or add rules:
netsh advfirewall firewall add rule name="APX Backend" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="APX Frontend" dir=in action=allow protocol=TCP localport=3000
```

### Report Fails?
```bash
# Enable "Use mock data" checkbox
# Or show pre-populated test data:
python scripts/populate_test_laps.py
```

---

## 📋 Pre-Demo Checklist

### 1 Hour Before
- [ ] Both laptops charged + adapters
- [ ] F1 game installed and tested
- [ ] Know your IP address
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] Teammate can access your IP

### 30 Minutes Before
- [ ] Backend running
- [ ] Frontend running (production mode)
- [ ] F1 game UDP configured
- [ ] Teammate's browser open to dashboard
- [ ] Full system test completed

### 10 Minutes Before
- [ ] Start F1 practice session
- [ ] Verify live telemetry on dashboard
- [ ] Complete one test lap
- [ ] Generate one test report
- [ ] Close all unnecessary apps
- [ ] Disable notifications

---

## 🎯 Success Criteria

### Must Show
- ✅ Live telemetry updating
- ✅ Lap completion
- ✅ AI report generation

### Bonus Points
- ⭐ Ghost lap comparison
- ⭐ Hardware profiling
- ⭐ Multiple reports
- ⭐ Code walkthrough

---

## 🆘 Backup Plans

**Plan A**: Everything works → Full demo  
**Plan B**: Network issues → Screen share  
**Plan C**: Backend issues → Pre-recorded video  
**Plan D**: Complete fail → Show test data + code  

---

## 📞 Quick Commands

```bash
# Your IP
ipconfig | findstr IPv4

# Start Backend
python api/main.py

# Start Frontend (Production)
cd ui && npm run build && npm run start

# Test Backend
curl http://localhost:8000/health

# Populate Test Data
python scripts/populate_test_laps.py

# Check Ports
netstat -ano | findstr :8000
netstat -ano | findstr :3000
netstat -ano | findstr :20777
```

---

## 🌐 URLs

```
Your IP:          ___________________

Backend Health:   http://YOUR-IP:8000/health
Frontend:         http://YOUR-IP:3000/dashboard
Intelligence:     http://YOUR-IP:3000/dashboard/intelligence
API Docs:         http://YOUR-IP:8000/docs
```

---

## 💡 Talking Points (During Loading)

While report generates (30-60s):
- "The system uses a 3-tier LLM backend..."
- "First tries local Ollama for privacy..."
- "Falls back to Gemini cloud API..."
- "Finally uses template mode offline..."
- "This is analyzing corner-by-corner performance..."
- "Comparing against professional F1 drivers..."
- "Generating personalized coaching tips..."

---

## 🎤 Opening Line

"Today I'm going to show you APX IQ - an AI-powered race engineering platform that provides real-time telemetry analysis and personalized coaching for sim racers. Let me start by showing you the live telemetry dashboard..."

---

## 🏁 Closing Line

"As you can see, APX IQ successfully captures live telemetry, analyzes performance using AI, and generates actionable coaching insights - all in real-time. The system is built with a scalable architecture using FastAPI, Next.js, and a multi-tier LLM backend. Thank you, any questions?"

---

**GOOD LUCK! 🚀**
