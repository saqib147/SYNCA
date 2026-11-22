# Synca System Architecture & Engineering Specifications

> **Platform Reference**: High-performance, production-grade architecture designed for correctness, security, and real-time collaboration.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
│                                                                 │
│   Next.js 14 (App Router)           Vercel Edge Network        │
│   ┌──────────────────────┐          ┌──────────────────────┐   │
│   │  React Components    │          │  Static Assets / CDN │   │
│   │  TanStack Query      │          │  Image Optimization  │   │
│   │  Socket.io Client    │          │  Edge Middleware      │   │
│   │  Zustand (UI state)  │          └──────────────────────┘   │
│   └──────────────────────┘                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │  HTTPS / WSS
┌────────────────▼────────────────────────────────────────────────┐
│                        API TIER  (Render)                       │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              Express.js API Server                       │  │
│   │                                                          │  │
│   │  ┌─────────────┐    ┌──────────────────────────────────┐ │  │
│   │  │  REST API   │    │       Socket.io Server           │ │  │
│   │  │  /api/v1/   │    │  (mounted on same HTTP server)   │ │  │
│   │  └──────┬──────┘    └──────────────┬───────────────────┘ │  │
│   │         │                          │                      │  │
│   │  Middleware Chain:         Redis Adapter (pub/sub)        │  │
│   │  Clerk Auth → RBAC →              │                      │  │
│   │  Validation → Rate Limit          │                      │  │
│   └──────────┬───────────────────────┬┘                      │  │
└──────────────┼───────────────────────┼───────────────────────┘  │
               │                       │
┌──────────────▼───────┐   ┌───────────▼───────────────────────┐
│   DATA TIER          │   │   CACHE / PUBSUB TIER             │
│                      │   │                                    │
│   MongoDB Atlas      │   │   Upstash Redis                   │
│   ┌───────────────┐  │   │   ┌──────────────────────────┐   │
│   │  Primary DB   │  │   │   │  Query Cache             │   │
│   │  Atlas Search │  │   │   │  Socket.io Adapter       │   │
│   │  Auto-Backups │  │   │   │  Rate Limit Counters     │   │
│   │  Indexes      │  │   │   │  Presence State          │   │
│   └───────────────┘  │   │   └──────────────────────────┘   │
└──────────────────────┘   └───────────────────────────────────┘
```

---

## 2. Architecture Decision Records (ADRs)

### ADR-001: Monorepo with Turborepo
- **Decision**: Single Git repository housing frontend (`apps/web`), backend (`apps/api`), and shared workspace packages (`packages/types`, `packages/zod-schemas`, `packages/config`).
- **Rationale**: Sharing TypeScript types and Zod schemas across frontend and backend eliminates contract mismatch bugs. Turborepo handles task orchestration and caching for efficient local dev and CI builds.

### ADR-002: Standalone Express Server over Serverless Next.js API Routes
- **Decision**: Standalone Express.js server hosted on Render rather than Next.js API routes on Vercel.
- **Rationale**: Socket.io requires persistent WebSocket connections. Serverless platforms cannot maintain long-lived WebSocket connections natively. A dedicated server allows full control over real-time events and middleware logic.

### ADR-003: MongoDB Atlas for Data Store
- **Decision**: MongoDB Atlas as primary data store via Mongoose.
- **Rationale**: Project entities (tasks, milestones, rich text content, nested members) feature flexible nested schemas that map cleanly to BSON documents. Mongoose schemas combined with Zod validation ensure strict application-level validation.

### ADR-004: Upstash Redis for Caching and Multi-Instance WebSockets
- **Decision**: Upstash Redis for caching, rate limiting, and Socket.io multi-instance scaling via `@socket.io/redis-adapter`.
- **Rationale**: Upstash provides a serverless Redis instance with zero connection management overhead, allowing seamless horizontal scaling of WebSockets across multiple backend processes.

### ADR-005: Clerk Identity Provider
- **Decision**: Clerk for user authentication and session management.
- **Rationale**: Out-of-the-box support for email/password, OAuth providers, multi-factor auth, session token verification, and automated webhooks (`user.created`, `user.deleted`).

### ADR-006: TanStack Query (v5) for Client Server State
- **Decision**: TanStack Query for all API data fetching, caching, and optimistic updates.
- **Rationale**: Replaces error-prone manual `useEffect` fetching. Provides built-in stale-while-revalidate, automatic refetching, cursor pagination, and instant cache mutation for drag-and-drop Kanban updates.

### ADR-007: Layered Backend Architecture
- **Decision**: Strict separation of concerns: `Routes` → `Controllers` → `Services` → `Repositories` → `Models`, plus scheduled background jobs (`apps/api/src/jobs/`).
- **Rationale**: Keeps controllers thin, decouples HTTP logic from business logic, and enables independent unit testing of services without mocking Express `req`/`res`.

### ADR-008: Decoupled Board Columns & Task Status
- **Decision**: Store custom ordered board columns on `Project.columns` (empty by default; auto-creating `"Default Column"` on first task) and store card placement on `Task.column` separately from workflow `Task.status` (`To Do` | `In Progress` | `Done`).
- **Rationale**: Allows teams to organize Kanban boards and List View tables by workflow stage, discipline, or sprint bucket (`Design`, `Backend`, `QA`) without forcibly mutating a task's completion status when dragging cards between columns.

### ADR-009: Ephemeral 24-Hour File Transfers (Cloudinary + Background Sweeper)
- **Decision**: Accept all file types up to 25 MB via Multer memory storage → Cloudinary (`image` for safe raster images, `raw` for all other file types), stamp `FileRef.expiresAt = uploadedAt + 24h`, and run `file-cleanup.job.ts` every 15 minutes to destroy expired assets on Cloudinary and soft-delete their `FileRef` records.
- **Rationale**: Keeps storage footprint predictable, prevents Cloudinary's PDF-as-image `403` restriction, and ensures expired files cleanly degrade to non-clickable placeholders (`410 FILE_EXPIRED`) across chat feeds and Profile Drawers.

### ADR-010: Viewport-Locked Desktop App Shell
- **Decision**: Lock the authenticated shell (`apps/web/src/app/(app)/layout.tsx`) to `h-screen overflow-hidden` with `Sidebar` at `h-full` and internal scrolling inside each page's main card/container (`flex-1 min-h-0 overflow-y-auto`).
- **Rationale**: Eliminates double scrollbars and clipped bottom card borders, delivering a crisp desktop-app feel across Dashboard, All Projects, Project Detail tabs, Direct Messages, and Settings.

---

## 3. Backend Layering Specification

```typescript
// Layer 1: Route & Middleware Guard
router.patch(
  '/:taskId',
  requireAuth,                     // Verifies Clerk JWT
  requirePermission('task:edit'),  // Verifies RBAC permission
  validate(updateTaskSchema),      // Validates request body with Zod
  taskController.updateTask        // Hands off to Controller
);

