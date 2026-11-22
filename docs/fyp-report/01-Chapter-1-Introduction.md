# Chapter 1: Introduction

---

## 1.1 Background and Motivation

In contemporary software engineering, academic capstone teams, and distributed corporate organizations, collaborative work is inherently multi-dimensional. Delivering a project requires simultaneous coordination across three tightly coupled activities: **planning and task tracking** (defining goals, milestones, assignees, priorities, and delivery columns), **synchronous and asynchronous communication** (project-wide discussions and 1:1 direct messaging), and **artifact exchange** (sharing design mockups, PDFs, code archives, spreadsheets, and screenshots).

Despite the natural interdependence of these workflows, the prevailing market ecosystem separates them into isolated SaaS products. Teams commonly manage sprints in Jira, Linear, or Asana; hold real-time conversations in Slack, Discord, or Microsoft Teams; and transfer working files via Google Drive, WeTransfer, or email attachments. Every boundary between these platforms introduces measurable operational friction:

1. **Context-Switching Tax**: Empirical studies in software engineering productivity consistently demonstrate that switching between disconnected applications interrupts deep focus and requires significant cognitive recovery time. A developer reading a task description must switch applications to message the task's assignee, then switch again to locate a referenced file.
2. **Duplicated Access Control and Onboarding Friction**: Adding a new collaborator requires inviting them separately into a task tracker, a chat workspace, and a file folder. Conversely, when a team member leaves a project, administrators frequently forget to revoke access or unassign orphaned tasks across all tools.
3. **Storage Bloat from Ad-Hoc Chat Files**: Transient working files shared during active discussions (such as error screenshots, draft exports, or temporary archives) accumulate indefinitely in cloud storage, inflating storage costs and exposing stale artifacts long after they are needed.
4. **Rigid Task-Board Coupling**: Traditional Kanban tools hard-wire board columns directly to a task's workflow status (`To Do`, `In Progress`, `Done`). Teams that want to organize cards by discipline (`Design`, `Backend`, `QA`), sprint week, or deliverable stream are forced to compromise their status reporting.

**Synca** was conceived to address these exact limitations by unifying project management, real-time messaging, and ephemeral file sharing inside a single, cohesive, **project-centric** web application.

---

## 1.2 Problem Statement

Existing team collaboration tools suffer from tool sprawl, rigid multi-tier workspace hierarchies, coupled Kanban-status models, and unbounded file retention. Small-to-medium engineering teams, university project groups, and agile startups need a unified platform that:

- Consolidates project portfolios, decoupled Kanban/List task boards, milestone tracking, project channels, 1:1 direct messaging, and file transfers under a **single project-scoped identity and permission boundary**;
- Eliminates unnecessary "Workspace / Organization / Room" nesting by allowing instant project onboarding via a **6-character alphanumeric join code** or direct exact-email invitation;
- Guarantees real-time responsiveness via WebSockets without sacrificing strict server-side authorization, XSS protection, or database integrity;
- Prevents unbounded cloud storage growth through automated **24-hour ephemeral file retention** with transparent countdown indicators and graceful expired-file previews; and
- Delivers a modern, distraction-free, **viewport-locked desktop experience** with full Light Mode and Dark Mode parity.

---

## 1.3 Purpose and Objectives of Synca

The primary purpose of Synca is to serve as an all-in-one operational hub where teams can plan work, execute deliverables, communicate in real time, and exchange temporary working files without ever leaving a single browser tab.

To realize this purpose, the project established the following concrete engineering objectives:

1. **Project-Centric Collaboration Model**: Design and implement a flat, project-scoped data and permission model (`Admin`, `Moderator`, `Member`) eliminating legacy Room/Workspace overhead.
2. **Decoupled Task Management**: Build both a drag-and-drop **Kanban Board** (supporting custom column creation, horizontal column reordering, and click-to-rename atomic migration) and a collapsible **List View** grouped by column, where `Task.column` is completely independent of `Task.status`.
3. **Real-Time Communication Engine**: Implement low-latency project `#general` channels and 1:1 Direct Messages over **Socket.io** backed by **Upstash Redis**, supporting live typing indicators, online presence, emoji reactions, unread badges, floating toast notifications, and conversation deletion.
4. **Rich-Text Formatting & Clean Message Feeds**: Provide an intuitive formatting toolbar (`Bold`, `Italic`, `Inline Code`, `Bullet List`) in both project channels and DMs, rendered via an XSS-safe React inline markdown renderer with tight consecutive same-user message grouping.
5. **Ephemeral All-Type File Transfer Pipeline**: Support uploading any file format up to **25 MB** to **Cloudinary** (routing safe raster images as `image` assets and all other file types as `raw` assets) with a **24-hour auto-delete lifecycle** enforced by a scheduled 15-minute background cleanup job.
6. **Defense-in-Depth Security**: Enforce Clerk JWT authentication on every REST endpoint and WebSocket handshake, strict project-scoped RBAC checks, tiered scoped user discovery (preventing global user enumeration), rate limiting, Helmet CSP headers, and Zod schema validation.
7. **Production-Grade UI/UX**: Implement Synca's Figma design system with unified Light/Dark tokens (`#006c52`, `#66deb4`, `#F0FF7C`, `#f3f3f3`, `#17181c`, `#111316`) and a viewport-locked (`h-screen overflow-hidden`) shell with internal container scrolling.

