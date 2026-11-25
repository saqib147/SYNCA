# Changelog

All notable changes to the Synca project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Production Deployment Readiness — Render + Vercel] - 2026-11-25
- Added [`render.yaml`](file:///d:/Synca-FYP/render.yaml) Render Blueprint for free-tier Node.js deployment of `apps/api` (`npm ci && npx turbo run build --filter=api...` + `npm run start --workspace=api` + `/health` probe).
- Hardened [`apps/api/src/app.ts`](file:///d:/Synca-FYP/apps/api/src/app.ts) and [`apps/api/src/socket/index.ts`](file:///d:/Synca-FYP/apps/api/src/socket/index.ts) for production reverse proxies: enabled `trust proxy`, normalized comma-separated `CLIENT_URL` origins (stripping trailing slashes), and updated `/health` to return `200` (`degraded` if optional Redis is disconnected, `healthy` when both MongoDB and Redis are connected).

## [Documentation Sync] - 2026-11-22
- Reconciled [`CONTEXT.md`](file:///d:/Synca-FYP/CONTEXT.md), [`docs/api.md`](file:///d:/Synca-FYP/docs/api.md), [`docs/architecture.md`](file:///d:/Synca-FYP/docs/architecture.md), [`docs/database.md`](file:///d:/Synca-FYP/docs/database.md), [`docs/design-system.md`](file:///d:/Synca-FYP/docs/design-system.md), [`docs/realtime-security.md`](file:///d:/Synca-FYP/docs/realtime-security.md), and [`docs/roles-and-permissions.md`](file:///d:/Synca-FYP/docs/roles-and-permissions.md) with all implemented changes (decoupled board columns, 24h ephemeral 25 MB Cloudinary file transfers, DM conversation deletion & inline email lookup, rich-text inline markdown formatting, departed member handling, canonical Figma Light/Dark palette, and viewport-locked internal-scroll app shell).
- Generated complete Final Year Project Thesis/Report documentation suite under [`docs/fyp-report/`](file:///d:/Synca-FYP/docs/fyp-report/Synca-FYP-Complete-Report.md) (Front Matter & TOC, Chapter 1 Introduction with screen-by-screen walkthroughs, Chapter 2 Design & Architecture with Mermaid UML diagrams, Chapter 3 Development Environment setup manual, Chapter 4 Conclusion & Future Work, and References), plus formal Microsoft Word thesis document [`Synca-FYP-Documentation.docx`](file:///d:/Synca-FYP/docs/fyp-report/Synca-FYP-Documentation.docx) with embedded UI screenshots and all 10 rendered UML/ERD diagrams.

## [Figma Design Alignment — Project Conversation, Direct Messages & New User Discovery (Frames 80:875, 86:330, 86:890)] - 2026-11-22

### Changed & Added
- **New User Discovery & Start Conversation ([`NewMessageModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/NewMessageModal.tsx))**:
  - Redesigned in the crisp Synca Figma modal system (`rounded-[20px]`, `#bdc9c2` borders, `#006c52`/`#66deb4` accents).
  - Upgraded Tier 3 exact-email discovery to perform **inline live lookup** against `GET /api/v1/users/lookup` directly inside the modal (previewing the matched user's real avatar & name with a 1-click **Chat** button, or showing a clear not-found message without a jarring redirect).
- **Project Conversation (Frame `80:875`) ([`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx), [`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx), [`ChatInput.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatInput.tsx))**:
  - Added dedicated `variant="channel"` styling: open Slack-style left-aligned message feed with avatar, bold sender name, timestamp, clean attachment cards, hover reaction bar, and mint-bordered composer (`#f4fdf9` / `#a7e9d2`) with markdown formatting toolbar (`B`, `I`, `</>`, list).
- **Direct Messages & Profile Card (Frames `86:330`, `86:890`) ([`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx), [`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx), [`ChatSidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatSidebar.tsx))**:
  - Split-card DM layout on `#f3f3f3` canvas: full-height `20px` rounded white chat surface + toggleable detached `300px` `20px` right Profile card (`76px` rounded-square avatar, quick action squares, `About` with local time & shared projects, and real `Shared Files` extracted from conversation attachments).
  - Matched Figma DM bubbles (left light-gray `#f1f3f4`, right mint-emerald `#3eb386` with bottom-right user avatar, white attachment cards, animated 3-dot typing indicator bubble, and rounded single-row pill composer with dark-teal `#006c52` send button).
  - Added inline in-chat message search and `+` New Message onboarding CTA in the Messages Hub.

  - **Delete DM Conversation (`DELETE /api/v1/messages/dm/:peerId`) ([`message.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/message.controller.ts), [`message.routes.ts`](file:///d:/Synca-FYP/apps/api/src/routes/message.routes.ts), [`useTeammates.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useTeammates.ts), [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx), [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx), [`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx))**:
    - Added `DELETE /api/v1/messages/dm/:peerId` to soft-delete all messages in a 1:1 DM thread and broadcast `dm:deleted` over Socket.io.
    - Added Delete Conversation buttons on Sidebar **Chats** rows (on hover), inside the DM header, and at the bottom of the Profile Card; removes the conversation immediately from the sidebar (auto-reappearing if a newer message arrives later, and always searchable via `+` New Message).

  - **Single WhatsApp-Style Sidebar & Clean `/chats` ([`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx), [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx))**:
    - Removed the redundant second `Messages` sidebar (`ChatSidebar`) from `/chats` so your main left Sidebar is the single source of truth for all conversations.
    - Removed the 6-person cap and `"More People"` pill from the Sidebar — **Chats** now displays all conversations in a scrollable list ordered by most recent message with 1-line last-message previews, unread badges, `+` New Message trigger, and hover delete.
    - Visiting `/chats` without `?dm=` automatically opens your most recent conversation (or displays a clean onboarding card with `+ Start New Conversation`).

  - **Instant DM Sidebar Sync & Hydration Fix ([`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx), [`useTeammates.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useTeammates.ts), [`NewMessageModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/NewMessageModal.tsx), [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx))**:
    - Fixed React hydration mismatch (`04:48 pm` vs `16:48`) in `ContactProfileDrawer` by computing local time client-side inside `useEffect`.
    - Added optimistic `upsertDmPeerLocally()` so starting a new conversation (or sending a DM) immediately unhides and adds/bubbles the peer to the top of the left sidebar with 0ms latency and no page refresh.
    - Streamlined exact-email lookup in `NewMessageModal` to open the chat immediately in 1 click and skipped redundant profile fetches when peer metadata is already in the URL.

  - **Cloudinary Upload 403 Fix ([`cloudinary.ts`](file:///d:/Synca-FYP/apps/api/src/lib/cloudinary.ts), [`file.routes.ts`](file:///d:/Synca-FYP/apps/api/src/routes/file.routes.ts))**:
    - Lazily configures Cloudinary with trimmed environment variables on each upload/delete call (preventing ESM import-order `undefined` credential issues).
    - Explicitly uses `resource_type: 'image'` for images and `resource_type: 'raw'` for PDFs/DOCX/XLSX/TXT (avoiding Cloudinary's default PDF-as-image `403` rejection) while preserving original filenames.

  - **All File Types (25 MB Limit) & 24-Hour Auto-Delete ([`packages/config/src/index.ts`](file:///d:/Synca-FYP/packages/config/src/index.ts), [`FileRef.ts`](file:///d:/Synca-FYP/apps/api/src/models/FileRef.ts), [`file.routes.ts`](file:///d:/Synca-FYP/apps/api/src/routes/file.routes.ts), [`file-cleanup.job.ts`](file:///d:/Synca-FYP/apps/api/src/jobs/file-cleanup.job.ts), [`index.ts`](file:///d:/Synca-FYP/apps/api/src/index.ts))**:
    - Enabled `FILE_LIMITS.ALLOW_ALL_TYPES: true` with `25 MB` max size (safe raster images uploaded as Cloudinary `image`, all other file types as Cloudinary `raw`).
    - Added `expiresAt` (24-hour retention) to `FileRef` and a background `file-cleanup.job` sweeping every 15 minutes to destroy expired assets on Cloudinary and soft-delete their `FileRef` records (`GET /api/v1/files/:id` returns `410 FILE_EXPIRED` once expired).

  - **File Expiry Countdown, Expired Previews & Departed Member Handling ([`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx), [`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx), [`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx), [`project.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/project.controller.ts))**:
    - Added live 24-hour expiry countdown badges (`Expires in Xh Ym`), inline image thumbnails for safe raster images, and muted non-clickable `"File expired • Auto-deleted (24h)"` placeholders in both DM & Project Conversation bubbles and the Profile Card's **Shared Files** list.
    - Greyed out avatars (`grayscale opacity-50`) and sender names with a `"Former member"` badge in Project Conversations for users who have left or been removed from the project.
    - Updated `DELETE /api/v1/projects/:id/members/:targetUserId` (`removeMember`) to automatically unassign departed/removed members from all active tasks in that project (`Task.updateMany` with `$pull: { assignees }`).

  - **Chat Rich Text Formatting, DM Formatting Toolbar & Tighter Message Grouping ([`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx), [`ChatInput.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatInput.tsx), [`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx))**:
    - Added an XSS-safe React inline markdown renderer in `MessageBubble` so `**bold**`, `_italic_` / `*italic*`, `` `code` ``, and `- bullet` lists render as styled rich text instead of raw markdown symbols.
    - Fixed toolbar focus/selection handling (`onMouseDown={(e) => e.preventDefault()}` + placeholder text when nothing is selected) and enabled the same `B`, `I`, `</>`, and `List` formatting toolbar inside **Direct Messages** as well as **Project Conversations**.
    - Reduced vertical spacing between consecutive messages from the same user (`space-y-0` stream container + tight `py-0.5` / `mt-0.5` continuation rows vs `mt-3.5` between distinct groups).

## [Figma Color System & Light/Dark Consistency Pass] - 2026-11-22

### Changed & Fixed
- **Canonical Figma Tokens ([`globals.css`](file:///d:/Synca-FYP/apps/web/src/app/globals.css), [`tailwind.config.js`](file:///d:/Synca-FYP/apps/web/tailwind.config.js))**:
  - Unified Light Mode canvas to `#f3f3f3` (matching `layout.tsx`), sidebar chrome to `#17181c`, primary dark-teal CTA to `#006c52` (hover `#005742`), bright mint accent & online presence dots to `#66deb4`, and dark card surfaces to `#111316` / `#14171c` / `#15171b`.
- **Full Light & Dark Mode Support on Modals & Auth Pages ([`TaskModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/task/TaskModal.tsx), [`TaskDetailModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/task/TaskDetailModal.tsx), [`EditTeamModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/EditTeamModal.tsx), [`sign-in/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/sign-in/%5B%5B...sign-in%5D%5D/page.tsx), [`sign-up/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/sign-up/%5B%5B...sign-up%5D%5D/page.tsx))**:
  - Replaced hardcoded dark-only surfaces and off-brand `#d8f870`/`#8be6c1`/rainbow icon colors in `TaskModal` and `TaskDetailModal` with dual Light/Dark Figma styling and brand `#006c52`/`#66deb4` CTAs, focus rings, checkboxes, and status controls.
  - Updated `EditTeamModal` role badges, primary CTA, focus rings, and native `<option>` dark-mode backgrounds; aligned Clerk `sign-in` and `sign-up` appearance with `#006c52`/`#66deb4` and `#17181c`.
- **Dashboard, Settings, TopBar & Notifications ([`dashboard/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx), [`settings/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/settings/page.tsx), [`projects/join/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/join/page.tsx), [`TopBar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/TopBar.tsx), [`ThemeToggle.tsx`](file:///d:/Synca-FYP/apps/web/src/components/shared/ThemeToggle.tsx), [`ChatNotificationContext.tsx`](file:///d:/Synca-FYP/apps/web/src/context/ChatNotificationContext.tsx))**:
  - Migrated all bluish `dark:bg-[#10141e]` cards to neutral `dark:bg-[#111316]` / `dark:bg-[#14171c]`, replaced legacy `#036867`/`#d8f870`/`#8be6c1`/rainbow category icons with brand `#006c52`/`#66deb4`, and fixed dark-mode contrast on dashboard unread badges and avatar fallbacks.
- **Dark-Mode Contrast & Hover Fixes across Projects & Chat ([`projects/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/page.tsx), [`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/%5Bid%5D/page.tsx), [`CreateProjectModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/CreateProjectModal.tsx), [`JoinProjectModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/JoinProjectModal.tsx), [`ProjectKanbanBoard.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectKanbanBoard.tsx), [`ProjectTaskTable.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectTaskTable.tsx), [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx), [`ChatInput.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatInput.tsx), [`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx), [`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx), [`NewMessageModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/NewMessageModal.tsx), [`ChatSidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatSidebar.tsx))**:
  - Added dark-mode styling to `On Track` / `In Progress` lime pills (`dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]`), fixed bright light-mode hover flashes (`hover:bg-[#d3f2e7]`), added `dark:hover:text-rose-400`, `dark:text-[#66deb4]`, and `dark:focus:border-[#66deb4]` overrides, and standardized online dots (`#66deb4`) and primary send/submit CTAs (`#006c52` hover `#005742`).

## [Viewport-Locked App Shell & Internal Container Scrolling] - 2026-11-22

### Changed
- **App Shell & Sidebar ([`layout.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/layout.tsx), [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx))**:
  - Locked the authenticated app shell to `h-screen overflow-hidden` and removed outer `<main>` vertical scrolling so the window never scrolls vertically; `Sidebar` now uses `h-full`.
- **Project Detail & Tabs ([`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/%5Bid%5D/page.tsx), [`ProjectKanbanBoard.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectKanbanBoard.tsx), [`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx))**:
  - Pinned the project header & tab navigation inside an `h-full` rounded container; `Overview`, `List`, and `Settings` scroll internally inside the card body, while `Board` (per-column task lists) and `Conversation` (message stream) fill the exact remaining height (`flex-1 min-h-0`) with internal scrolling only.
- **Dashboard, All Projects, Chats & Settings ([`dashboard/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx), [`projects/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/page.tsx), [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx), [`settings/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/settings/page.tsx), [`projects/join/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/join/page.tsx))**:
  - Converted every page to `h-full` with pinned headers/banners and internal scrollable content regions (`flex-1 min-h-0 overflow-y-auto`), eliminating outer page scrollbars across the entire app.
- **Left Sidebar Color Alignment ([`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx))**:
  - Replaced remaining yellow `#f0ff7c` sidebar chrome (Create/Join buttons, active left pill indicator, active/hover sub-project links, user avatar gradient) and rainbow avatar fallbacks with Synca's brand `#006c52`/`#66deb4` teal-mint palette, unified active DM/Settings rows (`bg-[#66deb4]/15`), and harmonized dark-mode sidebar surface (`dark:bg-[#111316]`).

## [Decoupled Board Columns & Task Status + Column Reordering] - 2026-11-22

### Changed & Added
- **Data Model & API (`Project.columns`, `Task.column`) ([`models.ts`](file:///d:/Synca-FYP/packages/types/src/models.ts), [`project.ts`](file:///d:/Synca-FYP/packages/zod-schemas/src/project.ts), [`task.ts`](file:///d:/Synca-FYP/packages/zod-schemas/src/task.ts), [`Project.ts`](file:///d:/Synca-FYP/apps/api/src/models/Project.ts), [`Task.ts`](file:///d:/Synca-FYP/apps/api/src/models/Task.ts), [`project.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/project.controller.ts), [`task.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/task.controller.ts))**:
  - Disconnected board columns from task `status`. New projects start with `columns: []` (empty by default).
  - Creating a project task when no columns exist automatically creates and persists `"Default Column"` on the project and places the task in it; otherwise places it in the selected column.
  - `PATCH /api/v1/tasks/:id/move` now updates `column` + `order` without modifying `task.status`.
  - `PATCH /api/v1/projects/:id` supports persisting `columns` order for any project member.
- **Board, List & TaskModal ([`ProjectKanbanBoard.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectKanbanBoard.tsx), [`ProjectTaskTable.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectTaskTable.tsx), [`TaskModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/task/TaskModal.tsx), [`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/[id]/page.tsx))**:
  - Added horizontal drag-and-drop column reordering on the Board (via grip handle, persisted to `project.columns`), click-to-rename column headers (atomically migrating column tasks in MongoDB via `renameColumn`), separate task/column collision detection so tasks drag smoothly across columns, empty-board onboarding state, independent status pills on cards, and empty-column deletion.
  - Rebuilt **List View** to render separate collapsible list tables grouped by each board column in exact board order, each with its own `+ Add Task` action.
  - Separated **Task Status** and **Board Column** selectors inside `TaskModal`.

  - **Sidebar Navigation Fix ([`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx))**: Matched the exact Figma dark glassmorphic bevel nav buttons using CSS `padding-box`/`border-box` diagonal gradient borders (`rgba(255,255,255,0.34 → 0.08 → 0.28)`), deep charcoal fill (`#232428 → #424348`), custom `1.25px` thin-stroke Figma SVGs for `Dashboard` and `All Projects`, and always-visible full-row `<Link>` project links underneath.

## [Figma Design Alignment — Project Creation & Project Detail Workspace (Frames 91:2549, 93:3149, 80:875)] - 2026-11-22

### Fixed
- **Project Creation Duplicate Key Error (`E11000 workspaceId_1_slug_1`) ([`mongodb.ts`](file:///d:/Synca-FYP/apps/api/src/lib/mongodb.ts), [`project.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/project.controller.ts))**:
  - Automatically drops the stale legacy `workspaceId_1_slug_1` index from `projects` on MongoDB connection startup.
  - Updated `createProject` slug collision check to loop across all documents (including soft-deleted ones) so creating a project with a reused name like `"fyp"` always generates a unique slug.

### Changed & Added
- **Project Creation & Join Flow ([`CreateProjectModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/CreateProjectModal.tsx), [`JoinProjectModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/JoinProjectModal.tsx))**:
  - Upgraded `CreateProjectModal` into a Figma-aligned 2-step flow: Step 1 (Essentials — Name, Project Brief, visual Figma Status pills, Public/Private access cards) and Step 2 (Optional starter High-Level Goals & first Milestone), with `"Create & Open"` auto-navigating directly into the newly created project.
  - Aligned `JoinProjectModal` to the same `#006c52` / `#66deb4` mint design system with auto-redirect into the joined workspace.
- **Project Detail Shell & Reorganized Tabs ([`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/[id]/page.tsx))**:
  - Replaced bulky hero card with Figma's streamlined `20px` rounded white workspace shell, breadcrumb bar, contextual task search, mint `Share` button, `+ Add Task`, `Funnel Display` title, Figma status pills, and crisp underline tab navigation (`Overview`, `Board`, `List`, `Conversation`, `Settings`).
  - **Overview Tab (Frame `91:2549`)**: 2-column bento with **Project Brief** (inline editable + live stats), interactive **Key Milestones** (add, inline edit title/description/status/progress slider/date, cycle status, delete), **High-Level Goals** (toggle, add, inline edit title & description, delete), **Project Team** avatar strip + 1-click DM links, and **Workspace Access** (Join Code + Invite Link).
  - **Board Tab ([`ProjectKanbanBoard.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectKanbanBoard.tsx), Frame `93:3149`)**: Crisp white bordered columns, Figma priority pills (`High Priority`, `Medium`, `Low`), mint top-accent on `In Progress` cards, subtask progress bars, compact `Done` cards, bottom `+ Add Task` bar, and mint `"Add a new column"` button.
  - **List Tab ([`ProjectTaskTable.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectTaskTable.tsx))**: Built-in Status & Priority filter chips, inline subtask progress bars, overdue highlighting, and hover edit/delete actions.
  - **Conversation Tab ([`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx), Frame `80:875`)**: `#project-slug` mint header with overlapping member avatars, mint-tinted live message search, date dividers, and mint-bordered composer container.
  - **Settings Tab**: Reorganized 2-column layout separating General Settings (left) from Members & Roles, Join Code, Leave Project, and Danger Zone (right).

## [Figma Design Alignment — All Projects / Project Portfolio (Frame 89:1317)] - 2026-11-22

### Changed & Added
- **All Projects Page Redesign ([`projects/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/page.tsx))**:
  - Aligned layout to Figma frame `89:1317` ("Project Portfolio"): full-height `20px` rounded white surface (`dark:bg-[#111316]`), `Funnel Display` `42px` heading + subtitle, and `#f8f9fa` `#bdc9c2`-bordered header filter controls (Search, Status, Privacy, Member, and Join Code).
  - Rebuilt project cards in a responsive 5-column bento grid matching Figma's status pills (`On Track` `#ddec6b`, `Active Sprint` `#e7e8e9`, `At Risk` `#ffdad6`), `#006c52` / `#ba1a1a` progress bars, mint-bordered (`#79deba` top-4) `Active Sprint` cards with inner `Sprint Goals` box, overlapping `32px` rounded-square real member avatars resolved via `useTeammates()`, card `...` action menu (Open, Copy Join Code, Copy Invite Link), and the final `"New Project"` tile (`91:1864`).

## [Figma Design Alignment — Dashboard & Sidebar (Frame 27:594)] - 2026-11-22

### Changed & Added
- **Dashboard Exact Figma Alignment ([`dashboard/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/dashboard/page.tsx), [`TaskCard.tsx`](file:///d:/Synca-FYP/apps/web/src/components/shared/TaskCard.tsx), [`layout.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/layout.tsx))**:
  - Updated light mode shell canvas to `#f3f3f3` and `20px` rounded white bento cards.
  - Added the **Top Greeting & 3 KPI Cards Banner** (`Task Completion %`, `Active Projects`, `Team Velocity avg`) in exact `#c9c9c9` bordered `15px` cards with live metrics.
  - Styled **Task Status** with the exact `#036867 → #79deba` teal-mint active tab pill (`Upcoming` / `Overdue` / `Completed`) and exact Figma task card gradients (`#f5ffac → #fcffe4`, `#ffdfac → #fff9ef`, white) with `#e85151` coral due pills.
  - Matched **Completed Tasks** 7-day `#66deb4 → #4ba384` vertical capsule strips (`Mon`–`Sun`) driven by real weekly completed tasks.
  - Added the missing **Bottom-Right Recent / Unread Chats Panel** matching Figma `UnreadChats` (`#bebebe/25` rows, vertical divider, live `lastMessagePreview`, and `#a7dac9` `Unread` pill) clicking straight into `/chats?dm=...`.
  - Wired **Ongoing Projects** `"New ↗"` pill directly to `CreateProjectModal` and **Private Task** card to list & create real personal tasks.
- **Sidebar Exact Figma Alignment ([`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx))**:
  - Matched `#17181c` dark surface, `252px` width, collapsible right-edge `<` chevron button, `#f0ff7c/75` active left-edge indicator pill, `rgba(65,65,65,0.2)` nav tiles, indented `›` project sub-list, `"Chats"` section with `+` modal trigger, and `#f0ff7c/30` `"More People"` pill with overlapping real teammate avatars.

## [Member Onboarding, Conversation & Direct Discovery Upgrade] - 2026-11-22

### Added & Upgraded
- **Direct Member Invites & Privacy Enforcement (`project.controller.ts`, `project.routes.ts`, `EditTeamModal.tsx`)**:
  - Enforced `project.privacy === 'Private'` on `POST /api/v1/projects/join` (returns `403 PRIVATE_PROJECT` so join codes only work for Public projects).
  - Added `POST /api/v1/projects/:id/members` (rate-limited, Zod-validated) allowing Admins/Moderators to add members directly by exact email or quick-add existing collaborators from other projects.
  - Upgraded `EditTeamModal` with an **Add Member by Exact Email** form, quick-add collaborator chips, role capability legend (`Admin`, `Moderator`, `Member`), and per-member **Message** buttons.
  - Added one-click Invite Link route (`/projects/join?code=XXXXXX`) + **Copy Invite Link** button and **Leave Project** button in Project Settings (`projects/[id]/page.tsx`).
- **Unified Recent DM Peers & External DM Persistence (`user.controller.ts`, `useTeammates.ts`, `useChat.ts`, `ChatNotificationContext.tsx`)**:
  - `GET /api/v1/users/teammates` now aggregates existing DM threads (`Message` collection) alongside shared-project collaborators, so Tier 3 exact-email DMs persist in the sidebar and sort by `lastMessageAt` descending (most recent chats on top).
  - Dispatched `synca:dm-updated` on DM send/receive so new DM threads immediately appear in the sidebar without refreshing.
- **Live Chat Presence & Real-Time Sync Upgrades (`socket/index.ts`, `socket/handlers.ts`, `SocketContext.tsx`, `task.controller.ts`, `useTasks.ts`)**:
  - Added initial `presence:sync` snapshot on socket connect so newly connected users immediately see which collaborators are already online.
  - Added `joinUserToProjectRoom()` and called it on project create, join, and direct member add so live sockets receive `#general` messages & notifications immediately without reloading.
  - Upgraded DM `message:reaction`, `message:deleted`, and `typing:update` broadcasts to target both `dm:<channelId>` and participants' `user:<id>` rooms.
  - Wired live `task:updated` Socket.io broadcasts on `updateTask`, `moveTask`, and `addTaskComment` + listener in `useTasks.ts` for real-time Kanban and Task Comment sync.

## [Full Codebase Audit Remediation (Phases 0–4)] - 2026-11-22

### Security & Access Control Hardening
- **Fixed Moderator Privilege Escalation**: Omitted `members` and `teamMembers` from `updateProjectSchema` and removed direct roster overwrite in `PATCH /api/v1/projects/:id` (`project.controller.ts`).
- **Hardened Sole-Admin & Ownership Guards**: `updateMemberRole` (now Zod-validated) and `removeMember` prevent demoting/removing the sole remaining Admin, transfer `ownerId` when an owner steps down with another Admin present, disallow silently adding non-members via role update, and evict removed users' live sockets from `project:<id>`.
- **Fixed Private Task IDOR & Ex-Member Access**: Added unified `resolveTaskPermissions()` in `task.controller.ts` enforcing active project membership and `isPrivate` visibility across `updateTask`, `moveTask`, `deleteTask`, and `addTaskComment`.
- **Prevented Message Sender Spoofing**: Server always resolves `senderName` and `senderAvatar` from Clerk (via shared bounded `clerk-profile.ts` cache) on both REST and Socket `message:send`.
- **Hardened DM Channels & Typing Auth**: Canonicalized all DM `channelId`s via `canonicalizeDmChannelId()` (rejecting unsorted pairs, self-DMs, and empty peers), added Zod validation + `assertAccess` to `typing:stop` and `typing:start`, and scoped `presence:update` broadcasts to shared project rooms with multi-tab disconnect checks.
- **Scoped User Profiles & Added Tier 3 Lookup**: Scoped `GET /api/v1/users/:userId/profile` to self, shared-project collaborators, or DM peers; added rate-limited `GET /api/v1/users/lookup?email=...` for exact email lookup.
- **Added Rate Limiting & XSS Protection**: Added Redis-backed (with in-memory fallback) rate limiting on `projects/join`, `files/upload`, `users/lookup`, and `users/:id/profile`; validated `https?://` protocol on chat attachments in both Zod (`sendMessageSchema`) and `MessageBubble.tsx`.
- **Completed File Routes & Global Error Handling**: Implemented `GET /api/v1/files/:id` and `DELETE /api/v1/files/:id`, removed legacy `roomId` fallback and debug route `/api/v1/protected-test`, added global JSON error handler for Multer errors in `app.ts`, escaped regex in `GET /projects?search=`, and added `ObjectId.isValid` checks across all controllers/socket handlers.

### Core Functional & UX Fixes
- **Fixed Project Notification Dropout**: Removed `project:leave` on `useChat` unmount so sockets stay subscribed to project rooms for global unread badges/toasts.
- **Fixed Kanban Empty-Column Drag-and-Drop**: Registered `useDroppable({ id: title })` in `KanbanColumn` (`ProjectKanbanBoard.tsx`), resolved member avatars/initials on Kanban cards and `ProjectTaskTable`, and gated Edit/Delete actions by role with delete confirmation.
- **Wired Tier 3 Email Lookup & Tier 2 Message Quick-Actions**: Added `EmailLookupView` in `chats/page.tsx` for `/chats?email=...` and "Message" quick-action links on `TaskDetailModal` assignees and project team rosters.
- **Fixed Chat Pagination, Moderation & State**: Prevented "Load older messages" from auto-scrolling back to bottom, enabled Admin/Moderator channel message deletion in UI, cleared stale messages/profiles on channel/peer switch, added socket ack rollback for failed optimistic sends, passed `projectId` + error banner to `ChatInput`, and closed emoji picker on outside click.
- **Fixed Caching, Hydration & Leaks**: Scoped `useProjects` and `useTeammates` caches to active `userId` (clearing on sign-out, syncing `useTeammates` on `synca:projects-changed`), switched `Sidebar` active DM detection to `useSearchParams()`, reused a single `AudioContext` and persisted unread counts in `sessionStorage` in `ChatNotificationContext`, and fixed `SocketContext` sign-out/retry cleanup.
- **Wired Dashboard, Project Goals & Settings**: Connected Dashboard weekly chart to real completed tasks, passed real user avatar/initials to `TaskCard`, wired "New Private Task" card to `TaskModal`, added `isPrivate` toggle in `TaskModal`, added inline Goal creation & rollback on `projects/[id]`, redirected `/` to `/dashboard`, and wired Settings profile/security cards to Clerk's `openUserProfile()`.
- **Build & Repo Hygiene**: Removed 22 stale compiled `.js`/`.d.ts` artifacts and legacy `room.ts`/`workspace.*` files from `packages/*/src/`, centralized graceful shutdown in `apps/api/src/index.ts`, added `teamMembers` + partial `slug` indexes to `Project.ts`, added `apps/web/.eslintrc.json`, and reconciled `CONTEXT.md` & `docs/api.md`.

## [Chat Header & Teammate Discovery Polish] - 2026-10-29

### Changed & Polished
- **Eliminated All "Teammate" & "Role" Fallbacks**:
  - `DirectChatView` in [`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx) now dynamically resolves the peer user's authentic Clerk name and avatar image from `useTeammates()` or on-demand fetch via `/api/v1/users/:userId/profile`.
  - Fixed missing `avatarUrl` passing to `target` in `DirectChatView`, ensuring both header and contact drawer render authentic Clerk photos.
  - Added query param support (`&name=...&avatar=...`) in [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx) and [`NewMessageModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/NewMessageModal.tsx).
  - Added `GET /api/v1/users/:userId/profile` endpoint in `user.controller.ts` and `user.routes.ts`.
- **Removed Wifi Real-Time Indicator**:
  - Removed the `Wifi` / `WifiOff` "Real-time active" / "Connecting..." indicator from the top header in both `DirectChatView` and `MessagesHubView` ([`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx)).
  - Replaced it with a clean, unobtrusive presence indicator (`Active now` / `Offline` or channel subtitle).
- **Direct Messages Sidebar Item Simplification**:
  - Removed the `role` subtitle ("Member") from inline Direct Message items in [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx).
  - Cleaned up unused `useMemo` and `useAuth` imports in `Sidebar.tsx`.
- **Real Teammate Profile Resolution Everywhere**:
  - Connected `ChatSidebar.tsx` and `NewMessageModal.tsx` to `useTeammates()` backed by `GET /api/v1/users/teammates`.
  - Replaced all stubbed names (`Teammate (Member)`) and sample fallbacks with live Clerk display names and avatar images.
  - Removed role subtitles across 1:1 conversation lists in both the Messages Hub and New Message search modal.
- **API Documentation & Registry**:
  - Added `GET /api/v1/users/teammates` to `docs/api.md` and `CONTEXT.md` (Section 3.5).

## [Direct Chat — Full-Screen DM View] - 2026-10-29

### Changed
- **`/chats` page redesigned as a routing dispatcher ([`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx))**:
  - **`?dm=userId`** → renders `DirectChatView`: full-width 1:1 chat with header (avatar, name, online status, call buttons), message stream, input bar, and right contact panel. **No Messages Hub sidebar.** Back arrow returns to previous page.
  - **No params** → renders `MessagesHubView`: the existing Messages Hub with `ChatSidebar` for browsing channels and DMs.
- Extracted shared `ChatStream` sub-component used by both views to avoid code duplication.


### Changed & Added
- **Sidebar DM section redesigned ([`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx))**:
  - Removed the standalone "Direct Messages" nav item — DMs now live directly inside the sidebar panel, matching the screenshots.
  - The **DIRECT MESSAGES** section now derives the list from real project teammates via `useProjects()` instead of a hardcoded static array.
  - Shows real online/offline presence dots (from `useSocket().onlineUsers`) and per-teammate unread badges.
  - Inline list shows up to 6 teammates; overflow count shown on "More People" button.
- **`+` icon on DIRECT MESSAGES header** opens the new `NewMessageModal`.
- **"More People" button** also opens the same modal with the full teammate network.
- **`NewMessageModal` ([`NewMessageModal.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/NewMessageModal.tsx))** — Tiered discovery flow:
  - **Tier 1 (Teammate search)**: Search by display name across all users who share at least one project with the current user. No global user table scan.
  - **Tier 3 (Exact email)**: If the query contains `@`, switches to an email-lookup UI with a CTA that routes to `/chats?email=...` for server-side exact-match resolution.
  - Keyboard accessible: `Esc` closes, hover shows "Message" CTA per row.


### Added & Enhanced
- **Multi-Window Unfocused Toast & Sound Triggers ([`ChatNotificationContext.tsx`](file:///d:/Synca-FYP/apps/web/src/context/ChatNotificationContext.tsx))**:
  - Integrated `document.hasFocus()` and `document.hidden` detection: side-by-side or background windows now immediately receive the interactive top-right glassmorphic toast and audio chime.
  - Added a window `focus` event listener that automatically marks the active conversation as read as soon as the user returns to or focuses the window.
  - Handled `AudioContext` autoplay suspended state with automatic `resume()`.
- **Zero-Duplicate Server Broadcasting ([`handlers.ts`](file:///d:/Synca-FYP/apps/api/src/socket/handlers.ts))**:
  - Implemented Socket.io chained `.to(projectRoom).to(userRoom).emit(...)` broadcasting so sockets belonging to both rooms receive the packet exactly once.
  - Added `dm:join` and `dm:leave` socket handlers for DM lifecycle management.
- **Client-Attached Authenticated Profiles ([`message.ts`](file:///d:/Synca-FYP/packages/zod-schemas/src/message.ts), [`useChat.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useChat.ts), [`message.controller.ts`](file:///d:/Synca-FYP/apps/api/src/controllers/message.controller.ts))**:
  - Updated `sendMessageSchema` to accept `senderName` and `senderAvatar` directly from Clerk's active user session.
  - Messages display the user's authentic name and avatar immediately with zero fallback lag or Clerk rate-limiting issues.
- **Unread Badge Indicators Everywhere**:
  - Added live pulsing unread badge to the **"Conversation"** tab button inside [`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/[id]/page.tsx) so team members on the Kanban board or List view are notified of new project messages.
  - Added direct `#general` conversation chat icons with unread badges next to projects in [`Sidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/layout/Sidebar.tsx).
  - Attached unread badge counters to teammates in the sidebar's Direct Messages list.
- **Clear UX Separation of Project Conversations & 1:1 DMs**:
  - Project conversations live directly inside each project's workspace at `/projects/[id]?tab=conversation`.
  - `/chats` is dedicated to 1:1 direct messages with collaborators across joined projects.
  - Added quick-link to open project conversations from `/chats` sidebar and from the main sidebar.

## [Phase 4 — Real-Time Messaging Completed] - 2026-10-29

### Added & Completed (Phase 4 Milestone)
- **Real-Time WebSockets & Socket.io Client Provider ([`SocketContext.tsx`](file:///d:/Synca-FYP/apps/web/src/context/SocketContext.tsx))**:
  - Implemented persistent WebSocket client authenticated via Clerk session JWT on handshake.
  - Added auto-reconnect with token refresh, online presence tracking, and global connection health monitoring.
  - Wrapped `(app)/layout.tsx` in `<SocketProvider>`.
- **Reactive Chat Hook ([`useChat.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useChat.ts))**:
  - Supports both `channel` and `dm` room scopes with automatic join/leave lifecycle (`project:join/leave`, `dm:join/leave`).
  - Cursor-based message history pagination with auto-scrolling.
  - Real-time listeners for `message:new`, `message:deleted`, `message:reaction`, and `typing:update`.
  - Optimistic message sending with rollback fallback and REST API fallback.
- **Dynamic Real-Time Chat Page ([`chats/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/chats/page.tsx))**:
  - Replaced static mockup with fully functional live messaging interface.
  - **Conversations Sidebar ([`ChatSidebar.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatSidebar.tsx))**: Project channels (`#general`) and direct messages with live online/offline presence dots and search filtering.
  - **Interactive Message Bubbles ([`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx))**: Sender avatars, timestamps, Cloudinary file attachments, quick emoji reactions, and sender-only deletion.
  - **Chat Authoring Bar ([`ChatInput.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ChatInput.tsx))**: Expanding message box with Enter-to-send, typing debounce, emoji picker popover, and Cloudinary file uploads.
  - **Contact & Channel Drawer ([`ContactProfileDrawer.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/ContactProfileDrawer.tsx))**: Project join-code copy card, roster counts, and security indicators.
- **Project Embedded Conversation Tab ([`ProjectConversationTab.tsx`](file:///d:/Synca-FYP/apps/web/src/components/project/ProjectConversationTab.tsx))**:
  - Added a dedicated **"Conversation"** tab to the Project Detail view ([`projects/[id]/page.tsx`](file:///d:/Synca-FYP/apps/web/src/app/(app)/projects/[id]/page.tsx)) allowing teammates to chat directly inside their project workspace.
- **Optimistic Deduplication & Bubble Grouping ([`useChat.ts`](file:///d:/Synca-FYP/apps/web/src/hooks/useChat.ts), [`chatUtils.ts`](file:///d:/Synca-FYP/apps/web/src/lib/chatUtils.ts), [`MessageBubble.tsx`](file:///d:/Synca-FYP/apps/web/src/components/chat/MessageBubble.tsx))**:
  - Fixed duplicate messages caused by optimistic temp message not being replaced upon server broadcast.
  - Implemented consecutive bubble grouping (Slack/iMessage style): groups messages from the same sender within 5 minutes, suppresses redundant avatars and headers, flattens adjacent bubble corners, and renders centered date dividers ("Today", "Yesterday").
  - Deep-linked DM navigation via query parameters (`/chats?dm=userId`).

## [Docs Cleanup — Project-Centric Sync] - 2026-10-29

### Changed
- Rewrote [`docs/realtime-security.md`](file:///d:/Synca-FYP/docs/realtime-security.md) to the project-scoped `Admin` / `Moderator` / `Member` model; removed Room-era Owner/Manager/Viewer/Guest matrix; documented socket rooms, chat moderation, and rate limits for `/projects` + `message:send`.
- Expanded [`docs/database.md`](file:///d:/Synca-FYP/docs/database.md) with `Message`, `FileRef`, and `Notification` schemas, Message indexes, Redis presence/unread keys; deprecated `RoomWide` privacy.
- Clarified [`docs/roles-and-permissions.md`](file:///d:/Synca-FYP/docs/roles-and-permissions.md): join-code visibility (Admin/Mod only), sole-Admin/owner guards, private-task UI label, Phase 4 messaging matrix.
- Completed messaging REST + Socket sections in [`docs/api.md`](file:///d:/Synca-FYP/docs/api.md); added project-centric domain model to [`docs/architecture.md`](file:///d:/Synca-FYP/docs/architecture.md).
- Synced [`CONTEXT.md`](file:///d:/Synca-FYP/CONTEXT.md): Phase 4 MVP scope, Phase 5 renamed to **Notifications & Mentions**, messaging deprecation notes.
- Marked [`SYNCA_README.md`](file:///d:/Synca-FYP/SYNCA_README.md) as a **legacy** product brief pointing to `CONTEXT.md` / `docs/` as source of truth.

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
- **Redis Connection Resilience ([`apps/api/src/lib/redis.ts`](file:///d:/Synca-FYP/apps/api/src/lib/redis.ts))**:
  - Configured socket `reconnectStrategy` with exponential backoff and a 5-retry limit to prevent terminal spam when Upstash or Redis endpoints are unreachable.

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
