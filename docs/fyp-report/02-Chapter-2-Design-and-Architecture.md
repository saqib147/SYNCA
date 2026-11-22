# Chapter 2: Design and Architecture

---

## 2.1 Architectural Style and Rationale

Synca employs a **Hybrid Client-Server, Event-Driven, Distributed Monorepo Architecture** tailored for low-latency collaborative software:

1. **Decoupled Client-Server Architecture**: The presentation tier (`apps/web`, Next.js 14 App Router) is strictly separated from the API & real-time application tier (`apps/api`, standalone Express.js + Socket.io server). Communication occurs exclusively over versioned HTTPS REST endpoints (`/api/v1/*`) and authenticated WebSocket Secure (WSS) channels.
2. **Event-Driven Real-Time Distributed Architecture**: To support concurrent messaging, typing indicators, live presence, and instant DM thread deletion across multiple horizontally scaled backend instances without sticky-session lock-in, Socket.io uses `@socket.io/redis-adapter` backed by **Upstash Redis Pub/Sub**. Any event published on Server Node A is instantaneously fanned out to connected clients on Server Node B.
3. **Layered Backend Pattern**: Within `apps/api`, HTTP transport, authorization, validation, domain logic, and persistence are separated cleanly across `Middleware` → `Routes` → `Controllers` → `Models` + scheduled `Jobs` (`file-cleanup.job.ts`).
4. **Shared-Contract Monorepo (Turborepo)**: Both applications consume three internal workspace packages — `@synca/types`, `@synca/zod-schemas`, and `@synca/config` — guaranteeing compile-time TypeScript parity and runtime Zod schema consistency between client and server.

---

## 2.2 High-Level System Architecture

```mermaid
flowchart TB
    subgraph ClientTier["Client Tier (Browser / Vercel Edge)"]
        WebApp["Next.js 14 App Router (apps/web)\nReact 18 + Tailwind CSS + @dnd-kit"]
        Hooks["State & Realtime Layer\nuseProjects / useTasks / useTeammates\nSocketContext / ChatNotificationContext / ThemeContext"]
        WebApp --> Hooks
    end

    subgraph ApiTier["Application & Real-Time Tier (Render / Node.js)"]
        Express["Express.js REST API (/api/v1)\nHelmet + CORS + Clerk Auth + Zod"]
        SocketIO["Socket.io Server\nJWT Handshake + Room Membership Guards"]
        CleanupJob["Background Sweeper\nfile-cleanup.job (Every 15 min)"]
    end

    subgraph ExternalServices["Managed Cloud Services"]
        Clerk["Clerk Auth\nJWT Verification & User Profiles"]
        Mongo["MongoDB Atlas\nProjects, Tasks, Messages, FileRefs, Users"]
        Redis["Upstash Redis\nSocket.io Pub/Sub, Presence, Typing, Rate Limits"]
        Cloudinary["Cloudinary\n25 MB Media Storage (image & raw assets)"]
    end

    Hooks -- "HTTPS REST (Bearer JWT)" --> Express
    Hooks <-- "WSS Bidirectional Events" --> SocketIO
    WebApp -- "OAuth / Session" --> Clerk

    Express --> Clerk
    Express --> Mongo
    Express --> Redis
    Express --> Cloudinary

    SocketIO --> Clerk
    SocketIO --> Mongo
    SocketIO <--> Redis

    CleanupJob --> Mongo
    CleanupJob --> Cloudinary
```
*Figure 2.1: High-Level System Architecture Diagram*

---

## 2.3 Architecture Decision Records (ADRs)

