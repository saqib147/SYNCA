# Synca — System Design & Engineering Plan

> Production-grade architecture reference. Every decision here prioritizes correctness, security, and maintainability over speed-of-prototyping. Read this before writing any code.

---

## Table of Contents

1. [Architecture Decisions](#1-architecture-decisions)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Repository & Monorepo Setup](#3-repository--monorepo-setup)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [API Design Standards](#6-api-design-standards)
7. [Real-Time Architecture](#7-real-time-architecture)
8. [Database Architecture](#8-database-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [File Storage Pipeline](#10-file-storage-pipeline)
11. [Caching Strategy](#11-caching-strategy)
12. [Security](#12-security)
13. [Error Handling & Logging](#13-error-handling--logging)
14. [Testing Strategy](#14-testing-strategy)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Monitoring & Observability](#16-monitoring--observability)
17. [Performance Optimization](#17-performance-optimization)
18. [Deployment Architecture](#18-deployment-architecture)
19. [Scalability Roadmap](#19-scalability-roadmap)
20. [Engineering Checklist](#20-engineering-checklist)

---

## 1. Architecture Decisions

These are the key decisions made upfront with explicit reasoning. Document your own ADRs (Architecture Decision Records) as the project grows.

### ADR-001: Monorepo with Turborepo
**Decision:** Single Git repository containing frontend (`apps/web`), backend (`apps/api`), and shared code (`packages/`).
**Why:** Shared TypeScript types between client and server eliminate an entire class of contract bugs. Single PR reviews changes across the stack. Turborepo handles caching and parallel builds so there is no performance cost.
**Alternative rejected:** Separate repos — too much friction keeping types in sync, impossible to make atomic cross-stack changes.

### ADR-002: Express over Next.js API Routes for the Backend
**Decision:** Standalone Express server (`apps/api`) on Render, not Next.js API routes.
**Why:** Socket.io requires a persistent Node.js server with WebSocket support — Next.js serverless functions cannot hold a WebSocket connection. Render supports persistent servers; Vercel does not (except with paid add-ons). Separation also makes backend independently scalable.

### ADR-003: MongoDB for Primary Data Store
**Decision:** MongoDB Atlas as the primary database.
**Why:** Projects, tasks, and messages have varying nested shapes (milestones array, subtasks array, rich-text content, custom permission maps) that map naturally to documents. Atlas provides managed backups, full-text search (Atlas Search), and global clusters without self-hosting.
**Trade-off:** We enforce schema strictly via Mongoose with Zod validation at the service layer — loose schema does not mean no schema.

### ADR-004: Redis (Upstash) for Caching and Socket.io Scaling
**Decision:** Upstash Redis for caching hot data, Socket.io Redis Adapter, and rate-limit counters.
**Why:** Upstash is serverless Redis with a free tier, HTTP-based client (works behind any firewall), and zero connection management. The Socket.io Redis Adapter allows multiple API server instances to broadcast events to all connected clients — critical for horizontal scaling.

### ADR-005: Clerk for Authentication
**Decision:** Clerk as the identity provider.
**Why:** Handles email/password, OAuth, session tokens, and webhook events (user.created, user.deleted) out of the box. Eliminates storing passwords, managing refresh tokens, or building email verification. The `@clerk/nextjs` and `@clerk/express` SDKs give verified `userId` on every request with one middleware line.
**Integration point:** On `user.created` webhook → create a User document in MongoDB mirroring the Clerk userId.

### ADR-006: React Query (TanStack Query) for Data Fetching
**Decision:** TanStack Query v5 for all server state on the frontend.
**Why:** Automatic background refetching, stale-while-revalidate, cache invalidation by query key, optimistic updates, and infinite scroll (cursor-based pagination) with one hook. Replaces manual `useEffect` + `useState` fetch patterns that cause race conditions and stale UI.

### ADR-007: Layered Backend Architecture
**Decision:** Routes → Controllers → Services → Repositories → Models (not fat controllers).
**Why:** Business logic in services means it can be tested without HTTP. Repositories abstract database calls so you can swap or mock the DB layer. Controllers are thin — they only parse the request and call the service.

---

## 2. System Architecture Overview

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
               │
┌──────────────▼───────────────────────────────────────────────┐
│   EXTERNAL SERVICES                                          │
│   Clerk (Auth) · Cloudinary (Files) · Sentry (Errors)       │
└──────────────────────────────────────────────────────────────┘
```

### Request Lifecycle (REST)
```
Browser → Vercel Edge (Next.js) → fetch('/api/v1/...') → Render (Express)
       → [Clerk Auth Middleware]   verify JWT, attach userId
       → [RBAC Middleware]         check role + permission for route
       → [Zod Validation]          validate body/params/query
       → [Rate Limit]              check Redis counter
       → [Controller]              parse request, call service
       → [Service]                 business logic
       → [Repository]              DB query via Mongoose
       → [Response]                standardized JSON shape
       → Browser (TanStack Query caches result)
```

### Request Lifecycle (WebSocket)
```
Browser (Socket.io client) → WSS → Render (Socket.io server)
       → [Socket Auth Middleware]  verify Clerk token on handshake
       → [Join Rooms]              socket.join(roomId), socket.join(userId)
       → [Event Handler]           validate payload, call service
       → [Broadcast]               io.to(roomId).emit(event, data)
       → [Redis Adapter]           fan-out to all server instances
       → All subscribed clients
```

---

## 3. Repository & Monorepo Setup

### Structure
```
synca/
├── apps/
│   ├── web/                  ← Next.js 14 (TypeScript)
│   └── api/                  ← Express + Socket.io (TypeScript)
├── packages/
│   ├── types/                ← Shared TypeScript interfaces
│   │   └── src/
│   │       ├── models.ts     Room, Project, Task, Message, User
│   │       ├── api.ts        Request/response shapes
│   │       ├── socket.ts     Socket event payloads
│   │       └── permissions.ts Role and permission enums
│   ├── zod-schemas/          ← Shared Zod schemas (used on both sides)
│   │   └── src/
│   │       ├── project.ts
│   │       ├── task.ts
│   │       └── message.ts
│   └── config/               ← Shared constants (pagination limits, etc.)
├── turbo.json
├── package.json              ← Workspace root
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

### Turborepo Pipeline (`turbo.json`)
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Key Rule: The `packages/types` package is the contract between frontend and backend.
Never use `any`. Every API request body, response, and socket payload must have a type defined here and imported on both sides.

---

## 4. Frontend Architecture

### 4.1 Folder Structure (Feature-Based)

```
apps/web/src/
├── app/                          ← Next.js App Router
│   ├── (marketing)/              ← Route group: no auth required
│   │   └── page.tsx              ← Landing page
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   └── (app)/                    ← Route group: auth required
│       ├── layout.tsx            ← Auth guard + sidebar + socket provider
│       ├── dashboard/page.tsx
│       ├── projects/
│       │   ├── page.tsx          ← Portfolio
│       │   └── [id]/
│       │       ├── layout.tsx    ← Project context provider
│       │       ├── page.tsx      ← Overview (redirect)
│       │       ├── overview/page.tsx
│       │       ├── board/page.tsx
│       │       ├── list/page.tsx
│       │       ├── timeline/page.tsx
│       │       └── conversation/page.tsx
│       ├── chat/[userId]/page.tsx
│       ├── todo/page.tsx
│       ├── people/
│       │   ├── page.tsx
│       │   └── [userId]/page.tsx
│       └── settings/
│           ├── page.tsx
│           ├── room/page.tsx
│           └── notifications/page.tsx
│
├── features/                     ← Feature modules (colocate logic)
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/                  ← TanStack Query hooks for this feature
│   ├── projects/
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskModal.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts    ← useQuery wrapper
│   │   │   ├── useTasks.ts
│   │   │   └── useKanban.ts      ← dnd-kit logic
│   │   └── api/
│   │       ├── projects.ts       ← Axios calls
│   │       └── tasks.ts
│   ├── chat/
│   │   ├── components/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx  ← Tiptap editor
│   │   │   └── ContactPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useMessages.ts    ← Infinite query
│   │   │   └── useTyping.ts      ← Debounced typing events
│   │   └── api/
│   ├── rooms/
│   └── notifications/
│
├── components/                   ← Truly shared, presentational-only
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── ui/                       ← Shadcn components (do not edit)
│   └── shared/
│       ├── Avatar.tsx
│       ├── StatusBadge.tsx
│       ├── PriorityBadge.tsx
│       └── EmptyState.tsx
│
├── providers/
│   ├── QueryProvider.tsx         ← TanStack Query client
│   ├── SocketProvider.tsx        ← Socket.io connection + context
│   └── RoomProvider.tsx          ← Active room context
│
├── hooks/
│   ├── usePermission.ts          ← Check current user's permissions
│   ├── useSocket.ts              ← Access socket from context
│   └── useDebounce.ts
│
├── lib/
│   ├── api.ts                    ← Axios instance with interceptors
│   ├── socket.ts                 ← Socket.io client factory
│   └── utils.ts
│
└── store/                        ← Zustand (UI state only, not server state)
    ├── useUIStore.ts             ← Sidebar open/closed, modal states
    └── usePresenceStore.ts       ← Online presence map { userId: status }
```

### 4.2 State Management Rules

| State Type | Tool | Example |
|---|---|---|
| Server state | TanStack Query | Project list, task details, messages |
| Real-time server state | Socket.io → TanStack Query cache update | New messages, task moves |
| Global UI state | Zustand | Sidebar open, active modal, notification drawer |
| Local component state | `useState` | Form inputs, hover states, toggles |
| URL state | `useSearchParams` | Active tab, filters, search query |

**Never** store server data in Zustand. TanStack Query is the cache for everything that comes from the API.

### 4.3 TanStack Query Setup

```typescript
// providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes before refetch
      gcTime: 1000 * 60 * 10,          // 10 minutes in cache
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});
```

### 4.4 Axios Instance with Interceptors

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  timeout: 15000,
});

// Attach Clerk token on every request
api.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.Clerk?.signOut();
    }
    return Promise.reject(error.response?.data ?? error);
  }
);
```

### 4.5 Socket Provider Pattern

```typescript
// providers/SocketProvider.tsx
'use client';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let s: Socket;

    (async () => {
      const token = await getToken();
      s = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
        auth: { token },
        transports: ['websocket'],  // skip long-polling
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      s.on('connect_error', (err) => {
        console.error('[Socket] connection error:', err.message);
      });

      setSocket(s);
    })();

    return () => { s?.disconnect(); };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

### 4.6 Optimistic Updates Pattern (for Kanban drag-drop)

```typescript
// features/projects/hooks/useKanban.ts
const moveTask = useMutation({
  mutationFn: ({ taskId, newStatus }) =>
    api.patch(`/tasks/${taskId}`, { status: newStatus }),

  // 1. Snapshot current cache
  onMutate: async ({ taskId, newStatus }) => {
    await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
    const previous = queryClient.getQueryData(['tasks', projectId]);

    // 2. Apply optimistic update immediately
    queryClient.setQueryData(['tasks', projectId], (old: Task[]) =>
      old.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );

    return { previous };
  },

  // 3. Rollback on error
  onError: (_, __, context) => {
    queryClient.setQueryData(['tasks', projectId], context?.previous);
  },

  // 4. Sync with server
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  },
});
```

### 4.7 Permission-Aware Component Pattern

```typescript
// hooks/usePermission.ts
export function usePermission(permission: Permission): boolean {
  const { membership } = useRoomContext();
  return hasPermission(membership.role, membership.customPermissions, permission);
}

// Usage in component
function TaskCard({ task }: { task: Task }) {
  const canEdit = usePermission('task:edit');
  const canAssign = usePermission('task:assign');

  return (
    <div>
      <p>{task.title}</p>
      {canEdit && <EditButton />}
      {canAssign && <AssigneeSelector />}
    </div>
  );
}
```

---

## 5. Backend Architecture

### 5.1 Folder Structure

```
apps/api/src/
├── index.ts                  ← Entry: create Express app, attach Socket.io, listen
├── app.ts                    ← Express app factory (testable without listening)
├── socket.ts                 ← Socket.io server setup + Redis adapter
│
├── routes/
│   └── v1/
│       ├── index.ts          ← Mount all routers at /api/v1
│       ├── rooms.router.ts
│       ├── projects.router.ts
│       ├── tasks.router.ts
│       ├── messages.router.ts
│       ├── files.router.ts
│       ├── notifications.router.ts
│       └── users.router.ts
│
├── controllers/              ← Thin: parse req, call service, send res
│   ├── rooms.controller.ts
│   ├── projects.controller.ts
│   ├── tasks.controller.ts
│   └── messages.controller.ts
│
├── services/                 ← Business logic (no HTTP knowledge)
│   ├── rooms.service.ts
│   ├── projects.service.ts
│   ├── tasks.service.ts
│   ├── messages.service.ts
│   ├── notifications.service.ts
│   └── files.service.ts
│
├── repositories/             ← Database access (no business logic)
│   ├── rooms.repository.ts
│   ├── projects.repository.ts
│   ├── tasks.repository.ts
│   └── messages.repository.ts
│
├── models/                   ← Mongoose schemas
│   ├── Room.model.ts
│   ├── Project.model.ts
│   ├── Task.model.ts
│   ├── Message.model.ts
│   ├── User.model.ts
│   └── Notification.model.ts
│
├── middleware/
│   ├── auth.middleware.ts        ← Clerk JWT verification
│   ├── rbac.middleware.ts        ← Permission guard factory
│   ├── validate.middleware.ts    ← Zod schema validator
│   ├── rateLimiter.middleware.ts ← Redis-backed rate limiting
│   ├── errorHandler.middleware.ts
│   └── requestLogger.middleware.ts
│
├── socket/
│   ├── handlers/
│   │   ├── message.handler.ts
│   │   ├── presence.handler.ts
│   │   └── task.handler.ts
│   └── middleware/
│       └── socketAuth.middleware.ts
│
├── lib/
│   ├── db.ts                 ← Mongoose connection
│   ├── redis.ts              ← Upstash Redis client
│   ├── cloudinary.ts
│   └── logger.ts             ← Pino structured logger
│
└── config/
    └── index.ts              ← Validated env vars (fail fast on startup)
```

### 5.2 Layered Architecture — Concrete Example

```typescript
// routes/v1/tasks.router.ts
router.patch(
  '/:taskId',
  requireAuth,                              // verify Clerk token
  requirePermission('task:edit'),           // check RBAC
  validate(updateTaskSchema),               // Zod validation
  taskController.updateTask                 // thin controller
);

// controllers/tasks.controller.ts
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.updateTask(
      req.params.taskId,
      req.body,
      req.auth.userId,   // Clerk userId attached by auth middleware
    );
    res.json(ApiResponse.success(task));
  } catch (err) {
    next(err);  // passes to global error handler
  }
};

// services/tasks.service.ts
export const updateTask = async (
  taskId: string,
  data: UpdateTaskInput,
  actorId: string,
): Promise<Task> => {
  const task = await taskRepository.findById(taskId);
  if (!task) throw new NotFoundError('Task not found');

  // Business rule: can only reassign if you have task:assign permission
  // (permission already checked at route level, but belt-and-suspenders)

  const updated = await taskRepository.update(taskId, data);

  // Side effect: notify assignees
  if (data.assignees) {
    await notificationService.notifyTaskAssignment(updated, actorId);
  }

  return updated;
};

// repositories/tasks.repository.ts
export const update = async (taskId: string, data: UpdateTaskInput) => {
  return Task.findByIdAndUpdate(taskId, { $set: data }, { new: true, runValidators: true });
};
```

### 5.3 Config Validation (Fail Fast)

```typescript
// config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().transform(Number),
  MONGODB_URI: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CLIENT_URL: z.string().url(),
});

// Throws on startup if any env var is missing — never silently undefined
export const config = envSchema.parse(process.env);
```

### 5.4 Graceful Shutdown

```typescript
// index.ts
const server = app.listen(config.PORT, () => {
  logger.info(`API running on port ${config.PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Graceful shutdown started.`);

  server.close(async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });

  // Force exit after 10s if server doesn't close cleanly
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 6. API Design Standards

### 6.1 Versioning
All routes are prefixed `/api/v1/`. When breaking changes are needed, `/api/v2/` is created alongside — never modify an existing version.

### 6.2 Standard Response Shape

Every API response — success or error — follows the same envelope. Frontend code can always rely on this shape.

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {                  // optional, for paginated responses
    "total": 100,
    "limit": 20,
    "nextCursor": "abc123"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "The requested task does not exist.",
    "details": [             // optional: Zod field errors
      { "field": "dueDate", "message": "Invalid date format" }
    ]
  }
}
```

```typescript
// lib/ApiResponse.ts
export class ApiResponse {
  static success<T>(data: T, meta?: PaginationMeta) {
    return { success: true, data, ...(meta && { meta }) };
  }

  static error(code: string, message: string, details?: FieldError[]) {
    return { success: false, error: { code, message, details } };
  }
}
```

### 6.3 Pagination Strategy

| Use Case | Strategy |
|---|---|
| Messages (infinite scroll) | Cursor-based (by `_id` or `createdAt`) |
| Projects / Tasks (list with filters) | Offset-based (page + limit) |
| Notifications | Cursor-based |

```
# Cursor-based (messages)
GET /api/v1/messages/dm/:userId?limit=30&before=<messageId>
→ Returns 30 messages older than <messageId>
→ Client appends to top, fetch more on scroll-to-top

# Offset-based (projects)
GET /api/v1/projects?page=1&limit=20&status=AtRisk&priority=High
```

### 6.4 Rate Limiting

Implemented per-route with Redis counters. Limits are per `userId` (authenticated) or `IP` (public routes).

| Route | Limit |
|---|---|
| `POST /messages` | 30 req / 10 seconds |
| `POST /files/upload` | 10 req / minute |
| `POST /rooms` | 5 req / hour |
| `GET *` (general) | 200 req / minute |
| Public auth routes | 10 req / 15 minutes (per IP) |

```typescript
// middleware/rateLimiter.middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const createRateLimiter = (requests: number, window: string) => {
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.auth?.userId ?? req.ip;
    const { success, reset } = await limiter.limit(identifier);

    if (!success) {
      res.set('X-RateLimit-Reset', String(reset));
      return res.status(429).json(
        ApiResponse.error('RATE_LIMITED', 'Too many requests. Please slow down.')
      );
    }
    next();
  };
};
```

### 6.5 Zod Validation Middleware

```typescript
// middleware/validate.middleware.ts
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return res.status(400).json(
        ApiResponse.error(
          'VALIDATION_ERROR',
          'Request validation failed.',
          result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        )
      );
    }

    req.validated = result.data;
    next();
  };
```

---

## 7. Real-Time Architecture

### 7.1 Socket.io Server Setup

```typescript
// socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: config.CLIENT_URL, methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for multi-instance pub/sub
  const pubClient = createClient({ url: config.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware on every socket connection
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { userId } = socket.data;

    // Join personal room for targeted events (notifications, DMs)
    socket.join(`user:${userId}`);

    // Register event handlers
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerTaskHandlers(io, socket);

    socket.on('disconnect', () => {
      presenceService.setOffline(userId);
      io.emit('presence:update', { userId, status: 'offline', lastSeen: new Date() });
    });
  });

  return io;
};
```

### 7.2 Socket Room Strategy

| Socket.io Room | Who joins | Used for |
|---|---|---|
| `user:{userId}` | That user's connections | DM delivery, personal notifications |
| `room:{roomId}` | All members of a workspace | Room-wide presence, announcements |
| `project:{projectId}` | Project members | Channel messages, task updates |
| `dm:{userA_userB}` | The two participants (sorted) | DM messages (no broadcast leak) |

```typescript
// When user opens a project
socket.on('project:join', async ({ projectId }) => {
  const member = await projectRepo.findMember(projectId, socket.data.userId);
  if (!member) return socket.emit('error', { code: 'FORBIDDEN' });

  socket.join(`project:${projectId}`);
});
```

### 7.3 Full Event Catalog

```typescript
// packages/types/src/socket.ts

// Client → Server
interface ClientEvents {
  'project:join':        { projectId: string }
  'project:leave':       { projectId: string }
  'message:send':        { channelType: 'dm' | 'channel'; channelId: string; content: RichTextContent; attachments?: string[] }
  'message:react':       { messageId: string; emoji: string }
  'message:delete':      { messageId: string }
  'typing:start':        { channelType: 'dm' | 'channel'; channelId: string }
  'typing:stop':         { channelType: 'dm' | 'channel'; channelId: string }
  'task:move':           { taskId: string; newStatus: string; newIndex: number }
}

// Server → Client
interface ServerEvents {
  'message:new':         Message
  'message:deleted':     { messageId: string; channelId: string }
  'message:reaction':    { messageId: string; reactions: Reaction[] }
  'typing:update':       { channelId: string; typingUsers: { userId: string; name: string }[] }
  'presence:update':     { userId: string; status: 'online' | 'offline'; lastSeen: Date }
  'task:updated':        { task: Task; projectId: string }
  'notification:new':    Notification
  'error':               { code: string; message: string }
}
```

### 7.4 Typing Indicator — Debounced, Timeout-Safe

```typescript
// Server handler
const typingUsers = new Map<string, NodeJS.Timeout>();

socket.on('typing:start', ({ channelId }) => {
  const key = `${channelId}:${socket.data.userId}`;

  // Clear existing timeout
  if (typingUsers.has(key)) clearTimeout(typingUsers.get(key));

  // Broadcast typing state
  socket.to(channelId).emit('typing:update', {
    channelId,
    userId: socket.data.userId,
    isTyping: true,
  });

  // Auto-clear after 3s of no events
  typingUsers.set(key, setTimeout(() => {
    socket.to(channelId).emit('typing:update', {
      channelId, userId: socket.data.userId, isTyping: false,
    });
    typingUsers.delete(key);
  }, 3000));
});
```

---

## 8. Database Architecture

### 8.1 Mongoose Models with Full Indexes

```typescript
// models/Message.model.ts
const MessageSchema = new Schema({
  channelType: { type: String, enum: ['dm', 'channel'], required: true },
  channelId:   { type: String, required: true },  // userId (dm) | projectId (channel)
  senderId:    { type: String, required: true },   // Clerk userId
  content:     { type: Schema.Types.Mixed, required: true }, // Tiptap JSON
  attachments: [FileRefSchema],
  reactions:   [{ emoji: String, userIds: [String] }],
  deletedAt:   { type: Date, default: null },      // soft delete
}, { timestamps: true });

// Compound index: fast channel message pagination
MessageSchema.index({ channelType: 1, channelId: 1, createdAt: -1 });
// Index for cursor-based query: before a specific message
MessageSchema.index({ channelType: 1, channelId: 1, _id: -1 });

// models/Task.model.ts
const TaskSchema = new Schema({
  projectId:  { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  title:      { type: String, required: true, maxlength: 280 },
  status:     { type: String, required: true },
  priority:   { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  assignees:  [String],  // Clerk userIds
  dueDate:    Date,
  subtasks:   [{ title: String, completed: { type: Boolean, default: false } }],
  isPrivate:  { type: Boolean, default: false },
  createdBy:  { type: String, required: true },
  deletedAt:  Date,  // soft delete
}, { timestamps: true });

// Query: "all tasks for project X, not deleted, sorted by status"
TaskSchema.index({ projectId: 1, deletedAt: 1, status: 1 });
// Query: "user's personal to-do list"
TaskSchema.index({ createdBy: 1, isPrivate: 1, deletedAt: 1 });
// Query: "tasks assigned to userId"
TaskSchema.index({ assignees: 1, deletedAt: 1 });
```

### 8.2 Soft Deletes
Never use hard deletes for user-generated content (messages, tasks, projects). Set `deletedAt` timestamp. Add a Mongoose plugin that automatically appends `{ deletedAt: null }` to every find query.

```typescript
// lib/softDelete.plugin.ts
export function softDeletePlugin(schema: Schema) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.pre(/^find/, function () {
    // @ts-ignore
    if (!this.getFilter().deletedAt) {
      // @ts-ignore
      this.where({ deletedAt: null });
    }
  });

  schema.methods.softDelete = async function () {
    this.deletedAt = new Date();
    return this.save();
  };
}
```

### 8.3 MongoDB Connection with Pooling

```typescript
// lib/db.ts
let cached: typeof mongoose | null = null;

export const connectDB = async () => {
  if (cached) return cached;

  const conn = await mongoose.connect(config.MONGODB_URI, {
    maxPoolSize: 10,         // max concurrent connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  cached = mongoose;
  logger.info(`MongoDB connected: ${conn.connection.host}`);
  return mongoose;
};
```

### 8.4 Query Patterns Reference

| Operation | Query | Index Used |
|---|---|---|
| Load DM messages (paginated) | `{ channelType: 'dm', channelId, _id: { $lt: cursor } }` | `channelType, channelId, _id` |
| Load project tasks | `{ projectId, deletedAt: null, status }` | `projectId, deletedAt, status` |
| Dashboard: user's upcoming tasks | `{ assignees: userId, deletedAt: null, dueDate: { $gte: now } }` | `assignees, deletedAt` |
| Ongoing projects in room | `{ roomId, status: { $in: [...] }, deletedAt: null }` | `roomId, status` |
| User's unread notifications | `{ userId, read: false }` | `userId, read` |

---

## 9. Authentication & Authorization

### 9.1 Clerk Integration Flow

```
User signs up via Clerk UI
        │
        ▼
Clerk fires user.created webhook → POST /api/webhooks/clerk
        │
        ▼
API creates User document in MongoDB (mirrors Clerk userId)
        │
        ▼
All subsequent API requests include Bearer token (Clerk JWT)
        │
        ▼
auth.middleware.ts verifies token with Clerk SDK
Attaches { userId, sessionId } to req.auth
```

```typescript
// middleware/auth.middleware.ts
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Clerk's official middleware — rejects invalid/expired tokens with 401
export const requireAuth = ClerkExpressRequireAuth();

// Webhook verification
export const verifyClerkWebhook = (req: Request, res: Response, next: NextFunction) => {
  const wh = new Webhook(config.CLERK_WEBHOOK_SECRET);
  try {
    const evt = wh.verify(req.rawBody, req.headers as WebhookRequiredHeaders);
    req.clerkEvent = evt;
    next();
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
  }
};
```

### 9.2 RBAC Middleware

```typescript
// middleware/rbac.middleware.ts

// Permission check factory — use at route level
export const requirePermission = (permission: Permission) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.auth;

    // Derive roomId or projectId from route params
    const roomId = req.params.roomId
      ?? req.params.projectId  // look up project's roomId
      ?? req.body.roomId;

    const membership = await RoomMember.findOne({ roomId, userId });

    if (!membership) {
      return res.status(403).json(
        ApiResponse.error('FORBIDDEN', 'You are not a member of this workspace.')
      );
    }

    if (!hasPermission(membership.role, membership.customPermissions, permission)) {
      return res.status(403).json(
        ApiResponse.error('INSUFFICIENT_PERMISSIONS', `Missing permission: ${permission}`)
      );
    }

    req.membership = membership;  // attach for use in controller/service
    next();
  };
```

```typescript
// packages/types/src/permissions.ts

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Owner:   [...ALL_PERMISSIONS],
  Admin:   [...ALL_PERMISSIONS],
  Manager: [
    'project:view', 'project:edit',
    'task:create', 'task:edit', 'task:delete', 'task:assign',
    'chat:send', 'file:upload',
  ],
  Member:  [
    'project:view',
    'task:create', 'task:edit',
    'chat:send', 'file:upload',
  ],
  Viewer:  ['project:view', 'chat:read'],
  Guest:   ['project:view'],
};

export function hasPermission(
  role: Role,
  customPermissions: Permission[],
  required: Permission
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role] ?? [];
  return [...rolePerms, ...customPermissions].includes(required);
}
```

### 9.3 Resource Ownership Checks
Beyond role checks, always verify the requesting user has access to the **specific resource**, not just the role:

```typescript
// Before returning task details, verify task belongs to a project in user's room
const task = await Task.findById(taskId).populate('projectId');
const isMember = await RoomMember.exists({ roomId: task.project.roomId, userId });
if (!isMember) throw new ForbiddenError();
```

---

## 10. File Storage Pipeline

### 10.1 Upload Flow

```
Client: user selects file
        │
        ▼
Frontend: POST /api/v1/files/upload (multipart/form-data)
        │
        ▼ (Backend validates file)
API: Multer (memory storage) → validate type + size → upload to Cloudinary
        │
        ▼
Cloudinary: returns secure_url, public_id
        │
        ▼
API: creates FileRef document in MongoDB
Returns: { id, url, fileName, fileSize, fileType }
        │
        ▼
Client: attaches FileRef id to message payload
Message saved with attachments: [fileRefId]
```

### 10.2 File Validation (backend)

```typescript
// lib/cloudinary.ts
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new ValidationError('File type not allowed'));
  }
  cb(null, true);
};

export const uploadToCloudinary = async (buffer: Buffer, options: UploadOptions) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `synca/${options.roomId}`,
        resource_type: 'auto',
        // Transform images: strip EXIF metadata
        transformation: options.isImage ? [{ quality: 'auto', fetch_format: 'auto' }] : [],
      },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
};
```

### 10.3 Signed URLs for Private Files
Files scoped to a Room should not be publicly accessible by anyone with the link. Generate signed Cloudinary URLs that expire.

```typescript
export const getSignedUrl = (publicId: string, expiresInSeconds = 3600) => {
  return cloudinary.url(publicId, {
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
};
```

---

## 11. Caching Strategy

### Layer 1 — TanStack Query (Frontend)

| Query | staleTime | Notes |
|---|---|---|
| Room members list | 5 min | Changes rarely |
| Projects list | 2 min | Refetch on window focus |
| Task detail | 1 min | Background refetch |
| Messages | 0 (real-time) | Socket updates cache directly |
| User profile | 10 min | Very stable |

### Layer 2 — Redis (Backend)

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    return redis.get<T>(key);
  },

  set: async (key: string, value: unknown, ttlSeconds: number) => {
    return redis.set(key, value, { ex: ttlSeconds });
  },

  del: async (...keys: string[]) => {
    return redis.del(...keys);
  },
};

// Cache key conventions
export const CacheKey = {
  roomMembers:   (roomId: string) => `room:${roomId}:members`,
  userProfile:   (userId: string) => `user:${userId}:profile`,
  projectMeta:   (projectId: string) => `project:${projectId}:meta`,
  presence:      (userId: string) => `presence:${userId}`,
};
```

```typescript
// In service — cache-aside pattern
export const getRoomMembers = async (roomId: string) => {
  const cacheKey = CacheKey.roomMembers(roomId);

  const cached = await cache.get<RoomMember[]>(cacheKey);
  if (cached) return cached;

  const members = await roomRepository.findMembers(roomId);
  await cache.set(cacheKey, members, 300); // 5 min TTL
  return members;
};

// Invalidate on member change
export const addMember = async (...) => {
  await roomRepository.createMembership(...);
  await cache.del(CacheKey.roomMembers(roomId)); // bust cache
};
```

### Layer 3 — HTTP Cache Headers (for static assets)
Vercel handles this automatically for Next.js static files. For API responses that can be cached at CDN level (public room list, landing page data): set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

---

## 12. Security

### 12.1 Security Headers (Helmet.js)
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', '*.cloudinary.com'],
      connectSrc: ["'self'", 'wss:', '*.clerk.accounts.dev'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

### 12.2 CORS — Strict Whitelist
```typescript
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [config.CLIENT_URL];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 12.3 Input Sanitization
```typescript
import mongoSanitize from 'express-mongo-sanitize';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Prevent NoSQL injection: strips $ and . from req.body keys
app.use(mongoSanitize());

// Sanitize rich text HTML before storing (run in service layer)
const sanitizeHTML = (dirty: string) => {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window as any);
  return purify.sanitize(dirty, { ALLOWED_TAGS: ['b', 'i', 'a', 'ul', 'li', 'code', 'p'] });
};
```

### 12.4 OWASP Top 10 Mitigations

| Threat | Mitigation |
|---|---|
| Broken Access Control | RBAC middleware on every route + resource ownership check |
| Cryptographic Failures | HTTPS enforced; signed Cloudinary URLs; no secrets in client code |
| Injection | Zod validation + mongoSanitize; never concatenate user input into queries |
| Insecure Design | Auth checked at middleware level, not buried in business logic |
| Security Misconfiguration | Helmet.js; strict CORS; no stack traces in production errors |
| Vulnerable Components | `npm audit` in CI; Dependabot PRs |
| Auth Failures | Clerk handles this; rate-limit auth endpoints per IP |
| Integrity Failures | Clerk webhook signature verification; signed Cloudinary |
| Logging Failures | All requests logged with Pino; errors logged to Sentry |
| SSRF | Never fetch user-supplied URLs on the server |

---

## 13. Error Handling & Logging

### 13.1 Custom Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super('NOT_FOUND', msg, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Access denied') {
    super('FORBIDDEN', msg, 403);
  }
}

export class ValidationError extends AppError {
  constructor(msg = 'Validation failed') {
    super('VALIDATION_ERROR', msg, 400);
  }
}

export class ConflictError extends AppError {
  constructor(msg = 'Resource already exists') {
    super('CONFLICT', msg, 409);
  }
}
```

### 13.2 Global Error Handler

```typescript
// middleware/errorHandler.middleware.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Log all errors
  logger.error({
    err,
    method: req.method,
    url: req.url,
    userId: req.auth?.userId,
    requestId: req.id,
  });

  // Known operational error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      ApiResponse.error(err.code, err.message)
    );
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponse.error('VALIDATION_ERROR', 'Database validation failed')
    );
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    return res.status(409).json(
      ApiResponse.error('CONFLICT', 'This resource already exists')
    );
  }

  // Never leak stack traces in production
  const message = config.NODE_ENV === 'production'
    ? 'An unexpected error occurred.'
    : err.message;

  return res.status(500).json(ApiResponse.error('INTERNAL_ERROR', message));
};
```

### 13.3 Structured Logging with Pino

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: config.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }          // readable in dev
    : undefined,                          // JSON in production (for log aggregators)
  base: { service: 'synca-api', env: config.NODE_ENV },
  redact: ['req.headers.authorization'], // never log auth tokens
});
```

