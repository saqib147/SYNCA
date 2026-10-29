# Roles & Permissions Specification

## 1. Overview

Synca enforces a single-tier, project-scoped **Role-Based Access Control (RBAC)** architecture.

In this model, **Projects** are the top-level collaboration boundary. Every user in a project is assigned one of three project roles:
1. **`Admin`**: Project owner/creator or promoted administrator with full project governance.
2. **`Moderator`**: Team lead / moderator managing tasks, milestones, deliverables, and invites.
3. **`Member`**: Core contributor collaborating on tasks, Kanban boards, subtasks, and project channels.

---

## 2. Project-Level Permissions Matrix

| Capability / Action | Admin | Moderator | Member |
|---|:---:|:---:|:---:|
| **View Project Overview, Roster & Channels** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Share / View Project `joinCode`** | ✅ Yes | ✅ Yes | ❌ Read-Only |
| **Reset Project `joinCode`** | ✅ Yes | ❌ No | ❌ No |
| **Edit Project Metadata & Goals / Milestones** | ✅ Yes | ✅ Yes | ❌ Read-Only |
| **Promote / Demote Member Roles (`Admin`, `Moderator`, `Member`)** | ✅ Yes | ❌ No | ❌ No |
| **Remove Members from Project** | ✅ Yes | ❌ No | ❌ No *(Can leave project)* |
| **Delete Project (Cascade Soft Delete)** | ✅ Yes (Owner/Admin) | ❌ No | ❌ No |

---

## 3. Task Visibility & Privacy Model

Synca follows a collaborative transparency model designed after modern agile tools (Linear, Asana):

| Task Type | Admin / Moderator | Project Member | Non-Member |
|---|:---:|:---:|:---:|
| **Standard Project Tasks** (`isPrivate: false`) | Visible (All) | **Visible (All)** | Hidden |
| **Private Project Tasks** (`isPrivate: true`) | Visible | **Only if Creator or Assignee** | Hidden |
| **Personal Tasks** (`projectId: null`) | Creator / Assignee Only | Creator / Assignee Only | Hidden |

- **Kanban Board & List Transparency**: All project members see standard tasks across the board (including unassigned backlog items and teammates' cards), enabling sprint awareness and self-assignment.
- **UI Quick Filters**: Personal focus is achieved in the UI via the "My Tasks" tab / filter and the personal Dashboard (`/dashboard`), rather than blocking shared data.

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

## 5. Join Code Architecture

- Every project is assigned a unique **6-character uppercase alphanumeric code** (e.g. `AB12CD`) upon creation.
- Entering a valid join code automatically adds the user to the project's member roster with the **`Member`** role.
- Project Admins can reset the join code at any time from the **Project Settings** tab to revoke existing invite codes.
