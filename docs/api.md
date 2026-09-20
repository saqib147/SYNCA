# Synca API Specification & Real-Time Event Protocols

> **Version**: 1.0.0  
> **Base URL**: `/api/v1`  
> **Protocol**: HTTPS (REST API) & WSS (Socket.io WebSockets)  

---

## 1. Overview & General Standards

### 1.1 Authentication & Request Headers
All API requests (except `/health` and `/api/webhooks/clerk`) require a valid JWT issued by Clerk in the `Authorization` header:

```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

### 1.2 Standard API Response Envelope

All API endpoints return JSON payloads wrapped in a standard response envelope.

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "limit": 20,
    "nextCursor": "64f1a2b3c4d5e6f7a8b9c0d1"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "The requested task does not exist or has been deleted.",
    "details": [
      {
        "field": "dueDate",
        "message": "Invalid ISO 8601 date format"
      }
    ]
  }
}
```

### 1.3 Standard Error Codes Matrix

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Zod schema validation failed on body, query, or params |
| `401` | `UNAUTHORIZED` | Missing or expired Clerk session token |
| `403` | `FORBIDDEN` | User does not belong to the Room or lacks required permission |
| `404` | `NOT_FOUND` | Resource was not found or is soft-deleted |
| `409` | `CONFLICT` | Resource collision (e.g. duplicate key or existing membership) |
| `429` | `RATE_LIMITED` | Request rate limit exceeded for this endpoint |
| `500` | `INTERNAL_ERROR` | Internal server exception |

---

## 2. REST API Endpoint Specifications

### 2.1 Workspace Management (`/api/v1/workspaces`)

#### `POST /api/v1/workspaces`
- **Description**: Create a new workspace. The authenticated creator is automatically set as `ownerId` and assigned the `'owner'` role in `members`.
- **Request Body**:
  ```json
  {
    "name": "Acme Engineering",
    "slug": "acme-eng", // optional; auto-generated if omitted
    "description": "Primary workspace for engineering team", // optional
    "isPrivate": false // optional, defaults to false
  }
  ```
- **Response `201`**: Returns created `Workspace` object including auto-generated 6-character uppercase `joinCode`.

#### `GET /api/v1/workspaces`
- **Description**: List all workspaces the authenticated user is a member of, sorted by most recently updated.
- **Response `200`**: Array of `Workspace` objects.

#### `GET /api/v1/workspaces/:id`
- **Description**: Get single workspace details by MongoDB `_id` or `slug`. If `isPrivate: true`, non-members receive `403 FORBIDDEN`.
- **Response `200`**: `Workspace` object with member roster.

#### `POST /api/v1/workspaces/join`
- **Description**: Join a workspace using a 6-character alphanumeric join code.
- **Request Body**:
  ```json
  {
    "joinCode": "SQ5KBF"
  }
  ```
- **Response `200`**: `Workspace` object with updated member roster.
- **Errors**: `404 NOT_FOUND` for invalid code; `409 CONFLICT` if already a member.

#### `PATCH /api/v1/workspaces/:id`
- **Description**: Update workspace settings (name, description, isPrivate). Requires `'owner'` or `'admin'` role.
- **Request Body**:
  ```json
  {
    "name": "Acme Core Team",
    "description": "Updated team description",
    "isPrivate": true
  }
  ```
- **Response `200`**: Updated `Workspace` object.

#### `DELETE /api/v1/workspaces/:id/members/:userId`
- **Description**: Remove a member from the workspace, or allow a member to leave voluntarily (`requesterId === targetUserId`). Owners cannot be removed or leave without transferring ownership.
- **Response `200`**: Updated `Workspace` object and confirmation message.

#### `DELETE /api/v1/workspaces/:id`
- **Description**: Delete workspace. Only the workspace `ownerId` can perform this operation.
- **Response `200`**: Confirmation message and deleted workspace ID.

#### `PATCH /api/v1/rooms/:roomId/members/:userId`
- **Description**: Update a member's role or custom permission overrides.
- **Permission**: `room:manage_members`
- **Request Body**:
  ```json
  {
    "role": "Manager",
    "customPermissions": ["project:create", "task:delete"]
  }
  ```

#### `DELETE /api/v1/rooms/:roomId/members/:userId`
- **Description**: Remove member from Room.
- **Permission**: `room:manage_members`

---

### 2.2 Project Management (`/api/v1/projects`)

#### `POST /api/v1/projects`
- **Description**: Create a new project.
- **Permission**: `project:create`
- **Request Body**:
  ```json
  {
    "roomId": "64f1a2...",
    "name": "Mobile App V2",
    "description": "Redesign of mobile experience",
    "status": "ActiveSprint",
    "privacy": "RoomWide",
    "teamMembers": ["user_2abc...", "user_3xyz..."]
  }
  ```

