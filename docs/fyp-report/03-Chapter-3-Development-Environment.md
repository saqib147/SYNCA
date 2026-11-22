# Chapter 3: Development Environment

---

This chapter provides a complete, step-by-step setup manual designed for a developer or evaluator who has **no prior knowledge** of Synca. Following these instructions sequentially will take a fresh machine from zero dependencies to a fully functional local Synca development environment with live authentication, database persistence, real-time WebSockets, and 24-hour Cloudinary file transfers.

---

## 3.1 System & Software Prerequisites

| Requirement | Minimum Specification | Recommended |
|---|---|---|
| **Operating System** | Windows 10/11, macOS 13+, or Ubuntu 22.04+ | Windows 11 or macOS 14+ |
| **RAM** | 8 GB | 16 GB |
| **Disk Space** | 2 GB free (for `node_modules` & Next.js build cache) | 5 GB free |
| **Node.js** | v18.18.0+ (required by `package.json` `engines`) | v20.x LTS |
| **npm** | v10.0.0+ (workspaces & Turborepo support) | v10.8.1+ |
| **Git** | v2.40+ | Latest |
| **Web Browser** | Chrome / Edge / Firefox (latest) | Google Chrome |
| **Code Editor** | Any IDE | Visual Studio Code |

---

## 3.2 Installing Core Developer Tools