---

## 1.4 Scope of the Project

### In Scope (Implemented and Verified)
- **Authentication & Identity**: Full Sign-In, Sign-Up, OAuth, session token lifecycle, and profile management via **Clerk** (`@clerk/nextjs` and `@clerk/express`).
- **Personal Dashboard**: Dynamic time-of-day greeting, live KPI cards (`Task Completion`, `Active Projects`, `Team Velocity`), segmented task feed (`Upcoming`, `Overdue`, `Completed`), 7-day weekly completion pill chart, personal private tasks (`projectId: null`), ongoing project shortcuts, and recent/unread DM previews.
- **Project Portfolio & Governance**: Project creation (2-step modal with optional initial goals & milestone), 6-character `joinCode` onboarding and join-link route (`/projects/join?code=`), live search and multi-dimensional filtering (status, privacy, member), inline-editable Project Brief, High-Level Goals, and Key Milestones with progress sliders, plus Settings and soft-delete cascade.
- **Task Management**: Full CRUD for project and personal tasks, decoupled board columns (`Project.columns` + `Task.column`), horizontal column drag-and-drop reordering, click-to-rename column migration, Kanban card drag-and-drop, collapsible List View grouped by column, task detail slide-over drawer, subtasks checklist, comments stream, priority badges, due dates, and private project task visibility rules.
- **Real-Time Messaging**: One `#general` channel per project + unlimited 1:1 Direct Messages, WhatsApp-style single scrollable left sidebar ordered by recency, split-card `/chats` view with toggleable Contact Profile Drawer, inline message search, emoji reactions, typing indicators, live online presence, unread counters, floating desktop toast notifications, DM conversation soft-delete, and inline exact-email user lookup.
- **File Sharing**: Universal file-type uploads up to 25 MB via Cloudinary, inline raster image previews, live 24-hour expiry countdown badges, background 15-minute asset cleanup job, `410 FILE_EXPIRED` API handling, and non-clickable expired file cards.
- **Departed Member Lifecycle**: Automatic unassignment from all active project tasks upon leaving or removal, combined with greyed-out avatars/names and `"Former member"` attribution in historical project channel messages.
- **Appearance & Ergonomics**: Class-based Light/Dark/System theme switching with zero-FOUC inline initialization and viewport-locked internal-scroll layout.

### Out of Scope (Planned for Post-MVP Phases)
- Multi-named project channels beyond the default `#general` channel (Phase 5+).
- Persistent `@mention` notification inbox and email digest alerts (Phase 5).
- Global searchable People Directory page (Phase 6).
- Public marketing landing page (Phase 7).
- Native iOS/Android mobile apps and voice/video calling (Post-FYP).

---

## 1.5 Target Users and Stakeholders

| User Group | Primary Needs | How Synca Serves Them |
|---|---|---|
| **University FYP & Capstone Teams** | Free/low-friction onboarding, unified tasks + chat, zero admin overhead | Instant 6-character join codes, decoupled Kanban + List views, built-in project chat, and 24h file sharing |
| **Agile Software Engineering Squads** | Fast board updates, inline code formatting in chat, clear role separation | `@dnd-kit` Kanban boards, inline `` `code` `` markdown, `Admin`/`Moderator`/`Member` RBAC, and dark mode |
| **Project Leads & Managers** | Portfolio visibility, milestone tracking, team governance | Project Portfolio filters, inline editable Goals & Milestones, KPI dashboard, and member role controls |
| **Individual Contributors** | Personal focus alongside team transparency | Dashboard `Task Status` tabs, personal Private Tasks (`projectId: null`), and quick 1:1 DMs from task assignees |

---

## 1.6 Core Functional Features

### 1.6.1 Project-Centric Workspace & Portfolio Management
Every collaboration boundary in Synca is a **Project**. Users can belong to any number of projects simultaneously with independent roles in each. A project encapsulates:
- **Core Metadata**: Name, unique URL slug, description/brief, delivery status (`OnTrack`, `ActiveSprint`, `AtRisk`, `Completed`, `Archived`), and privacy setting (`Public` or `Private`).
- **Strategic Alignment**: High-Level Goals (interactive completion checkboxes with inline add/delete) and Key Milestones (title, description, status `Upcoming` / `InProgress` / `Completed`, target date, and 0–100% progress slider).
- **Onboarding Controls**: A unique 6-character uppercase alphanumeric `joinCode` (automatically generated on creation and resettable by Admins) alongside direct invite-by-email and quick-add from shared teammates.
- **Cascade Soft Deletion**: Deleting a project sets `deletedAt` on the project and cascades soft deletion to all child tasks, preserving referential integrity and preventing accidental permanent data loss.

