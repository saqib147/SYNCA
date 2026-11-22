# Synca — Context & Active Architecture

> **Living System Context Document**
> This file contains the active state, tech stack, and endpoint registry of the Synca platform. It is automatically maintained by AI agents on every code edit as required by `.antigravity/rules.md`.

---

## 1. High-Level Overview

**Synca** is a unified, real-time team collaboration platform that integrates project management, direct & channel messaging, file sharing, and task tracking built around a **Project-Centric Architecture**.

### Key System Concepts
- **Projects**: Top-level containers of work items, milestone deliverables, and channels. Each project has a unique 6-character alphanumeric `joinCode` for instant member onboarding.
- **Project Roles**: Three-tier role hierarchy per project:
  - **`Admin`**: Project owner/creator or promoted admin with full control over settings, member roles, join codes, and project deletion.
  - **`Moderator`**: Manages project tasks, goals, milestones, invites, and channel message moderation.
  - **`Member`**: Collaborates on tasks, Kanban cards, subtasks, and project channels.
- **Tasks**: Work items assigned within projects or personal private tasks (`projectId: null`). Public project tasks are visible to all members; private project tasks are scoped to creator/assignees (+ Admin/Mod oversight). **Board columns (`Project.columns`, `Task.column`) are decoupled from `Task.status`** — new projects start with `columns: []`, auto-creating `"Default Column"` on first task creation, and moving cards between columns does not mutate `task.status`.
- **Messaging (Phase 4)**: Real-time 1:1 DMs and **one default `#general` channel per project** with XSS-safe inline markdown formatting (`**bold**`, `_italic_`, `` `code` ``, `- bullet` lists) in both composers, emoji reactions, typing indicators, presence, unread badges/toasts, DM conversation soft-delete (`DELETE /api/v1/messages/dm/:peerId`), single WhatsApp-style left Sidebar for all conversations, and former-member greyed-out attribution in project channels. Multi-named channels and `@mentions` are scheduled for Phase 5+.
- **File Sharing**: Cloudinary-backed file attachments accepting **all file types** up to **25 MB**, with automatic **24-hour expiration** (`FileRef.expiresAt` + 15-minute `file-cleanup.job` destroying Cloudinary assets and returning `410 FILE_EXPIRED`), live countdown badges, inline raster image thumbnails, and non-clickable expired file placeholders.

> **Deprecated**: Room / Workspace layers, `RoomWide` privacy, and legacy roles (`Owner`, `Manager`, `Viewer`, `Guest`). See `SYNCA_README.md` (legacy product brief) vs this file (active truth).

---

## 2. Active Tech Stack

| Layer | Technology / Choice | Details / Reason |
|---|---|---|
| **Architecture** | Monorepo (Turborepo) | Shared TypeScript types (`packages/types`), Zod schemas (`packages/zod-schemas`), apps `apps/web` & `apps/api` |
| **Frontend** | Next.js 14+ (App Router) | TypeScript, Tailwind CSS (class-based dark mode), ThemeContext (`light` / `dark` / `system` with zero-FOUC script), `@dnd-kit`, custom React hooks + SWR-style user-scoped caches |
| **Backend** | Express.js + Socket.io | Standalone Node.js Express server on Render for persistent WebSockets |
| **Primary DB** | MongoDB Atlas (Mongoose) | Flexible JSON document storage for projects, tasks, channels, and milestones |
| **Caching & Pub/Sub** | Upstash Redis | Serverless Redis for query caching, rate-limiting, presence, unread, and Socket.io multi-instance scaling |
| **Authentication** | Clerk Auth | Email/OAuth auth, JWT session management, `@clerk/nextjs` & `@clerk/express` SDKs |
| **File Storage** | Cloudinary | Media transform, file cards, signed private URLs |
| **Observability** | Pino + Sentry + BetterStack | Structured JSON logging with request tracing, Sentry error monitoring |

---

## 3. Complete Planned API Endpoints Registry

All REST API endpoints require `Authorization: Bearer <clerk_token>` header unless explicitly marked public.

### 3.1 Projects (`/api/v1/projects`)

