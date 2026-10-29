# Synca Real-Time Architecture, RBAC & Security Specification

> **Focus Area**: Multi-instance WebSocket scaling, project-scoped Role-Based Access Control (RBAC), and security hardening.  
> **Source of truth for roles**: [`docs/roles-and-permissions.md`](./roles-and-permissions.md)

---

## 1. Real-Time Architecture & Scaling

### 1.1 Socket.io + Upstash Redis Pub/Sub Adapter
To scale WebSocket servers across multiple instances on Render without sticky session locks, Socket.io relies on `@socket.io/redis-adapter` powered by Upstash Redis.

```
Client A (Server Node 1) ──(emit)──> Server Node 1 ──(publish)──> Upstash Redis Pub/Sub
                                                                       │
Client B (Server Node 2) <──(receive)── Server Node 2 <──(broadcast)──┘
```

### 1.2 Socket Authentication Handshake
Every incoming Socket connection is authenticated using Clerk JWT tokens before joining rooms:

```typescript
// socketAuth.middleware.ts
export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication token missing'));

    const decoded = await clerkClient.verifyToken(token);
    socket.data.userId = decoded.sub;
    next();
  } catch (err) {
    next(new Error('Invalid authentication token'));
  }
};
```

### 1.3 Socket Room Membership (Phase 4)
After auth, clients join Socket.io rooms that mirror collaboration boundaries:

| Socket Room Key | Who May Join | Purpose |
|---|---|---|
| `project:{projectId}` | Project members | Project channel messages, typing, task live updates |
| `dm:{sortedUserIdPair}` | The two DM participants | 1:1 message delivery |
| `user:{userId}` | The authenticated user only | Presence, notifications, unread badges |

Membership must be re-checked on `project:join` / `message:send` — never trust the client alone.

---

## 2. Role-Based Access Control (RBAC)

Synca uses a **project-scoped** three-role model. There is no Room / Workspace role layer.

| Project Role | Scope |
|---|---|
| **Admin** | Owner or promoted admin — full governance |
| **Moderator** | Team lead — planning, milestones, chat moderation |
| **Member** | Default join-code role — collaborate on tasks & channels |

### 2.1 Capability Matrix (Summary)

| Capability | Admin | Moderator | Member |
|---|:---:|:---:|:---:|
| Manage project settings / goals / milestones | ✅ | ✅ | ❌ |
| Promote / demote members / reset join code / delete project | ✅ | ❌ | ❌ |
| Create & collaborate on tasks (see task matrix) | ✅ | ✅ | ✅ |
| Send / read project channel & DMs | ✅ | ✅ | ✅ |
| Soft-delete **others'** channel messages | ✅ | ✅ | ❌ |
| Soft-delete **own** messages | ✅ | ✅ | ✅ |
| Upload files in chat / project | ✅ | ✅ | ✅ |

Full task visibility and action matrices: [`docs/roles-and-permissions.md`](./roles-and-permissions.md).

### 2.2 Evaluation Pattern (Project-Centric)

Permission checks are **inline project-membership lookups** (as used in controllers), not the legacy global `Role` enum:

```typescript
function isProjectAdminOrMod(project: Project, userId: string): boolean {
  if (project.ownerId === userId) return true;
  const member = project.members?.find((m) => m.userId === userId);
  return member?.role === 'Admin' || member?.role === 'Moderator';
}

function isProjectMember(project: Project, userId: string): boolean {
  if (project.ownerId === userId) return true;
  return (
    project.members?.some((m) => m.userId === userId) ||
    project.teamMembers?.includes(userId)
  );
}
```

> **Note**: Legacy `packages/types` `Role` / `room:*` permission constants are deprecated leftovers from the pre–Phase 2 Room model. New code must use `ProjectRole = 'Admin' | 'Moderator' | 'Member'`.

---

## 3. Messaging Security Rules (Phase 4)

| Action | Rule |
|---|---|
| Read / send **project channel** | Caller must be a project member |
| Read / send **DM** | Caller must be one of the two participants |
| React / typing | Same membership as send |
| Delete message | Sender, or project Admin/Moderator (channel only); DM delete = sender only |
| Attachments | Must pass file ownership + project/DM membership checks before signed URL |

---

## 4. Security Hardening & OWASP Mitigations

### 4.1 HTTP Security Headers (Helmet.js)
Enforce HSTS, Content Security Policy (CSP), and anti-clickjacking headers:

```typescript
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

### 4.2 Strict CORS Configuration
```typescript
app.use(cors({
  origin: [config.CLIENT_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 4.3 NoSQL Injection Protection & Input Sanitization
- `express-mongo-sanitize` strips `$` and `.` characters from user inputs to prevent MongoDB operator injection.
- DOMPurify (`jsdom`) cleans HTML rich-text payloads on the server prior to DB insertion.

### 4.4 Rate Limiting Configuration Matrix

| Target Endpoint | Rate Limit Threshold | Storage Provider |
|---|---|---|
| `POST /api/v1/messages` | 30 requests / 10 seconds | Upstash Redis |
| Socket `message:send` | 30 events / 10 seconds per user | Upstash Redis |
| `POST /api/v1/files/upload` | 10 requests / 1 minute | Upstash Redis |
| `POST /api/v1/projects` | 5 requests / 1 hour | Upstash Redis |
| `GET /api/v1/*` | 200 requests / 1 minute | Upstash Redis |
| `/api/webhooks/clerk` | Verified via Svix Signature | Svix SDK |