### 1.6.2 Role-Based Access Control (RBAC) & Join Code Onboarding
Synca implements a clean three-tier, project-scoped RBAC model:
- **`Admin`**: Project creator (`ownerId`) or promoted administrator. Has full governance over project settings, member roles, join code resets, member removal, channel moderation, and project deletion. Sole-Admin guards prevent demoting or removing the last remaining Admin.
- **`Moderator`**: Team lead with authority to edit project metadata, goals, and milestones, invite new members (`Member` role), manage all tasks, and soft-delete inappropriate messages in the project channel.
- **`Member`**: Standard collaborator (default role when joining via `joinCode`). Can view all public project tasks, create tasks, update task statuses/subtasks/descriptions, self-assign or unassign themselves, reorder/rename board columns, post comments, upload files, and participate in project chat and DMs.

### 1.6.3 Decoupled Kanban Board & Collapsible List Views
A distinguishing architectural feature of Synca is the **decoupling of board columns from task workflow status**:
- **Custom Columns (`Project.columns`)**: Newly created projects start with `columns: []` (an empty board inviting users to define their own workflow). If a user creates a task before adding any columns, the backend automatically initializes `"Default Column"` and places the task inside it.
- **Horizontal Column Drag-and-Drop**: Powered by `@dnd-kit/core` and `@dnd-kit/sortable`, users can drag column grip handles to reorder columns horizontally; the new order persists via `PATCH /api/v1/projects/:id`.
- **Click-to-Rename Atomic Migration**: Clicking any column header opens an inline rename input. Committing the rename sends `renameColumn: { from, to }` to `PATCH /api/v1/projects/:id`, which atomically updates both `project.columns` and `Task.column` across every task in that column.
- **Status Independence**: Moving a task card between columns via `PATCH /api/v1/tasks/:id/move` updates only `task.column` and `task.order` — `task.status` (`To Do`, `In Progress`, `Done`) remains untouched until explicitly changed.
- **Synchronized Collapsible List View**: The **List** tab groups tasks into separate collapsible tables mirroring the exact order of `Project.columns`, with inline status, priority, assignee, due date, and quick-add controls per column.

### 1.6.4 Task Lifecycle, Subtasks, Comments & Personal Private Tasks
Tasks support rich operational metadata:
- **Title, Description, Priority (`Low`, `Medium`, `High`), Status (`To Do`, `In Progress`, `Done`), Board Column, Due Date, and Multi-Assignee selection**.
- **Interactive Subtasks Checklist**: Tasks maintain an embedded `subtasks` array (`{ title, completed }`) with live completion counters (`e.g., 3/5 done`) toggleable directly from the Task Detail Drawer.
- **Threaded Activity Comments**: Any project member can post timestamped comments with Clerk avatar and display name attribution.
- **Task Privacy Scopes**:
  - *Standard Project Tasks* (`isPrivate: false`): Transparently visible to all project members.
  - *Private Project Tasks* (`isPrivate: true`): Visible exclusively to the creator, assignees, and project Admins/Moderators.
  - *Personal Private Tasks* (`projectId: null`): Created directly from the Dashboard's **Private Task** card and visible solely to the authenticated user.

### 1.6.5 Real-Time Messaging (Project Channels & 1:1 Direct Messages)
Synca delivers real-time messaging over persistent Socket.io connections scaled via Upstash Redis:
- **Project Channels (`#project-slug`)**: Every project includes a dedicated real-time conversation tab (`channelType: 'channel'`, `channelId = projectId`).
- **1:1 Direct Messages (`/chats`)**: Deterministic channel identifiers (`min(userA, userB):max(userA, userB)`) enable private conversations between any two Synca users, regardless of whether they share a project.
- **WhatsApp-Style Single Sidebar**: All active DM conversations appear directly in the left navigation sidebar sorted by most recent message timestamp, displaying 1-line previews, live online status dots, unread counters, and hover delete buttons.
- **Optimistic UI & Zero Reloads**: Sending a message immediately appends an optimistic bubble (`sending...`), updates the sidebar preview and order via `upsertDmPeerLocally()`, and reconciles seamlessly upon server acknowledgment without reloading the conversation.
- **DM Conversation Soft-Delete**: Users can clear a DM thread via `DELETE /api/v1/messages/dm/:peerId`, which soft-deletes thread messages, emits `dm:deleted` over Socket.io, and immediately removes the thread from the sidebar (automatically reappearing if a new message is exchanged later).
- **Live Presence, Typing Indicators & Reactions**: Users see real-time `"Online"` / `"Offline"` indicators (`presence:sync`, `presence:update`), animated 3-dot typing bubbles (`typing:start`, `typing:stop`, `typing:update`), quick-emoji reactions (`message:react`), and floating top-right toast notifications (`ChatNotificationContext`) when messages arrive in background rooms.