Every request gets a `requestId` (via `express-request-id`) for tracing log lines across a single request.

### 13.4 Sentry Integration

```typescript
// index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: config.SENTRY_DSN,
  environment: config.NODE_ENV,
  tracesSampleRate: 0.1,   // 10% of requests traced
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Mongo(),
  ],
});

// Sentry handlers MUST be first/last
app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler()); // before your own errorHandler
app.use(errorHandler);
```

---

## 14. Testing Strategy

### 14.1 Testing Pyramid

```
         /\
        /E2E\          Playwright: 10–15 critical user flows
       /──────\
      /Integr. \       Supertest: API route + DB integration
     /──────────\
    /  Unit Tests \    Jest/Vitest: services, utils, permission logic
   /______________\
```

### 14.2 Unit Tests (Services & Pure Logic)

```typescript
// services/__tests__/tasks.service.test.ts
import { updateTask } from '../tasks.service';
import { taskRepository } from '../../repositories/tasks.repository';

jest.mock('../../repositories/tasks.repository');

describe('TaskService.updateTask', () => {
  it('throws NotFoundError when task does not exist', async () => {
    (taskRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(updateTask('nonexistent', {}, 'user1')).rejects.toThrow('Task not found');
  });

  it('notifies new assignees on update', async () => {
    const mockTask = { id: '1', assignees: [], title: 'Test' };
    (taskRepository.findById as jest.Mock).mockResolvedValue(mockTask);
    (taskRepository.update as jest.Mock).mockResolvedValue({ ...mockTask, assignees: ['user2'] });

    const notifySpy = jest.spyOn(notificationService, 'notifyTaskAssignment');
    await updateTask('1', { assignees: ['user2'] }, 'user1');
    expect(notifySpy).toHaveBeenCalled();
  });
});
```

