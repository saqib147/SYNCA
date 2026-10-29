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
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "The requested project does not exist or has been archived."
  }
}
```

---

## 2. REST API Endpoint Specifications

### 2.1 Projects (`/api/v1/projects`)

#### `POST /api/v1/projects`
- **Description**: Create a new top-level project. The creator is set as `ownerId` and assigned the `'Admin'` role in `members`. An uppercase 6-character `joinCode` is generated automatically.
- **Request Body**:
  ```json
  {
    "name": "Mobile Redesign",
    "description": "Cross-platform mobile app overhaul",
    "status": "ActiveSprint",
    "privacy": "Public"
  }
  ```
- **Response `201`**: Created `Project` object.

#### `POST /api/v1/projects/join`
- **Description**: Join an existing project using its 6-character `joinCode`. Automatically assigns the user the `'Member'` role.
- **Request Body**:
  ```json
  {
    "joinCode": "AB12CD"
  }
  ```
- **Response `200`**: `Project` object.

#### `GET /api/v1/projects`
- **Description**: List all active projects the user belongs to.
- **Response `200`**: Array of `Project` objects.

#### `GET /api/v1/projects/:id`
- **Description**: Get details of a project by MongoDB `_id` or `slug`, enriched with member profile details and user role.
- **Response `200`**: Enriched `Project` object.

#### `PATCH /api/v1/projects/:id`
- **Description**: Update project details, goals, or milestones. Restricted to `Admin` or `Moderator`.
- **Response `200`**: Updated `Project` object.

#### `PATCH /api/v1/projects/:id/members/:userId/role`
- **Description**: Promote/demote project member (`Admin`, `Moderator`, `Member`). Restricted to `Admin`.
- **Request Body**:
  ```json
  {
    "role": "Moderator"
  }
  ```

#### `DELETE /api/v1/projects/:id/members/:userId`
- **Description**: Remove member from project or leave project.

#### `POST /api/v1/projects/:id/join-code/reset`
- **Description**: Regenerate a fresh 6-character join code. Restricted to `Admin`.

#### `DELETE /api/v1/projects/:id`
- **Description**: Soft delete project and cascade delete child tasks. Restricted to `Admin`.

---

### 2.2 Tasks (`/api/v1/tasks`)

#### `POST /api/v1/tasks`
- **Description**: Create a new task in a project or a personal private task (`projectId: null`).
- **Request Body**:
  ```json
  {
    "projectId": "64f1a2b3...",
    "title": "Design Figma Mockups",
    "description": "High fidelity screens",
    "status": "To Do",
    "priority": "High",
    "assignees": ["user_2abc123..."],
    "subtasks": [{ "title": "Setup grid", "completed": false }]
  }
  ```

#### `GET /api/v1/tasks?projectId=`
- **Description**: List tasks for a project. Returns all public project tasks for all members; private tasks (`isPrivate: true`) are visible only to the task creator, assignees, and project Admins/Moderators.

#### `GET /api/v1/tasks/my`
- **Description**: List user's assigned/created tasks across all their projects plus personal private tasks.

#### `PATCH /api/v1/tasks/:id`
- **Description**: Update task status, description, subtasks, or assignees. Full planning field edits (`title`, `priority`, `dueDate`, `isPrivate`) require task creator or project Admin/Moderator. Regular members can update `status`, `subtasks`, `description`, and self-assign or unassign themselves.

#### `PUT /api/v1/tasks/:id/move`
- **Description**: Update task status and order index for Kanban drag-and-drop. Accessible to project members, assignees, creators, and admins.

#### `POST /api/v1/tasks/:id/comments`
- **Description**: Add a comment to a task. Accessible to all project members, assignees, task creators, and project admins.

#### `DELETE /api/v1/tasks/:id`
- **Description**: Soft delete a task (strictly requires task creator or project Admin/Moderator).