Detailed roles and permissions specification is documented in [`docs/roles-and-permissions.md`](file:///d:/Synca-FYP/docs/roles-and-permissions.md).

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/projects` | Create a new top-level Project (creator becomes Admin) | Authenticated |
| `POST` | `/api/v1/projects/join` | Join an existing project using a 6-character `joinCode` | Authenticated |
| `GET` | `/api/v1/projects` | List all active projects the user belongs to | Authenticated |
| `GET` | `/api/v1/projects/:id` | Get project detail (Overview, Goals, Milestones, Enriched Roster) | Project Member |
| `PATCH` | `/api/v1/projects/:id` | Update project metadata, goals, milestones, `columns` order (any member), or atomic `renameColumn` | Admin / Moderator (columns: Member) |
| `POST` | `/api/v1/projects/:id/members` | Add member directly by exact email or shared-project userId (rate-limited) | Admin / Moderator |
| `PATCH` | `/api/v1/projects/:id/members/:userId/role` | Promote/demote project member (`Admin`, `Moderator`, `Member`) | Project Admin |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | Remove member from project or leave project (auto-unassigns from all project tasks) | Project Admin or Self |
| `POST` | `/api/v1/projects/:id/join-code/reset` | Regenerate project join code | Project Admin |
| `DELETE` | `/api/v1/projects/:id` | Soft delete project and cascade delete child tasks | Project Admin |

### 3.2 Tasks (`/api/v1/tasks`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | Create task (in project or personal private task) | Project Member |
| `GET` | `/api/v1/tasks?projectId=` | List tasks for a project (All public project tasks visible; private tasks scoped to creator/assignee/admin) | Project Member |
| `GET` | `/api/v1/tasks/my` | Get user's assigned/created tasks across all joined projects plus personal tasks | Authenticated |
| `PATCH` | `/api/v1/tasks/:id` | Update task: status, subtasks, description, self-assign (Member); full planning metadata (Creator / Admin / Mod) | Project Member / Assignee / Admin |
| `PATCH` | `/api/v1/tasks/:id/move` | Kanban reordering & column transition (`column` + `order`; decoupled from `status`) | Project Member / Assignee / Admin |
| `POST` | `/api/v1/tasks/:id/comments` | Add comment to a task | Project Member / Assignee / Admin |
| `DELETE` | `/api/v1/tasks/:id` | Soft delete task | Task Creator or Project Admin / Moderator |

### 3.3 Messages & Real-Time (`/api/v1/messages`) — Phase 4

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/messages/dm/:userId` | Get DM message history (cursor paginated) | DM Participant |
| `GET` | `/api/v1/messages/channel/:projectId` | Get default project channel history (cursor paginated) | Project Member |
| `POST` | `/api/v1/messages` | Send message (REST fallback; primary = Socket `message:send`) | Project Member / DM Participant |
| `DELETE` | `/api/v1/messages/dm/:peerId` | Soft delete all messages in a 1:1 DM thread & broadcast `dm:deleted` | DM Participant |
| `DELETE` | `/api/v1/messages/:id` | Soft delete message | Sender / Project Admin / Moderator (channel) |

### 3.4 File Storage (`/api/v1/files`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/files/upload` | Upload any file type (max 25 MB) to Cloudinary (`image` for raster images, `raw` otherwise) with 24h `expiresAt` | Authenticated |
| `GET` | `/api/v1/files/:id` | Get file metadata & URL (`410 FILE_EXPIRED` once past 24h `expiresAt`) | Project Member / Uploader |
| `DELETE` | `/api/v1/files/:id` | Delete file reference and Cloudinary asset | Uploader / Admin |

### 3.5 Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/users/teammates` | Get unique project collaborators enriched with Clerk profiles (batched) | Authenticated |
| `GET` | `/api/v1/users/lookup?email=` | Tier 3 exact email lookup (rate-limited, exact match only) | Authenticated |
| `GET` | `/api/v1/users/:userId/profile` | Get individual user display profile (scoped to self, shared-project teammates, or DM peers) | Authenticated (Scoped) |

### 3.6 System

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/health` | Health check endpoint (DB + Redis state) | Public |

---

## 4. WebSocket Event Registry (Socket.io)

### Client → Server (`Emit`)
- `project:join` `{ projectId }`
- `project:leave` `{ projectId }`
- `dm:join` `{ targetUserId }`
- `dm:leave` `{ targetUserId }`
- `message:send` `{ channelType, channelId, content, attachments, senderName?, senderAvatar? }`
- `message:react` `{ messageId, emoji }`
- `message:delete` `{ messageId }`
- `typing:start` `{ channelType, channelId }`
- `typing:stop` `{ channelType, channelId }`
- `task:move` `{ taskId, newStatus, newIndex }`

### Server → Client (`Listen`)
- `message:new` `Message`
- `message:deleted` `{ messageId, channelId }`
- `dm:deleted` `{ channelId, peerId, deletedBy }`
- `message:reaction` `{ messageId, reactions }`
- `typing:update` `{ channelId, typingUsers }`
- `presence:update` `{ userId, status, lastSeen }`
- `presence:sync` `{ onlineUserIds }`
- `task:updated` `{ task, projectId }`
- `notification:new` `Notification`
- `error` `{ code, message }`

---

## 5. Workflow Protocols & Automation

This repository enforces strict execution and documentation rules defined in `.antigravity/rules.md` and `.agents/rules/sync-automation.md`:
1. **Context Awareness**: `CONTEXT.md` and `/docs/` must be consulted prior to edits.
2. **Automated Post-Change Sync**: Every code edit, feature implementation, refactor, or route update MUST update:
   - `CONTEXT.md` (endpoint updates, schema adjustments, architecture notes)
   - `/docs/` files (`api.md`, `database.md`, `architecture.md`, `realtime-security.md`, `roles-and-permissions.md`)
   - `CHANGELOG.md` (logged under current date/version)
3. **Manual Sync Command**: Responds to `sync-docs` command by comparing git diff against docs and reconciling all discrepancies.

### Direct Message Discovery (Scoped — No Global User Scan)

DM discovery uses a **tiered scoped approach** to prevent exposing the full user database:

- **Tier 1 — Teammate Search (default)**: The "New Message" modal (`NewMessageModal.tsx`) queries only the users who share at least one project with the current user via `useTeammates()` (`GET /api/v1/users/teammates`). The user can filter by display name with keyboard navigation (`↑↓`, `Enter`, `Esc`).
- **Tier 2 — Contextual Quick-Actions**: "Message" buttons on task assignees (`TaskDetailModal`) and project team rosters (`projects/[id]`) open a DM directly.
- **Tier 3 — Inline Exact Email Lookup**: If the search query contains `@`, `NewMessageModal.tsx` performs an inline live lookup against `GET /api/v1/users/lookup?email=...` (exact match only, rate-limited), previews the matched user, opens the DM in 1 click, and immediately updates the left Sidebar optimistically via `upsertDmPeerLocally()`.

---

## 6. Project Roadmap & Phase Progress

| Phase | Description | Status | Progress |
|---|---|---|---|
| **Phase 0** | Setup & Foundation | Completed | 100% |
| **Phase 1** | Dashboard | Completed | 100% |
| **Phase 2** | Architecture Simplification (Project-Centric Model) | Completed | 100% |
| **Phase 3** | Projects & Tasks | Completed | 100% |
| **Phase 4** | Real-Time Messaging | **Completed** | **100%** |
| **Phase 5** | Notifications & Mentions *(roles already shipped in Phases 2–3; harden sole-Admin / ownership)* | PENDING | 0% |
| **Phase 6** | People & Directory | PENDING | 0% |
| **Phase 7** | Landing Page | PENDING | 0% |
| **Phase 8** | Polish, Testing & Deployment | PENDING | 0% |

### Phase 4 — Real-Time Messaging (Completed)

**MVP**: One `#general` channel per project + 1:1 DMs from project roster. Defer multi-channels, threads, message edit, voice/video, full directory search.

| Step | Description | Status |
|---|---|---|
| **4.1** | Align shared types & Zod: `Message` / `FileRef` drop `roomId`, add `projectId`; DM `channelId` = sorted user pair; project-centric permissions; privacy `Private \| Public` only | ✅ Completed |
| **4.2** | API model cleanup: Project privacy enum; FileRef `projectId`; upload route uses `projectId` | ✅ Completed |
| **4.3** | Message Mongoose model + indexes; helpers (`dmChannelId`, membership checks) | ✅ Completed |
| **4.4** | REST: `GET` channel/DM history (cursor), `POST /messages`, `DELETE /messages/:id` | ✅ Completed |
| **4.5** | Install Socket.io (+ redis-adapter); HTTP server bootstrap; Clerk socket auth middleware | ✅ Completed |
| **4.6** | Socket handlers: `project:join/leave`, `message:send/react/delete`, typing, presence | ✅ Completed |
| **4.7** | Web: `message.api.ts`, socket client hook, wire `/chats` to real DMs + unread | ✅ Completed |
| **4.8** | Web: Project Conversation tab (`#general`) with live send / history | ✅ Completed |
| **4.9** | Docs sync + CHANGELOG; mark Phase 4 complete when MVP verified | ✅ Completed |