### 14.3 Integration Tests (API Routes)

```typescript
// routes/__tests__/tasks.test.ts
import request from 'supertest';
import { app } from '../../app';
import { connectTestDB, clearTestDB, closeTestDB } from '../../../test/db-helper';

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await closeTestDB(); });

describe('PATCH /api/v1/tasks/:taskId', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).patch('/api/v1/tasks/fake-id').send({ status: 'Done' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks task:edit permission', async () => {
    // seed a task and a viewer-role member
    const { task, viewerToken } = await seedTaskWithViewer();
    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'Done' });
    expect(res.status).toBe(403);
  });

  it('returns 200 and updated task for authorized member', async () => {
    const { task, memberToken } = await seedTaskWithMember();
    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'Done' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Done');
  });
});
```

### 14.4 E2E Tests (Playwright)

Test the 10–15 most critical user journeys. Do not test every UI state — that's what unit tests are for.

```
Critical flows to cover:
1. Sign up → create Room → invite member (via link)
2. Create project → add task → move task on Kanban
3. Send DM → receive in real time (two browser tabs)
4. Upload file in chat → download from message
5. Admin changes member role → UI updates for that user
6. Viewer cannot see "Create Task" button
7. Project channel: send message with @mention → recipient gets notification
8. Private task only visible to creator
9. Mark task complete → dashboard % updates
10. Sign out → protected routes redirect to sign-in
```

