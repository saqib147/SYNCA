# Synca — Context & Active Architecture

> **Living System Context Document**
> This file contains the active state, tech stack, and endpoint registry of the Synca platform. It is automatically maintained by AI agents on every code edit as required by `.antigravity/rules.md`.

---

## 1. High-Level Overview

**Synca** is a unified, real-time team collaboration platform that integrates project management, direct & channel messaging, file sharing, and task tracking within workspace **Rooms**.

### Key System Concepts
- **Rooms**: Organizations or workspaces where admins manage members, custom roles, permissions, and settings.
- **Projects**: Portfolio of work items organized by Kanban boards, Gantt timelines, flat lists, and calendars.
- **Tasks**: Hierarchical work items with subtasks, priority levels, assignees, due dates, and custom Kanban status columns. Supports personal private tasks.
- **Messaging**: Real-time 1:1 Direct Messages (DMs) and project-scoped group channels (`#channel-name`) with rich-text (Tiptap), `@mentions`, emoji reactions, and file attachments.
- **File Sharing**: Cloudinary-backed file attachments with file cards and signed URLs for room privacy.

---

## 2. Active Tech Stack

| Layer | Technology / Choice | Details / Reason |
|---|---|---|
| **Architecture** | Monorepo (Turborepo) | Shared TypeScript types (`packages/types`), Zod schemas (`packages/zod-schemas`), apps `apps/web` & `apps/api` |
| **Frontend** | Next.js 14+ (App Router) | TypeScript, Tailwind CSS (class-based dark mode), Shadcn UI, ThemeContext (`light` / `dark` / `system` with zero-FOUC script), Zustand (UI state), TanStack Query v5 (Server state), Tiptap, Recharts |
| **Backend** | Express.js + Socket.io | Standalone Node.js Express server on Render for persistent WebSockets |
| **Primary DB** | MongoDB Atlas (Mongoose) | Flexible JSON document storage for rich tasks, channels, and milestones |
| **Caching & Pub/Sub** | Upstash Redis | Serverless Redis for query caching, rate-limiting, and Socket.io multi-instance scaling |
| **Authentication** | Clerk Auth | Email/OAuth auth, JWT session management, `@clerk/nextjs` & `@clerk/express` SDKs |
| **File Storage** | Cloudinary | Media transform, file cards, signed private URLs |
| **Observability** | Pino + Sentry + BetterStack | Structured JSON logging with request tracing, Sentry error monitoring |

---

## 3. Complete Planned API Endpoints Registry

All REST API endpoints require `Authorization: Bearer <clerk_token>` header unless explicitly marked public.

### 3.1 Workspace Management (`/api/v1/workspaces`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/workspaces` | Create a new Workspace (creator becomes Owner) | Authenticated |
| `GET` | `/api/v1/workspaces` | List all workspaces user is a member of | Authenticated |
| `GET` | `/api/v1/workspaces/:id` | Get Workspace details by ID or slug | Workspace Member |
| `POST` | `/api/v1/workspaces/join` | Join Workspace via 6-character join code | Authenticated |
| `PATCH` | `/api/v1/workspaces/:id` | Update Workspace settings (name, desc, isPrivate) | Owner / Admin |
| `DELETE` | `/api/v1/workspaces/:id/members/:userId` | Remove member or leave workspace | Owner / Admin or Self |
| `DELETE` | `/api/v1/workspaces/:id` | Delete Workspace | Workspace Owner |

### 3.2 Projects (`/api/v1/projects`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/projects` | Create a new Project in Room | `project:create` |
| `GET` | `/api/v1/projects?roomId=` | List projects in room (filterable by status, priority, assignee) | `project:view` |
| `GET` | `/api/v1/projects/:id` | Get project detail (Overview, Brief, Goals, Milestones) | `project:view` |
| `PATCH` | `/api/v1/projects/:id` | Update project metadata or privacy | `project:edit` |
| `DELETE` | `/api/v1/projects/:id` | Soft delete project | `project:delete` |
| `POST` | `/api/v1/projects/:id/members` | Add team member to project | `project:manage_members` |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | Remove team member from project | `project:manage_members` |