| ADR | Decision | Architectural Rationale |
|---|---|---|
| **ADR-001** | **Turborepo Monorepo** (`apps/*`, `packages/*`) | Eliminates API contract drift by sharing TypeScript interfaces (`@synca/types`), Zod validators (`@synca/zod-schemas`), and limits (`@synca/config`). |
| **ADR-002** | **Standalone Express + Socket.io Server** | Serverless Next.js API routes cannot hold long-lived persistent WebSocket connections; a dedicated Node.js server provides full real-time and background-job control. |
| **ADR-003** | **MongoDB Atlas with Mongoose** | Flexible document nesting cleanly represents project goals, milestones, task subtasks, comments, and message reactions with compound indexes for cursor pagination. |
| **ADR-004** | **Upstash Redis Adapter** | Serverless Redis enables zero-ops horizontal Socket.io scaling, ephemeral typing/presence keys with short TTLs, and distributed rate limiting. |
| **ADR-005** | **Clerk Identity Provider** | Offloads password cryptography, OAuth, MFA, session rotation, and JWT verification to a hardened identity platform. |
| **ADR-006** | **User-Scoped SWR-Style React Hooks** | Custom hooks (`useProjects`, `useTasks`, `useTeammates`) maintain instant in-memory caches per user, eliminating full-page loading flashes on route navigation and supporting optimistic updates (`upsertDmPeerLocally`). |
| **ADR-007** | **Project-Centric Domain Model** | Eliminated redundant Workspace/Room layers so Projects serve as the single boundary for tasks, `#general` channels, roles, and join codes. |
| **ADR-008** | **Decoupled Board Columns & Task Status** | `Project.columns` and `Task.column` operate independently of `Task.status`, allowing teams to drag cards across custom workflow columns without corrupting completion metrics. |
| **ADR-009** | **Ephemeral 24-Hour File Transfers** | Universal file uploads (≤25 MB) routed safely to Cloudinary (`image` for raster images, `raw` for all other files) with automated 15-minute cleanup sweeping after `expiresAt`. |
| **ADR-010** | **Viewport-Locked Desktop Shell** | Locking the root layout to `h-screen overflow-hidden` with internal card scrolling prevents double scrollbars and preserves crisp rounded card framing across all screen sizes. |

---

## 2.4 Backend Layered Architecture & Middleware Pipeline

Every incoming REST request traverses a deterministic security and validation pipeline:

1. **Security & Transport Middleware**: `helmet()` sets CSP/HSTS headers; `cors()` enforces the whitelisted `CLIENT_URL`; `express.json()` parses request payloads.
2. **Authentication Middleware (`requireAuth`)**: Extracts and verifies the Clerk Bearer JWT, populating `req.auth.userId`.
3. **Validation & Rate Limiting**: Zod schemas from `@synca/zod-schemas` reject malformed bodies with structured `400 VALIDATION_ERROR` responses; sensitive routes apply per-user rate limits.
4. **Controller & RBAC Enforcement**: Controllers fetch the target `Project` / `Task` / `Message` / `FileRef`, execute project-scoped permission guards (`isProjectMember`, `isProjectAdmin`, `isProjectAdminOrMod`), perform atomic MongoDB updates, emit real-time Socket.io notifications where applicable, and return a standardized `{ success, data }` envelope.
5. **Centralized Error Handler**: Catches domain and Mongoose errors and maps them to safe, consistent HTTP status codes (`400`, `401`, `403`, `404`, `410`, `429`, `500`) without leaking stack traces in production.

---

## 2.5 Frontend Architecture & State Management

| State Category | Implementation | Responsibility |
|---|---|---|
| **Server Data & Optimistic Cache** | `useProjects`, `useTasks`, `useTeammates` | User-scoped caches, instant tab/route switches, optimistic DM sidebar updates, and column/task mutations |
| **Real-Time Transport** | `SocketContext` (`socket.io-client`) | Manages authenticated WSS lifecycle, room subscriptions (`project:*`, `dm:*`), and live online presence map |
| **Cross-App Notifications** | `ChatNotificationContext` | Tracks per-channel/per-DM unread counters and renders floating top-right toast alerts |
| **Appearance / Theme** | `ThemeContext` + Zero-FOUC inline script | Persists `'light' \| 'dark' \| 'system'` in `localStorage` and synchronizes `.dark` class on `<html>` |
| **URL / Navigation State** | Next.js App Router (`usePathname`, `useSearchParams`) | Deep-linking into DMs (`/chats?dm=...`), project tabs (`/projects/[id]?tab=conversation`), and invite links (`/projects/join?code=...`) |

---

## 2.6 Database Design & Entity-Relationship Diagram (ERD)

