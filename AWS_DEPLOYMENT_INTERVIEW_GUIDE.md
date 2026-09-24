# MoneyMap: Complete AWS Cloud Deployment & System Architecture Guide
> **Purpose**: In-depth technical documentation and interview-preparation notes detailing the architectural decisions, failure modes, engineering solutions, and end-to-end deployment of **MoneyMap** on AWS.

---

## 🏗️ 1. High-Level System Architecture

```mermaid
graph TD
    Client["User Browser / Client"]
    DNS["DuckDNS (DNS Resolution: A Record)"]
    Firewall["AWS Security Group (Firewall: 22, 80, 443)"]
    Nginx["Nginx Reverse Proxy & SSL Termination (:443 / :80)"]
    PM2["PM2 Process Manager (Daemon)"]
    NextApp["Next.js 16 Application Server (:3000)"]
    Supabase["Supabase Cloud (PostgreSQL + RLS + GoTrue Auth)"]
    GoogleCloud["Google Cloud Identity & Gmail API (OAuth 2.0)"]

    Client -->|1. Resolves Domain| DNS
    Client -->|2. HTTPS Requests :443| Firewall
    Firewall --> Nginx
    Nginx -->|3. HTTP Reverse Proxy :3000| NextApp
    PM2 -.->|Monitors & Auto-restarts| NextApp
    NextApp -->|4. Authenticated JWT Queries| Supabase
    Client -->|5. Google Identity Token (GIS)| GoogleCloud
    NextApp -->|6. Fetch Today's Transaction Emails| GoogleCloud
```

---

## 🔍 2. Step-by-Step Deep Dive (What, Why, How)

---

### Step 1: Production Bundling & Next.js Optimization
* **WHAT**: Configured `output: "standalone"` inside `next.config.ts`.
* **WHY**: 
  - In default development/build mode, Next.js requires the entire `node_modules` directory (~250MB+) to be present on the host to run `next start`.
  - With `standalone`, Next.js uses AST tree-shaking to trace all imports and generate a minimal production bundle that only includes dependencies actually used at runtime. This drastically reduces disk usage, accelerates builds, and makes the application cloud-ready and container-ready.
* **HOW**:
  ```typescript
  // moneymap/next.config.ts
  const nextConfig: NextConfig = {
    output: "standalone",
    turbopack: { root: process.cwd() },
  };
  ```

---

### Step 2: Next.js Build-Time Environment Variable Inlining & Secrets Hygiene
* **WHAT**: Differentiated between build-time client variables (`NEXT_PUBLIC_*`) and runtime server secrets (`GOOGLE_CLIENT_SECRET`). Created an official `.env.example` template and updated `.gitignore`.
* **WHY**:
  - **The Next.js Bundling Mechanism**: Any environment variable prefixed with `NEXT_PUBLIC_` is inlined into the client-side JavaScript bundle **at compile time (`next build`)**, not at runtime. If these variables are missing during `next build`, the production bundle bakes in `undefined`, causing silent failures in client authentication.
  - **Secrets Hygiene**: `.env.local` containing live API keys and Google client secrets must never be committed to Git. A clean `.env.example` provides the contract for any cloud deployment pipeline.
* **HOW**:
  - Created `.env.example` with placeholders.
  - Added `!.env.example` exceptions to root and subfolder `.gitignore` files to allow tracking the template while strictly ignoring actual secrets.

---

### Step 3: Infrastructure Provisioning on AWS EC2
* **WHAT**: Launched an Amazon Elastic Compute Cloud (EC2) instance running Ubuntu Server 24.04 LTS (x86_64) on a `t3.micro` instance type within AWS region `eu-north-1` (Stockholm).
* **WHY**:
  - **Compute Choice**: EC2 provides full root control over the operating system, file system, process lifecycle, and networking stack, qualifying under the AWS Free Tier (750 hours/month).
  - **Ubuntu 24.04 LTS**: Chosen for long-term kernel stability, modern OpenSSL 3 support, and complete compatibility with NodeSource Node.js 20 LTS repositories.
  - **t3.micro (2 vCPU, 1 GB RAM)**: Cost-effective compute utilizing AWS Nitro Hypervisor with burstable CPU performance credits.