### 3.3 Tasks (`/api/v1/tasks`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | Create task (in project or personal private task) | `task:create` |
| `GET` | `/api/v1/tasks?projectId=` | List tasks for a project | `project:view` |
| `GET` | `/api/v1/tasks?userId=&private=true` | Get user's personal To-Do list | Authenticated (Owner only) |
| `GET` | `/api/v1/tasks/:id` | Get task detail with subtasks | `project:view` |
| `PATCH` | `/api/v1/tasks/:id` | Update task (status, assignees, subtasks, priority, due date) | `task:edit` |
| `DELETE` | `/api/v1/tasks/:id` | Soft delete task | `task:delete` |

### 3.4 Milestones (`/api/v1/milestones`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/milestones` | Create project milestone | `milestone:manage` |
| `GET` | `/api/v1/milestones?projectId=` | List milestones for project | `project:view` |
| `PATCH` | `/api/v1/milestones/:id` | Update milestone status / progress | `milestone:manage` |
| `DELETE` | `/api/v1/milestones/:id` | Delete milestone | `milestone:manage` |

### 3.5 Messages & Real-Time (`/api/v1/messages`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/messages/dm/:userId` | Get DM message history (cursor paginated) | Authenticated |
| `GET` | `/api/v1/messages/channel/:projectId` | Get channel message history (cursor paginated) | `chat:read` |
| `POST` | `/api/v1/messages` | Send message (REST fallback) | `chat:send` |
| `DELETE` | `/api/v1/messages/:id` | Soft delete message | Message Sender / Admin |

### 3.6 File Storage (`/api/v1/files`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/files/upload` | Upload file to Cloudinary & create FileRef | `file:upload` |
| `GET` | `/api/v1/files/:id` | Get file metadata & signed URL | Room Member |
| `DELETE` | `/api/v1/files/:id` | Delete file reference and Cloudinary asset | File Uploader / Admin |

### 3.7 Notifications (`/api/v1/notifications`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Get user notifications feed | Authenticated |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark notification as read | Authenticated |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all notifications as read | Authenticated |

### 3.8 Directory & Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/users/:id` | Get member profile | Room Member |
| `GET` | `/api/v1/users?roomId=` | Search/list workspace members | Room Member |

### 3.9 System & Webhooks

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/health` | Health check endpoint (DB + Redis state) | Public |
| `POST` | `/api/webhooks/clerk` | Clerk webhook sync (`user.created`, `user.deleted`) | Clerk Svix Signature |

---

## 4. WebSocket Event Registry (Socket.io)

### Client → Server (`Emit`)
- `project:join` `{ projectId }`
- `project:leave` `{ projectId }`
- `message:send` `{ channelType, channelId, content, attachments }`
- `message:react` `{ messageId, emoji }`
- `message:delete` `{ messageId }`
- `typing:start` `{ channelType, channelId }`
- `typing:stop` `{ channelType, channelId }`
- `task:move` `{ taskId, newStatus, newIndex }`

### Server → Client (`Listen`)
- `message:new` `Message`
- `message:deleted` `{ messageId, channelId }`
- `message:reaction` `{ messageId, reactions }`
- `typing:update` `{ channelId, typingUsers }`
- `presence:update` `{ userId, status, lastSeen }`
- `task:updated` `{ task, projectId }`
- `notification:new` `Notification`
- `error` `{ code, message }`

---

## 5. Workflow Protocols & Automation

This repository enforces strict execution and documentation rules defined in `.antigravity/rules.md` and `.agents/rules/sync-automation.md`:
1. **Context Awareness**: `CONTEXT.md` and `/docs/` must be consulted prior to edits.
2. **Automated Post-Change Sync**: Every code edit, feature implementation, refactor, or route update MUST update:
   - `CONTEXT.md` (endpoint updates, schema adjustments, architecture notes)
   - `/docs/` files (`api.md`, `database.md`, `architecture.md`, `realtime-security.md`)
   - `CHANGELOG.md` (logged under current date/version)
3. **Manual Sync Command**: Responds to `sync-docs` command by comparing git diff against docs and reconciling all discrepancies.

---

## 6. Project Roadmap & Phase Progress

| Phase | Description | Status | Progress |
|---|---|---|---|
| **Phase 0** | Setup & Foundation | Completed | 100% |
| **Phase 1** | Dashboard | Completed | 100% |
| **Phase 2** | Workspace Management | Completed | 100% |
| **Phase 3** | Projects & Tasks | PENDING | 0% |
| **Phase 4** | Real-Time Messaging | PENDING | 0% |
| **Phase 5** | Roles, Permissions & Notifications | PENDING | 0% |
| **Phase 6** | People & Directory | PENDING | 0% |
| **Phase 7** | Landing Page | PENDING | 0% |
| **Phase 8** | Polish, Testing & Deployment | PENDING | 0% |

---

### Active Phase Breakdown — Phase 0: Setup & Foundation (100%)

- [x] **Step 1: Monorepo & App Initialization**: Set up Turborepo monorepo layout with `apps/web` (Next.js 14, TypeScript, Tailwind CSS), `apps/api` (Express), and `packages/` (`types`, `zod-schemas`, `config`).
- [x] **Step 2: Component Library & Base Shell Layout**: Configure Shadcn UI and create base application layout with dark sidebar (`#16191e`), top bar, and route views matching `/design/` Figma mockups (`/dashboard`, `/todo`, `/projects`, `/chats`, `/settings`).
- [x] **Step 3: Clerk Authentication System**: Integrate Clerk auth on client (`@clerk/nextjs`) and server (`@clerk/express`) with sign-up, sign-in, protected route guards, and session persistence.
- [x] **Step 4: Express Server & MongoDB Connection**: Build Express backend server structure on Render, establish Mongoose MongoDB connection pooling, and set up Upstash Redis.
- [x] **Step 5: Cloudinary File Storage Configuration**: Configure Cloudinary SDK on Express backend for signed uploads and file metadata tracking.
- [x] **Step 6: Environment Configuration & Base Shell Verification**: Audit and set up environment variables across services, verify base layout, auth redirect flow, and initial server health.

