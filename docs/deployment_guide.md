# Free Deployment Guide for Delhi CM Grievance Dashboard

To deploy this full-stack application (Next.js frontend, Express backend, MongoDB, Redis/BullMQ, S3 Storage, and WhatsApp Webhook) entirely for **free** with production-like capabilities, follow this architecture map and step-by-step setup guide.

---

## 🏗️ Free-Tier Cloud Architecture

```
User / Citizen / CM ──> Vercel (Next.js Frontend)
                              │
                        (API Requests)
                              │
                              ▼
           Koyeb / Render (Express Backend + Workers) 
            │                 │                    │
    (MongoDB Protocol)  (Redis Protocol)    (S3 Ssl/Https API)
            │                 │                    │
            ▼                 ▼                    ▼
     MongoDB Atlas      Upstash Redis        Cloudflare R2
       (Free M0)         (Serverless)         (Free Storage)
```

### Free Hosting Providers Selection
1. **Frontend:** **Vercel** (Hobby Tier — Always-on, native Next.js support, free SSL).
2. **Backend & Workers:** **Koyeb** (Free Tier — 1 always-on Micro instance with 512MB RAM, no sleep cycles) OR **Render** (Free Web Service — spins down after 15m of inactivity).
3. **Database:** **MongoDB Atlas** (Shared M0 Tier — 512MB storage, free forever).
4. **Background Queue (Redis):** **Upstash Redis** (Serverless Free Tier — 10k requests/day, supports BullMQ).
5. **Media Storage (S3 API):** **Cloudflare R2** (10GB free storage, **$0 egress fees**) or **Supabase Storage**.

---

## 📋 Step-by-Step Setup

### Step 1: Database Setup (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. Create a new project and build a cluster selecting the **M0 (Free)** tier.
3. Choose your preferred cloud provider region (e.g., AWS Mumbai or N. Virginia).
4. In **Database Access**, create a user credentials (username and password).
5. In **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) so that your server instances can connect.
6. Copy the connection string (format: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`).

### Step 2: Queue & Cache Setup (Upstash Redis)
1. Register at [Upstash](https://upstash.com/).
2. Create a serverless Redis database. Choose a region close to your backend (e.g., AWS `ap-south-1` or `us-east-1`).
3. Scroll down to the **Node.js** connection section and copy the Redis URL (format: `rediss://default:PASSWORD@endpoint.upstash.io:6379`).

### Step 3: Media Storage Setup (Cloudflare R2)
1. Sign up for a [Cloudflare Account](https://dash.cloudflare.com/).
2. Go to **R2 Object Storage** in the sidebar and enable it.
3. Create a bucket named `delhi-cm-grievances` (choose the region closest to your app).
4. Go to **R2 > Manage R2 API Tokens**, create a token with `Read & Write` permissions.
5. Save the **Access Key ID**, **Secret Access Key**, and the S3 Endpoint URL (format: `https://<account_id>.r2.cloudflarestorage.com`).

---

### Step 4: Backend Deployment (Koyeb or Render)

#### Option A: Koyeb (Recommended — Always On)
1. Register at [Koyeb](https://www.koyeb.com/).
2. Create an App and link it to your GitHub Repository.
3. Set the **Build Command** to:
   ```bash
   cd backend && npm install && npm run build
   ```
4. Set the **Run Command** to:
   ```bash
   cd backend && npm run start
   ```
5. Add the **Environment Variables** (see below).
6. Deploy. Koyeb provides a secure `https://<app-name>.koyeb.app` URL.

#### Option B: Render (Alternative)
1. Register at [Render](https://render.com/).
2. Select **New > Web Service** and connect your GitHub Repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install && npm run build`.
5. Set **Start Command** to `npm run start`.
6. Add the environment variables and deploy. Render provides an `https://<app-name>.onrender.com` URL.

#### Required Backend Environment Variables:
```ini
PORT=8000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_uri
MONGODB_DB_NAME=delhi-cm-grievance

# Upstash Redis
REDIS_URL=your_upstash_redis_uri

# JWT Configuration
JWT_ACCESS_SECRET=generate_a_long_random_string_here
JWT_REFRESH_SECRET=generate_another_long_random_string_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://your-frontend-app.vercel.app

# Cloudflare R2 / S3
MINIO_ENDPOINT=account_id.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_r2_access_key
MINIO_SECRET_KEY=your_r2_secret_key
MINIO_BUCKET_NAME=delhi-cm-grievances

# WhatsApp Credentials (Meta API)
WHATSAPP_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_secure_verify_token
```

---

### Step 5: WhatsApp Webhook Configuration (Meta Portal)
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. In your App dashboard, navigate to **WhatsApp > Configuration**.
3. Under **Webhook**, click **Edit**:
   * **Callback URL:** `https://your-backend-service-url.com/webhooks/whatsapp`
   * **Verify Token:** The exact value you set for `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in the backend environment.
4. Click **Verify and Save**.
5. Under **Webhook Fields**, click **Manage** and subscribe to **messages** events.

---

### Step 6: Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository.
3. Configure the Project:
   * **Root Directory:** Select `frontend`.
   * **Framework Preset:** Next.js.
4. Add the following **Environment Variables**:
   ```ini
   NEXT_PUBLIC_API_URL=https://your-backend-service-url.com/api/v1
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_or_maplibre_style
   ```
5. Click **Deploy**. Vercel will build and assign a production URL (e.g. `https://your-project.vercel.app`).

---

## ⚡ Active Worker Notification
Since the background queue workers (such as SMS, WhatsApp notifications, SLA checks, and DBSCAN clustering) are initialised natively inside `backend/src/app.ts` under the function `startWorkers()`, **you do not need a separate worker container**. Everything runs in the same container process, conserving your free limits.