* **HOW**:
  - Provisioned via AWS EC2 Management Console.
  - Attached an elastic Virtual Private Cloud (VPC) network interface with an auto-assigned public IPv4 address (`16.192.77.176`).

---

### Step 4: Network Security & Firewall Configuration (Security Groups)
* **WHAT**: Configured an AWS Security Group (a stateful virtual firewall) controlling inbound and outbound traffic at the network hypervisor level.
* **WHY**:
  - Principles of least privilege: Expose only necessary ingress ports to the internet.
  - Unused ports (such as Node.js port 3000 or internal databases) must never be directly accessible from the outside internet.
* **HOW**:
  - **Inbound Rules**:
    - `Port 22 (SSH)`: Allowed for administrative access and EC2 Instance Connect.
    - `Port 80 (HTTP)`: Allowed from `0.0.0.0/0` (standard unencrypted web traffic, redirected to HTTPS).
    - `Port 443 (HTTPS)`: Allowed from `0.0.0.0/0` (TLS encrypted traffic).
  - **Outbound Rules**:
    - `All Traffic (0.0.0.0/0)`: Allows the instance to query external services (Supabase, Google APIs, apt repositories).

---

### Step 5: Linux Memory Engineering (The 1GB RAM OOM Solution)
* **WHAT**: Allocated and enabled a 2GB Linux Swap Space file (`/swapfile`).
* **WHY**:
  - **The Linux Out-Of-Memory (OOM) Killer**: Next.js 16 with React 19 uses Webpack/Turbopack, TypeScript type-checking, and the Google V8 engine. Compiling 15+ pages and API routes requires ~1.2GB–1.5GB of peak memory.
  - On a `t3.micro` with only 1GB physical RAM, the Linux Kernel's OOM Killer automatically terminates the Node process mid-build (`Exit Code 137`).
  - Creating a 2GB virtual memory swap on the SSD disk gives the operating system temporary paging space, allowing compilation to complete smoothly.
* **HOW**:
  ```bash
  sudo fallocate -l 2G /swapfile      # Allocate 2GB file on disk
  sudo chmod 600 /swapfile            # Restrict permissions to root only (security)
  sudo mkswap /swapfile               # Format file as Linux swap area
  sudo swapon /swapfile               # Enable swap in kernel
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab  # Persist across reboots
  ```

---

### Step 6: Application Process Management with PM2
* **WHAT**: Managed the Next.js runtime process using PM2 (Production Process Manager for Node.js).
* **WHY**:
  - Running a server using `node server.js` or `npm start` attached to an SSH session is fragile: disconnecting the terminal kills the process (`SIGHUP`).
  - Even with `nohup`, unhandled runtime exceptions crash the process permanently.
  - PM2 provides:
    1. **Daemonization**: Runs the app detached in the background.
    2. **Automatic Healing**: Instantly restarts the application if an unhandled error crashes it.
    3. **Boot Persistence**: Re-launches the application automatically upon server restarts or kernel patches (`pm2 startup` + `pm2 save`).
    4. **Unified Logging**: Aggregates stdout and stderr streams for production monitoring (`pm2 logs`).
* **HOW**:
  ```bash
  pm2 start npm --name "moneymap" -- start
  pm2 startup
  pm2 save
  ```

---

### Step 7: Web Server & Reverse Proxy Architecture (Nginx)
* **WHAT**: Deployed Nginx on port 80 and 443 to act as an edge Reverse Proxy forwarding requests to the internal Next.js application on `http://127.0.0.1:3000`.
* **WHY (Why not expose Node.js directly on port 80/443?)**:
  1. **Privileged Ports Security**: On Linux, ports below 1024 require `root` privileges. Running a Node.js runtime as root is a major security vulnerability (remote code execution could compromise the entire server). Nginx runs worker processes under a low-privilege `www-data` user.
  2. **SSL Termination Offloading**: Nginx handles expensive cryptographic TLS handshakes in optimized C code, relieving the Node.js V8 single-threaded event loop from compute overhead.
  3. **Static Asset Caching & Buffering**: Nginx buffers slow client connections, preventing slow internet connections from holding open Node.js sockets.
  4. **WebSocket & Header Propagation**: Passes `Host`, client IP (`X-Forwarded-For`), and protocol (`X-Forwarded-Proto`) headers so the app knows the exact client context.
