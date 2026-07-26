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
- **Rationale**: Workspace entities (tasks, milestones, rich text content, custom roles) feature flexible nested schemas that map cleanly to BSON documents. Mongoose schemas combined with Zod validation ensure strict application-level validation.

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
- **Decision**: Strict separation of concerns: `Routes` → `Controllers` → `Services` → `Repositories` → `Models`.
- **Rationale**: Keeps controllers thin, decouples HTTP logic from business logic, and enables independent unit testing of services without mocking Express `req`/`res`.

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
| **Server State** | TanStack Query v5 | Projects list, Task cards, Message history |
| **Real-time Updates** | Socket.io → Query Cache | Instant message insertion, task moves |
| **Global UI State** | Zustand | Active modal state, sidebar collapsed toggle |
| **Local Component State** | React `useState` | Hover state, dropdown open, inline inputs |
| **URL State** | Next.js `useSearchParams` | Active filters, Kanban column view tab |