Synca uses MongoDB Atlas with five active collections (`users`, `projects`, `tasks`, `messages`, `filerefs`) plus a planned `notifications` collection for Phase 5. Soft deletion (`deletedAt: Date | null`) is enforced across all user-generated entities.

```mermaid
erDiagram
    USER ||--o{ PROJECT : "owns (ownerId)"
    USER ||--o{ PROJECT_MEMBER : "enrolled in"
    PROJECT ||--|{ PROJECT_MEMBER : "has roster"
    PROJECT ||--o{ TASK : "contains"
    PROJECT ||--o{ MESSAGE : "hosts #general channel"
    PROJECT ||--o{ FILEREF : "scopes attachments"
    USER ||--o{ TASK : "creates / assigned to"
    USER ||--o{ MESSAGE : "sends"
    USER ||--o{ FILEREF : "uploads"
    MESSAGE }o--o{ FILEREF : "attaches"

    USER {
        string _id PK "Clerk userId"
        string email UK
        string name
        string avatarUrl
        date createdAt
    }

    PROJECT {
        objectId _id PK
        string ownerId FK
        string joinCode UK "6-char uppercase"
        string name
        string slug UK
        string status "OnTrack|ActiveSprint|AtRisk|Completed|Archived"
        string privacy "Public|Private"
        string[] columns "Ordered board columns"
        string[] teamMembers "Indexed Clerk IDs"
        date deletedAt
    }

    PROJECT_MEMBER {
        string userId FK
        string role "Admin|Moderator|Member"
        date joinedAt
    }

    TASK {
        objectId _id PK
        objectId projectId FK "Nullable for personal tasks"
        string createdBy FK
        string title
        string status "To Do|In Progress|Done"
        string column "Board column name"
        number order
        string priority "Low|Medium|High"
        string[] assignees
        boolean isPrivate
        date dueDate
        date deletedAt
    }

    MESSAGE {
        objectId _id PK
        string channelType "channel|dm"
        string channelId "projectId or sorted user pair"
        objectId projectId FK "Nullable for DMs"
        string senderId FK
        string plainText
        string[] attachments
        date deletedAt
        date createdAt
    }

    FILEREF {
        objectId _id PK
        string uploaderId FK
        objectId projectId FK
        string cloudinaryPublicId
        string cloudinaryUrl
        string cloudinaryResourceType "image|raw"
        string fileName
        number fileSize "Max 25 MB"
        string fileType
        date expiresAt "uploadedAt + 24h"
        date deletedAt
    }
```
*Figure 2.2: MongoDB Entity-Relationship Diagram (ERD)*

---

## 2.7 UML Class Diagram

The UML Class Diagram below models Synca's core domain entities, embedded value objects (`Goal`, `Milestone`, `Subtask`, `TaskComment`, `Reaction`), and service/controller responsibilities.

