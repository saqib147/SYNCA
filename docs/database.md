# Synca Database Architecture & Schema Specification

> **Database**: MongoDB Atlas  
> **ORM / ODM**: Mongoose with TypeScript types  
> **Cache**: Upstash Redis  

---

## 1. Data Modeling Design Principles

1. **Project-Centric Structure**: Projects are the top-level collaboration boundary. Each project contains milestones, tasks, a default channel, and a member roster. There is no Workspace / Room collection.
2. **Document Flexibility**: Projects, tasks, and messages leverage document nesting for subtasks, milestone goals, and rich text content while maintaining strict Mongoose schema definitions.
3. **Soft Delete Enforcement**: User-generated content (`Task`, `Project`, `Message`, `FileRef`) utilizes soft deletes via a `deletedAt: Date` timestamp.
4. **Compound Indexing**: Compound indexes are tailored for low-latency queries — join codes, project-filtered tasks, and cursor-paginated message history.

---

## 2. Collections & Schema Specifications

### 2.1 `User` Collection
Mirrors Clerk identity data synced via webhooks (`user.created`, `user.deleted`).

```typescript
{
  _id: String,           // Clerk userId (e.g. 'user_2abc123...')
  email: String,         // Unique, required
  name: String,          // Full name
  avatarUrl: String,     // Profile image URL
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 `Project` Collection
Top-level collaboration containers.

```typescript
{
  _id: ObjectId,
  ownerId: String,       // Clerk userId of creator/owner (always treated as Admin)
  joinCode: String,      // Unique 6-character uppercase alphanumeric code (e.g. "AB12CD")
  name: String,          // Project name (required)
  slug: String,          // Unique URL slug
  description: String,   // Project description
  status: String,        // 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived'
  privacy: String,       // 'Private' | 'Public'  (invite-only vs discoverable metadata; membership still requires joinCode)
  goals: [{
    title: String,
    description: String,
    icon: String,
    completed: Boolean
  }],
  milestones: [{
    title: String,
    description: String,
    status: String,      // 'Completed' | 'InProgress' | 'Upcoming'
    progress: Number,
    date: Date
  }],
  teamMembers: [String], // Array of Clerk userIds for fast indexed lookup
  members: [{
    userId: String,      // Clerk ID
    role: String,        // 'Admin' | 'Moderator' | 'Member'
    joinedAt: Date
  }],
  connectedFiles: [String],
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

> **Deprecated**: `RoomWide` privacy is obsolete after Workspace/Room removal. Use only `Private` | `Public`.

### 2.3 `Task` Collection
Tasks assigned within projects or personal private tasks.

```typescript
{
  _id: ObjectId,
  projectId: ObjectId | null, // Refers to Project._id (null for personal tasks)
  createdBy: String,     // Clerk userId
  title: String,         // Task title (required)
  description: String,
  status: String,        // 'To Do' | 'In Progress' | 'Done' (+ Custom)
  order: Number,         // Ordering index for Kanban drag-and-drop
  priority: String,      // 'High' | 'Medium' | 'Low'
  assignees: [String],   // Array of Clerk userIds
  dueDate: Date | null,
  subtasks: [{
    title: String,
    completed: Boolean
  }],
  comments: [{
    userId: String,
    userName: String,
    userAvatar: String,
    text: String,
    createdAt: Date
  }],
  isPrivate: Boolean,    // Default false; Admins/Mods can still see private project tasks
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.4 `Message` Collection (Phase 4)

```typescript
{
  _id: ObjectId,
  channelType: String,   // 'dm' | 'channel'
  channelId: String,     // projectId for channels; sorted "userA:userB" pair for DMs
  projectId: ObjectId | null, // Set for project channels; null for DMs
  senderId: String,      // Clerk userId
  senderName: String,    // Cached display name from Clerk
  senderAvatar: String,  // Cached avatar URL from Clerk
  content: Mixed,        // Tiptap JSON document
  plainText: String,     // Denormalized search / preview text
  attachments: [String], // FileRef ids
  reactions: [{
    emoji: String,
    userIds: [String]
  }],
  mentions: [String],    // Clerk userIds mentioned in content
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.5 `FileRef` Collection

```typescript
{
  _id: ObjectId,
  uploaderId: String,
  projectId: ObjectId | null, // Project scope when uploaded in a channel; null for DM/personal
  cloudinaryPublicId: String,
  cloudinaryUrl: String,
  fileName: String,
  fileSize: Number,
  fileType: String,
  deletedAt: Date | null,
  uploadedAt: Date
}
```

### 2.6 `Notification` Collection (Phase 5)

```typescript
{
  _id: ObjectId,
  userId: String,
  type: String,          // 'TaskAssigned' | 'Mentioned' | 'MessageReceived'
  referenceId: String,   // Task / Message id
  projectId: ObjectId | null,
  read: Boolean,
  createdAt: Date
}
```

---

## 3. Database Indexes

### `Project` Indexes
- `{ joinCode: 1 }` (unique)
- `{ slug: 1 }` (unique)
- `{ ownerId: 1 }`
- `{ 'members.userId': 1 }`
- `{ deletedAt: 1, status: 1 }`

### `Task` Indexes
- `{ projectId: 1, deletedAt: 1, status: 1, order: 1 }`
- `{ assignees: 1, deletedAt: 1 }`
- `{ createdBy: 1, isPrivate: 1, deletedAt: 1 }`

### `Message` Indexes
- `{ channelType: 1, channelId: 1, deletedAt: 1, createdAt: -1 }` (cursor pagination)
- `{ projectId: 1, deletedAt: 1, createdAt: -1 }`
- `{ senderId: 1, createdAt: -1 }`
- `{ mentions: 1, createdAt: -1 }`

### `FileRef` Indexes
- `{ projectId: 1, deletedAt: 1 }`
- `{ uploaderId: 1 }`

### `Notification` Indexes
- `{ userId: 1, read: 1, createdAt: -1 }`

---

## 4. Redis Keys (Cache / Presence / Unread)

| Key Pattern | Purpose | TTL |
|---|---|---|
| `presence:{userId}` | Online / away / lastSeen | Short (e.g. 60s heartbeat) |
| `typing:{channelType}:{channelId}` | Active typers set | Very short (3–5s) |
| `unread:{userId}:{channelId}` | Unread message count | Until cleared |
| `ratelimit:*` | API / socket rate counters | Window-based |
