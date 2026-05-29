# 🏎️ APX-IQ Quick Start Guide

## ✅ **System Status: FULLY OPERATIONAL**

All services are running and accessible on your network!

---

## 🌐 **Access Your Dashboard**

### **From Your PC:**
```
http://localhost:3000
```

### **From Other Devices (Phone/Tablet/Laptop):**
```
http://10.9.130.236:3000
```

**Make sure the device is on the same Wi-Fi network!**

---

## 🎮 **F1 Game Setup**

Configure your F1 game to send telemetry:

1. **In-game Settings** → **Telemetry Settings**
2. **UDP Telemetry:** ON
3. **UDP IP Address:** `10.9.130.236`
4. **UDP Port:** `20777`
5. **UDP Send Rate:** 60Hz

---

## 🚀 **What's Working**

### ✅ **Real-Time Dashboard**
- Live speed, RPM, gear display
- Throttle/brake pedal visualization
- Lap times and sector splits
- Tyre temperatures
- Fuel load tracking

### ✅ **Lap Recording**
- Automatic lap detection
- Telemetry saved at 60Hz
- Accessible in Intelligence dashboard

### ✅ **Intelligence Layer**
- Load ghost laps (real F1 driver data)
- Compare your lap vs professional drivers
- AI-powered coaching with Gemini
- Delta analysis and corner detection

---

## 📊 **Running Services**

| Service | Status | Port |
|---------|--------|------|
| Frontend (Next.js) | ✅ Running | 3000 |
| API Server (FastAPI) | ✅ Running | 8000 |
| Ingestion (WebSocket) | ✅ Running | 3001 |
| UDP Listener | ✅ Running | 20777 |
| PostgreSQL Database | ✅ Running | 5432 (not used yet) |

---

## 🎯 **Quick Test**

1. **Start F1 Game**
2. **Configure telemetry** (see above)
3. **Start driving**
4. **Watch dashboard update in real-time!**

---

## 🧠 **Intelligence Analysis**

After driving some laps:

1. Go to: `http://10.9.130.236:3000/dashboard/intelligence`
2. Select your lap from the list
3. Choose a ghost lap (e.g., Verstappen 2024)
4. Click "Analyze"
5. Get AI-powered coaching report!

---

## 🔧 **Troubleshooting**

### Dashboard not updating?
- Check F1 game telemetry settings
- Verify UDP IP is `10.9.130.236`
- Make sure you're actively driving (not in menus)

### Can't access from other device?
- Confirm same Wi-Fi network
- Try: `http://10.9.130.236:3000`
- Check Windows Firewall isn't blocking

### Services not running?
Check terminal logs for errors

---

## 📱 **Mobile Access**

Perfect for:
- Viewing telemetry on a tablet while racing
- Analyzing laps on your phone
- Remote monitoring from another room

---

**🏁 You're all set! Start racing and analyzing your performance!**