```mermaid
classDiagram
    class User {
        +string _id
        +string email
        +string name
        +string avatarUrl
        +Date createdAt
    }

    class Project {
        +ObjectId _id
        +string ownerId
        +string joinCode
        +string name
        +string slug
        +string description
        +ProjectStatus status
        +ProjectPrivacy privacy
        +string[] columns
        +string[] teamMembers
        +Date deletedAt
        +resetJoinCode() string
        +renameColumn(from, to) void
        +softDeleteCascade() void
    }

    class ProjectMember {
        +string userId
        +ProjectRole role
        +Date joinedAt
    }

    class Goal {
        +string title
        +string description
        +boolean completed
    }

    class Milestone {
        +string title
        +string description
        +MilestoneStatus status
        +number progress
        +Date date
    }

    class Task {
        +ObjectId _id
        +ObjectId projectId
        +string createdBy
        +string title
        +string description
        +TaskStatus status
        +string column
        +number order
        +TaskPriority priority
        +string[] assignees
        +boolean isPrivate
        +Date dueDate
        +Date deletedAt
        +moveToColumn(column, order) void
        +addComment(comment) void
        +unassignMember(userId) void
    }

    class Subtask {
        +string title
        +boolean completed
    }

    class TaskComment {
        +string userId
        +string userName
        +string userAvatar
        +string text
        +Date createdAt
    }

    class Message {
        +ObjectId _id
        +ChannelType channelType
        +string channelId
        +ObjectId projectId
        +string senderId
        +string senderName
        +string senderAvatar
        +string plainText
        +string[] attachments
        +Date deletedAt
        +toggleReaction(userId, emoji) void
    }

    class Reaction {
        +string emoji
        +string[] userIds
    }

    class FileRef {
        +ObjectId _id
        +string uploaderId
        +ObjectId projectId
        +string cloudinaryPublicId
        +string cloudinaryUrl
        +string cloudinaryResourceType
        +string fileName
        +number fileSize
        +string fileType
        +Date expiresAt
        +Date deletedAt
        +isExpired() boolean
    }

    Project "1" *-- "1..*" ProjectMember : embeds
    Project "1" *-- "0..*" Goal : embeds
    Project "1" *-- "0..*" Milestone : embeds
    Project "1" o-- "0..*" Task : contains
    Project "1" o-- "0..*" Message : channel feed
    Project "1" o-- "0..*" FileRef : scopes
    Task "1" *-- "0..*" Subtask : embeds
    Task "1" *-- "0..*" TaskComment : embeds
    Message "1" *-- "0..*" Reaction : embeds
    Message "0..*" --> "0..*" FileRef : references
    User "1" --> "0..*" Project : owns / joins
    User "1" --> "0..*" Task : creates / assigned
    User "1" --> "0..*" Message : authors
    User "1" --> "0..*" FileRef : uploads
```
*Figure 2.3: UML Class Diagram — Synca Core Domain Model*

---

## 2.8 UML Use Case Diagram

Synca defines three human actor roles scoped per project (`Admin`, `Moderator`, `Member`), plus an automated system actor (`File Cleanup Scheduler`) that enforces 24-hour file retention.

```mermaid
flowchart LR
    Member(["Project Member"])
    Mod(["Project Moderator"])
    Admin(["Project Admin"])
    Scheduler(["File Cleanup Job\n(15-min Cron)"])

    subgraph SyncaSystem["Synca Collaboration Platform"]
        UC1(("Authenticate via Clerk"))
        UC2(("View Dashboard & KPIs"))
        UC3(("Create / Join Project\nvia Join Code"))
        UC4(("Manage Tasks, Subtasks\n& Comments"))
        UC5(("Reorder / Rename\nBoard Columns"))
        UC6(("Send Channel & DM\nFormatted Messages"))
        UC7(("Upload & Preview\n25 MB Files"))
        UC8(("Delete Own DM\nConversation"))
        UC9(("Edit Goals, Milestones\n& Invite Members"))
        UC10(("Moderate Channel\nMessages"))
        UC11(("Manage Roles & Reset\nJoin Code"))
        UC12(("Remove Members /\nDelete Project"))
        UC13(("Sweep Expired 24h\nCloudinary Files"))
    end

    Member --> UC1
    Member --> UC2
    Member --> UC3
    Member --> UC4
    Member --> UC5
    Member --> UC6
    Member --> UC7
    Member --> UC8

    Mod -. "inherits" .-> Member
    Mod --> UC9
    Mod --> UC10

    Admin -. "inherits" .-> Mod
    Admin --> UC11
    Admin --> UC12

    Scheduler --> UC13
```
*Figure 2.4: UML Use Case Diagram — Actors and System Capabilities*

---

## 2.9 UML Activity Diagrams

### 2.9.1 Activity Diagram — Task Creation & Decoupled Kanban Column Movement

