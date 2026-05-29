# 🎥 APX-IQ Demo Video Recording Guide

## **Setup for Recording**

### **Step 1: Start All Services**
All services should already be running:
- ✅ Frontend (http://localhost:3000)
- ✅ API Server (http://localhost:8000)
- ✅ Ingestion Service (WebSocket)

### **Step 2: Open Dashboard**
```
http://localhost:3000
```

### **Step 3: Start Google Meet & Screen Share**
1. Open Google Meet
2. Click "Share screen"
3. Select your browser window showing the dashboard
4. Start recording

### **Step 4: Run Demo Race**
In a terminal, run:
```bash
python demo_race.py
```

This will:
- Simulate 3 complete laps
- Send realistic telemetry data
- Make the dashboard come alive with:
  - Speed varying from 100-250 km/h
  - RPM changes
  - Gear shifts
  - Throttle/brake inputs
  - Tyre temperature changes
  - Lap timing

---

## **What You'll See on Dashboard**

### **Real-Time Updates:**
- ✅ Speed trace graph (live)
- ✅ RPM gauge (live)
- ✅ Current lap time
- ✅ Gear display
- ✅ Throttle/brake bars
- ✅ Tyre temperatures
- ✅ Fuel load
- ✅ Sector times

### **After Demo Completes:**
- ✅ 3 laps saved in lap history
- ✅ Telemetry data available for analysis
- ✅ Ready for intelligence analysis

---

## **Demo Timeline**

| Time | Event |
|------|-------|
| 0:00 | Start demo script |
| 0:05 | Session initialized |
| 0:10 | Lap 1 starts - speed increases |
| 4:10 | Lap 1 complete |
| 4:15 | Lap 2 starts |
| 8:15 | Lap 2 complete |
| 8:20 | Lap 3 starts |
| 12:20 | Lap 3 complete |
| 12:30 | Demo finished |

**Total demo duration: ~12-13 minutes**

---

## **Talking Points for Video**

### **Introduction (0:00-0:30)**
"This is APX-IQ, a real-time motorsport intelligence platform. It ingests live telemetry from the F1 game via UDP, processes it through our backend, and displays it on this dashboard."

### **Real-Time Telemetry (0:30-4:00)**
"As you can see, the dashboard is updating in real-time with:
- Speed varying from 100 to 250 km/h
- RPM changes as the driver shifts gears
- Throttle and brake inputs
- Tyre temperatures heating up during the lap
- Sector times being recorded"

### **Lap Recording (4:00-8:00)**
"Each lap is automatically recorded with 100+ telemetry points per lap. The system detects lap boundaries and saves the data to our API. You can see the lap time incrementing in real-time."

### **Multiple Laps (8:00-12:00)**
"The system handles multiple consecutive laps seamlessly. Each lap is independently recorded and analyzed. The telemetry data is persistent and available for post-race analysis."

### **Intelligence Analysis (12:00-13:00)**
"After the race, drivers can analyze their performance using our intelligence layer. They can compare their lap against professional F1 drivers using real data from FastF1."

### **AI Coaching (13:00-14:00)**
"Our AI-powered coaching engine, powered by Google Gemini, generates personalized debrief reports with specific coaching tips for improvement."

---

## **Demo Script Commands**

### **Run Full Demo:**
```bash
python demo_race.py
```

### **Check Saved Laps:**
```bash
curl http://localhost:8000/telemetry/laps/completed
```

### **View Specific Lap:**
```bash
curl http://localhost:8000/telemetry/lap/1
```

### **Check API Health:**
```bash
curl http://localhost:8000/health
```

---

## **Troubleshooting**

### **Dashboard not updating?**
- Check that all services are running: `listProcesses` in Kiro
- Verify frontend is at http://localhost:3000
- Check browser console for errors

### **Demo script fails?**
- Make sure ingestion service is running
- Verify UDP port 20777 is available
- Check Windows Firewall isn't blocking

### **Laps not saving?**
- Check API server is running
- Verify `/telemetry/laps/completed` endpoint works
- Check API logs for errors

---

## **Recording Tips**

1. **Zoom in on key metrics** - Speed, RPM, lap time
2. **Pause between sections** - Let viewers absorb information
3. **Highlight the graphs** - Show real-time updates
4. **Mention the tech stack** - Python, React, FastAPI, etc.
5. **Show the saved laps** - Demonstrate data persistence
6. **Explain the intelligence layer** - How AI coaching works

---

## **Post-Demo Analysis**

After recording the demo, you can show:

1. **Lap Comparison:**
   ```
   Go to: http://localhost:3000/dashboard/intelligence
   Select your lap
   Select a ghost lap (real F1 driver)
   Click "Analyze"
   ```

2. **AI Report Generation:**
   - Show the Gemini-powered coaching report
   - Highlight specific coaching tips
   - Show corner-by-corner analysis

---

**Good luck with your video! 🎥🏎️**