```typescript
// e2e/kanban.spec.ts
test('member can move task from To Do to In Progress', async ({ page, context }) => {
  await signIn(page, testUser);
  await page.goto(`/projects/${testProjectId}/board`);

  const card = page.getByText('Provision AWS Subnets');
  const inProgressColumn = page.getByTestId('column-in-progress');

  await card.dragTo(inProgressColumn);

  await expect(inProgressColumn).toContainText('Provision AWS Subnets');

  // Verify persisted on reload
  await page.reload();
  await expect(inProgressColumn).toContainText('Provision AWS Subnets');
});
```

### 14.5 Test Scripts (`package.json`)
```json
{
  "scripts": {
    "test": "turbo run test",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 15. CI/CD Pipeline

### 15.1 GitHub Actions — CI (`ci.yml`)

Runs on every push and pull request. A PR cannot be merged if any step fails.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: npm ci

      # Run in parallel via Turborepo
      - name: Typecheck
        run: npx turbo typecheck

      - name: Lint
        run: npx turbo lint

      - name: Unit & Integration Tests
        run: npx turbo test
        env:
          MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
          CLERK_SECRET_KEY: ${{ secrets.TEST_CLERK_SECRET_KEY }}

      - name: Build
        run: npx turbo build

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### 15.2 GitHub Actions — Deploy (`deploy.yml`)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"

  # Vercel deploys frontend automatically on push to main
  # No extra step needed — Vercel GitHub integration handles it
```