```mermaid
flowchart TD
    Start([Start: User opens Project Board]) --> Action{Action?}
    Action -- "Add Task" --> OpenModal["Open TaskModal\nEnter Title, Status, Priority, Column"]
    OpenModal --> CheckCols{Does Project have\nany columns?}
    CheckCols -- "No (columns = [])" --> AutoCreate["Backend auto-creates\n'Default Column' on Project"]
    AutoCreate --> PersistTask["Insert Task in MongoDB\nwith column='Default Column'"]
    CheckCols -- "Yes" --> PersistTask2["Insert Task in MongoDB\nwith selected column"]
    PersistTask --> UpdateUI["Update Board & List State"]
    PersistTask2 --> UpdateUI

    Action -- "Drag Task Card" --> DragCard["User drags card to target column\nvia @dnd-kit"]
    DragCard --> OptimisticMove["Optimistically update local\ncolumn & order"]
    OptimisticMove --> CallMoveAPI["PATCH /api/v1/tasks/:id/move\n{ column, order }"]
    CallMoveAPI --> VerifyAuth{Is User a\nProject Member?}
    VerifyAuth -- "No" --> RevertUI["Return 403 & Revert UI"]
    VerifyAuth -- "Yes" --> SaveMove["Update Task.column & order\n(Task.status unchanged)"]
    SaveMove --> BroadcastTask["Emit task:updated via Socket.io"]
    BroadcastTask --> End([End])
    UpdateUI --> End
    RevertUI --> End
```
*Figure 2.5: UML Activity Diagram — Task Creation & Decoupled Kanban Movement*

### 2.9.2 Activity Diagram — Ephemeral 24-Hour File Upload & Expiration Lifecycle

```mermaid
flowchart TD
    Start([User selects file in ChatInput]) --> SizeCheck{File size <= 25 MB?}
    SizeCheck -- "No" --> ShowSizeErr["Show inline error:\nFile exceeds 25 MB limit"]
    SizeCheck -- "Yes" --> UploadAPI["POST /api/v1/files/upload\n(Multipart via Multer Memory)"]
    UploadAPI --> MimeCheck{Safe raster image?\njpeg/png/gif/webp}
    MimeCheck -- "Yes" --> CloudImg["Upload to Cloudinary\nresource_type: 'image'"]
    MimeCheck -- "No (PDF/ZIP/SVG/etc.)" --> CloudRaw["Upload to Cloudinary\nresource_type: 'raw'"]
    CloudImg --> SaveRef["Save FileRef in MongoDB\nexpiresAt = now + 24h"]
    CloudRaw --> SaveRef
    SaveRef --> RenderCard["Render attachment card\nwith live 'Expires in Xh Ym' badge"]
    RenderCard --> Wait24h["24 Hours Elapse"]
    Wait24h --> Sweeper["15-min file-cleanup.job runs\nQuery: expiresAt <= now & deletedAt == null"]
    Sweeper --> DestroyCloud["cloudinary.uploader.destroy(\npublicId, resource_type)"]
    DestroyCloud --> SoftDel["Set FileRef.deletedAt = now"]
    SoftDel --> ExpiredUI["GET /api/v1/files/:id returns 410 FILE_EXPIRED\nUI renders muted non-clickable expired card"]
    ExpiredUI --> End([End])
    ShowSizeErr --> End
```
*Figure 2.6: UML Activity Diagram — Ephemeral 24-Hour File Upload & Expiration Lifecycle*

---

## 2.10 UML Sequence Diagrams

### 2.10.1 Sequence Diagram — Real-Time Messaging via Socket.io & Upstash Redis

```mermaid
sequenceDiagram
    actor Sender as Sender Browser (Next.js)
    participant API as Express / Socket.io Server
    participant Redis as Upstash Redis Pub/Sub
    participant Mongo as MongoDB Atlas
    actor Receiver as Receiver Browser (Next.js)

    Sender->>Sender: Render optimistic message ("sending...")\n& update Sidebar preview via upsertDmPeerLocally()
    Sender->>API: emit("message:send", { channelType, channelId, content, attachments })
    API->>API: Verify socket.data.userId & channel/DM membership
    API->>Mongo: Message.create({ senderId, plainText, attachments, ... })
    Mongo-->>API: Persisted Message document (_id, createdAt)
    API->>Redis: Publish "message:new" to room (project:id or dm:pair)
    Redis-->>API: Fan-out across server instances
    API-->>Sender: emit("message:new", message)
    API-->>Receiver: emit("message:new", message)
    Sender->>Sender: Replace optimistic bubble with persisted message
    Receiver->>Receiver: Append bubble & increment unread / show toast
```
*Figure 2.7: UML Sequence Diagram — Real-Time Messaging via Socket.io & Redis*

### 2.10.2 Sequence Diagram — Member Removal & Automatic Task Unassignment

