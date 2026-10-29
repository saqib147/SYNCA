# Synca — Collaborative Workspace Platform

> ⚠️ **LEGACY PRODUCT BRIEF** — This document describes the original Room/Workspace-centric design.  
> **Active architecture & contracts**: [`CONTEXT.md`](./CONTEXT.md) and [`docs/`](./docs/).  
> **Current model**: Projects are the top-level boundary with roles `Admin` | `Moderator` | `Member`. Rooms/Workspaces are removed.

> Historical summary: A unified project management and real-time communication platform for teams (originally Room-scoped). Prefer `CONTEXT.md` for implementation decisions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [User Flow](#4-user-flow)
5. [Pages & Screens](#5-pages--screens)
6. [Tech Stack](#6-tech-stack)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Database Schema (High-Level)](#9-database-schema-high-level)
10. [API Structure](#10-api-structure)
11. [Development Phases](#11-development-phases)
12. [Environment Variables](#12-environment-variables)
13. [Project Structure](#13-project-structure)

---

## 1. Project Overview

**Synca** is a team collaboration platform that combines project management, real-time messaging, and file sharing into a single intuitive workspace. Users create or join **Rooms** (workspaces tied to an organization or team), where an admin controls member access, roles, and permissions. Within a Room, members can manage projects using Kanban boards, timelines, and task lists; communicate via direct messages and project-specific channels; and share files — all governed by a flexible permission system.

### Design Philosophy
- **Intuitive first** — minimal learning curve; every action should be discoverable.
- **Permission-aware UI** — components render based on what the user is allowed to do, not what exists.
- **Unified context** — project, chat, and tasks are never siloed; they surface together where relevant.

### Visual Language
- Dark sidebar (`#1a1a1a`) + light main content area (`#f4f4f5`)
- Primary accent: Teal/Green (`#4ecb9e` / `#2ecc8f`)
- Status colors: Green = On Track, Amber = At Risk, Red = Blocked, Blue = Active Sprint
- Priority badges: Red = High, Yellow = Medium, Grey = Low
- Rounded cards, soft shadows, avatar stacks for team members

---

## 2. Core Features

### 2.1 Workspace / Room Management
- Create a new Room (organization or personal workspace)
- Join an existing Room via invite link or organization code
- Switch between multiple Rooms from the sidebar
- Room settings: name, avatar, description, visibility (public/private)

### 2.2 Dashboard
- Personalized greeting with time of day
- Stats bar: Task Completion %, Active Projects count, Team Velocity
- Task Status panel: tabs for Upcoming, Overdue, Completed task cards
- Completed Projects chart (weekly bar chart)
- Ongoing Projects quick-list with due dates
- Recent Chats panel with unread indicators
- Private Task section (personal to-do items not shared with the team)

### 2.3 Project Management
- **Project Portfolio** — grid view of all projects with status badges, progress bars, assignee stacks, due dates, and filters (Status, Priority, Assignee)
- **Project Detail** — tabbed project page:
  - **Overview** — Project Brief (rich text), High-level Goals, Key Milestones, Team Members, Connected Files
  - **List** — flat task list with sorting and filtering
  - **Board** — Kanban columns (To Do / In Progress / Done / custom); drag-and-drop tasks
  - **Timeline** — Gantt-style timeline view of milestones and tasks
  - **Calendar** — calendar view of deadlines and events
  - **Dashboard** — project-specific analytics
  - **Conversation** — embedded project channel (mirrors Project Chat)
- Project statuses: On Track · Active Sprint · At Risk · Completed · Archived
- Project privacy: Private to Team · Room-wide · Public

### 2.4 Task Management
- Create tasks with: name, description, priority (High/Medium/Low), assignee(s), due date, subtasks
- Subtask progress tracking (`3/5` style counter)
- Task cards display: priority badge, title, subtask count, assignee avatar
- Task assignment to one or more members
- Drag-and-drop across Kanban columns
- Private tasks (visible only to the creator)
- To-Do List: personal task list separate from project tasks

### 2.5 Real-Time Messaging

#### Direct Messages (DMs)
- One-on-one conversations between members
- Online/Offline presence indicator + last seen timestamp
- File and document attachments (with download)
- Typing indicator (animated `...`)
- Message timestamps
- Search within conversation
- Voice call and video call buttons (UI, future integration)
- Right panel: contact profile, local time, email, team, shared media grid

#### Project Channels (Group Chat)
- Channel scoped to a project (`#channel-name`)
- Member list with avatar stack + count
- Rich text input: Bold, Italic, Link, Bullet List, Code block
- File attachments with file type and size display
- Emoji reactions on messages
- `@mention` support with user autocomplete
- Date separators and **NEW MESSAGES** divider
- `Return to send` / `Shift+Return for new line` behavior
- Search within channel
- Notification bell per channel

### 2.6 File Sharing
- Attach files in DMs and project channels
- File cards show: icon, filename, size, type label
- Download directly from the message
- Connected Briefs on project overview (PDF, PNG, etc.)
- Shared Media gallery per contact/project

### 2.7 People & Directory
- Room member list with role and title
- "More People" overflow with full member browser
- Member cards: avatar, name, role/title
- View member profiles: local time, email, team, shared files

### 2.8 Roles & Permissions (admin-controlled)
- See Section 3 for full breakdown.

### 2.9 Notifications
- Unread message badges on chat contacts
- Bell icon for project/channel notifications
- In-app notification feed

### 2.10 Landing Page (public-facing)
- Header with nav and CTA
- About section
- How it works walkthrough
- Connect with Organization section
- Feature highlights
- Who is this for
- Newsletter / Feature updates signup
- Footer

---

## 3. User Roles & Permissions

### Built-in Roles

| Role | Scope | Description |
|---|---|---|
| **Owner** | Room | Created the Room; full control including billing and deletion |
| **Admin** | Room | Manage members, roles, projects, and all settings |
| **Manager** | Project | Create/edit/delete tasks, manage project members |
| **Member** | Room/Project | Default role; access governed by permissions |
| **Viewer** | Room/Project | Read-only access |
| **Guest** | Room | Restricted access; can only see what they are explicitly added to |

### Permission Categories

```
Room-Level
├── Manage Members (invite, remove, change roles)
├── Manage Room Settings
├── Create Projects
├── View All Projects
└── Access Directory

Project-Level
├── View Project
├── Create / Edit / Delete Tasks
├── Assign Tasks to Members
├── Manage Project Members
├── View Conversations
├── Send Messages in Channels
├── Upload Files
├── Manage Milestones
└── Export Project Data

Chat-Level
├── Send Direct Messages
├── Create Group Channels (future)
└── Share Files in Chat
```

### Custom Permissions
Admins can create custom roles with any combination of the above permissions and assign them per member, per project, or room-wide.

---

## 4. User Flow

### 4.1 Onboarding Flow

```
Visit Landing Page
       │
       ▼
  Sign Up / Log In  (via Clerk)
       │
       ▼
 ┌─────┴─────┐
 │           │
Join Room  Create Room
(code/link) (org name, avatar)
       │
       ▼
 Welcome / Onboarding Screen
 - Tour of Dashboard
 - Invite teammates
 - Create first project
       │
       ▼
  Dashboard Home
```

### 4.2 Project Flow

```
All Projects → New Project
       │
       ▼
Set: Name, Description, Status, Privacy, Team Members
       │
       ▼
Project Detail → Overview tab
       │
  ┌────┼────────┬──────────┐
  ▼    ▼        ▼          ▼
Board  List  Timeline  Conversation
  │
  ▼
Add Columns → Add Tasks
       │
       ▼
Assign Members → Set Priority → Set Due Date
       │
       ▼
Track Progress (% complete, subtask counter)
```

### 4.3 Chat Flow

```
Sidebar → Chats section
       │
  ┌────┴────┐
  ▼         ▼
 DM      Project Channel
  │         │
  ▼         ▼
Type message / Attach file / React
       │
       ▼
Real-time delivery (WebSocket / Socket.io)
```

### 4.4 Task Assignment Flow

```
Project Board → Task Card → Open Task
       │
       ▼
Edit: Assignee, Priority, Due Date, Description, Subtasks
       │
       ▼
Assignee receives notification
       │
       ▼
Assignee views task in Dashboard → To-Do List or Project Board
```

---

## 5. Pages & Screens

### Public Pages (unauthenticated)

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | Marketing and onboarding entry |
| Sign Up | `/sign-up` | Clerk registration |
| Sign In | `/sign-in` | Clerk login |
| Accept Invite | `/invite/[code]` | Join Room via invite link |

### App Pages (authenticated)

| Page | Route | Key Components |
|---|---|---|
| Dashboard | `/dashboard` | Stats bar, Task Status, Chart, Ongoing Projects, Chat Panel |
| To-Do List | `/dashboard/todo` | Personal task list with filters |
| All Projects | `/projects` | Project Portfolio grid with filters |
| Project Detail | `/projects/[id]` | Tabbed project view (Overview, List, Board, Timeline, Calendar, Dashboard, Conversation) |
| Project Board | `/projects/[id]/board` | Kanban drag-and-drop |
| Project Timeline | `/projects/[id]/timeline` | Gantt chart |
| Direct Message | `/chat/[userId]` | 1:1 chat with profile panel |
| Project Channel | `/projects/[id]/conversation` | Group channel with rich text input |
| People | `/people` | Room member directory |
| Member Profile | `/people/[userId]` | Individual profile view |
| Settings | `/settings` | Account, Room, Notifications, Roles |
| Room Settings | `/settings/room` | Members, permissions, integrations |

---

## 6. Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Shadcn UI |
| State Management | Zustand (or Jotai) |
| Forms | React Hook Form + Zod |
| Drag & Drop | `@dnd-kit/core` |
| Rich Text Editor | Tiptap |
| Charts | Recharts |
| Icons | Lucide React |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Real-time | Socket.io |
| ORM | Prisma (or Mongoose) |
| Auth | Clerk |
| File Storage | Cloudinary |

### Database
| Purpose | Technology |
|---|---|
| Primary DB | MongoDB (flexible schema for projects/tasks/messages) |
| Optional relational | MySQL (for roles/permissions if strict relational model preferred) |

### Infrastructure
| Purpose | Technology |
|---|---|
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| File Storage | Cloudinary |
| Auth Provider | Clerk |
| Real-time | Socket.io on Render (WebSocket support) |

---

## 7. Functional Requirements

### Authentication
- [x] Sign up / sign in via Clerk (email + OAuth)
- [x] Protected routes — redirect unauthenticated users
- [x] Session persistence across tabs
- [x] Role-based UI rendering (hide/show elements per permission)

### Room Management
- [x] Create a Room with name, avatar, description
- [x] Generate and share Room invite links
- [x] Join Room via invite link or code
- [x] Admin can remove members or change their roles
- [x] Member can leave a Room
- [x] Multiple Room support with switcher

### Dashboard
- [x] Greeting with user name and time of day
- [x] Stats: task completion %, active project count, team velocity
- [x] Task Status panel with Upcoming / Overdue / Completed tabs
- [x] Completed Projects weekly bar chart
- [x] Ongoing Projects quick-list
- [x] Recent Chats panel with unread badges
- [x] Private Task section

### Projects
- [x] Create project (name, description, status, privacy, members)
- [x] Project Portfolio grid with status badges and progress
- [x] Filter projects by Status, Priority, Assignee
- [x] Project Detail: Overview, List, Board, Timeline, Calendar, Dashboard, Conversation tabs
- [x] Project Brief (rich text)
- [x] High-level Goals section
- [x] Key Milestones with status (Completed / In Progress / Upcoming) and date
- [x] Project Team panel with member add/remove
- [x] Connected Briefs / file attachments
- [x] Export project data
- [x] Share project (copy link)
- [x] Archive / delete project

### Tasks
- [x] Create task: name, description, priority, assignee(s), due date, subtasks
- [x] Kanban Board: columns (To Do / In Progress / Done / custom), drag-and-drop
- [x] Task cards: priority badge, title, subtask counter, assignee avatar
- [x] Add custom columns per project
- [x] Subtask tracking with `n/total` counter
- [x] Personal To-Do List (private tasks)
- [x] Task detail view / edit modal
- [x] Task assignment notification

### Messaging
- [x] Direct messages between Room members
- [x] Online/Offline presence + last seen
- [x] File attachment in DMs
- [x] Typing indicator
- [x] Message timestamps
- [x] Project channels (group chat scoped to project)
- [x] `@mention` with autocomplete
- [x] Emoji reactions
- [x] File attachment in channels with file info card
- [x] Rich text formatting (Bold, Italic, Link, List, Code)
- [x] New Messages divider
- [x] Date separators
- [x] Real-time delivery via WebSocket
- [x] Unread message counters
- [x] Search within conversation

### File Sharing
- [x] Attach files in chat and channels (via Cloudinary)
- [x] File card with icon, name, size, type
- [x] Download file from message
- [x] Shared Media gallery per contact/project

### People / Directory
- [x] Room member list with name, role, avatar
- [x] Member profile page: local time, email, team, shared media
- [x] Mute notifications per contact

### Roles & Permissions
- [x] Assign built-in roles (Owner, Admin, Manager, Member, Viewer, Guest)
- [x] Custom role creation with granular permission toggles
- [x] Per-project permission override
- [x] Permission-aware UI components

### Notifications
- [x] Unread badge on chat contacts
- [x] Bell icon with in-app notification feed
- [x] Task assignment notification
- [x] Mention notification

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard initial load < 2s on fast 3G |
| **Real-time** | Message delivery latency < 200ms on same region |
| **Scalability** | Architecture supports multi-room, multi-project at scale |
| **Security** | All routes protected; API validates Clerk session tokens; file URLs are signed |
| **Accessibility** | WCAG 2.1 AA — keyboard navigable, ARIA labels, sufficient color contrast |
| **Responsive** | Full functionality on desktop (1280px+); tablet-ready (768px+) |
| **Offline** | Graceful degradation — show cached data when disconnected; retry on reconnect |
| **Auth** | Session expiry handling; auto-refresh tokens |
| **File Limits** | Max upload size: 25 MB per file |
| **Data Privacy** | Private tasks and private projects are never exposed to non-members via API |

---

## 9. Database Schema (High-Level)

### Collections / Models

```
User
├── id (Clerk userId)
├── name
├── email
├── avatarUrl
├── role (global default)
└── createdAt

Room
├── id
├── name
├── avatarUrl
├── description
├── ownerId → User
├── inviteCode
└── createdAt

RoomMember
├── roomId → Room
├── userId → User
├── role (Owner | Admin | Manager | Member | Viewer | Guest)
├── customPermissions: [String]
└── joinedAt

Project
├── id
├── roomId → Room
├── name
├── description (rich text)
├── status (OnTrack | ActiveSprint | AtRisk | Completed | Archived)
├── privacy (Private | RoomWide | Public)
├── goals: [{ title, description, icon }]
├── teamMembers: [userId]
├── connectedFiles: [FileRef]
└── createdAt / updatedAt

Task
├── id
├── projectId → Project (nullable for private tasks)
├── createdBy → User
├── title
├── description
├── priority (High | Medium | Low)
├── status (Todo | InProgress | Done | custom)
├── assignees: [userId]
├── dueDate
├── subtasks: [{ title, completed }]
├── isPrivate
└── createdAt / updatedAt

Milestone
├── id
├── projectId → Project
├── title
├── description
├── status (Completed | InProgress | Upcoming)
├── progress (0–100)
└── date

Message
├── id
├── roomId → Room
├── channelType (DM | ProjectChannel)
├── channelId (userId for DM | projectId for channel)
├── senderId → User
├── content (rich text JSON)
├── attachments: [FileRef]
├── reactions: [{ emoji, userIds }]
├── createdAt

FileRef
├── id
├── uploaderId → User
├── cloudinaryUrl
├── fileName
├── fileSize
├── fileType
└── uploadedAt

Notification
├── id
├── userId → User (recipient)
├── type (TaskAssigned | Mentioned | MessageReceived | ...)
├── referenceId (taskId | messageId | ...)
├── read
└── createdAt
```

---

## 10. API Structure

### Auth
All requests require `Authorization: Bearer <clerk_token>` header.

### Endpoints (Express REST)

```
# Rooms
POST   /api/rooms                    Create room
GET    /api/rooms/:roomId            Get room details
PATCH  /api/rooms/:roomId            Update room settings
DELETE /api/rooms/:roomId            Delete room
POST   /api/rooms/:roomId/invite     Generate invite link
POST   /api/rooms/join               Join room via code
GET    /api/rooms/:roomId/members    List members
PATCH  /api/rooms/:roomId/members/:userId   Update member role/permissions
DELETE /api/rooms/:roomId/members/:userId   Remove member

# Projects
POST   /api/projects                 Create project
GET    /api/projects?roomId=         List projects in room (filtered)
GET    /api/projects/:id             Get project detail
PATCH  /api/projects/:id             Update project
DELETE /api/projects/:id             Delete project
POST   /api/projects/:id/members     Add member to project
DELETE /api/projects/:id/members/:userId  Remove member

# Tasks
POST   /api/tasks                    Create task
GET    /api/tasks?projectId=         List tasks for project
GET    /api/tasks?userId=&private=   Personal to-do list
GET    /api/tasks/:id                Get task detail
PATCH  /api/tasks/:id                Update task (status, assignee, etc.)
DELETE /api/tasks/:id                Delete task

# Milestones
POST   /api/milestones               Create milestone
GET    /api/milestones?projectId=    List milestones
PATCH  /api/milestones/:id           Update milestone
DELETE /api/milestones/:id           Delete milestone

# Messages
GET    /api/messages/dm/:userId      Get DM history
GET    /api/messages/channel/:projectId  Get channel history
POST   /api/messages                 Send message (REST fallback)
DELETE /api/messages/:id             Delete message

# Files
POST   /api/files/upload             Upload to Cloudinary, return FileRef
GET    /api/files/:id                Get file metadata
DELETE /api/files/:id                Delete file

# Notifications
GET    /api/notifications            Get user notifications
PATCH  /api/notifications/:id/read   Mark as read
PATCH  /api/notifications/read-all   Mark all as read

# Users
GET    /api/users/:id                Get user profile
GET    /api/users?roomId=            List room members (directory)
```

### WebSocket Events (Socket.io)

```
# Emit (client → server)
message:send        { channelType, channelId, content, attachments }
message:react       { messageId, emoji }
typing:start        { channelType, channelId }
typing:stop         { channelType, channelId }
presence:connect    { userId, roomId }
presence:disconnect { userId }

# Listen (server → client)
message:new         { message object }
message:updated     { messageId, reactions }
typing:update       { channelId, typingUsers: [userId] }
presence:update     { userId, status: 'online' | 'offline', lastSeen }
notification:new    { notification object }
task:updated        { taskId, changes }
```

---

## 11. Development Phases

### Phase 0 — Setup & Foundation (Week 1)
- [ ] Initialize Next.js project with TypeScript and Tailwind CSS
- [ ] Configure Shadcn UI component library
- [ ] Set up Clerk authentication (sign up, sign in, session management)
- [ ] Set up Express backend on Render
- [ ] Connect MongoDB database (Mongoose or Prisma)
- [ ] Configure Cloudinary for file uploads
- [ ] Set up environment variables for all services
- [ ] Create base layout: dark sidebar + light content area
- [ ] Implement sidebar navigation with Dashboard, ToDo, Projects, Chats, Settings links

**Deliverable:** Authenticated shell app with working auth and navigation.

---

### Phase 1 — Dashboard (Week 2)
- [ ] Dashboard page layout (stats bar + 3-column grid)
- [ ] Greeting with time-of-day logic (Good Morning/Afternoon/Evening)
- [ ] Stats cards: Task Completion %, Active Projects, Team Velocity
- [ ] Task Status panel with tabs (Upcoming / Overdue / Completed)
- [ ] Task cards UI (priority badge, project name, due date, assignee chip)
- [ ] Completed Projects bar chart (Recharts)
- [ ] Ongoing Projects quick-list
- [ ] Recent Chats panel with unread badge indicator
- [ ] Private Task section (placeholder)

**Deliverable:** Fully rendered Dashboard with static/mock data.

---

### Phase 2 — Room Management (Week 2–3)
- [ ] Create Room flow (name, avatar, description)
- [ ] Generate invite link (unique code stored in DB)
- [ ] Join Room via invite link / code input page
- [ ] Room switcher in sidebar
- [ ] Room settings page (name, avatar, description)
- [ ] Member list with role badges
- [ ] Invite member by email (Clerk invite)
- [ ] Remove member
- [ ] Leave Room

**Deliverable:** Users can create and join Rooms; admin can manage members.

---

### Phase 3 — Projects & Tasks (Week 3–5)
- [ ] Project Portfolio page (grid with filters: Status, Priority, Assignee)
- [ ] Create Project modal (name, description, status, privacy, members)
- [ ] Project Detail page with tab navigation
- [ ] Overview tab: Project Brief, High-level Goals, Milestones, Team, Files
- [ ] Milestone cards (Completed / In Progress / Upcoming) with progress bar
- [ ] List tab: flat task table
- [ ] Board tab: Kanban columns with drag-and-drop (`@dnd-kit`)
  - [ ] Default columns: To Do, In Progress, Done
  - [ ] Add custom column
  - [ ] Drag tasks between columns
- [ ] Task cards: priority badge, title, subtask counter `n/total`, assignee avatar
- [ ] Task create/edit modal: name, description, priority, assignees, due date, subtasks
- [ ] Timeline tab (basic Gantt — can be a later iteration)
- [ ] Calendar tab (later iteration)
- [ ] Project Dashboard tab (project-specific analytics — later iteration)
- [ ] Personal To-Do List page (private tasks)

**Deliverable:** Full project and task management with Kanban board.

---

### Phase 4 — Real-Time Messaging (Week 5–7)
- [ ] Set up Socket.io on backend (Render WebSocket)
- [ ] Socket context provider in Next.js
- [ ] Direct Messages
  - [ ] DM list in sidebar (sorted by latest message)
  - [ ] DM conversation page
  - [ ] Send/receive messages in real time
  - [ ] Typing indicator
  - [ ] Online/Offline presence + last seen
  - [ ] Contact profile right panel
  - [ ] File attachment (Cloudinary upload, card display, download)
  - [ ] Message timestamps
- [ ] Project Channels
  - [ ] Channel page within project (Conversation tab)
  - [ ] Rich text input (Tiptap — Bold, Italic, Link, Lists, Code)
  - [ ] `@mention` with member autocomplete
  - [ ] Emoji reactions (picker + counter)
  - [ ] File attachments with file info card
  - [ ] Date separators
  - [ ] New Messages divider
  - [ ] Search within channel (later iteration)

**Deliverable:** Real-time DMs and project channel messaging with file sharing.

---

### Phase 5 — Roles, Permissions & Notifications (Week 7–8)
- [ ] Role model: Owner, Admin, Manager, Member, Viewer, Guest
- [ ] Permission matrix per role
- [ ] Custom role creation (admin UI)
- [ ] Permission-aware UI: hide buttons/sections user cannot use
- [ ] API middleware: validate permission per endpoint
- [ ] Notification model in DB
- [ ] Trigger notifications on: task assignment, @mention, message received
- [ ] In-app notification feed (bell icon dropdown)
- [ ] Mark as read / mark all as read
- [ ] Unread count badge on sidebar items

**Deliverable:** Full RBAC system with in-app notifications.

---

### Phase 6 — People & Directory (Week 8)
- [ ] People page: room member grid with search
- [ ] Member profile page: avatar, name, role, local time, email, team, shared media
- [ ] Mute notifications per contact
- [ ] Shared Media gallery (images and files exchanged in DM)

**Deliverable:** Member directory and profile pages.

---

### Phase 7 — Landing Page (Week 8–9)
- [ ] Header with nav links and CTA button
- [ ] Hero / About section
- [ ] How it works (step walkthrough)
- [ ] Connect with Organization section
- [ ] Feature highlights grid
- [ ] "Who is this for" section
- [ ] Newsletter / feature updates signup (email input)
- [ ] Footer (links, social, copyright)
- [ ] Responsive layout (mobile-first)

**Deliverable:** Public-facing marketing page.

---

### Phase 8 — Polish, Testing & Deployment (Week 9–10)
- [ ] End-to-end responsive polish (tablet breakpoints)
- [ ] Loading states and skeleton screens
- [ ] Error boundaries and empty states
- [ ] Toast notifications (Shadcn `<Sonner />`)
- [ ] Input validation (Zod schemas on frontend and backend)
- [ ] API error handling (standard error response shape)
- [ ] Rate limiting on message send and file upload endpoints
- [ ] Security: validate Room membership on every API call
- [ ] Performance: image optimization (next/image), lazy loading
- [ ] Vercel deployment (frontend) + Render deployment (backend)
- [ ] Environment variable audit

**Deliverable:** Production-ready v1.0.

---

### Post-Launch / Future Iterations
- [ ] Timeline tab (full Gantt chart)
- [ ] Calendar tab with event management
- [ ] Project Dashboard tab (task analytics per project)
- [ ] Voice/video call integration (e.g., Daily.co or Agora)
- [ ] AI task summary (summarize To-Do items or project progress)
- [ ] Mobile app (React Native / Capacitor)
- [ ] Email notifications (Resend / Nodemailer)
- [ ] Webhook integrations (Slack, GitHub, Jira)
- [ ] Dark/light mode toggle

---

## 12. Environment Variables

### Frontend (`.env.local` — Next.js)
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

### Backend (`.env` — Express)
```env
# Server
PORT=4000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://...

# Clerk
CLERK_SECRET_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# CORS
CLIENT_URL=https://your-app.vercel.app
```

---

## 13. Project Structure

### Frontend (Next.js App Router)
```
/src
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (app)/
│   │   ├── layout.tsx          ← Sidebar + auth guard
│   │   ├── dashboard/
│   │   ├── projects/
│   │   │   ├── page.tsx        ← Portfolio
│   │   │   └── [id]/
│   │   │       ├── page.tsx    ← Overview
│   │   │       ├── board/
│   │   │       ├── list/
│   │   │       ├── timeline/
│   │   │       └── conversation/
│   │   ├── chat/
│   │   │   └── [userId]/
│   │   ├── people/
│   │   │   └── [userId]/
│   │   ├── todo/
│   │   └── settings/
│   └── page.tsx                ← Landing page
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── TaskCard.tsx
│   │   └── MilestoneCard.tsx
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ContactPanel.tsx
│   └── ui/                     ← Shadcn components
├── hooks/
│   ├── useSocket.ts
│   ├── usePresence.ts
│   └── usePermissions.ts
├── lib/
│   ├── api.ts                  ← Axios instance
│   ├── socket.ts
│   └── utils.ts
├── store/
│   ├── useRoomStore.ts
│   ├── useProjectStore.ts
│   └── useChatStore.ts
└── types/
    └── index.ts
```

### Backend (Express)
```
/src
├── index.ts                    ← Express + Socket.io setup
├── routes/
│   ├── rooms.ts
│   ├── projects.ts
│   ├── tasks.ts
│   ├── messages.ts
│   ├── files.ts
│   ├── notifications.ts
│   └── users.ts
├── controllers/
├── middleware/
│   ├── auth.ts                 ← Clerk session validation
│   └── permissions.ts          ← Role/permission guard
├── models/
│   ├── Room.ts
│   ├── Project.ts
│   ├── Task.ts
│   ├── Message.ts
│   ├── FileRef.ts
│   └── Notification.ts
├── socket/
│   ├── handlers.ts             ← Socket event handlers
│   └── presence.ts             ← Online presence tracking
└── lib/
    └── cloudinary.ts
```

---

## Quick Reference — Status & Priority Colors

| Label | Color |
|---|---|
| On Track | `#4ecb9e` (green) |
| Active Sprint | `#3b82f6` (blue) |
| At Risk | `#f59e0b` (amber) |
| Blocked | `#ef4444` (red) |
| Completed | `#6b7280` (grey, strikethrough) |
| High Priority | `#ef4444` (red badge) |
| Medium Priority | `#f59e0b` (amber badge) |
| Low Priority | `#6b7280` (grey badge) |

---

*Synca — built with Next.js · Express · MongoDB · Socket.io · Clerk · Cloudinary · Tailwind CSS*
