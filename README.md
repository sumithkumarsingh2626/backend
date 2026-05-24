# Price Drop Alert — Backend

Production-oriented Express + TypeScript API with MongoDB, Redis/BullMQ, Zod validation, and JWT RBAC.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Nodemon + `tsx` hot reload |
| `npm run build` | Emit `dist/` via `tsc` |
| `npm start` | Run compiled `dist/server.js` |

## Layout

See `src/` — `configs`, `constants`, `controllers`, `jobs`, `lib`, `middlewares`, `models`, `queues`, `routes`, `scrapers`, `services`, `types`, `utils`, `validators`.

## Bootstrap

Copy `.env.example` → `.env`, start MongoDB + Redis, then `npm run dev`.

## Deployment on Render

This backend is pre-configured for a highly reliable, containerized deployment on **Render** using our custom Docker file. This guarantees that Puppeteer (Chromium) and its system dependencies run flawlessly.

### Step-by-Step Render Setup

1. **Create a New Web Service**:
   * Log into Render and click **New +** > **Web Service**.
   * Connect your GitHub repository.

2. **Configure General Settings**:
   * **Name**: `price-drop-backend`
   * **Root Directory**: `backend` *(CRITICAL: This instructs Render to navigate to the backend subdirectory for build context)*
   * **Runtime**: `Docker` *(CRITICAL: Render will build using the `Dockerfile` inside the backend directory)*

3. **Configure Environment Variables**:
   Under **Environment**, click **Add Environment Variable** and define:
   * `NODE_ENV`: `production`
   * `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   * `JWT_SECRET`: `your_secure_jwt_secret_of_at_least_32_characters` *(Mandatory for security in production)*
   * `REDIS_ENABLED`: `false` *(Keep `false` for simpler standard deployments. If you hook up a Render Redis database, set this to `true` and add `REDIS_URL`)*
   * `CLIENT_URL`: `https://your-frontend-domain.com` *(Comma-separated allowed client URLs for CORS. If left blank, defaults to allowing all origins for easy testing)*

4. **Deploy**:
   * Click **Create Web Service**. Render will build the container, install Chromium dependencies, and launch the service successfully.