// Layer 2: Controller (Thin HTTP parser)
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.updateTask(req.params.taskId, req.body, req.auth.userId);
    res.json(ApiResponse.success(task));
  } catch (err) {
    next(err);
  }
};

// Layer 3: Service (Pure Business Logic)
export const updateTask = async (taskId: string, data: UpdateTaskInput, actorId: string) => {
  const task = await taskRepository.findById(taskId);
  if (!task) throw new NotFoundError('Task not found');
  
  const updated = await taskRepository.update(taskId, data);
  if (data.assignees) {
    await notificationService.notifyTaskAssignment(updated, actorId);
  }
  return updated;
};

// Layer 4: Repository (Database Access)
export const update = async (taskId: string, data: UpdateTaskInput) => {
  return Task.findByIdAndUpdate(taskId, { $set: data }, { new: true });
};
```

---

## 4. Frontend Architecture & State Management

| State Category | Responsible Tool | Example Use Case |
|---|---|---|
| **Server State & Caches** | Custom React Hooks (`useProjects`, `useTasks`, `useTeammates`) with user-scoped SWR-style caches | Instant route switching, optimistic DM sidebar sync (`upsertDmPeerLocally`), drag-and-drop column/task updates |
| **Real-time Updates** | `SocketContext` + `ChatNotificationContext` (Socket.io Client) | Instant message insertion, typing indicators, online presence, DM deletion (`dm:deleted`), unread counts & toast notifications |
| **Theme & Appearance** | `ThemeContext` + Zero-FOUC inline script | `light` / `dark` / `system` theme persisted in `localStorage` (`synca_theme`) |
| **Local Component State** | React `useState` | Modal open states, inline editing (Brief/Goals/Milestones/Column rename), formatting toolbar, search filters |
| **URL State** | Next.js `useSearchParams` | Active DM (`?dm=`), active project tab (`?tab=conversation`), invite code (`/projects/join?code=`) |

---

## 5. Project-Centric Domain Model

```
User (Clerk)
 └── ProjectMembership (Admin | Moderator | Member)
      └── Project
           ├── Tasks (+ personal tasks with projectId: null)
           ├── Milestones / Goals
           ├── Channel (#general, channelId = projectId)
           └── FileRefs

DM (channelType: 'dm', channelId = sorted userId pair)
 └── Messages between two users (no project required)
```

**Deprecated**: Workspace / Room collections and `RoomWide` privacy. Active contracts live in `CONTEXT.md` and `/docs/`.
