# Changelog

All notable changes to the Synca project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
