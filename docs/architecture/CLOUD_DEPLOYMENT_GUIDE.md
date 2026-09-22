# APX-IQ — Master Cloud Deployment & Zero-Idle-Cost Architecture Guide

> **Target Version**: v1.0.0 Release  
> **Topology**: Cloudflare Pages (Edge Frontend) + Google Cloud Run (Serverless Backend) + Neon Serverless PostgreSQL (Optional Persistence)  
> **Cost Profile**: **$0.00 / month** when idle (Scale-to-Zero architecture)

---

## 1. System Topology Overview

```mermaid
flowchart TD
    subgraph WebVisitors ["🌐 Public Web Visitors (LinkedIn, Portfolio, Mobile, Desktop)"]
        User["Visitor Browser"]
    end

    subgraph SimRacers ["🏎️ Sim Racers (F1 2020–2025 on PC / PS5 / Xbox)"]
        F1Game["F1 25 UDP (:20777)"] --> Bridge["Local Ingestion Bridge\n(python run_ingestion.py)"]
    end

    subgraph CloudflareEdge ["⚡ Cloudflare Pages (Edge Frontend)"]
        CF_Pages["Next.js 16 Static / Edge Workstation\n• 300+ Edge Locations\n• Unlimited Free Egress Bandwidth\n• $0.00 Idle Cost"]
    end

    subgraph GoogleCloud ["☁️ Google Cloud Platform (Scale-to-Zero Compute)"]
        GCP_Run["GCP Cloud Run (FastAPI Engine)\n• 2GB RAM for FastF1 & Pandas\n• Scales to 0 instances when idle\n• Covered by $10/mo Google AI Credit\n• SSE Streaming for AI Briefings"]
        Gemini["Google Gemini AI API\n(Race Engineer Briefings)"]
        GCP_Run --> Gemini
    end

    subgraph CloudDB ["🗄️ Optional Serverless Database ($0 Idle)"]
        NeonDB["Neon Serverless PostgreSQL\n• Scales to 0 compute when idle\n• Stores completed laps & reports"]
    end

    User -->|Instant Static UI| CF_Pages
    CF_Pages -->|REST / SSE Telemetry Math| GCP_Run
    Bridge -.->|Live Telemetry Uplink| GCP_Run
    GCP_Run -.->|Optional Persistence| NeonDB
```

---

## 2. Step 1: Database Setup (Optional — For Full Cloud Persistence)

If you want users to save custom laps and generated AI reports permanently in the cloud:

1. Sign up at [Neon.tech](https://neon.tech) (100% Free Tier, No credit card required).
2. Create a project named `apx-iq`.
3. Copy the pooled connection string:
   ```text
   postgresql://apxiq_owner:PASSWORD@ep-xyz.us-east-2.aws.neon.tech/apx_iq?sslmode=require
   ```
4. *Note: If omitted, the backend automatically operates in lightweight in-memory mode (`InMemoryLapService`).*

---

## 3. Step 2: Deploy Backend to Google Cloud Run

Google Cloud Run runs your containerized FastAPI backend, scaling to **0 instances when idle** ($0.00 billed) and spinning up in ~2s on demand.

### A. Deploy via Google Cloud Console
1. Navigate to [Google Cloud Console $\rightarrow$ Cloud Run](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Select **"Continuously deploy from a repository"** $\rightarrow$ Set up Cloud Build with your GitHub repo (`MatMridul/APX-IQ`).
4. **Build Configuration**:
   * Branch: `^main$`
   * Build Type: **Dockerfile**
   * Dockerfile path: `/Dockerfile.api`
5. **Container & Resource Sizing**:
   * **Port**: `8000`
   * **Minimum instances**: `0` *(Crucial: guarantees zero charges during idle time)*
   * **Maximum instances**: `2` *(Safety cap)*
   * **Memory**: `2 GiB` *(Optimal for FastF1 telemetry matrices and NumPy delta math)*
   * **CPU**: `1 vCPU`
   * **CPU Allocation**: Select **"CPU is only allocated during request processing"** (CPU Throttling enabled).
6. **Environment Variables**:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://...` | Connection string from Step 1 (Optional) |
   | `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
   | `CORS_ORIGINS` | `*` | Or specify your Cloudflare Pages domain |
   | `LOG_FORMAT` | `json` | Production structured logging |
7. **Security**: Select **"Allow unauthenticated invocations"** (Public API).
8. Click **Create**. Copy your public Cloud Run URL (e.g., `https://apx-iq-api-xxxxx-uc.a.run.app`).

---

## 4. Step 3: Deploy Frontend to Cloudflare Pages

Cloudflare Pages provides global edge delivery with **unlimited free bandwidth**.

### A. Deploy via Cloudflare Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
2. Select repository: `MatMridul/APX-IQ`.
3. Configure Build Settings:
   * **Project name**: `apx-iq`
   * **Production branch**: `main`
   * **Framework preset**: `Next.js`
   * **Root directory**: `ui`
   * **Build command**: `npm run build`
   * **Build output directory**: `.next`
4. **Environment Variables**:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://apx-iq-api-xxxxx-uc.a.run.app` | Your Cloud Run Backend URL from Step 2 |
   | `NEXT_PUBLIC_WS_URL` | `http://localhost:3001` | Default local live telemetry port |
   | `NODE_VERSION` | `20` | Node.js 20 LTS |
5. Click **Save and Deploy**. Your live workstation will be active at `https://apx-iq.pages.dev`.

---

## 5. Environment Variables Master Matrix

### Backend (`api/`)
```env
API_PORT=8000
DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/apxiq?sslmode=require
CORS_ORIGINS=*
GEMINI_API_KEY=AIzaSy...
LOG_FORMAT=json
LOG_LEVEL=INFO
SECRET_KEY=generate-a-secure-random-string-here
```

### Frontend (`ui/`)
```env
NEXT_PUBLIC_API_URL=https://apx-iq-api-xxxxx-uc.a.run.app
NEXT_PUBLIC_WS_URL=http://localhost:3001
NODE_ENV=production
```

---

## 6. How Sim Racers Connect Live Sim Rigs to the Cloud

For users driving on a local sim rig who want their telemetry broadcast to the cloud:

1. **In-Game Settings (F1 2020–2025 on PC, PS5, or Xbox)**:
   * UDP Telemetry: `On`
   * UDP IP Address: `127.0.0.1` (or local LAN IPv4 if on console)
   * UDP Port: `20777`
   * UDP Rate: `60Hz`
2. **Launch Local Bridge**:
   ```bash
   python run_ingestion.py
   ```
3. Open `https://apx-iq.pages.dev` in your browser or mounted tablet screen. The UI detects local telemetry and transitions from `SIM` $\to$ `LIVE` with zero latency.

---

## 7. Cost & Verification Summary

* **Idle State (No Visitors)**:
  * Cloudflare Pages: $0.00
  * GCP Cloud Run (`min-instances: 0`): $0.00
  * Neon Postgres: $0.00
  * **Total Idle Cost**: **$0.00 / Month**
* **Active State (Public Launch / LinkedIn Traffic)**:
  * Cloudflare Pages: $0.00 (Unlimited Bandwidth)
  * GCP Cloud Run: 100% covered by 2M free monthly requests + $10 Google AI Pro credit pool.