### 1.6.6 Rich-Text Inline Markdown Formatting & Message Grouping
Both Project Conversation and Direct Message composers (`ChatInput.tsx`) feature a shared formatting toolbar:
- **Toolbar Actions**: **Bold** (`**text**`), *Italic* (`_text_`), `Inline Code` (`` `code` ``), and Bullet List (`- item`). Buttons use `onMouseDown={(e) => e.preventDefault()}` so clicking them never steals textarea focus or selection, and automatically insert highlighted placeholder text when no text is selected.
- **XSS-Safe Rendering**: `MessageBubble.tsx` parses inline markdown tokens directly into React elements (`<strong>`, `<em>`, `<code>`, bullet rows) without using `dangerouslySetInnerHTML`, neutralizing script injection vectors while rendering crisp styled text in both Light and Dark themes.
- **Consecutive Same-User Grouping**: Messages sent back-to-back by the same author within a short window collapse repeated avatars/headers and render with tight vertical spacing (`mt-0 py-0.5` in channels; `mt-0.5` in DMs), while distinct sender groups maintain clean `mt-3.5` separation.

### 1.6.7 Ephemeral 24-Hour File Transfers (All Types, 25 MB Limit)
File sharing is engineered for speed, security, and bounded storage:
- **Universal File Support**: Configured in `@synca/config` (`FILE_LIMITS.ALLOW_ALL_TYPES = true`, `MAX_FILE_SIZE_BYTES = 25 MB`, `RETENTION_HOURS = 24`).
- **Safe Cloudinary Routing**: Files are buffered in memory via Multer and streamed to Cloudinary. Only safe raster image MIME types (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) upload with `resource_type: 'image'`; all other formats (PDF, DOCX, XLSX, ZIP, SVG, source code, binaries) upload as `resource_type: 'raw'` preserving their original filename and preventing SVG-based XSS or Cloudinary PDF delivery `403` errors.
- **Automated 24-Hour Expiration**: Each `FileRef` stores `expiresAt = uploadedAt + 24h`. A background sweeper (`apps/api/src/jobs/file-cleanup.job.ts`) executes on startup and every 15 minutes to destroy expired assets on Cloudinary (`cloudinary.uploader.destroy`) and soft-delete their MongoDB records.
- **Client Expiry UX**: Active attachments display inline raster image thumbnails (for safe images) and live countdown badges (`Expires in 23h 41m`). Once expired, `GET /api/v1/files/:id` returns HTTP `410 FILE_EXPIRED`, and both chat bubbles and the Profile Drawer's **Shared Files** list render muted, non-clickable `"File expired • Auto-deleted (24h)"` cards.

### 1.6.8 Departed & Removed Member Lifecycle Handling
When a member leaves a project or is removed by an Admin (`DELETE /api/v1/projects/:id/members/:targetUserId`):
1. **Automatic Task Unassignment**: The backend runs `Task.updateMany({ projectId, deletedAt: null, assignees: targetUserId }, { $pull: { assignees: targetUserId } })` so no tasks remain assigned to departed members.
2. **Historical Chat Attribution**: Past messages authored by the departed user remain preserved for project continuity, but `ProjectConversationTab.tsx` and `MessageBubble.tsx` detect that `senderId` is no longer in the active project roster and render their avatar in `grayscale opacity-50`, mute their display name, and display a `"Former member"` badge.

### 1.6.9 Scoped Three-Tier User Discovery
To prevent exposing the global user directory to scraping or unsolicited spam, Synca implements a three-tier discovery strategy:
- **Tier 1 — Shared-Project Teammates**: `GET /api/v1/users/teammates` returns collaborators who share at least one project plus existing DM peers, enriched via batched Clerk profile lookups.
- **Tier 2 — Contextual Quick-Actions**: One-click message buttons appear on task assignees (`TaskDetailModal`) and project team rosters (`projects/[id]` and `EditTeamModal`).
- **Tier 3 — Inline Exact-Email Lookup**: Typing an email address containing `@` inside `NewMessageModal.tsx` triggers an inline live lookup against `GET /api/v1/users/lookup?email=` (strict exact match only, rate-limited to 15 req/min), previewing the matched user with a 1-click **Chat** button.

### 1.6.10 Dual Light/Dark Design System & Viewport-Locked Desktop Shell
- **Canonical Figma Palette**: Light Mode pairs a `#f3f3f3` neutral canvas with `#ffffff` rounded cards (`rounded-[20px]`), `#17181c` dark floating sidebar, `#006c52` deep-teal CTAs, `#66deb4` mint accents, and `#F0FF7C` lime highlights. Dark Mode pairs a `#000000` ambient canvas with `#111316` / `#14171c` / `#15171b` neutral dark cards and `#66deb4` interactive accents.
- **Zero-FOUC Theme Engine**: `ThemeContext.tsx` supports `'light' | 'dark' | 'system'` persisted in `localStorage` (`synca_theme`), initialized via a synchronous `<script>` before first paint.
- **Viewport-Locked Shell**: The authenticated layout is locked to `h-screen overflow-hidden`, ensuring the outer window never exhibits a scrollbar while every page container (`Dashboard`, `All Projects`, `Project Detail`, `Direct Messages`, `Settings`) scrolls cleanly inside its own rounded boundary.

