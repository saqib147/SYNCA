# Synca Database Architecture & Schema Specification

> **Database**: MongoDB Atlas  
> **ORM / ODM**: Mongoose with TypeScript types  
> **Cache**: Upstash Redis  

---

## 1. Data Modeling Design Principles

1. **Document Flexibility**: Projects, tasks, and messages leverage document nesting for subtasks, milestone goals, and rich text content while maintaining strict Mongoose schema definitions.
2. **Soft Delete Enforcement**: User-generated content (`Task`, `Project`, `Message`, `FileRef`) utilizes soft deletes via a `deletedAt: Date` timestamp. Soft deleted records are excluded automatically using pre-find hooks.
3. **Compound Indexing**: Compound indexes are tailored for low-latency queries, particularly for cursor-based message pagination and project-filtered task retrieval.

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
  role: String,          // Default global role ('Member')
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 `Room` Collection
Represents workspace organizations.

```typescript
{
  _id: ObjectId,
  name: String,          // Workspace name (e.g. "Acme Corp")
  avatarUrl: String,
  description: String,
  ownerId: String,       // Refers to User._id
  inviteCode: String,    // Unique indexed string for invite links
  createdAt: Date,
  updatedAt: Date
}
```

### 2.3 `RoomMember` Collection
Maps users to rooms and defines role/permission settings per workspace.

```typescript
{
  _id: ObjectId,
  roomId: ObjectId,      // Refers to Room._id
  userId: String,        // Refers to User._id
  role: String,          // 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Viewer' | 'Guest'
  customPermissions: [String], // Granular overrides (e.g. ['project:create'])
  joinedAt: Date
}
```

### 2.4 `Project` Collection
Project portfolio items inside a workspace.

```typescript
{
  _id: ObjectId,
  roomId: ObjectId,      // Refers to Room._id
  name: String,
  description: String,   // Rich text brief
  status: String,        // 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived'
  privacy: String,       // 'Private' | 'RoomWide' | 'Public'
  goals: [{
    title: String,
    description: String,
    icon: String
  }],
  teamMembers: [String], // Array of User._id strings
  connectedFiles: [ObjectId], // Refers to FileRef._id
  deletedAt: Date,       // Soft delete timestamp
  createdAt: Date,
  updatedAt: Date
}
```

### 2.5 `Task` Collection
Kanban board cards, subtasks, and personal to-do items.

```typescript
{
  _id: ObjectId,
  projectId: ObjectId,   // Refers to Project._id (null for personal private tasks)
  createdBy: String,     // Refers to User._id
  title: String,         // Required, max 280 chars
  description: String,
  status: String,        // 'To Do' | 'In Progress' | 'Done' | custom column
  priority: String,      // 'High' | 'Medium' | 'Low'
  assignees: [String],   // Array of User._id strings
  dueDate: Date,
  subtasks: [{
    title: String,
    completed: Boolean
  }],
  isPrivate: Boolean,    // True if personal to-do task
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.6 `Milestone` Collection
Project timelines and high-level milestones.

```typescript
{
  _id: ObjectId,
  projectId: ObjectId,   // Refers to Project._id
  title: String,
  description: String,
  status: String,        // 'Completed' | 'InProgress' | 'Upcoming'
  progress: Number,      // 0 - 100
  date: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.7 `Message` Collection
1:1 Direct Messages and Project Channel conversations.

```typescript
{
  _id: ObjectId,
  roomId: ObjectId,      // Workspace scope
  channelType: String,   // 'dm' | 'channel'
  channelId: String,     // Target userId (for DM) or projectId (for Channel)
  senderId: String,      // Refers to User._id
  content: Schema.Types.Mixed, // Rich-text JSON format (Tiptap)
  attachments: [ObjectId],     // Refers to FileRef._id
  reactions: [{
    emoji: String,
    userIds: [String]
  }],
  deletedAt: Date,       // Soft delete timestamp
  createdAt: Date,
  updatedAt: Date
}
```

### 2.8 `FileRef` Collection
Cloudinary file metadata references.

```typescript
{
  _id: ObjectId,
  uploaderId: String,    // Refers to User._id
  roomId: ObjectId,
  cloudinaryPublicId: String,
  cloudinaryUrl: String,
  fileName: String,
  fileSize: Number,      // Bytes (max 25MB)
  fileType: String,      // MIME type
  uploadedAt: Date
}
```

### 2.9 `Notification` Collection
In-app notification records.

```typescript
{
  _id: ObjectId,
  userId: String,        // Recipient User._id
  type: String,          // 'TaskAssigned' | 'Mentioned' | 'MessageReceived'
  referenceId: String,   // taskId | messageId | projectId
  read: Boolean,         // Default false
  createdAt: Date
}
```

---

## 3. Database Indexes Specification

To guarantee sub-second performance at scale, the following explicit indexes are maintained:

```typescript
// RoomMember Indexes
RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
RoomMemberSchema.index({ userId: 1 });

// Task Indexes
TaskSchema.index({ projectId: 1, deletedAt: 1, status: 1 });
TaskSchema.index({ createdBy: 1, isPrivate: 1, deletedAt: 1 });
TaskSchema.index({ assignees: 1, deletedAt: 1 });

// Message Indexes (Fast Cursor Pagination for Chat)
MessageSchema.index({ channelType: 1, channelId: 1, createdAt: -1 });
MessageSchema.index({ channelType: 1, channelId: 1, _id: -1 });

// Notification Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Project Indexes
ProjectSchema.index({ roomId: 1, deletedAt: 1, status: 1 });
```

---

## 4. Soft Delete Plugin Architecture

All query patterns filter out soft deleted records (`deletedAt != null`) by default using a Mongoose schema plugin:

```typescript
export function softDeletePlugin(schema: Schema) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.pre(/^find/, function () {
    if (!this.getFilter().deletedAt) {
      this.where({ deletedAt: null });
    }
  });

  schema.methods.softDelete = async function () {
    this.deletedAt = new Date();
    return this.save();
  };
}
```