### 15.3 Branch Strategy

```
main          ← production; protected; requires PR + 1 approval + CI pass
develop       ← integration branch; all features merged here first
feature/*     ← individual feature branches (e.g. feature/kanban-dnd)
fix/*         ← bug fix branches
```

Vercel creates **Preview Deployments** for every PR automatically — each PR gets its own URL for review.

### 15.4 Pre-Commit Hooks (Husky + lint-staged)

```json
// .husky/pre-commit
npx lint-staged

// lint-staged.config.js
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

Conventional commits enforced with `commitlint`:
```
feat: add task assignment notification
fix: correct DM pagination cursor
chore: update Clerk SDK to v5
```

---

## 16. Monitoring & Observability

### 16.1 Health Check Endpoint

```typescript
// routes/health.ts
router.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'ok' : 'error';
  const redisState = await redis.ping().then(() => 'ok').catch(() => 'error');

  const status = dbState === 'ok' && redisState === 'ok' ? 200 : 503;

  res.status(status).json({
    status: status === 200 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database: dbState, cache: redisState },
    uptime: process.uptime(),
  });
});
```

Render uses this for its health check — if it returns non-200, Render restarts the service.

### 16.2 Monitoring Stack

| Tool | Purpose | Free Tier |
|---|---|---|
| **Sentry** | Error tracking + performance traces | 5k errors/month |
| **BetterStack** | Uptime monitoring + incident alerts | Yes |
| **MongoDB Atlas** | DB performance metrics, slow query log | Built-in |
| **Render** | CPU/Memory/Request metrics | Built-in dashboard |
| **Vercel Analytics** | Core Web Vitals, page load times | Free |
| **Pino (logs)** | Structured request logs | Self-hosted |

### 16.3 Key Alerts to Set Up

- API health check fails → immediate Slack/email alert
- Error rate > 1% in 5 minutes → alert
- MongoDB connection pool > 80% → alert
- Memory usage > 85% (Render) → alert
- P95 response time > 2s → alert

### 16.4 Logging What Matters

Log these events to build an audit trail:

```typescript
// In services — log important state changes
logger.info({ userId, action: 'room.member.added', roomId, targetUserId }, 'Member added to room');
logger.info({ userId, action: 'project.created', projectId }, 'Project created');
logger.warn({ userId, action: 'permission.denied', required: permission }, 'Permission denied');
logger.info({ userId, action: 'file.uploaded', fileId, size: fileRef.fileSize }, 'File uploaded');
```

---

## 17. Performance Optimization

### 17.1 Frontend

| Technique | Implementation |
|---|---|
| Code splitting | Next.js App Router does this automatically per route segment |
| Dynamic imports | `dynamic(() => import('./TaskModal'))` for heavy modals |
| Image optimization | `next/image` for all images (auto WebP, lazy, sized) |
| Skeleton loaders | Show skeleton UI while queries are in `isLoading` state |
| Infinite scroll | TanStack Query `useInfiniteQuery` for message history |
| Virtualization | `react-virtual` for lists > 100 items (member list, task list) |
| Debounce | Search inputs debounced 300ms before firing query |
| Prefetching | Hover over project card → prefetch project details |

### 17.2 Backend

| Technique | Implementation |
|---|---|
| Select projection | Never return full documents when only a few fields are needed |
| Lean queries | `.lean()` on read-only Mongoose queries (plain JS objects, ~2x faster) |
| Compound indexes | All common query patterns have a matching index (see Section 8) |
| Compression | `compression` middleware (gzip responses > 1kb) |
| Avoid N+1 | Use `.populate()` or aggregation pipelines; never query in a loop |
| Connection pool | MongoDB pool size 10; reuse connections (not one per request) |
| Pagination | Never return more than `limit` records; enforce server-side max |

### 17.3 Database Query Analyzer
Before shipping any new query, run `explain()` to verify it hits an index:

```typescript
const plan = await Task.find({ projectId, deletedAt: null }).explain('executionStats');
console.log(plan.executionStats.totalDocsExamined); // should be close to nReturned
```

---

## 18. Deployment Architecture

### 18.1 Services Map

| Service | Platform | Plan |
|---|---|---|
| Frontend (Next.js) | Vercel | Hobby → Pro on launch |
| Backend API (Express) | Render | Web Service (Starter) |
| Database | MongoDB Atlas | M0 Free → M10 Dedicated |
| Redis | Upstash | Free → Pay-per-request |
| Auth | Clerk | Free → Pro |
| Files | Cloudinary | Free → Plus |
| Error Tracking | Sentry | Free |
| Uptime Monitor | BetterStack | Free |

### 18.2 Environment Strategy

| Environment | Branch | Frontend | Backend | DB |
|---|---|---|---|---|
| `development` | `feature/*` | `localhost:3000` | `localhost:4000` | Local MongoDB |
| `preview` | PRs | Vercel Preview URL | Staging Render | Staging Atlas cluster |
| `staging` | `develop` | `staging.synca.io` | `api-staging.synca.io` | Staging Atlas |
| `production` | `main` | `synca.io` | `api.synca.io` | Production Atlas M10 |

Never share database instances between staging and production. Never use production credentials in development.

### 18.3 Render Configuration (`render.yaml`)

```yaml
services:
  - type: web
    name: synca-api
    runtime: node
    buildCommand: npm ci && npx turbo build --filter=api
    startCommand: node apps/api/dist/index.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false   # set in Render dashboard, never in repo
      - key: CLERK_SECRET_KEY
        sync: false
    autoDeploy: true
    scaling:
      minInstances: 1
      maxInstances: 3
      targetMemoryPercent: 70
```

### 18.4 Secrets Management Rules
- **Never** commit `.env` files (`.gitignore` must include all `.env*`)
- Development: `.env.local` (local only, never pushed)
- Staging/Production: secrets set directly in Vercel dashboard and Render dashboard
- Rotate secrets immediately if accidentally exposed
- No secrets in `turbo.json`, `render.yaml`, or any config file in the repo

---

## 19. Scalability Roadmap

### Current Architecture Handles (estimate)
- ~500 concurrent WebSocket connections per Render instance
- ~1000 API requests/minute
- ~50 concurrent users per workspace

### When to Scale (triggers)

| Signal | Action |
|---|---|
| Render CPU > 80% sustained | Increase Render instance count (already configured in render.yaml) |
| MongoDB P99 query time > 500ms | Upgrade Atlas tier (M0 → M10); add read replica |
| Redis latency spikes | Upgrade Upstash plan |
| Message delivery lag > 1s | Add second Socket.io server; Redis adapter already handles fan-out |
| File upload bottleneck | Cloudinary handles CDN automatically; just upgrade plan |

### Architecture Evolution Path

```
v1.0  Single Express server
      Single MongoDB cluster
      Upstash Redis
      Socket.io with Redis adapter (ready to scale horizontally)

v1.5  Add read replica in MongoDB Atlas for dashboard queries
      Add background job queue (BullMQ + Redis) for:
        - Email notifications
        - File processing (thumbnail generation)
        - Notification fan-out

v2.0  Extract real-time server to separate Render service
      (main API handles REST; socket server handles WS)
      Add Atlas Search for full-text message/task search
      CDN for static files via Cloudinary

v3.0  Consider edge functions for auth-gating (Vercel Middleware)
      Message archival to cold storage (> 6 months old)
```

---

## 20. Engineering Checklist

Use this before shipping any feature to production.

### Feature Checklist
- [ ] TypeScript — no `any` types; all props and returns typed
- [ ] Zod schema exists for every API request body in `packages/zod-schemas`
- [ ] Route has `requireAuth` middleware
- [ ] Route has `requirePermission` middleware where data access is restricted
- [ ] Route has `validate()` middleware for request body
- [ ] Controller is thin — no business logic
- [ ] Service has no HTTP knowledge (no `req`/`res`)
- [ ] Repository abstracts all DB calls
- [ ] New Mongoose model has appropriate indexes
- [ ] Soft delete used instead of hard delete for user content
- [ ] Redis cache invalidated when underlying data changes
- [ ] Rate limit applied to mutation endpoints
- [ ] Error thrown via custom `AppError` subclass
- [ ] Unit test for service layer logic
- [ ] Integration test for route (auth, permission, happy path)
- [ ] Optimistic update on frontend for interactive mutations
- [ ] Loading and empty states handled in UI
- [ ] No secrets or API keys in frontend code
- [ ] `console.log` removed before commit

### Pre-Launch Checklist
- [ ] All environment variables set in Render and Vercel dashboards
- [ ] MongoDB Atlas: IP allowlist configured, backups enabled, indexes verified
- [ ] Clerk: production instance configured (not development instance)
- [ ] Cloudinary: upload presets restricted by file type and size
- [ ] Sentry DSN configured in both frontend and backend
- [ ] BetterStack monitors hitting `/health` every 60s
- [ ] CORS origin set to production domain only
- [ ] `NODE_ENV=production` on Render
- [ ] `npm audit` — no critical vulnerabilities
- [ ] E2E test suite passes against staging URL
- [ ] Graceful shutdown tested (SIGTERM handled)
- [ ] Health check endpoint returns 200
- [ ] Rate limits tuned to production expected traffic

---

*This document is a living reference — update it when architectural decisions change. Every deviation from this design should be recorded as a new ADR explaining why.*

*Synca System Design · v1.0 · Built with Next.js · Express · MongoDB · Socket.io · Redis · Clerk · Cloudinary*