---

## 1.7 Application Programming Interface (API) Overview

### 1.7.1 RESTful HTTP API (`/api/v1`)
All REST endpoints return a standardized JSON envelope (`{ success: true, data: ... }` or `{ success: false, error: { code, message } }`) and require a valid `Authorization: Bearer <clerk_jwt>` header (except `GET /health` and Svix-verified Clerk webhooks).

| Domain | Method | Endpoint | Purpose | Required Role / Scope |
|---|---|---|---|---|
| **Projects** | `POST` | `/api/v1/projects` | Create project + generate 6-char `joinCode` | Authenticated |
| **Projects** | `POST` | `/api/v1/projects/join` | Join project by `joinCode` as `Member` | Authenticated |
| **Projects** | `GET` | `/api/v1/projects` | List active projects for current user | Authenticated |
| **Projects** | `GET` | `/api/v1/projects/:id` | Get enriched project details & roster | Project Member |
| **Projects** | `PATCH` | `/api/v1/projects/:id` | Update metadata, goals, milestones, `columns`, or `renameColumn` | Admin/Mod (columns: Member) |
| **Projects** | `POST` | `/api/v1/projects/:id/members` | Add member by exact email or teammate `userId` | Admin / Moderator |
| **Projects** | `PATCH` | `/api/v1/projects/:id/members/:userId/role` | Promote/demote member role | Project Admin |
| **Projects** | `DELETE` | `/api/v1/projects/:id/members/:userId` | Remove or leave project + unassign tasks | Admin or Self |
| **Projects** | `POST` | `/api/v1/projects/:id/join-code/reset` | Regenerate 6-character `joinCode` | Project Admin |
| **Projects** | `DELETE` | `/api/v1/projects/:id` | Soft delete project + cascade child tasks | Project Admin |
| **Tasks** | `POST` | `/api/v1/tasks` | Create project or personal task (`Default Column` auto-init) | Project Member / Self |
| **Tasks** | `GET` | `/api/v1/tasks?projectId=` | List project tasks (privacy-scoped) | Project Member |
| **Tasks** | `GET` | `/api/v1/tasks/my` | List user's assigned/created + personal tasks | Authenticated |
| **Tasks** | `PATCH` | `/api/v1/tasks/:id` | Update task fields (role-gated planning metadata) | Member / Creator / Admin |
| **Tasks** | `PATCH` | `/api/v1/tasks/:id/move` | Update `column` and `order` (status decoupled) | Project Member |
| **Tasks** | `POST` | `/api/v1/tasks/:id/comments` | Append activity comment | Project Member |
| **Tasks** | `DELETE` | `/api/v1/tasks/:id` | Soft delete task | Creator / Admin / Mod |
| **Messages** | `GET` | `/api/v1/messages/dm/:userId` | Cursor-paginated 1:1 DM history | DM Participant |
| **Messages** | `GET` | `/api/v1/messages/channel/:projectId` | Cursor-paginated `#general` history | Project Member |
| **Messages** | `POST` | `/api/v1/messages` | Send message (REST fallback) | Member / DM Participant |
| **Messages** | `DELETE` | `/api/v1/messages/dm/:peerId` | Soft delete entire DM thread + emit `dm:deleted` | DM Participant |
| **Messages** | `DELETE` | `/api/v1/messages/:id` | Soft delete single message | Sender / Admin / Mod |
| **Files** | `POST` | `/api/v1/files/upload` | Upload any file (≤25 MB) to Cloudinary with 24h `expiresAt` | Authenticated |
| **Files** | `GET` | `/api/v1/files/:id` | Fetch metadata & URL (`410 FILE_EXPIRED` after 24h) | Member / Uploader |
| **Files** | `DELETE` | `/api/v1/files/:id` | Delete `FileRef` & Cloudinary asset | Uploader / Admin |
| **Users** | `GET` | `/api/v1/users/teammates` | Get collaborators + DM peers with Clerk profiles & previews | Authenticated |
| **Users** | `GET` | `/api/v1/users/lookup?email=` | Tier 3 exact email lookup (15 req/min) | Authenticated |
| **Users** | `GET` | `/api/v1/users/:userId/profile` | Scoped display profile | Self / Teammate / DM Peer |
| **System** | `GET` | `/health` | Service, MongoDB & Redis health probe | Public |

### 1.7.2 Real-Time WebSocket Event Protocol (Socket.io)
Socket.io is mounted on the same HTTP server as Express and scaled horizontally via `@socket.io/redis-adapter`:

