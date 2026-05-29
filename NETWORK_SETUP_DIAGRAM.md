# Network Setup Diagrams

## Testing Setup (Before Demo)

```
┌─────────────────────────────────────────────────────────────┐
│                    Friend's Laptop                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              F1 Game                                 │  │
│  │                                                      │  │
│  │  UDP Settings:                                       │  │
│  │  - IP: 192.168.1.100 (Your laptop)                 │  │
│  │  - Port: 20777                                       │  │
│  │  - Broadcast: ON                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          │ UDP Packets                      │
│                          ▼                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WiFi Network
                           │ (192.168.1.x)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Your Laptop                              │
│                 IP: 192.168.1.100                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backend (Python/FastAPI)                     │  │
│  │         Port: 8000                                   │  │
│  │         Listens on: 0.0.0.0:8000                    │  │
│  │         UDP Listener: 0.0.0.0:20777                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          │ HTTP API                         │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Frontend (Next.js)                           │  │
│  │         Port: 3000                                   │  │
│  │         Access: http://192.168.1.100:3000           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Browser: http://localhost:3000/dashboard                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Demo Day Setup (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Laptop                              │
│                 IP: 192.168.1.100                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              F1 Game                                 │  │
│  │                                                      │  │
│  │  UDP Settings:                                       │  │
│  │  - IP: 127.0.0.1 (localhost)                        │  │
│  │  - Port: 20777                                       │  │
│  │  - Broadcast: OFF                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          │ UDP Packets (localhost)          │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backend (Python/FastAPI)                     │  │
│  │         Port: 8000                                   │  │
│  │         Listens on: 0.0.0.0:8000                    │  │
│  │         UDP Listener: 0.0.0.0:20777                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          │ HTTP API                         │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Frontend (Next.js)                           │  │
│  │         Port: 3000                                   │  │
│  │         Production Build                             │  │
│  │         npm run build && npm run start               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WiFi Network
                           │ (192.168.1.x)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Teammate's Laptop                          │
│                 IP: 192.168.1.101                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Browser (Chrome/Firefox)                     │  │
│  │                                                      │  │
│  │  URL: http://192.168.1.100:3000/dashboard          │  │
│  │                                                      │  │
│  │  Connected to Projector/Screen                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Alternative: Hotspot Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Laptop                              │
│                 IP: 192.168.137.1 (Hotspot)                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WiFi Hotspot                                 │  │
│  │         SSID: APX-IQ-Demo                           │  │
│  │         Password: apxiq2024                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              F1 Game                                 │  │
│  │              UDP → 127.0.0.1:20777                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backend (Port 8000)                          │  │
│  │         Frontend (Port 3000)                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Hotspot WiFi
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Teammate's Laptop                          │
│                 IP: 192.168.137.2                           │
│                                                             │
│  Connected to: APX-IQ-Demo WiFi                            │
│  Browser: http://192.168.137.1:3000/dashboard             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────┐
│   F1 Game   │
│             │
│  Telemetry  │
│   Output    │
└──────┬──────┘
       │
       │ UDP Packets (60Hz)
       │ Port 20777
       ▼
┌─────────────────────────────────────────┐
│         UDP Listener                    │
│         (ingestion/listener.py)         │
└──────┬──────────────────────────────────┘
       │
       │ Raw Packets
       ▼
┌─────────────────────────────────────────┐
│         Packet Decoder                  │
│         (ingestion/decoder.py)          │
└──────┬──────────────────────────────────┘
       │
       │ Decoded Data
       ▼
┌─────────────────────────────────────────┐
│         Packet Router                   │
│         (ingestion/router.py)           │
└──────┬──────────────────────────────────┘
       │
       │ Structured Data
       ▼
┌─────────────────────────────────────────┐
│         WebSocket Broadcast             │
│         (api/main.py)                   │
└──────┬──────────────────────────────────┘
       │
       │ WebSocket Events
       ▼
┌─────────────────────────────────────────┐
│         Frontend Dashboard              │
│         (ui/src/app/dashboard)          │
│                                         │
│  - Live telemetry display               │
│  - Lap timing                           │
│  - Graphs and metrics                   │
└─────────────────────────────────────────┘
       │
       │ User clicks "Intelligence"
       ▼
┌─────────────────────────────────────────┐
│         Intelligence Layer              │
│         (intelligence/*)                │
│                                         │
│  1. Fetch lap telemetry                 │
│  2. Load ghost lap (FastF1)             │
│  3. Align telemetry                     │
│  4. Detect corners                      │
│  5. Compute deltas                      │
│  6. Generate coaching tips              │
│  7. Profile hardware                    │
│  8. Generate AI report                  │
└─────────────────────────────────────────┘
       │
       │ Report Data
       ▼
┌─────────────────────────────────────────┐
│         LLM Backend                     │
│         (Multi-tier)                    │
│                                         │
│  1. Try Ollama (local)                  │
│  2. Try Gemini (cloud)                  │
│  3. Use Template (offline)              │
└──────┬──────────────────────────────────┘
       │
       │ Markdown Report
       ▼
┌─────────────────────────────────────────┐
│         Frontend Display                │
│         (Intelligence Page)             │
│                                         │
│  - Executive summary                    │
│  - Key findings                         │
│  - Corner analysis                      │
│  - Coaching tips                        │
└─────────────────────────────────────────┘
```

