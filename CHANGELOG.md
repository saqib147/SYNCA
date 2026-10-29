# Changelog

All notable changes to the Synca project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Collaborative Task Visibility & Permission Refinement] - 2026-10-29

### Enhanced
- **Collaborative Project Board Visibility ([`task.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/task.controller.ts))**:
  - Replaced the restrictive task filter in `getProjectTasks` so that all non-private project tasks are visible across the entire project team (resolving the "Ghost" Kanban board issue).
  - Maintained privacy for `isPrivate: true` tasks, which remain restricted to task creators, assignees, and project admins.
- **Agile Task Collaboration & Self-Assignment**:
  - **Self-Assignment**: Regular project members can now assign or unassign themselves from project tasks without requiring admin elevation.
  - **Task Description & Subtasks**: Assigned and project members can now update task descriptions and check off subtask checklist items to document work progress.
  - **Kanban Card Movement (`moveTask`)**: Any project member can now reorder and move tasks between Kanban columns.
  - **Task Comments Stream (`addTaskComment`)**: Enabled all project members to post comments and collaborate on project tasks.
- **Documentation Alignment**:
  - Updated [`docs/roles-and-permissions.md`](file:///d:/Synca-FYP/docs/roles-and-permissions.md) with comprehensive task visibility and action permission matrices.
  - Updated [`docs/api.md`](file:///d:/Synca-FYP/docs/api.md) and [`CONTEXT.md`](file:///d:/Synca-FYP/CONTEXT.md) to reflect the refined collaborative RBAC architecture.

## [Phase 3 Improvements & Fixes] - 2026-09-27

### Added & Enhanced
- **Asana-Style Task Slide-Over Drawer ([`<TaskDetailModal />`](file:///d:/Synca-FYP/apps/web/src/components/task/TaskDetailModal.tsx))**:
  - Converted the task detail view into a full-height slide-over side drawer emerging smoothly from the right side of the screen (`animate-in slide-in-from-right duration-300`).
  - Added Asana-style quick action header with a 1-click **"Mark Complete" / "Completed"** toggle button.
  - Organized task attributes into an Asana-style structured properties table (Assignees with avatar chips, Due Date, Project, Status badges, and Priority pills).
  - Integrated full subtask checklist toggling, scrollable comments stream, and real-time comment authoring bar.
- **Instant Project Synchronization & In-Memory SWR Cache ([`useProjects.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useProjects.ts))**:
  - Implemented a shared in-memory project cache with instant initialization, eliminating cold-start flickering and navigation lag across Dashboard, Projects, and Sidebar.
  - Applied optimistic updates across `createProject`, `joinProject`, `updateProject`, and `deleteProject` for zero-latency UI sync.