- **Client → Server (`Emit`)**: `project:join`, `project:leave`, `dm:join`, `dm:leave`, `message:send`, `message:react`, `message:delete`, `typing:start`, `typing:stop`, `task:move`.
- **Server → Client (`Listen`)**: `message:new`, `message:deleted`, `dm:deleted`, `message:reaction`, `typing:update`, `presence:update`, `presence:sync`, `task:updated`, `notification:new`, `error`.

---

## 1.8 Authentication, Authorization, and Security Architecture

### 1.8.1 Identity & JWT Session Verification (Clerk)
Synca delegates password hashing, MFA, OAuth social login, and session rotation to **Clerk**. On the frontend, `@clerk/nextjs` middleware protects all application routes under `/(app)/*`, redirecting unauthenticated visitors to `/sign-in`. Every API call attaches a short-lived Clerk Bearer JWT retrieved via `getToken()`, which the backend verifies cryptographically via `@clerk/express` (`requireAuth`) before executing any controller logic. Similarly, the Socket.io connection middleware verifies `socket.handshake.auth.token` before attaching `socket.data.userId` and admitting the client to any room.

### 1.8.2 Project-Scoped RBAC & Ownership Guards
Every project, task, message, and file endpoint performs **server-side membership and role verification** directly against MongoDB — client claims are never trusted:
- `ownerId` always resolves as `Admin`, protecting project ownership.
- Sole-Admin guards block any request that would demote or remove the last remaining Admin.
- Task planning metadata (`title`, `priority`, `dueDate`, `isPrivate`) and task deletion are restricted to the task creator or project `Admin`/`Moderator`.
- Scoped profile endpoints (`GET /api/v1/users/:userId/profile`) return `403 Forbidden` unless the caller shares a project or DM thread with the target user.

### 1.8.3 Transport, Injection, XSS, and Upload Hardening
- **HTTP Security Headers**: `helmet` enforces HSTS, Content Security Policy (CSP), and anti-clickjacking headers.
- **Strict CORS**: Whitelists only the configured `CLIENT_URL` with explicit allowed methods and headers.
- **Input Validation**: All request payloads are validated through shared `@synca/zod-schemas` definitions before touching Mongoose models.
- **XSS Mitigation**: Chat rich-text formatting is rendered via a custom React tokenizer (`MessageBubble.tsx`) with zero `dangerouslySetInnerHTML`. Uploaded SVGs and non-raster files are stored as Cloudinary `raw` assets rather than executable inline images.
- **Rate Limiting**: Sensitive endpoints (`/users/lookup`, `/projects/:id/members`, `/files/upload`, `/messages`) enforce per-user rate limits to prevent enumeration and abuse.

---

## 1.9 Screen-by-Screen User Interface Walkthrough

This section documents every user-facing screen in Synca, explaining its layout, interactive controls, and real-time behaviors.

> **Note for Final Submission**: Capture crisp screenshots of each screen from the running application (`http://localhost:3000`) and replace the placeholder boxes below before exporting to PDF/Word.

### 1.9.1 Authentication Screens (`/sign-in` & `/sign-up`)
Synca provides dedicated Clerk-powered authentication pages styled in the dark Synca brand palette (`#000000` canvas, `#17181c` card, `#006c52` primary submit button, `#66deb4` focus borders and links). Users can register or sign in using email/password or connected OAuth providers, and are automatically redirected to `/dashboard` upon session establishment.

> **[INSERT SCREENSHOT — Figure 1.1: Synca Sign-In Screen (`/sign-in`)]**
> **[INSERT SCREENSHOT — Figure 1.2: Synca Sign-Up Screen (`/sign-up`)]**

---

### 1.9.2 Personal Dashboard (`/dashboard`)
The Dashboard is the user's daily command center, organized inside a viewport-locked layout:
- **Top Banner**: Displays a dynamic time-of-day greeting (`Good Morning` / `Good Afternoon` / `Good Evening` + first name in `Funnel Display`), three KPI cards (**Task Completion %**, **Active Projects**, and **Team Velocity avg**), and the `<ThemeToggle />` button.
- **Column 1 — Task Status**: Features a segmented pill switcher (`Upcoming`, `Overdue`, `Completed`) with a `#006c52` → `#66deb4` active gradient and an internally scrollable list of assigned project tasks. Clicking any task card opens the slide-over `TaskDetailModal`.
- **Column 2 — Completed Tasks & Private Tasks**: The top widget renders seven iconic vertical pill bars (`Mon`–`Sun`) showing weekly task completion counts; the bottom widget manages personal **Private Tasks** (`projectId: null`) with an inline `+ Add` trigger.
- **Column 3 — Ongoing Projects & Recent Chats**: Provides quick links to the top 5 active projects (`New ↗` button opens `CreateProjectModal`) and a live preview of the 5 most recent DM conversations with unread badges.