```mermaid
sequenceDiagram
    actor Admin as Project Admin (Browser)
    participant API as Express Controller (project.controller.ts)
    participant Mongo as MongoDB Atlas
    participant Socket as Socket.io Server
    actor ExMember as Former Member (Browser)

    Admin->>API: DELETE /api/v1/projects/:id/members/:targetUserId
    API->>Mongo: Fetch Project & verify Admin role + Sole-Admin guard
    API->>Mongo: Pull targetUserId from project.members & project.teamMembers
    API->>Mongo: Task.updateMany({ projectId, assignees: targetUserId }, { $pull: { assignees: targetUserId } })
    Mongo-->>API: Updated Project & Unassigned Tasks count
    API->>Socket: Revoke targetUserId sockets from room "project:<id>"
    API-->>Admin: 200 OK { project }
    Admin->>Admin: Refresh Team Roster & grey out ex-member in Conversation ("Former member")
    Socket-->>ExMember: No longer receives project:<id> real-time events
```
*Figure 2.8: UML Sequence Diagram — Member Removal & Automatic Task Unassignment*

---

## 2.11 UML Package Diagram

```mermaid
flowchart TB
    subgraph Monorepo["d:/Synca-FYP (Turborepo Workspace)"]
        subgraph Apps["apps/"]
            Web["apps/web (Next.js 14)\n- app/(app)/dashboard, projects, chats, settings\n- components/layout, project, task, chat, shared\n- context/ (Socket, ChatNotification, Theme)\n- hooks/ (useProjects, useTasks, useTeammates)\n- lib/api/"]
            Api["apps/api (Express + Socket.io)\n- routes/ (project, task, message, file, user)\n- controllers/\n- models/ (Project, Task, Message, FileRef, User)\n- middleware/ (clerkAuth, errorHandler)\n- socket/ (handlers, auth)\n- jobs/ (file-cleanup.job)\n- lib/ (mongodb, redis, cloudinary)"]
        end

        subgraph Packages["packages/"]
            Types["@synca/types\nShared TypeScript Interfaces\n(Project, Task, Message, FileRef)"]
            Schemas["@synca/zod-schemas\nShared Runtime Validation\n(project, task, message schemas)"]
            Config["@synca/config\nShared Constants\n(FILE_LIMITS, PAGINATION)"]
        end
    end

    Web --> Types
    Web --> Schemas
    Web --> Config
    Api --> Types
    Api --> Schemas
    Api --> Config
```
*Figure 2.9: UML Package Diagram — Turborepo Monorepo Structure*

---

## 2.12 UML Deployment Diagram

```mermaid
flowchart TB
    subgraph UserDevice["End-User Device"]
        Browser["Modern Web Browser\n(Chrome / Edge / Firefox / Safari)"]
    end

    subgraph VercelCloud["Vercel Edge Network"]
        NextServer["Next.js 14 Production App\n(SSR + Static Assets + Clerk Middleware)"]
    end

    subgraph RenderCloud["Render Web Service (Node.js 20+)"]
        ApiServer["Express.js REST API + Socket.io Server\n+ 15-min file-cleanup.job"]
    end

    subgraph ManagedData["Managed Cloud Data & Auth Tier"]
        MongoAtlas["MongoDB Atlas\n(Replica Set Cluster)"]
        Upstash["Upstash Redis\n(Serverless TLS Pub/Sub & Cache)"]
        ClerkCloud["Clerk Auth Platform\n(JWKS + OAuth + User Directory)"]
        CloudinaryCDN["Cloudinary Cloud Storage & CDN\n(image & raw delivery)"]
    end

    Browser -- "HTTPS (443)" --> NextServer
    Browser -- "HTTPS REST / WSS (443)" --> ApiServer
    Browser -- "HTTPS Media Preview" --> CloudinaryCDN
    NextServer -- "JWT Session Validation" --> ClerkCloud
    ApiServer -- "TLS Mongoose" --> MongoAtlas
    ApiServer -- "TLS Redis" --> Upstash
    ApiServer -- "HTTPS SDK" --> ClerkCloud
    ApiServer -- "HTTPS Upload/Destroy API" --> CloudinaryCDN
```
*Figure 2.10: UML Deployment Diagram — Production Cloud Topology*