* **HOW**:
  ```nginx
  server {
      listen 80 default_server;
      server_name moneymap-abbhiinay.duckdns.org;

      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

---

### Step 8: Domain Resolution & Automated TLS Encryption (DuckDNS + Let's Encrypt / Certbot)
* **WHAT**: Bound a custom domain (`moneymap-abbhiinay.duckdns.org`) to the EC2 Public IP via an `A` record, and provisioned a trusted TLS/SSL certificate using Certbot via the ACME protocol.
* **WHY**:
  - **The OAuth Constraint**: The OAuth 2.0 RFC specification and Google Identity Services (GIS) **explicitly forbid raw public IP addresses** (e.g. `http://16.192.77.176`) as JavaScript origins or redirect URIs. They strictly mandate valid domain names with HTTPS.
  - **Security & Privacy**: Encrypts all user credentials, financial transactions, and session JWTs in transit, preventing Man-in-the-Middle (MITM) attacks and packet sniffing.
* **HOW**:
  - Registered DuckDNS subdomain pointing to `16.192.77.176`.
  - Executed Certbot to perform automated domain challenge validation and Nginx SSL configuration:
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d moneymap-abbhiinay.duckdns.org
    ```
  - Certbot automatically added TLS certificate directives and configured a `301 Moved Permanently` HTTP-to-HTTPS redirect.

---

### Step 9: Cloud Identity & Production OAuth Integration
* **WHAT**: Reconfigured Google Cloud OAuth 2.0 Credentials and Supabase Auth Providers for the production HTTPS domain.
* **WHY & TROUBLESHOOTING LESSONS**:
  - **Bug 1: `Error 401: deleted_client`**: Occurred because an old Google Cloud OAuth client was deleted. Google's identity servers permanently invalidate deleted client IDs; creating a fresh OAuth Client ID in an active Google Cloud brand was required.
  - **Bug 2: `Error 400: origin_mismatch`**: Google OAuth checks the `Origin` HTTP header against its Authorized JavaScript Origins list. Adding `https://moneymap-abbhiinay.duckdns.org` (strictly without a trailing slash) resolved this.
  - **Bug 3: `Unacceptable audience in id_token`**: When using Google Identity Services with Supabase (`supabase.auth.signInWithIdToken`), Supabase validates that the `aud` (audience) claim inside the Google-signed JWT matches the Client ID registered in the Supabase Dashboard. Updating the Google Client ID inside Supabase resolved this.
  - **Bug 4: Sensitive Scope Restriction (`gmail.readonly`)**: Since the app requests access to read transaction emails, Google enforces strict OAuth consent screen policies. Adding the developer email as an explicit **Test User** in Google Cloud Console allowed OAuth authorization to succeed without full commercial verification.

---

## 🎯 3. Technical Interview Q&A (Be Ready to Answer These!)

### Q1: "Can you walk me through how you deployed your fullstack Next.js project to AWS?"
> *"I deployed MoneyMap to an AWS EC2 instance running Ubuntu 24.04 LTS. On the codebase side, I configured Next.js with standalone output to bundle only required production dependencies, implemented secrets isolation via `.env.local`, and created an unauthenticated `/api/health` probe.*  
> *On the server side, because micro instances only have 1GB RAM, I engineered a 2GB Linux swap space to prevent the OOM Killer from terminating `next build`. I used PM2 as a process daemon to ensure auto-restarts and boot persistence, and placed Nginx in front as an edge reverse proxy for SSL termination and privileged port isolation. Finally, I bound the domain via DuckDNS, automated HTTPS with Let's Encrypt Certbot, and aligned our OAuth redirect URIs across Google Cloud Console and Supabase."*