> **[INSERT SCREENSHOT — Figure 1.3: Personal Dashboard — Light Mode (`/dashboard`)]**
> **[INSERT SCREENSHOT — Figure 1.4: Personal Dashboard — Dark Mode (`/dashboard`)]**

---

### 1.9.3 Navigation Sidebar (`Sidebar.tsx`)
Anchored to the left edge of every authenticated route (`w-[252px]`, collapsible to `w-[80px]` via the circular edge toggle), the dark floating sidebar (`#17181c` light / `#111316` dark) contains:
- **User Profile Header** with Clerk avatar, display name, email, and quick **Create** and **Join** project buttons.
- **Primary Navigation**: Glassmorphic bevel buttons for **Dashboard** and **All Projects** with `#66deb4` left active pills, followed by quick links to active projects and their `#general` unread counters.
- **WhatsApp-Style Chats Section**: Scrollable list of all 1:1 DM threads ordered by latest message, showing avatar, live `#66deb4` online dot, 1-line last-message preview, unread badge, `+` New Message trigger, and hover trash icon to delete a conversation.
- **Footer**: Direct links to **Settings** (`/settings`) and **Sign out**.

> **[INSERT SCREENSHOT — Figure 1.5: Left Navigation Sidebar (Expanded & Collapsed States)]**

---

### 1.9.4 Project Portfolio (`/projects`)
Displays all active projects the user belongs to inside a full-height rounded container with pinned header/filter controls and an internally scrollable Bento card grid:
- **Filter Controls**: Live text search, Status dropdown (`All Statuses`, `On Track`, `Active Sprint`, `At Risk`, `Completed`, `Archived`), Privacy filter (`Public` / `Private`), Member filter, and **Join Code** button.
- **Project Cards**: Each card displays a semantic status pill, project title, description snippet, live task completion progress bar, stacked member avatars, quick invite-code copy button (for Admins/Moderators), and a dedicated `+ New Project` dashed card at the end of the grid.

> **[INSERT SCREENSHOT — Figure 1.6: Project Portfolio Page (`/projects`)]**

---

### 1.9.5 Create Project Modal & Join Project Modal
- **Create Project Modal (`CreateProjectModal.tsx`)**: A 2-step workflow. Step 1 captures Essentials (Project Name, Description, Status, Privacy). Step 2 optionally lets the creator add initial High-Level Goals and a first Key Milestone before submitting and automatically navigating into the newly created project.
- **Join Project Modal (`JoinProjectModal.tsx`)**: Accepts a 6-character alphanumeric `joinCode` (auto-uppercased), validates it against `POST /api/v1/projects/join`, enrolls the user as a `Member`, and immediately opens the project workspace.

> **[INSERT SCREENSHOT — Figure 1.7: Two-Step Create Project Modal]**
> **[INSERT SCREENSHOT — Figure 1.8: Join Project with 6-Character Code Modal]**

---

### 1.9.6 Project Detail — Overview Tab (`/projects/[id]`)
The Project Detail shell pins the breadcrumb (`Projects > Project Name`), title, status/privacy/role badges, Task Completion progress bar, **Share** and **+ Add Task** action buttons, and five underline tabs (`Overview`, `Board`, `List`, `Conversation`, `Settings`).
- **Overview Tab**: Features a 2-column layout with inline-editable **Project Brief** (with live stats: Tasks Completed, Goals Reached, Team Members), **Key Milestones** cards (inline edit/create with status cycling, target date, and progress slider), **High-Level Goals** checklist (toggleable checkboxes + quick-add input), **Project Team** roster with direct DM icons, and **Workspace Access** join-code/invite-link card.

> **[INSERT SCREENSHOT — Figure 1.9: Project Detail — Overview Tab (`/projects/[id]`)]**

---

### 1.9.7 Project Detail — Board Tab (Kanban)
Renders horizontally arranged, custom-ordered columns (`ProjectKanbanBoard.tsx`) inside the locked viewport:
- **Column Controls**: Drag the left grip icon to reorder columns horizontally; click a column's title to rename it inline (atomically updating all cards in that column); delete empty columns; or click **+ Add a new column** on the right.
- **Task Cards**: Each column scrolls vertically inside its own body (`overflow-y-auto`), displaying priority badges, task title, subtask progress, due date, assignee initials, and edit/delete actions. Dragging a card into another column updates `Task.column` and `order` without mutating `Task.status`.

> **[INSERT SCREENSHOT — Figure 1.10: Project Detail — Kanban Board Tab with Drag-and-Drop Columns]**

---

### 1.9.8 Project Detail — List Tab
`ProjectTaskTable.tsx` displays the same custom columns as separate, collapsible structured tables. Each table shows a column header with task count and quick `+ Add Task` button, followed by rows detailing Title, Status badge, Priority badge, Assignees, Due Date, Subtask count, and Edit/Delete actions.

> **[INSERT SCREENSHOT — Figure 1.11: Project Detail — Collapsible List View Tab]**

---

