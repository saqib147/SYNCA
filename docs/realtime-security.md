# Synca Real-Time Architecture, RBAC & Security Specification

> **Focus Area**: Multi-instance WebSocket scaling, granular Role-Based Access Control (RBAC), and security hardening.

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
Every incoming Socket connection is authenticated using Clerk JWT tokens before joining channels:

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

---

## 2. Role-Based Access Control (RBAC) Specification

### 2.1 Roles & Permission Matrix

| Permission | Owner | Admin | Manager | Member | Viewer | Guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `room:manage_settings` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `room:manage_members` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `project:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `project:edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `task:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `task:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `task:delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `task:assign` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `chat:send` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `chat:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `file:upload` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### 2.2 RBAC Evaluation Function

```typescript
export function hasPermission(
  role: Role,
  customPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] ?? [];
  const effectivePermissions = new Set([...rolePermissions, ...customPermissions]);
  return effectivePermissions.has(requiredPermission);
}
```

---

## 3. Security Hardening & OWASP Mitigations

### 3.1 HTTP Security Headers (Helmet.js)
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

### 3.2 Strict CORS Configuration
```typescript
app.use(cors({
  origin: [config.CLIENT_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 3.3 NoSQL Injection Protection & Input Sanitization
- `express-mongo-sanitize` strips `$` and `.` characters from user inputs to prevent MongoDB operator injection.
- DOMPurify (`jsdom`) cleans HTML rich-text payloads on the server prior to DB insertion.

### 3.4 Rate Limiting Configuration Matrix

| Target Endpoint | Rate Limit Threshold | Storage Provider |
|---|---|---|
| `POST /api/v1/messages` | 30 requests / 10 seconds | Upstash Redis |
| `POST /api/v1/files/upload` | 10 requests / 1 minute | Upstash Redis |
| `POST /api/v1/rooms` | 5 requests / 1 hour | Upstash Redis |
| `GET /api/v1/*` | 200 requests / 1 minute | Upstash Redis |
| `/api/webhooks/clerk` | Verified via Svix Signature | Svix SDK |