### Step 1: Install Node.js (LTS)
1. Navigate to [https://nodejs.org](https://nodejs.org) and download the **LTS (Long Term Support)** installer (Node.js v20.x).
2. Run the installer with default options (ensure **"Add to PATH"** is checked on Windows).
3. Open a new terminal (PowerShell on Windows, Terminal on macOS/Linux) and verify both Node.js and npm:

```bash
node -v
# Expected output: v20.x.x (must be >= v18.0.0)

npm -v
# Expected output: 10.x.x
```

> **[INSERT SCREENSHOT — Figure 3.1: Terminal verifying `node -v` and `npm -v`]**

### Step 2: Install Git
1. Download Git from [https://git-scm.com/downloads](https://git-scm.com/downloads) and complete installation.
2. Verify installation:

```bash
git --version
# Expected output: git version 2.4x.x
```

### Step 3: Install Visual Studio Code (Recommended)
1. Download VS Code from [https://code.visualstudio.com](https://code.visualstudio.com).
2. Recommended extensions: **Tailwind CSS IntelliSense**, **ESLint**, **Prettier**, and **GitLens**.

---

## 3.3 Provisioning External Cloud Services

Synca connects to four free-tier-friendly managed cloud services: **MongoDB Atlas**, **Upstash Redis**, **Clerk**, and **Cloudinary**. Complete the four sub-sections below and keep each credential handy for Section 3.5.

### 3.3.1 MongoDB Atlas Setup (Primary Database)
1. Create a free account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Build a Database** → choose the **M0 Free** tier → select your nearest region → click **Create Deployment**.
3. Under **Database Access**, create a database user (e.g., `synca_dev`) with **Read and write to any database** permissions and save the password.
4. Under **Network Access**, click **Add IP Address** → select **Allow Access from Anywhere (`0.0.0.0/0`)** for local development (or add your specific IP).
5. Click **Database** → **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/synca?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with the credentials created in Step 3.

> **[INSERT SCREENSHOT — Figure 3.2: MongoDB Atlas Cluster & Connection String Dialog]**

---

### 3.3.2 Upstash Redis Setup (Real-Time Pub/Sub & Caching)
1. Create a free account at [https://upstash.com](https://upstash.com).
2. Click **Create Database** → name it `synca-redis` → choose the region closest to you → click **Create**.
3. On the database details page, copy the **Redis URL** (`rediss://default:<password>@<endpoint>.upstash.io:6379`) and/or **REST URL / Token** if configured.

> **[INSERT SCREENSHOT — Figure 3.3: Upstash Redis Database Dashboard & Connection Details]**

---

### 3.3.3 Clerk Authentication Setup (Identity & JWT)
1. Create a free account at [https://clerk.com](https://clerk.com).
2. Click **Create Application**, name it **Synca**, and enable **Email** (and optionally **Google / GitHub** OAuth).
3. From the Clerk Dashboard sidebar, open **Configure → API Keys**.
4. Copy both keys:
   - **Publishable Key**: `pk_test_...` (used by `apps/web`)
   - **Secret Key**: `sk_test_...` (used by both `apps/web` and `apps/api`)

> **[INSERT SCREENSHOT — Figure 3.4: Clerk Dashboard API Keys Screen]**

---

### 3.3.4 Cloudinary Setup (25 MB All-Type File Transfers)
1. Create a free account at [https://cloudinary.com](https://cloudinary.com).
2. Open **Settings → API Keys** from the Cloudinary Console.
3. Copy the three required credentials:
   - **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
   - **API Key** (`CLOUDINARY_API_KEY`)
   - **API Secret** (`CLOUDINARY_API_SECRET`)
4. **CRITICAL — Verify API Key Role & PDF/ZIP Delivery**:
   - Ensure the API Key has **Admin / Media Library Admin** (or **Master Admin**) upload permissions (`create` and `destroy` actions) so server-side uploads and 24-hour cleanup deletions do not fail with HTTP `403`.
   - Under **Settings → Security**, enable **"Allow delivery of PDF and ZIP files"** if you intend to preview PDFs directly via Cloudinary URLs.

> **[INSERT SCREENSHOT — Figure 3.5: Cloudinary API Keys & Security Settings]**

---

## 3.4 Cloning the Repository & Exploring the Monorepo

Open your terminal, navigate to your desired workspace folder, and clone the repository:

```bash
git clone <repository-url> Synca-FYP
cd Synca-FYP
```

The repository follows a clean Turborepo monorepo layout:

```text
Synca-FYP/
├── apps/
│   ├── api/                 # Standalone Express.js + Socket.io backend (Port 4000)
│   │   ├── src/
│   │   │   ├── controllers/ # Project, Task, Message, User controllers
│   │   │   ├── jobs/        # file-cleanup.job.ts (15-min 24h expiry sweeper)
│   │   │   ├── lib/         # mongodb.ts, redis.ts, cloudinary.ts
│   │   │   ├── middleware/  # Clerk JWT auth & error handling
│   │   │   ├── models/      # Mongoose schemas (Project, Task, Message, FileRef, User)
│   │   │   ├── routes/      # /api/v1/* Express routers
│   │   │   └── socket/      # Socket.io server, auth & room handlers
│   │   └── .env             # Backend environment variables (create in Step 3.5)
│   └── web/                 # Next.js 14 App Router frontend (Port 3000)
│       ├── src/
│       │   ├── app/         # Routes: (app)/dashboard, projects, chats, settings, sign-in, sign-up
│       │   ├── components/  # layout/, project/, task/, chat/, shared/
│       │   ├── context/     # SocketContext, ChatNotificationContext, ThemeContext
│       │   ├── hooks/       # useProjects, useTasks, useTeammates
│       │   └── lib/api/     # Typed REST API clients
│       └── .env.local       # Frontend environment variables (create in Step 3.5)
├── packages/
│   ├── config/              # Shared limits (FILE_LIMITS: 25 MB, 24h retention)
│   ├── types/               # Shared TypeScript domain interfaces
│   └── zod-schemas/         # Shared Zod validation schemas
├── docs/                    # Architecture, API, Database, Design System, Security, FYP Report
├── CONTEXT.md               # Living system context document
├── CHANGELOG.md             # Chronological engineering log
├── package.json             # Root npm workspaces & Turborepo scripts
└── turbo.json               # Turborepo task pipeline configuration
```

---

## 3.5 Configuring Environment Variables

Never commit `.env` or `.env.local` files to Git. Create the two environment files below using the credentials provisioned in Section 3.3.

### 1. Backend Environment File — `apps/api/.env`
Create `apps/api/.env` with the following keys:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/synca?retryWrites=true&w=majority

# Upstash Redis (optional fallback to local/memory if omitted in dev, required for multi-instance Socket.io)
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudinary File Storage (25 MB limit, 24h auto-delete)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Frontend Environment File — `apps/web/.env.local`
Create `apps/web/.env.local` with the following keys:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Clerk Auth Route Redirects
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend API & WebSocket URLs
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

> **[INSERT SCREENSHOT — Figure 3.6: Configured `apps/api/.env` and `apps/web/.env.local` in VS Code (with secrets redacted)]**

---

## 3.6 Installing Dependencies & Starting the Development Servers

### Step 1: Install All Workspace Dependencies
From the **root directory** (`Synca-FYP/`), run a single install command. npm workspaces will link `apps/web`, `apps/api`, and all three `packages/*` automatically:

```bash
npm install
```

> **[INSERT SCREENSHOT — Figure 3.7: Successful `npm install` output in terminal]**

### Step 2: Launch Both Frontend and Backend Simultaneously
Run Turborepo's parallel development command from the root directory:

```bash
npm run dev
```

Turborepo will start two concurrent watchers in the same terminal:
- **`api:dev`**: Runs `tsx watch src/index.ts` on **`http://localhost:4000`** (connects to MongoDB Atlas, initializes Socket.io + Redis adapter, and starts the 15-minute `file-cleanup.job` sweeper).
- **`web:dev`**: Runs `next dev` on **`http://localhost:3000`**.

> **[INSERT SCREENSHOT — Figure 3.8: Turborepo `npm run dev` terminal showing `api:dev` and `web:dev` ready]**

---

## 3.7 Verifying the Installation

Perform the following five-point verification checklist to confirm every subsystem is operational:

1. **API Health Probe**: Open [http://localhost:4000/health](http://localhost:4000/health) in your browser. Confirm it returns HTTP `200` with MongoDB connected status.
2. **Authentication Flow**: Navigate to [http://localhost:3000](http://localhost:3000). You should be redirected to `/sign-in`. Create an account via `/sign-up` and confirm automatic redirect to `/dashboard`.
3. **Project & Kanban Verification**: Click **Create** in the left sidebar → create a project → switch to the **Board** tab → click **+ Add Task** → verify `"Default Column"` is created automatically and drag-and-drop works smoothly.
4. **Real-Time Messaging Verification**: Open the project's **Conversation** tab, send a formatted message (`**Hello** _Synca_ \`v1\``), and confirm it renders as rich formatted text without reloading the page.
5. **File Upload Verification**: Click the `+` paperclip icon in the chat composer, upload an image or PDF (≤25 MB), and confirm the attachment card displays with a live `Expires in 23h 59m` countdown badge.

> **[INSERT SCREENSHOT — Figure 3.9: `/health` JSON response in browser]**
> **[INSERT SCREENSHOT — Figure 3.10: Running Synca Dashboard at `http://localhost:3000/dashboard`]**

---

## 3.8 Useful Workspace Commands & Database Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts both `apps/web` (`:3000`) and `apps/api` (`:4000`) via Turborepo |
| `npm run typecheck` | Runs TypeScript `tsc --noEmit` across all workspaces |
| `npm run typecheck --workspace=web` | Typechecks only the Next.js frontend (safe while `npm run dev` is running) |
| `npm run typecheck --workspace=api` | Typechecks only the Express backend |
| `npm run lint` | Runs ESLint across workspaces |
| `npm run build` | Builds production bundles for all workspaces *(stop `npm run dev` first to avoid `.next` folder collision)* |
| `npm run clear-db` | Utility script (`scripts/clear-db.js`) to reset development database collections |

---

## 3.9 Troubleshooting Common Setup Issues

| Symptom / Error | Root Cause | Resolution |
|---|---|---|
| `MongooseServerSelectionError` on API startup | IP address not whitelisted in MongoDB Atlas or wrong `MONGODB_URI` password | Add `0.0.0.0/0` in Atlas **Network Access** and URL-encode special characters in your password |
| `401 Unauthorized` on all `/api/v1/*` requests | Mismatched Clerk keys between `apps/web/.env.local` and `apps/api/.env` | Ensure both apps use keys from the **same** Clerk application instance |
| `FileUpload` returns `403 UnexpectedResponse` from Cloudinary | Cloudinary API key lacks `create` upload role permissions | In Cloudinary Console → **Settings → API Keys**, assign **Media Library Admin** or **Master Admin** role to the key and restart `npm run dev` |
| `EADDRINUSE: address already in use :::4000` | Another process is already occupying port `4000` or `3000` | Stop the existing Node process or change `PORT` in `apps/api/.env` and `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` |
| Next.js hydration warning or broken live dev after `npm run build` | Running `next build` overwrites the active `.next/` dev cache | Restart `npm run dev` (or delete `apps/web/.next` and re-run `npm run dev`); use `npm run typecheck` while dev server is live |
| Socket.io fails to connect in browser console | Wrong `NEXT_PUBLIC_SOCKET_URL` or CORS mismatch | Confirm `CLIENT_URL=http://localhost:3000` in `apps/api/.env` and `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` in `apps/web/.env.local` |