---

## Port Usage Summary

| Port  | Service           | Protocol | Bind Address | Purpose                    |
|-------|-------------------|----------|--------------|----------------------------|
| 20777 | UDP Listener      | UDP      | 0.0.0.0      | F1 game telemetry input    |
| 8000  | FastAPI Backend   | HTTP     | 0.0.0.0      | REST API endpoints         |
| 3000  | Next.js Frontend  | HTTP     | 0.0.0.0      | Web dashboard              |
| 3001  | WebSocket Server  | WS       | 0.0.0.0      | Real-time telemetry push   |
| 11434 | Ollama API        | HTTP     | 127.0.0.1    | Local LLM (optional)       |

---

## Firewall Rules Needed

### Windows
```powershell
# Inbound rules
netsh advfirewall firewall add rule name="APX IQ Backend" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="APX IQ Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="APX IQ Telemetry" dir=in action=allow protocol=UDP localport=20777
netsh advfirewall firewall add rule name="APX IQ WebSocket" dir=in action=allow protocol=TCP localport=3001

# Outbound rules (usually not needed)
netsh advfirewall firewall add rule name="APX IQ Backend Out" dir=out action=allow protocol=TCP localport=8000
```

### Mac
```bash
# Add to System Preferences → Security & Privacy → Firewall → Options
# Allow incoming connections for:
# - Python (backend)
# - Node (frontend)
```

---

## Network Troubleshooting

### Can't Find Your IP?

**Windows**:
```cmd
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
# Usually starts with 192.168.x.x or 10.0.x.x
```

**Mac**:
```bash
ifconfig
# Look for "inet" under en0 (WiFi) or en1 (Ethernet)
```

**Alternative**:
```bash
# Both platforms
ping $(hostname)
```

### Can't Connect from Teammate's Laptop?

**Test 1: Ping**
```bash
# From teammate's laptop
ping 192.168.1.100
# Should get replies
```

**Test 2: Telnet**
```bash
# From teammate's laptop
telnet 192.168.1.100 8000
# Should connect
```

**Test 3: Browser**
```
http://192.168.1.100:8000/health
# Should show JSON response
```

### Firewall Blocking?

**Quick Test** (Windows):
```powershell
# Temporarily disable firewall
netsh advfirewall set allprofiles state off

# Test connection

# Re-enable firewall
netsh advfirewall set allprofiles state on
```

---

## Best Practices

### For Reliability
1. ✅ Use wired Ethernet if available
2. ✅ Use production build (`npm run build`)
3. ✅ Close unnecessary applications
4. ✅ Disable Windows updates during demo
5. ✅ Test full flow 1 hour before

### For Performance
1. ✅ Use same WiFi network (not hotspot if possible)
2. ✅ Sit close to WiFi router
3. ✅ Reduce F1 game graphics settings
4. ✅ Close browser tabs on teammate's laptop
5. ✅ Use Chrome or Firefox (not Edge)

### For Backup
1. ✅ Have HDMI cable ready (direct connection)
2. ✅ Have screen sharing app ready (TeamViewer/AnyDesk)
3. ✅ Have pre-recorded video ready
4. ✅ Have test data populated
5. ✅ Know how to switch to Plan B quickly

---

**Remember**: Test the full setup at least 1 hour before the demo!
