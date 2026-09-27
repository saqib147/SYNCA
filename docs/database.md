# Synca Database Architecture & Schema Specification

> **Database**: MongoDB Atlas  
> **ORM / ODM**: Mongoose with TypeScript types  
> **Cache**: Upstash Redis  

---

## 1. Data Modeling Design Principles

1. **Project-Centric Structure**: Projects are top-level containers. Each project contains its own milestone deliverables, tasks, channels, and member roster.
2. **Document Flexibility**: Projects, tasks, and messages leverage document nesting for subtasks, milestone goals, and rich text content while maintaining strict Mongoose schema definitions.
3. **Soft Delete Enforcement**: User-generated content (`Task`, `Project`, `Message`, `FileRef`) utilizes soft deletes via a `deletedAt: Date` timestamp.
4. **Compound Indexing**: Compound indexes are tailored for low-latency queries, particularly for join code lookups and project-filtered task retrieval.

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

### 2.2 `Project` Collection
Top-level project portfolio items.

```typescript
{
  _id: ObjectId,
  ownerId: String,       // Clerk userId of creator/owner
  joinCode: String,      // Unique 6-character uppercase alphanumeric code (e.g. "AB12CD")
  name: String,          // Project name (required)
  slug: String,          // Unique URL slug
  description: String,   // Project description
  status: String,        // 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived'
  privacy: String,       // 'Public' | 'Private'
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
  isPrivate: Boolean,    // Default false
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
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