### 1.9.9 Project Detail — Conversation Tab (`#project-channel`)
`ProjectConversationTab.tsx` provides a Slack-style real-time project channel:
- **Channel Header**: Displays `#project-slug`, stacked active member avatars, and live typing status.
- **Message Feed**: Tightly grouped consecutive messages with formatted inline markdown (`**bold**`, `_italic_`, `` `code` ``, `- bullet`), hover emoji reaction bar, inline raster image previews, 24-hour file expiry countdowns, and greyed-out `"Former member"` attribution for departed teammates.
- **Mint-Bordered Composer**: Includes the `B`, `I`, `</>`, `List` formatting toolbar, 25 MB file attachment picker, emoji picker popover, and send button.

> **[INSERT SCREENSHOT — Figure 1.12: Project Detail — Conversation Tab with Formatting Toolbar & File Cards]**

---

### 1.9.10 Project Detail — Settings Tab & Members/Roles Modal
- **Settings Tab**: Lets Admins/Moderators update Project Name, Description, Status, and Privacy; lets Admins copy/reset the Join Code or permanently soft-delete the project in the Danger Zone; and allows non-sole-Admin members to leave the project.
- **Members, Invites & Roles Modal (`EditTeamModal.tsx`)**: Allows Admins/Moderators to invite collaborators by exact email or 1-click quick-add from other shared projects, view the role capability legend, promote/demote roles (`Admin`, `Moderator`, `Member`), start a DM, or remove members (automatically unassigning them from all project tasks).

> **[INSERT SCREENSHOT — Figure 1.13: Project Detail — Settings Tab & Join Code Management]**
> **[INSERT SCREENSHOT — Figure 1.14: Members, Invites & Roles Modal (`EditTeamModal`)]**

---

### 1.9.11 Task Creation/Edit Modal & Task Detail Drawer
- **Task Modal (`TaskModal.tsx`)**: Supports creating or editing tasks in full Light/Dark mode with Title, Description, Priority selector (`Low`, `Medium`, `High`), Due Date picker, Task Status selector (`To Do`, `In Progress`, `Done`), Board Column dropdown, multi-assignee chip selector, Subtasks checklist builder, and Private Task visibility toggle.
- **Task Detail Drawer (`TaskDetailModal.tsx`)**: Slide-over panel showing a 1-click **Mark Complete** toggle, Edit/Delete buttons, Project/Priority/Status badges, structured Properties table (interactive status switcher, assignees with 1-click DM links, due date, project), Description, clickable Subtasks checklist, and live Comments & Activity feed.

> **[INSERT SCREENSHOT — Figure 1.15: Create / Edit Task Modal (`TaskModal`)]**
> **[INSERT SCREENSHOT — Figure 1.16: Slide-Over Task Detail Drawer (`TaskDetailModal`)]**

---

### 1.9.12 Direct Messages Hub & Contact Profile Drawer (`/chats`)
When opened, `/chats` automatically loads the user's most recent conversation (or a clean onboarding state with **+ Start New Conversation**). It uses a split-card layout:
- **Left Main Chat Card**: Peer name, live Online/Offline indicator, inline in-chat message search, Delete Conversation button, Profile Drawer toggle, message stream with left (`#f1f3f4` / `#1e2127`) and right (`#3eb386` / `#006c52`) bubbles, animated 3-dot typing indicator, and the formatted composer with `B`, `I`, `</>`, `List`, 25 MB file upload, and emoji picker.
- **Right Contact Profile Drawer (`ContactProfileDrawer.tsx`)**: Detached `300px` rounded card displaying a `76px` avatar, live status, Mute and Search quick actions, **About** (client-synced Local Time and Shared Projects), **Shared Files** (with live 24h countdown and expired placeholders), and a **Delete Conversation** action.

> **[INSERT SCREENSHOT — Figure 1.17: Direct Messages Hub & Detachable Contact Profile Drawer (`/chats`)]**

---

### 1.9.13 New Message Modal (`NewMessageModal.tsx`)
Triggered from the Sidebar `+` button or empty `/chats` state, this modal lists shared-project teammates and existing DM contacts with keyboard navigation (`↑`, `↓`, `Enter`, `Esc`). Entering an email address containing `@` switches seamlessly to **Tier 3 Inline Exact-Email Lookup**, resolving the user via `GET /api/v1/users/lookup`, displaying their real avatar/name, and opening the chat in 1 click while optimistically updating the left Sidebar.

> **[INSERT SCREENSHOT — Figure 1.18: New Message Modal with Inline Exact-Email Lookup]**

---

### 1.9.14 User Settings & Theme Switcher (`/settings`)
Allows users to switch between **Light Mode**, **Dark Mode**, and **System Sync** with live previews, inspect their Clerk account details, and open Clerk's hosted profile/security modal for updating avatars, passwords, connected OAuth accounts, and 2FA.

> **[INSERT SCREENSHOT — Figure 1.19: User Settings & Appearance Theme Switcher (`/settings`)]**