#### `GET /api/v1/projects`
- **Query Params**: `roomId` (required), `status`, `priority`, `page`, `limit`
- **Response `200`**: List of projects with pagination metadata.

#### `GET /api/v1/projects/:id`
- **Description**: Get detailed project view including Overview brief, Goals, and Milestones.

#### `PATCH /api/v1/projects/:id`
- **Description**: Update project status, brief, goals, or settings.
- **Permission**: `project:edit`

#### `DELETE /api/v1/projects/:id`
- **Description**: Soft delete project.
- **Permission**: `project:delete`

---

### 2.3 Task Management (`/api/v1/tasks`)

#### `POST /api/v1/tasks`
- **Description**: Create task (project task or personal private task).
- **Request Body**:
  ```json
  {
    "projectId": "64f1b3...",
    "title": "Implement WebSockets in Express",
    "description": "Connect socket.io with Upstash Redis adapter",
    "status": "In Progress",
    "priority": "High",
    "assignees": ["user_2abc..."],
    "dueDate": "2026-08-15T18:00:00.000Z",
    "subtasks": [
      { "title": "Setup socket server", "completed": true },
      { "title": "Add auth middleware", "completed": false }
    ],
    "isPrivate": false
  }
  ```

#### `GET /api/v1/tasks`
- **Query Params**:
  - For Project tasks: `projectId=<id>&status=<status>`
  - For Personal tasks: `userId=<id>&private=true`

#### `PATCH /api/v1/tasks/:id`
- **Description**: Update task (drag-and-drop status update, subtasks, assignees).
- **Permission**: `task:edit`

#### `DELETE /api/v1/tasks/:id`
- **Description**: Soft delete task.
- **Permission**: `task:delete`

---

### 2.4 Messages (`/api/v1/messages`)

#### `GET /api/v1/messages/dm/:userId`
- **Query Params**: `limit=30`, `before=<messageId>` (Cursor-based pagination)
- **Description**: Fetch DM history between current user and target member.

#### `GET /api/v1/messages/channel/:projectId`
- **Query Params**: `limit=30`, `before=<messageId>` (Cursor-based pagination)
- **Description**: Fetch project channel message history.

#### `DELETE /api/v1/messages/:id`
- **Description**: Soft delete message (replaces content with soft delete indicator).

---

### 2.5 File Storage (`/api/v1/files`)

#### `POST /api/v1/files/upload`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `file` (binary, max 25 MB), `roomId` (string)
- **Response `201`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "64f1c4...",
      "fileName": "architecture.pdf",
      "fileSize": 2048576,
      "fileType": "application/pdf",
      "cloudinaryUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## 3. WebSocket Real-Time Specifications (Socket.io)

### 3.1 Connection & Authentication Handshake
Clients connect over WSS providing the Clerk JWT token in the connection handshake:

```typescript
const socket = io('wss://api.synca.io', {
  auth: { token: 'Bearer <clerk_jwt_token>' },
  transports: ['websocket'],
});
```

### 3.2 Room Joining Strategy
Upon connection, the server places the client into appropriate Socket rooms:
- `user:<userId>` — Personal notification and DM target room.
- `room:<roomId>` — Workspace wide presence broadcast.
- `project:<projectId>` — Joined dynamically when visiting a project channel/board (`project:join`).

### 3.3 Socket Event Catalog

#### Client → Server (`Emit`)
- `project:join`: `{ projectId: string }`
- `project:leave`: `{ projectId: string }`
- `message:send`: `{ channelType: 'dm' | 'channel', channelId: string, content: RichTextJSON, attachments?: string[] }`
- `message:react`: `{ messageId: string, emoji: string }`
- `typing:start`: `{ channelType: 'dm' | 'channel', channelId: string }`
- `typing:stop`: `{ channelType: 'dm' | 'channel', channelId: string }`
- `task:move`: `{ taskId: string, newStatus: string, newIndex: number }`

#### Server → Client (`Listen`)
- `message:new`: Full `Message` document payload.
- `message:reaction`: `{ messageId: string, reactions: [{ emoji: string, userIds: string[] }] }`
- `typing:update`: `{ channelId: string, typingUsers: [{ userId: string, name: string }] }`
- `presence:update`: `{ userId: string, status: 'online' | 'offline', lastSeen: Date }`
- `task:updated`: `{ taskId: string, changes: Partial<Task> }`
- `notification:new`: `Notification` payload.
