# 🌐 APX-IQ Network Access Guide

## 🖥️ **Your PC (Host Machine)**
**IP Address:** `10.9.130.236`

---

## 📱 **Access from Other Devices**

### **Main Dashboard**
```
http://10.9.130.236:3000
```
- Real-time telemetry display
- Live speed, RPM, gear, lap times
- Tyre temps, fuel load, sector times

### **Intelligence Dashboard**
```
http://10.9.130.236:3000/dashboard/intelligence
```
- Lap analysis and comparison
- AI-powered coaching reports
- Delta analysis vs ghost laps

---

## 🔌 **Backend Services**

### **REST API (FastAPI)**
```
http://10.9.130.236:8000
```
- API Documentation: `http://10.9.130.236:8000/docs`
- Health Check: `http://10.9.130.236:8000/health`

### **WebSocket (Real-time Telemetry)**
```
ws://10.9.130.236:3001
```
- Socket.IO connection for live data streaming

### **UDP Telemetry Listener**
```
10.9.130.236:20777
```
- Configure F1 game to send telemetry here

---

## 🎮 **F1 Game Configuration**

In F1 game settings:
1. **Settings** → **Telemetry Settings**
2. Set **UDP Telemetry:** ON
3. Set **UDP IP Address:** `10.9.130.236`
4. Set **UDP Port:** `20777`
5. Set **UDP Send Rate:** 60Hz
6. Set **UDP Format:** 2022 (for F1 22) or 2025 (for F1 25)

---

## 🔥 **Firewall Status**
✅ Windows Firewall rules are configured
✅ Ports 3000, 3001, 8000, 20777 are accessible

---

## 📱 **Mobile/Tablet Access**

Make sure your device is on the **same Wi-Fi network** as your PC.

Then open:
```
http://10.9.130.236:3000
```

---

## 🚀 **Quick Test**

From another device on the same network:

1. **Test Frontend:**
   ```
   http://10.9.130.236:3000
   ```

2. **Test API:**
   ```
   http://10.9.130.236:8000/health
   ```

3. **Test WebSocket:**
   Open browser console and run:
   ```javascript
   const socket = io('http://10.9.130.236:3001');
   socket.on('connect', () => console.log('Connected!'));
   ```

---

## 🛠️ **Troubleshooting**

### Can't connect from other device?

1. **Check same network:**
   - Both devices must be on the same Wi-Fi

2. **Check Windows Firewall:**
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"}
   ```

3. **Verify services are running:**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:8000/health`
   - Ingestion: Check terminal logs

4. **Check IP hasn't changed:**
   ```powershell
   ipconfig
   ```
   Look for "Wireless LAN adapter Wi-Fi" → IPv4 Address

---

## 🎯 **All Running Services**

| Service | Port | Local URL | Network URL |
|---------|------|-----------|-------------|
| Frontend | 3000 | http://localhost:3000 | http://10.9.130.236:3000 |
| API Server | 8000 | http://localhost:8000 | http://10.9.130.236:8000 |
| Ingestion WebSocket | 3001 | http://localhost:3001 | http://10.9.130.236:3001 |
| UDP Listener | 20777 | 127.0.0.1:20777 | 10.9.130.236:20777 |

---

**🏎️ Ready to race! Access your dashboard from any device on your network.**