---

### Q2: "Why did you use Nginx instead of having Node.js listen directly on port 80 and 443?"
> *"For three primary architectural reasons:*  
> 1. * **Security Principle of Least Privilege**: Ports below 1024 are privileged on Linux and require root access. Running a Node.js process as root exposes the system to catastrophic remote code execution vulnerabilities. Nginx binds port 80/443 and passes traffic to unprivileged Node.js running on port 3000.*  
> 2. * **SSL Termination Efficiency**: Nginx is written in C and handles SSL/TLS handshakes and certificate renewal far more efficiently than the single-threaded Node.js V8 event loop.*  
> 3. * **Resilience and Reverse Proxy Capabilities**: Nginx buffers slow clients, handles static asset compression/caching, and allows seamless zero-downtime rolling updates if we deploy multiple Node instances behind it."*

---

### Q3: "What major failure modes did you encounter during deployment, and how did you debug them?"
> *"I encountered and systematically solved four key issues:*  
> 1. * **OOM Build Failure**: The Next.js 16 build crashed due to the 1GB RAM constraint of the `t3.micro` instance. I analyzed memory utilization and provisioned a 2GB virtual memory swap space using `fallocate` and `mkswap`, persisting it in `/etc/fstab`.*  
> 2. * **OAuth Client Invalidation (`deleted_client`)**: When the original Google project was recovered, the internal OAuth brand state was corrupted. I provisioned a clean OAuth 2.0 Web Client, updated `.env.local`, and rebuilt the project.*  
> 3. * **Supabase Audience Mismatch**: Supabase rejected Google sign-ins with an `Unacceptable audience in id_token` error. I identified that Supabase verifies the JWT's `aud` claim against its registered provider ID, and updated the Supabase Authentication Provider settings accordingly.*  
> 4. * **Browser-Level OAuth Policy (`origin_mismatch`)**: Google strictly enforces domain-level HTTPS origins for Google Identity Services. Deploying Let's Encrypt SSL and registering the exact HTTPS DuckDNS origin resolved the issue."*

---

### Q4: "How would you scale this architecture if MoneyMap experiences a 100x traffic spike?"
> *"I would evolve this architecture across three tiers:*  
> 1. * **Edge Caching**: Place AWS CloudFront (CDN) in front of the application to cache static assets, JavaScript chunks, and landing page assets at Edge locations worldwide, reducing origin hits by up to 70%.*  
> 2. * **Compute Tier (Stateless Scaling)**: Containerize the Next.js app using our Dockerfile and deploy it behind an AWS Application Load Balancer (ALB) across an Auto Scaling Group on AWS ECS (Fargate). As CPU/memory thresholds are crossed, ECS spins up additional containers automatically.*  
> 3. * **Database Tier**: Enable Supabase's built-in PgBouncer / Supavisor connection pooling to handle tens of thousands of concurrent database connections without exhausting PostgreSQL connection limits."*

---

## 📌 4. Production Deployment Verification Checklist

- [x] Next.js `output: 'standalone'` configured.
- [x] Health check endpoint active at `/api/health`.
- [x] AWS Security Group rules restricted to ports 22, 80, and 443.
- [x] 2GB Swap space enabled and verified via `free -h`.
- [x] Node.js 20 LTS and PM2 daemon running.
- [x] PM2 startup script enabled on boot (`pm2 startup` + `pm2 save`).
- [x] Nginx reverse proxy routing port 80/443 to `127.0.0.1:3000`.
- [x] Free SSL/TLS certificate installed via Certbot with automatic renewal.
- [x] Google Cloud Console updated with HTTPS domain origins & callbacks.
- [x] Supabase URL configuration updated with production domain and redirect paths.
- [x] Production application verified live at [https://moneymap-abbhiinay.duckdns.org](https://moneymap-abbhiinay.duckdns.org).
