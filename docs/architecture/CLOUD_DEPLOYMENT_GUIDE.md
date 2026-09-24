# APX-IQ — Master Cloud Deployment & Zero-Burn Architecture Guide

> **Target Version**: v1.0.0 Release  
> **Topology**: Cloudflare Pages (Edge Frontend) + AWS Lambda with Lambda Web Adapter (Serverless Backend) + Neon Serverless PostgreSQL (Optional Persistence)  
> **Cost Profile**: **$0.00 / month** when idle (Scale-to-Zero architecture, 100% credit preserving)

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

    subgraph AWSCloud ["☁️ Amazon Web Services (Zero-Burn Serverless)"]
        LambdaFunc["AWS Lambda Function (FastAPI Container)\n• 1024MB RAM (1 vCPU equivalent)\n• AWS Lambda Web Adapter (Rust HTTP translator)\n• Scales to 0 instances when idle ($0.00)\n• 1,000,000 invocations/mo FREE forever"]
        FuncURL["Lambda Function URL\n• Direct HTTPS endpoint with CORS\n• No API Gateway or Load Balancer fees"]
        FuncURL --> LambdaFunc
    end

    subgraph CloudDB ["🗄️ Serverless Database ($0 Idle)"]
        NeonDB["Neon Serverless PostgreSQL\n• Scales to 0 compute when idle\n• PgBouncer Connection Pooling (:6543)\n• Stores completed laps & reports"]
    end

    User -->|Instant Static UI| CF_Pages
    CF_Pages -->|REST / SSE Telemetry Math| FuncURL
    Bridge -.->|Live Telemetry Uplink| CF_Pages
    LambdaFunc -.->|Pooled SQL Queries| NeonDB
```

---

## 2. Step 1: Database Setup (Optional — For Full Cloud Persistence)

If you want users to save custom laps and generated AI reports permanently in the cloud:

1. Sign up at [Neon.tech](https://neon.tech) (100% Free Tier, No credit card required).
2. Create a project named `apx-iq`.
3. Copy the pooled connection string (port `6543` for serverless environments):
   ```text
   postgresql://apxiq_owner:PASSWORD@ep-xyz-pooler.ap-south-1.aws.neon.tech/apx_iq?sslmode=require
   ```
4. *Note: If omitted, the backend automatically operates in lightweight in-memory mode (`InMemoryLapService`).*

---

## 3. Step 2: Deploy Backend to AWS Lambda (Container Image + Function URL)

AWS Lambda runs your containerized FastAPI backend with **true scale-to-zero ($0 idle cost)**, zero load balancer configuration, built-in TLS/HTTPS via Lambda Function URLs, and native health checking on `/health`.

### A. Dockerfile Setup (AWS Lambda Web Adapter)
The container uses the official AWS Lambda Web Adapter to run standard FastAPI inside Lambda with zero code modifications:
```dockerfile
COPY --from=public.ecr.aws/awslabs/aws-lambda-web-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=8000
```

### B. Amazon ECR & Lambda Deployment
1. **Authenticate Docker to Amazon ECR**:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com
   ```
2. **Create ECR Repository** (if not already existing):
   ```bash
   aws ecr create-repository --repository-name apx-iq-api --region ap-south-1
   ```
3. **Build & Push Image**:
   ```bash
   docker build -t apx-iq-api:latest .
   docker tag apx-iq-api:latest <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com/apx-iq-api:latest
   docker push <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com/apx-iq-api:latest
   ```
4. **Deploy / Update Lambda Function**:
   * Function Name: `apx-iq-api`
   * Image URI: `<aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com/apx-iq-api:latest`
   * Memory: `1024 MB`
   * Timeout: `30 seconds`
   * Enable Function URL with Auth Type `NONE` and CORS enabled.

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
   | `NEXT_PUBLIC_API_URL` | `https://<unique-id>.lambda-url.ap-south-1.on.aws` | Your AWS Lambda Function URL from Step 2 |
   | `NEXT_PUBLIC_WS_URL` | `http://localhost:3001` | Default local live telemetry port |
   | `NODE_VERSION` | `20` | Node.js 20 LTS |
5. Click **Save and Deploy**. Your live workstation will be active at `https://apx-iq.pages.dev`.

---

## 5. Environment Variables Master Matrix

### Backend (`api/`)
```env
PORT=8000
DATABASE_URL=postgresql://user:pass@ep-xyz-pooler.ap-south-1.aws.neon.tech/apx_iq?sslmode=require
CORS_ORIGINS=*
GEMINI_API_KEY=AIzaSy...
LOG_FORMAT=json
LOG_LEVEL=INFO
SECRET_KEY=generate-a-secure-random-string-here
```

### Frontend (`ui/`)
```env
NEXT_PUBLIC_API_URL=https://<unique-id>.lambda-url.ap-south-1.on.aws
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
  * Cloudflare Pages: **$0.00**
  * AWS Lambda (`scale-to-0`): **$0.00**
  * AWS Lambda Function URL: **$0.00** (Free direct HTTPS)
  * Neon Serverless Postgres: **$0.00**
  * **Total Idle Cost**: **$0.00 / Month**
* **Active State (Public Launch / LinkedIn Traffic)**:
  * Cloudflare Pages: **$0.00** (Unlimited Bandwidth edge CDN)
  * AWS Lambda: 100% covered by 1,000,000 free monthly requests.
  * **Total AWS Credit Burn**: **$0.00** (100% of your $210 credits preserved for other projects).