---

### Active Phase Breakdown — Phase 1: Dashboard (100%)

- [x] **Step 1: Dashboard Layout & Greeting Grid**: Create the responsive layout structure for `/dashboard` matching Figma designs, and code the dynamic time-of-day greeting ("Good Morning/Afternoon/Evening").
- [x] **Step 2: Metrics Stats Bar**: Implement the visual stats widgets for Task Completion Rate (visual radial/gauge meter), Active Projects, and Team Velocity with premium hover micro-animations.
- [x] **Step 3: Task Status Navigation Panels**: Build the status tabs panel (`Upcoming`, `Overdue`, `Completed`) displaying a list of Task Cards, featuring priority level, project name, category badge, and assignee avatar.
- [x] **Step 4: Analytics Completed Projects Chart**: Integrate Recharts/Calendar Grid to render the weekly completed tasks contribution heat map using theme gradients.
- [x] **Step 5: Ongoing Projects & Recent Chats Widgets**: Build the ongoing projects quick-list and recent chats activity panel with unread badge count indicators.
- [x] **Step 6: Route Simplification**: Removed ToDo tab per user specification, maintaining Dashboard and Projects core views.

---

### Active Phase Breakdown — Phase 2: Workspace Management (100%)

- [x] **Step 1: Database Model & Zod Schemas**: Define Mongoose `Workspace` schema, Zod validation schemas, and TypeScript interfaces for workspace objects, member rosters, and join codes.
- [x] **Step 2: Workspace API Endpoints**: Implement Express workspace routes (`POST /api/v1/workspaces`, `GET /api/v1/workspaces`, `POST /api/v1/workspaces/join`, `DELETE /api/v1/workspaces/:id/members/:userId`).
- [x] **Step 3: Workspace Context & Hook**: Build `WorkspaceContext` and `useWorkspace()` hook in `apps/web` with state management for active workspace and workspace switching.
- [x] **Step 4: Workspace Selector & Switcher in Sidebar**: Add interactive workspace switcher dropdown to sidebar with active workspace indicators and quick-action triggers.
- [x] **Step 5: Create & Join Workspace Modals**: Build accessible dialog modals for creating new workspaces and joining existing workspaces via 6-character alphanumeric codes.
- [x] **Step 6: Dedicated Workspace Overview Page**: Build the `/workspaces/[id]` route featuring member roster, invite code copy buttons, and workspace settings.
