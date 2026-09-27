# Roles & Permissions Specification

## Overview

Synca enforces a single-tier, project-scoped **Role-Based Access Control (RBAC)** architecture.

In this model, **Projects** are the top-level collaboration boundary. Every user in a project is assigned one of three project roles:
1. **`Admin`**: Project owner/creator or promoted administrator.
2. **`Moderator`**: Team lead / moderator managing tasks, milestones, and goals.
3. **`Member`**: Core contributor collaborating on tasks, Kanban boards, and project channels.

---

## Role & Permission Matrix

| Capability / Action | Admin | Moderator | Member |
|---|---|---|---|
| **View Project Overview, Kanban Board & Tasks** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Create Tasks & Subtasks** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Move Kanban Cards & Edit Assigned Tasks** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Send Messages & Attach Files in Project Channels** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Edit/Delete Any Task in Project** | ✅ Yes | ✅ Yes | ❌ Only Assigned/Created |
| **Create & Update Project Goals & Milestones** | ✅ Yes | ✅ Yes | ❌ Read-Only |
| **Invite Members via Join Code** | ✅ Yes | ✅ Yes | ❌ Read-Only |
| **Promote/Demote Member Roles (`Admin`, `Moderator`, `Member`)** | ✅ Yes | ❌ No | ❌ No |
| **Remove Members from Project** | ✅ Yes | ❌ No | ❌ No |
| **Edit Project Settings & Reset Join Code** | ✅ Yes | ❌ No | ❌ No |
| **Archive / Delete Project** | ✅ Yes (Owner/Admin) | ❌ No | ❌ No |

---

## Join Code Architecture

- Every project is assigned a unique **6-character uppercase alphanumeric code** (e.g. `AB12CD`) upon creation.
- Entering a valid join code automatically adds the user to the project's member roster with the **`Member`** role.
- Project Admins can reset the join code at any time from the **Project Settings** tab.