- **Dashboard Task Synchronization & Tab Counter Badges ([`dashboard/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx))**:
  - Synchronized task fetching with Clerk authentication readiness (`isAuthLoaded` & `isSignedIn`) and token refresh fallback to ensure tasks across all user projects populate on initial load.
  - Added an **"All"** tasks tab alongside real-time task counter badges for `All`, `Upcoming`, `Overdue`, and `Completed`.
  - Prevented premature task omission when projects are loading asynchronously.

### Fixed
- **API Task Route Alignment ([`apps/api/src/routes/task.routes.ts`](file:///d:/Synca-FYP/apps/api/src/routes/task.routes.ts))**:
  - Registered `router.get('/my', getMyTasks)` alongside `/my-tasks` so the canonical endpoint `GET /api/v1/tasks/my` called by the frontend no longer returns `404 Not Found`.
  - Added `PUT /:id/move` alongside `PATCH /:id/move` for complete API client compatibility.

## [Architecture Simplification - Project-Centric Model] - 2026-09-22

### Changed & Refactored
- **Simplified Project-Centric Architecture**:
  - Completely deprecated and removed the top-level `Workspace` collection, controllers, routes (`/api/v1/workspaces`), contexts, and modals.
  - Made **Projects** the top-level collaboration boundary across Synca. Removed `workspaceId` requirement from `Project` and `Task` schemas.
- **Project Join Codes**:
  - Added auto-generated unique **6-character alphanumeric `joinCode`** (e.g., `AB12CD`) to all projects using cryptographically secure `generateJoinCode()`.
  - Implemented `POST /api/v1/projects/join` endpoint and created [`<JoinProjectModal />`](file:///d:/Synca-FYP/apps/web/src/components/project/JoinProjectModal.tsx) for 1-click project joining.
  - Added Join Code display card with clipboard copy button and Admin join code reset trigger ([`regenerateJoinCodeApi`](file:///d:/Synca-FYP/apps/web/src/lib/api/project.api.ts)).
- **Simplified Project Roles & Permissions**:
  - Defined 3 core project roles: **`Admin`**, **`Moderator`**, and **`Member`** in `@synca/types` and `@synca/zod-schemas`.
  - Updated [`<EditTeamModal />`](file:///d:/Synca-FYP/apps/web/src/components/project/EditTeamModal.tsx) and project controllers to allow Project Admins to promote/demote member roles and manage rosters dynamically.
- **Frontend & Navigation Refactor**:
  - Updated [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx) with a unified User Profile header and quick action triggers (`+ Create Project` and `🔑 Join Project`).
  - Updated [`/projects`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/page.tsx) and [`/projects/[id]`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/[id]/page.tsx) to list all user projects and display project role badges.
  - Updated [`/dashboard`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx) and [`TopBar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/TopBar.tsx) to operate seamlessly without Workspace context.
  - Updated all Danger Zone UI labels and confirmation prompts from "Archive Project" / "Archiving..." to "Delete Project" / "Deleting...".
- **Database Reset**:
  - Wiped all existing project, task, and workspace documents from MongoDB Atlas for a clean slate.

- **Task Detail View Modal (`<TaskDetailModal />`)**:
  - Created dedicated organized read-only view for tasks distinct from full edit form, featuring status quick selector, subtasks checklist, assignee avatars, and comment stream.
- **Task Comments System**:
  - Added `TaskComment` schema, interface, and `POST /api/v1/tasks/:id/comments` endpoint allowing assignees and admins to post updates with Clerk user avatars and timestamps.
- **Role-Gated Task Permissions & Visibility**:
  - Restricted task visibility in `getProjectTasks` and `getMyTasks`: regular members only see tasks assigned to them or created by them. Unassigned tasks are visible strictly to Task Creators and Project Admins/Moderators.
  - Restricted full task property editing and task deletion to Task Creators and Project Admins/Moderators. Assigned regular members have status change and commenting permissions.

### Fixed
- **Dashboard Task Display & Date Boundaries**:
  - Broadened `getMyTasks` backend query (`apps/api/src/controllers/task.controller.ts`) so tasks created in any joined project, assigned to, or created by the user are returned.
  - Updated string ID matching (`String(p._id) === String(t.projectId)`) in [`/dashboard/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx) to reliably associate tasks with active user projects.
  - Aligned "Upcoming" vs "Overdue" task filtering in Dashboard to evaluate due dates against `todayStart` (`00:00:00.000` local time), ensuring tasks due on the current day correctly display under the "Upcoming" tab instead of "Overdue".
- **Database Cleanup Script**:
  - Created [`scripts/clear-db.js`](file:///d:/Synca-FYP/scripts/clear-db.js) and added `npm run clear-db` task to wipe all collections across MongoDB Atlas.

## [Phase 3 - Projects & Tasks] - 2026-09-21

### Added
- **Project Roles & Granular Access Control**:
  - Defined `ProjectRole = 'Admin' | 'Member' | 'Viewer'` and `ProjectTeamMember` interface in `@synca/types` and `createProjectSchema` in `@synca/zod-schemas`.
  - Added `members` subdocument array to Mongoose `Project` model storing `{ userId, role }`.
  - Updated `createProject` in `apps/api/src/controllers/project.controller.ts`: project creator is automatically assigned `'Admin'` role; invited members are assigned their selected role (default `'Member'`).
  - Updated `getProjectById` and `updateProject` to enrich `teamMemberProfiles` with `projectRole`.
  - Updated `<CreateProjectModal />`: allows assigning project roles (`Admin / PM`, `Contributor`, `Viewer`) when selecting team members, automatically designating creator as Admin.
  - Updated `<EditTeamModal />`: allows Project Admins and Workspace Admins to update individual member project roles dynamically with visual color-coded selector pills.
  - Updated Project Overview page (`/projects/[id]`):
    - Displays color-coded project role badges (`Admin / PM` in amber, `Contributor` in emerald, `Viewer` in blue) in the Assigned Team roster card.
    - Viewers have read-only access to board and task list without permission to create, edit, or delete tasks.
    - Project Settings tab and "Manage Team" action are restricted exclusively to Project Admins and Workspace Admins.
- **Data Models & Schema Alignment (Step 1)**:
  - Scoped Mongoose `Project` and `Task` schemas in `apps/api/src/models/` to `workspaceId` with compound indexes (`workspaceId + slug`, `workspaceId + status`, `projectId + status + order`).
  - Aligned `packages/types/src/models.ts` with comprehensive `Project`, `Task`, `Subtask`, and `Milestone` interfaces.
  - Created Zod validation schemas in `packages/zod-schemas/src/project.ts` and `task.ts` with `z.input` typing supporting optional default values for API consumers.
- **Project Backend REST API (Step 2)**:
  - Implemented `/api/v1/projects` endpoints in `apps/api/src/controllers/project.controller.ts` and `routes/project.routes.ts`:
    - `POST /api/v1/projects`: Create project in workspace with auto-generated slug.
    - `GET /api/v1/projects`: List workspace projects with text search, status filtering, and pagination.
    - `GET /api/v1/projects/:id`: Fetch project details enriched with Clerk team member profiles (avatars, full names, emails).
    - `PATCH /api/v1/projects/:id`: Update project details, goals, milestones, or member roster.
    - `DELETE /api/v1/projects/:id`: Soft delete project and its associated tasks.
- **Task Backend REST API (Step 3)**:
  - Implemented `/api/v1/tasks` endpoints in `apps/api/src/controllers/task.controller.ts` and `routes/task.routes.ts`:
    - `POST /api/v1/tasks`: Create project task or private personal task with subtasks checklist.
    - `GET /api/v1/tasks`: Fetch tasks for a project with status and private filters.
    - `GET /api/v1/tasks/my`: Fetch all tasks assigned to or created by current user across workspace.
    - `PATCH /api/v1/tasks/:id`: Update task fields, priority, due date, subtasks, or status.
    - `PUT /api/v1/tasks/:id/move`: Atomic Kanban column transition and reordering with automatic order shifting.
    - `DELETE /api/v1/tasks/:id`: Soft delete task.
- **Frontend API Clients & Custom Hooks (Step 4)**:
  - Built authenticated API clients `apps/web/src/lib/api/project.api.ts` and `task.api.ts` with automatic 401 retry resilience via `withAuth`.
  - Built `useProjects` React hook managing workspace project state with search and filtering.
  - Built `useTasks` React hook with optimistic UI reordering for Kanban drag-and-drop.
- **Project Portfolio Page & Create Modal (Step 5)**:
  - Replaced dummy project cards in `apps/web/src/app/(app)/projects/page.tsx` with live workspace data.
  - Built top metrics summary strip (*Total Projects, Active Sprint, On Track, At Risk, Completed*).
  - Built status filter pills, search input, and responsive project cards with progress bars and member avatars.
  - Built `<CreateProjectModal />` (`apps/web/src/components/project/CreateProjectModal.tsx`) using React Portal (`z-[9999]`) with workspace team member roster picker, status, and privacy toggles.
- **Dynamic Project Detail Page (Step 6)**:
  - Implemented `apps/web/src/app/(app)/projects/[id]/page.tsx` with dynamic ID/slug resolution, breadcrumb navigation, completion gauge, and team member chips.
  - Built tab navigation across **Overview**, **Board**, **List**, and **Settings**.
  - Overview tab displays rich project brief, interactive goals checklist with instant toggle, and milestone progress cards.
  - Settings tab provides project update forms, status controls, and soft-deletion trigger.
- **Kanban Board with Drag-and-Drop (Step 7)**:
  - Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
  - Built `apps/web/src/components/project/ProjectKanbanBoard.tsx` with columns for *To Do*, *In Progress*, and *Done*.
  - Added sortable task cards, drag handles, subtask checklist counters, priority badges, and column task counters.
  - Supported drag-and-drop between columns with optimistic UI updates and backend synchronization.
- **Tabular Task List & Task Modal (Step 8)**:
  - Built `apps/web/src/components/project/ProjectTaskTable.tsx` for structured list view with inline status badges, due dates, priority pills, and quick action menus.
  - Built `<TaskModal />` (`apps/web/src/components/task/TaskModal.tsx`) using React Portal for creating and editing tasks with priority selection, date pickers, workspace assignee assignment, and dynamic checklist management.
- **Dashboard Live Integration (Step 9)**:
  - Connected `apps/web/src/app/(app)/dashboard/page.tsx` to live user tasks via `fetchMyTasks`.
  - Dynamic Task Status column (*Upcoming*, *Overdue*, *Completed*) mapped from live task status and due dates.
  - Dynamic Task Completion gauge calculated from active vs completed tasks.
  - Dynamic Ongoing Projects widget showing active workspace projects with direct links to project detail pages.
### Fixed
- **Sidebar Real Projects**: Removed hardcoded sample projects (`Develop API Endpoints`, `Alfa - Onboarding Flow`, etc.) from `Sidebar.tsx`. Connected "All Projects" sub-navigation to live workspace projects via `useProjects()` with active route highlighting and a fallback `+ Create a project` link.
- **Member Name & Avatar Resolution**:
  - Enriched workspace members in `getUserWorkspaces` (`apps/api/src/controllers/workspace.controller.ts`) with Clerk user profiles (`clerkClient.users.getUserList`), providing real full names, email addresses, and avatars.
  - Resolved `Member (wRYt)` fallback bug in `CreateProjectModal.tsx`: now displays member full names and profile avatars, with clear `(You)` indicators.
  - Resolved `YT` slice avatar bug in `ProjectCard` (`apps/web/src/app/(app)/projects/page.tsx`): now cross-references `activeWorkspace.members` to render actual user avatars and real name initials.
- **Project Progress Calculation**: Fixed project card progress fallback defaulting to `40%` on newly created projects with 0 goals. Now accurately starts at `0%` until goals or tasks are completed.
- **Dashboard Real Data & Clean Empty States**:
  - Completely purged static mock arrays (`upcomingTasks`, `overdueTasks`, `completedTasks`, `ongoingProjects`, `recentChats`) from `dashboard/page.tsx`.
  - Replaced fake `84.2%` completion rate with actual live task percentage (clean `0%` when zero tasks).
  - Replaced fake `48 avg` team velocity with live count of tasks completed within the past 7 days.
  - Replaced fake ongoing projects with real workspace projects or a clean empty state.
  - Replaced hardcoded recent chats with real workspace team members.
  - Replaced static task lists with elegant empty states guiding the user to create tasks.
- **Client Route Param Safety**: Updated `apps/web/src/app/(app)/projects/[id]/page.tsx` to use `useParams()` from `next/navigation` for reactive, safe client route resolution, and cleared stale `.next` webpack build chunks.
- **Private Project & Task Access Enforcement**:
  - Enforced privacy check in `apps/api/src/controllers/project.controller.ts`: When a project has `privacy: 'Private'`, non-team members (who are not workspace owners or admins) cannot list it, view its details, or modify it.
  - Enforced project privacy check in `apps/api/src/controllers/task.controller.ts`: Non-team members cannot retrieve or create tasks inside `Private` projects.
  - Project deletion is strictly restricted to workspace owners and admins.
- **Roles, Permissions & Project Team Management**:
  - Authored comprehensive specification [`docs/roles-and-permissions.md`](file:///d:/Synca-FYP/docs/roles-and-permissions.md) defining the three-tier inheritance hierarchy (Workspace -> Project -> Task), WorkspaceWide vs TeamWide (Private) visibility rules, Project roles, and Task-level visibility controls.
  - Implemented `<EditTeamModal />` (`apps/web/src/components/project/EditTeamModal.tsx`) enabling project managers and workspace admins to search, select, add, and remove workspace members from any project team.
  - Added "Manage Team" triggers in the Project Overview tab, the Top Header team avatar strip, and a dedicated "Project Team" card in the Settings tab.
  - Enforced WorkspaceWide read-only overview restriction in `apps/web/src/app/(app)/projects/[id]/page.tsx`: Non-team workspace members can only view the Overview & Goals tab in read-only mode with an ambient banner, while Board, List, Settings, and Task creation are locked.
  - Enforced backend authorization in `apps/api/src/controllers/task.controller.ts` on `getProjectTasks`, `createTask`, `updateTask`, and `moveTask`: restricted strictly to project team members and workspace admins.
- **Deleted Project & Task Synchronization**:
  - **Cascade Soft-Deletion**: Updated `deleteProject` in `apps/api/src/controllers/project.controller.ts` to automatically cascade soft-delete all child tasks (`Task.updateMany({ projectId: project._id }, { deletedAt: new Date() })`).
  - **Self-Healing & Deleted Project Filtering**: Updated `getMyTasks` in `apps/api/src/controllers/task.controller.ts` to self-heal orphaned tasks from previously deleted projects and strictly restrict returned tasks to currently active projects or personal tasks.
  - **Dashboard Task Filtering**: Updated `apps/web/src/app/(app)/dashboard/page.tsx` to filter tasks against active projects so orphaned tasks from deleted projects never render.
  - **Live Multi-Component Event Synchronization**: Added `synca:projects-changed` and `synca:tasks-changed` event dispatchers and listeners across `useProjects`, `useTasks`, `page.tsx`, and `dashboard/page.tsx`. When a project or task is created, modified, or deleted anywhere in the app, the Sidebar, Dashboard, and Project views instantly re-synchronize without requiring a page refresh.

## [Dark Mode & Theme Architecture] - 2026-09-20

### Added
- **System-Wide Light & Dark Mode Architecture**:
  - Configured class-based dark mode (`darkMode: 'class'`) across Tailwind CSS configuration in `apps/web/tailwind.config.js`.
  - Created `ThemeContext` and `ThemeProvider` in `apps/web/src/context/ThemeContext.tsx` with full support for `'light' | 'dark' | 'system'` modes, `localStorage` persistence (`synca_theme`), and OS `prefers-color-scheme` media query listeners.
  - Implemented zero-FOUC (Flash of Unstyled Content) synchronous inline script in `apps/web/src/app/layout.tsx` before DOM paint.
  - Built interactive animated `<ThemeToggle />` component (`apps/web/src/components/shared/ThemeToggle.tsx`) with Sun/Moon micro-animations and size variants (`sm` and `md`).
  - Mounted `<ThemeToggle />` in:
    - `TopBar.tsx`: Accessible from any app page.
    - `WorkspaceSwitcher.tsx`: Quick toggle directly inside the user & workspace flyout menu.
    - `dashboard/page.tsx`: In the top stat greeting chip bar.
    - `settings/page.tsx`: Dedicated "Appearance & Theme" selection card supporting Light, Dark, and System Sync.
  - Upgraded all pages and components with high-fidelity dark mode tokens:
    - Base canvas: `bg-[#f4f4f5]` in Light mode / pure `#000000` pitch black in Dark mode with fixed, subtle AI-style ambient radial green/lime/mint gradients (`radial-gradient` in `globals.css`).
    - Primary card surfaces: `bg-white` / `dark:bg-[#10141e]/65 dark:backdrop-blur-xl dark:border-white/[0.08]` translucent iOS-style glass allowing the ambient green glow to bleed through.
    - Menus and flyouts: `dark:bg-[#10141e]/90 dark:backdrop-blur-2xl dark:border-white/[0.12]`.
    - Sticky cards (`TaskCard.tsx`): yellow (`dark:bg-amber-950/25`), peach (`dark:bg-orange-950/25`), and white (`dark:bg-white/[0.04]`), all with `backdrop-blur-md`.
    - Universal sleek scrollbar styling in `globals.css` (5px rounded pill thumb, transparent track, zero native Windows gray/white bar intrusion, plus `.scrollbar-none` utility).
    - `chats/page.tsx`: Translucent dark glass container, bubbles, attachment cards, and right contact profile drawer.
    - `workspaces/[id]/page.tsx`: Translucent dark glass banner, join code widget, members roster table, and settings danger zone.
    - `projects/page.tsx`: Translucent dark glass filter dropdowns, project cards, and new project placeholder.
  - Added section **6. Dark Mode Tokens & Architecture Guidelines** to `docs/design-system.md` detailing standard token pairings for all future phases.

### Fixed
- Fixed unsightly default Windows scrollbars cutting through rounded cards by adding universal sleek 5px transparent track scrollbars and a `.scrollbar-none` utility class.
- Fixed flyout menu transparency bleed where dashboard text showed through the popover by giving it a solid opaque obsidian background (`bg-[#0b0e14]`), solid user profile header, and rich drop shadow (`shadow-[0_20px_60px_rgba(0,0,0,0.9)]`).
- Fixed Clerk session token verification in `apps/api/src/middleware/auth.middleware.ts` by using `getAuth(req)` from `@clerk/express` to resolve user session claims and attach them to `req.auth`.
- Added explicit `publishableKey` and `secretKey` configuration to `clerkMiddleware()` in `apps/api/src/app.ts` along with early environment variable loading.
- Enhanced backend auth middleware with detailed diagnostic logging on unauthenticated requests.
- Added automatic 401 retry resilience in `apps/web/src/context/WorkspaceContext.tsx` via `withAuth()` helper, automatically fetching a fresh session token (`getToken({ skipCache: true })`) from Clerk if the client session was idle or expired before displaying an error.
- Fixed workspace member roster display: replaced raw Clerk user ID placeholder labels (`User (user_3H8lE...)`, `user_...`, and ID-slice initials `YT`) with the user's actual profile photo, full name (`Saqib Arshad`), email address, and proper initials. Enriched backend `getWorkspaceById` with Clerk user profiles (`clerkClient.users.getUserList`).

## [Phase 2 - Workspace Management] - 2026-07-28

### Added
- Upgraded **User Profile & Workspace Switcher Header**:
  - Merged the separate User Profile card and Workspace card into a unified header card showing avatar, user name, and active workspace with interactive status indicators.
  - Built a sleek flyout popover menu opening to the right (`left-[calc(100%+0.75rem)]`) containing user profile details, email, interactive workspace switcher with checkmarks, quick actions ("Create Workspace", "Join with Code", "Manage Workspace"), settings shortcut, and sign-out trigger.
- Completed **Phase 2 — Step 6: Dedicated Workspace Overview Page & Phase 2 Milestone**:
  - Implemented the dedicated `/workspaces/[id]` route (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`) with dynamic ID/slug resolution, breadcrumb navigation, and responsive header banner.
  - Built an interactive **Invite Code Widget** with one-click clipboard copying (`navigator.clipboard.writeText`) and animated checkmark feedback.
  - Built the **Members & Team Roster** tab featuring member search filtering, role indicators (`Owner`, `Admin`, `Member`), joined dates, and admin member removal controls.
  - Built the **Workspace Settings** tab allowing workspace admins/owners to update name, description, and toggle privacy (Public vs. Private) with live feedback.
  - Built the **Danger Zone** with role-gated Leave Workspace (non-owners) and Delete Workspace (owners) workflows featuring safety confirmation states.
  - Phase 2 (Workspace Management) is **100% Complete**!

### Fixed
- Fixed modal stacking context and clipping bug where Task Cards overlapped modal dialogs:
  - Upgraded `CreateWorkspaceModal` and `JoinWorkspaceModal` to render using React Portals (`createPortal(..., document.body)`).
  - Assigned `z-[9999]` with rich darkened backdrop blur (`bg-black/75 backdrop-blur-md`) and zoom-in entrance animation.
  - Added `z-30` to Sidebar container and click-outside/Escape-key dismissal handlers.
- Completed **Phase 2 — Step 5: Create & Join Workspace Modals**:
  - Implemented `CreateWorkspaceModal` (`apps/web/src/components/workspace/CreateWorkspaceModal.tsx`) with client-side Zod validation (`createWorkspaceSchema`), workspace name, description, privacy toggle (Public vs. Private), loading spinner, and error state handling.
  - Implemented `JoinWorkspaceModal` (`apps/web/src/components/workspace/JoinWorkspaceModal.tsx`) featuring a 6-character monospace invite code input, automatic uppercase filtering, Zod schema validation, and immediate workspace activation on join.
- Completed **Phase 2 — Step 4: Workspace Selector & Switcher in Sidebar**:
  - Created `WorkspaceSwitcher` (`apps/web/src/components/workspace/WorkspaceSwitcher.tsx`) integrated directly into the floating sidebar, displaying the active workspace name, avatar badge, user role, and member count.
  - Built an accessible dropdown popover with click-outside detection and Escape key closing, workspace listing with active checkmark indicators, and quick action buttons for "Create Workspace", "Join with Code", and "Manage Workspace".
  - Updated `Sidebar.tsx` to mount the `WorkspaceSwitcher` prominently beneath the user profile.
  - Updated `TopBar.tsx` to dynamically display the active workspace name from the `useWorkspace` hook.
- Completed **Phase 2 — Step 3: Workspace Context & Hook**:
  - Implemented typed client API services in `apps/web/src/lib/api/workspace.api.ts` wrapping all `/api/v1/workspaces` endpoints with Clerk bearer token authentication and standard error handling.
  - Built `WorkspaceContext` & `WorkspaceProvider` in `apps/web/src/context/WorkspaceContext.tsx` providing centralized workspace state, active workspace selection, persistent caching (`synca_active_workspace_id`), and role derivation (`userRole`, `isOwner`, `isAdmin`).
  - Created custom `useWorkspace()` hook in `apps/web/src/hooks/useWorkspace.ts` with context validation guard.
  - Integrated `<WorkspaceProvider>` into `apps/web/src/app/(app)/layout.tsx` to provide workspace state across all app views.
  - Added `NEXT_PUBLIC_API_URL` configuration to `apps/web/.env.local`.
- Completed **Phase 2 — Step 2: Workspace API Endpoints**:
  - Implemented `apps/api/src/utils/workspace-helpers.ts` for cryptographically secure 6-character uppercase join code generation (`generateJoinCode`) and URL slug generation (`slugify`).
  - Implemented `apps/api/src/controllers/workspace.controller.ts` handling workspace CRUD, join code verification, member authorization, and role protection.
  - Created `apps/api/src/routes/workspace.routes.ts` with Clerk session authentication (`requireAuth`) on all routes.
  - Mounted workspace router at `/api/v1/workspaces` in `apps/api/src/app.ts`.
  - Documented all endpoint schemas and error codes in `docs/api.md` and updated `CONTEXT.md`.
- Completed **Phase 2 — Step 1: Database Model & Zod Schemas**:
  - Created shared TypeScript interfaces (`Workspace`, `WorkspaceMember`, `WorkspaceRole`) in `packages/types/src/workspace.types.ts`.
  - Created Zod validation schemas (`createWorkspaceSchema`, `joinWorkspaceSchema`, `updateWorkspaceSchema`) in `packages/zod-schemas/src/workspace.schema.ts`.
  - Defined Mongoose `Workspace` model in `apps/api/src/models/Workspace.ts` with compound indexes on `joinCode`, `slug`, `ownerId`, and `members.userId`.
  - Documented `Workspace` collection specification in `docs/database.md`.

### Fixed
- Fixed Upstash Redis connection loop error (`SocketClosedUnexpectedlyError`) by upgrading `REDIS_URL` in `apps/api/.env.local` from unencrypted `redis://` to TLS-encrypted `rediss://`.
- Enhanced `apps/api/src/loadEnv.ts` with absolute path directory resolution and `override: true` to ensure local development environment overrides are correctly applied.
- Verified live server `/health` returns status `200 OK` with both MongoDB and Redis `connected`.

## [Phase 1 - Dashboard] - 2026-07-28

### Added
- Completed **Phase 1 — Step 6: Route Simplification & Phase 1 Milestone**:
  - Removed the `ToDo List` tab and `/todo` route per user specification, streamlining application navigation to Dashboard and Projects views.
  - Phase 1 (Dashboard) is **100% Complete**!
- Completed **Phase 1 — Step 5: Ongoing Projects & Recent Chats Widgets**:
  - Upgraded the Ongoing Projects card, inserting detailed progress tracking bars with custom Tailwind widths and gradient indicators scoped to project category color models.
  - Redesigned the Recent Chats card structure, adding initials-based avatar profile blocks, active glowing presence indicator dots, and dynamic unread message counter badges.
  - Implemented card border glow, scaling lifts, and list margin layouts for increased visual density and feedback.
- Completed **Phase 1 — Step 4: Analytics Completed Projects Chart**:
  - Replaced the vertical projects bar chart mockup with a premium "Completed Tasks" frequency chart displaying 7 vertical rounded pill strips (Mon-Sun) matching the user's specific design mockup.
  - Applied color-weight gradients (from light green `from-[#bfead7] to-[#99d7bd]` to darker green `from-[#5bd9a8] to-[#3cae81]`) indicating the frequency of tasks completed on each day.
  - Aligned fonts, title structures ("Completed Tasks"), and subtitles ("24 Tasks Completed this Week") to match the screenshot parameters exactly.
- Completed **Phase 1 — Step 3: Task Status Navigation Panels**:
  - Defined custom lists for `overdueTasks` (simulating active overdue development and security tasks) and `completedTasks` (simulating recently resolved monorepo and auth setup tasks).
  - Wired up the tab filter component to toggle rendering dynamically based on the active tab selection state (`Upcoming` | `Overdue` | `Completed`).
  - Upgraded the shared `TaskCard` component to dynamically render colored status pills: green for completed tasks, red/rose for overdue tasks, and light grey for upcoming tasks.
- Completed **Phase 1 — Step 2: Metrics Stats Bar**:
  - Replaced the static icons in the Task Completion metrics card with a custom SVG radial/gauge circular progress ring showing the dynamic 84% completion.
  - Upgraded Active Projects and Team Velocity stats cards with custom micro-animations (e.g. lift, shadow transitions, and pulsing energy bolt).
  - Enhanced stats card layout margins, fonts, and borders to align with the premium glassmorphism design parameters.
- Completed **Phase 1 — Step 1: Dashboard Layout & Greeting Grid**:
  - Integrated Clerk's `useUser()` hook inside the main Dashboard layout file `apps/web/src/app/(app)/dashboard/page.tsx` to retrieve the authenticated member's display name.
  - Coded a dynamic client-side greeting function determining and rendering time-of-day parameters ("Good Morning/Afternoon/Evening") depending on the user's system clock.
  - Implemented safe `useEffect` side-effects to prevent SSR hydration mismatches in Next.js.



## [Manual Sync] - 2026-07-28

- Audited and synchronized workspace documentation.
- Reconciled `CONTEXT.md`, `CHANGELOG.md`, and design specifications under `docs/design-system.md` following Phase 0 Step 2 layout updates.

### Fixed
- Fixed Express backend ESM hoisting issue where server initialization imported database and Redis clients before `dotenv` was fully loaded, resulting in `REDIS_URL` missing errors. Introduced `loadEnv.ts` loaded at the absolute top of the index entrypoint.

### Added
- Completed **Phase 0 — Step 6: Environment Configuration & Base Shell Verification**:
  - Documented all required client-side and server-side configurations in `apps/web/.env.example` and `apps/api/.env.example`.
  - Verified local dev runtime environments (`npm run dev`) and health pings (`/health` returning 200 OK with connected status).
- Completed **Phase 0 — Step 5: Cloudinary File Storage Configuration**:
  - Installed `cloudinary` and `multer` file upload packages (along with `@types/multer` typing support).
  - Defined Mongoose `FileRef` database schema in `apps/api/src/models/FileRef.ts` with standard parameters (`uploaderId`, `roomId`, `cloudinaryPublicId`, `cloudinaryUrl`, `fileName`, `fileSize`, `fileType`, `uploadedAt`), query middleware soft-delete exclusions, and compound indexing.
  - Implemented Cloudinary v2 SDK configuration and upload buffer stream helper in `apps/api/src/lib/cloudinary.ts`.
  - Built `POST /api/v1/files/upload` route in `apps/api/src/routes/file.routes.ts` utilizing `multer` in-memory storage, validating parameter shapes, limiting file sizes to **25 MB**, and validating permitted MIME types.
  - Registered file upload router in `apps/api/src/app.ts` under `/api/v1/files`.
- Completed **Phase 0 — Step 4: Express Server & MongoDB Connection**:
  - Installed `mongoose` and `redis` client packages in `apps/api`.
  - Implemented MongoDB Atlas connection pooling in `apps/api/src/lib/mongodb.ts` with connection events monitoring and graceful shutdown handling.
  - Implemented Upstash Redis client connection setup in `apps/api/src/lib/redis.ts` supporting SSL/TLS connection strings.
  - Refactored `apps/api/src/app.ts`'s `/health` endpoint to query and return real-time statuses of MongoDB Atlas and Upstash Redis connections (pings).
  - Updated server start routine in `apps/api/src/index.ts` to await MongoDB and Redis connections successfully before launching the Express listener.
- Completed **Phase 0 — Step 3: Clerk Authentication System**:
  - Integrated Clerk Authentication in Next.js client (`@clerk/nextjs@^5`) and Express backend (`@clerk/express`).
  - Implemented Next.js edge authentication middleware (`apps/web/src/middleware.ts`) protecting all app routes and keeping `/sign-in` and `/sign-up` public.
  - Created customized `/sign-in` and `/sign-up` routes matching the dark theme design system.
  - Updated `Sidebar.tsx` user profile layout to dynamically load logged-in user profile image/details and wired up the sign-out trigger.
  - Implemented reusable backend authentication middleware (`requireAuth`) enforcing the standard JSON error envelope (`401 UNAUTHORIZED`).
  - Mounted global Clerk middleware in Express server and added `/api/v1/protected-test` endpoint for authentication validation.
- Project Roadmap & Phase Progress tracking table in `CONTEXT.md` (Phases 0 through 8).
- Atomic 6-step breakdown checklist for Phase 0: Setup & Foundation.
- Completed **Phase 0 — Step 1: Monorepo & App Initialization**:
  - Configured Turborepo monorepo workspace (`package.json`, `turbo.json`, root `tsconfig.json`).
  - Created `@synca/types` package with core entity interfaces, permissions matrix, API envelopes, and Socket event schemas.
  - Created `@synca/zod-schemas` package with Zod validation schemas for room, project, task, and message payloads.
  - Created `@synca/config` package with shared application constants.
  - Created `apps/api` Express application shell (`app.ts`, `index.ts`, `tsconfig.json`).
  - Created `apps/web` Next.js 14 App Router application shell with Tailwind CSS (`layout.tsx`, `page.tsx`, `globals.css`).
  - Verified `npm run typecheck` (8 tasks) and `npm run build` (5 tasks) clean compilation.
- Completed **Phase 0 — Step 2: Component Library & Base Shell Layout**:
  - Documented complete design system in `docs/design-system.md` from Figma mockups in `/design/`.
  - Configured `tailwind.config.js` with exact design tokens (`#16191e` sidebar, `#d8f870` lime accent, `#8be6c1` mint accent, `#fde896` sticky yellow, `#f9c5d1` sticky pink).
  - Built dark floating `Sidebar` component (`#16191e`, user profile header, expandable project list, team chat member list with avatars/titles, settings/sign-out buttons).
  - Built `TopBar` component with global search input, workspace badge, notification bell with unread indicator, and share button.
  - Created application route layout and pixel-matched page views for `/dashboard`, `/todo`, `/projects`, `/chats`, and `/settings`.
  - Created reusable `TaskCard.tsx` component matching the exact pixel design from user's mockups (Title, Assignee avatar, `Upcoming` pill badge, Project name, `Due: date` red pill badge, and `✳ DevSek` category badge).
  - Verified clean compilation with `npm run typecheck` and static pre-rendering across 9 routes with `npm run build`.



## [0.1.0] - 2026-07-26

### Added
- Repository bootstrap and system engineering blueprint (`SYNCA_README.md`, `SYNCA_SYSTEM_DESIGN.md`).
- Project context file (`CONTEXT.md`) with active tech stack, system concepts, and complete API/WebSocket endpoint registry.
- Detailed foundational specifications inside `/docs/`:
  - `docs/api.md`: REST API envelope, endpoint specifications, status codes, and Socket.io event catalog.
  - `docs/database.md`: MongoDB schema specifications, Mongoose models, compound indexes, and soft-delete strategy.
  - `docs/architecture.md`: Architectural Decision Records (ADR-001 through ADR-007), system overview, backend layering, and state management rules.
  - `docs/realtime-security.md`: Real-time WebSocket scaling with Redis Pub/Sub, RBAC permission matrix, rate limits, and security hardening rules.
- Automated documentation synchronization protocols (`.antigravity/rules.md` & `.agents/rules/sync-automation.md`).
