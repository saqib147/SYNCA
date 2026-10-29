# Roles & Permissions Specification

## 1. Overview

Synca enforces a single-tier, project-scoped **Role-Based Access Control (RBAC)** architecture.

In this model, **Projects** are the top-level collaboration boundary. Every user in a project is assigned one of three project roles:
1. **`Admin`**: Project owner/creator or promoted administrator with full project governance.
2. **`Moderator`**: Team lead managing tasks, milestones, deliverables, invites, and channel moderation.
3. **`Member`**: Core contributor collaborating on tasks, Kanban boards, subtasks, and project channels.

There is **no** Room / Workspace role layer. Legacy roles (`Owner`, `Manager`, `Viewer`, `Guest`) are deprecated.

---

## 2. Project-Level Permissions Matrix

| Capability / Action | Admin | Moderator | Member |
|---|:---:|:---:|:---:|
| **View Project Overview, Roster & Channels** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Project `joinCode`** | ✅ Yes | ✅ Yes | ❌ No |
| **Share / Copy Project `joinCode`** | ✅ Yes | ✅ Yes | ❌ No |
| **Reset Project `joinCode`** | ✅ Yes | ❌ No | ❌ No |
| **Edit Project Metadata & Goals / Milestones** | ✅ Yes | ✅ Yes | ❌ Read-Only |
| **Promote / Demote Member Roles (`Admin`, `Moderator`, `Member`)** | ✅ Yes | ❌ No | ❌ No |
| **Remove Members from Project** | ✅ Yes | ❌ No | ❌ No *(Can leave project)* |
| **Delete Project (Cascade Soft Delete)** | ✅ Yes | ❌ No | ❌ No |
| **Soft-delete others' channel messages** | ✅ Yes | ✅ Yes | ❌ No |

### 2.1 Ownership & Sole-Admin Guards

- `ownerId` always resolves as **Admin**, even if missing from `members`.
- **Cannot** demote, remove, or force-leave the last remaining Admin.
- **Cannot** delete the project owner without transferring `ownerId` first (transfer-ownership flow; implement when Settings polish lands).
- Admins may promote other members to Admin; multiple Admins are allowed.

---

## 3. Task Visibility & Privacy Model

Synca follows a collaborative transparency model designed after modern agile tools (Linear, Asana):

| Task Type | Admin / Moderator | Project Member | Non-Member |
|---|:---:|:---:|:---:|
| **Standard Project Tasks** (`isPrivate: false`) | Visible (All) | **Visible (All)** | Hidden |
| **Private Project Tasks** (`isPrivate: true`) | Visible *(oversight)* | **Only if Creator or Assignee** | Hidden |
| **Personal Tasks** (`projectId: null`) | Creator / Assignee Only | Creator / Assignee Only | Hidden |

- **Kanban Board & List Transparency**: All project members see standard tasks across the board (including unassigned backlog items and teammates' cards), enabling sprint awareness and self-assignment.
- **UI Quick Filters**: Personal focus is achieved via the "My Tasks" tab / filter and the personal Dashboard (`/dashboard`), rather than blocking shared data.
- **Private-task UX**: When `isPrivate: true`, the UI should label the task as **"Private · Visible to Admins"** so oversight is not surprising.

---

## 4. Task-Level Action Permissions Matrix

Task actions are governed by the user's project role and their relationship to the specific task:

| Action / Capability | Admin / Moderator | Task Creator | Assigned Member | Project Member (Unassigned) |
|---|:---:|:---:|:---:|:---:|
| **Create Task in Project** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Public Task Details** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Update Status (`status`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Check / Toggle Subtasks (`subtasks`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Edit Description (`description`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Self-Assign / Unassign (`assignees`)** | ✅ Full control | ✅ Full control | ✅ Self add/remove | ✅ Self add/remove |
| **Reassign Other Members** | ✅ Yes | ✅ Yes | ❌ Forbidden | ❌ Forbidden |
| **Edit Planning Metadata (`title`, `priority`, `dueDate`, `isPrivate`)** | ✅ Yes | ✅ Yes | ❌ Forbidden | ❌ Forbidden |
| **Move Card on Kanban Board (`moveTask`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Post Comments (`addTaskComment`)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Delete Task (Soft Delete)** | ✅ Yes | ✅ Yes | ❌ Forbidden | ❌ Forbidden |

---

## 5. Messaging Permissions (Phase 4)

| Action | Admin | Moderator | Member | Non-Member |
|---|:---:|:---:|:---:|:---:|
| **Read / send project `#general` channel** | ✅ | ✅ | ✅ | ❌ |
| **Start DM from project roster** | ✅ | ✅ | ✅ | — |
| **React / typing indicators** | ✅ | ✅ | ✅ | ❌ |
| **Delete own message** | ✅ | ✅ | ✅ | ❌ |
| **Delete others' channel messages** | ✅ | ✅ | ❌ | ❌ |
| **Delete others' DM messages** | ❌ | ❌ | ❌ | ❌ |

Phase 4 MVP uses **one default channel per project** (`channelId = projectId`). Named multi-channels are deferred.

---

## 6. Join Code Architecture

- Every project is assigned a unique **6-character uppercase alphanumeric code** (e.g. `AB12CD`) upon creation.
- Entering a valid join code automatically adds the user to the project's member roster with the **`Member`** role.
- Only **Admins** and **Moderators** can view/copy the join code in Project Settings.
- Project Admins can reset the join code at any time to revoke an exposed invite code (existing members stay enrolled).
