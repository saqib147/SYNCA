# Synca — Context & Active Architecture

> **Living System Context Document**
> This file contains the active state, tech stack, and endpoint registry of the Synca platform. It is automatically maintained by AI agents on every code edit as required by `.antigravity/rules.md`.

---

## 1. High-Level Overview

**Synca** is a unified, real-time team collaboration platform that integrates project management, direct & channel messaging, file sharing, and task tracking built around a **Project-Centric Architecture**.

### Key System Concepts
- **Projects**: Top-level containers of work items, milestone deliverables, and channels. Each project has a unique 6-character alphanumeric `joinCode` for instant member onboarding.
- **Project Roles**: Three-tier role hierarchy per project:
  - **`Admin`**: Project owner/creator or promoted admin with full control over settings, member roles, join codes, and project archiving.
  - **`Moderator`**: Manages project tasks, goals, milestones, and invites.
  - **`Member`**: Collaborates on tasks, Kanban cards, subtasks, and project channels.
- **Tasks**: Work items assigned within projects or personal private tasks (`isPrivate: true`).
- **Messaging**: Real-time 1:1 Direct Messages (DMs) and project-scoped group channels (`#channel-name`) with rich-text (Tiptap), `@mentions`, emoji reactions, and file attachments.
- **File Sharing**: Cloudinary-backed file attachments with file cards and signed private URLs.

---

## 2. Active Tech Stack

| Layer | Technology / Choice | Details / Reason |
|---|---|---|
| **Architecture** | Monorepo (Turborepo) | Shared TypeScript types (`packages/types`), Zod schemas (`packages/zod-schemas`), apps `apps/web` & `apps/api` |
| **Frontend** | Next.js 14+ (App Router) | TypeScript, Tailwind CSS (class-based dark mode), ThemeContext (`light` / `dark` / `system` with zero-FOUC script), TanStack Query v5, Tiptap, Recharts |
| **Backend** | Express.js + Socket.io | Standalone Node.js Express server on Render for persistent WebSockets |
| **Primary DB** | MongoDB Atlas (Mongoose) | Flexible JSON document storage for projects, tasks, channels, and milestones |
| **Caching & Pub/Sub** | Upstash Redis | Serverless Redis for query caching, rate-limiting, and Socket.io multi-instance scaling |
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
| `PATCH` | `/api/v1/projects/:id` | Update project metadata, goals, or milestones | Admin / Moderator |
| `PATCH` | `/api/v1/projects/:id/members/:userId/role` | Promote/demote project member (`Admin`, `Moderator`, `Member`) | Project Admin |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | Remove member from project or leave project | Project Admin or Self |
| `POST` | `/api/v1/projects/:id/join-code/reset` | Regenerate project join code | Project Admin |
| `DELETE` | `/api/v1/projects/:id` | Soft delete project and cascade delete child tasks | Project Admin |

### 3.2 Tasks (`/api/v1/tasks`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | Create task (in project or personal private task) | Project Member |
| `GET` | `/api/v1/tasks?projectId=` | List tasks for a project (Kanban / List) | Project Member |
| `GET` | `/api/v1/tasks/my` | Get user's assigned/created tasks across all joined projects | Authenticated |
| `PATCH` | `/api/v1/tasks/:id` | Update task (status, assignees, subtasks, priority, due date) | Project Member / Assignee |
| `PUT` | `/api/v1/tasks/:id/move` | Kanban reordering and column transition | Task Assignee / Admin |
| `POST` | `/api/v1/tasks/:id/comments` | Add comment to a task | Task Assignee / Admin |
| `DELETE` | `/api/v1/tasks/:id` | Soft delete task | Task Creator or Project Admin |

### 3.3 Messages & Real-Time (`/api/v1/messages`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `GET` | `/api/v1/messages/dm/:userId` | Get DM message history (cursor paginated) | Authenticated |
| `GET` | `/api/v1/messages/channel/:projectId` | Get channel message history (cursor paginated) | Project Member |
| `POST` | `/api/v1/messages` | Send message (REST fallback) | Project Member |
| `DELETE` | `/api/v1/messages/:id` | Soft delete message | Sender / Project Admin |

### 3.4 File Storage (`/api/v1/files`)

| Method | Endpoint | Description | Auth / Permission |
|---|---|---|---|
| `POST` | `/api/v1/files/upload` | Upload file to Cloudinary & create FileRef | Authenticated |
| `GET` | `/api/v1/files/:id` | Get file metadata & signed URL | Project Member |
| `DELETE` | `/api/v1/files/:id` | Delete file reference and Cloudinary asset | Uploader / Admin |

### 3.5 System & Webhooks

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
| **Phase 2** | Architecture Simplification (Project-Centric Model) | Completed | 100% |
| **Phase 3** | Projects & Tasks | Completed | 100% |
| **Phase 4** | Real-Time Messaging | PENDING | 0% |
| **Phase 5** | Roles, Permissions & Notifications | PENDING | 0% |
| **Phase 6** | People & Directory | PENDING | 0% |
| **Phase 7** | Landing Page | PENDING | 0% |
| **Phase 8** | Polish, Testing & Deployment | PENDING | 0% |
