# Synca Design System Specification

> **Design Source**: Derived directly from the Synca Figma file (`uCjOcbJzYsYDPHlIakP2Me` — Frames `27:594` Dashboard, `89:1317` All Projects, `91:2549` Project Overview, `93:3149` Project Board, `80:875` Project Conversation, `86:330` & `86:890` Direct Messages & Profile Card).

---

## 1. Visual Language & Core Principles

- **Viewport-Locked Desktop App Shell**: Authenticated layout (`apps/web/src/app/(app)/layout.tsx`) is locked to `h-screen overflow-hidden` so the outer window never scrolls vertically. Each page renders an `h-full` rounded card (`rounded-[20px]`) with pinned headers/tabs and internal scrolling (`flex-1 min-h-0 overflow-y-auto`) inside the main container.
- **Floating Dark Sidebar**: `#17181c` (Light Mode) / `#111316` (Dark Mode) rounded container (`rounded-[20px]`, `h-full`) with dark glassmorphic bevel nav buttons, `#66deb4` active accents, and a scrollable WhatsApp-style DM list.
- **Clean Neutral Canvas**: `#f3f3f3` Light Mode canvas and `#000000` Dark Mode canvas (with subtle emerald/lime radial ambiance in `globals.css`).
- **Brand Teal & Mint Primary System**:
  - **Primary CTA / Active (Light)**: Deep Teal `#006c52` (hover `#005742`) with `#ffffff` text.
  - **Primary Bright Accent (Dark & Interactive)**: Mint `#66deb4` (hover `#52d1a4`) for dark-mode text/icons/focus rings, online presence dots, unread badges, and active indicators.
  - **Brand Lime Highlight**: `#F0FF7C` (Light) / `dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]` (Dark) reserved for `On Track` / `In Progress` / `Medium` highlights and sticky accents (not primary form CTAs).
- **Semantic Status Palette**:
  - **On Track / Medium**: `#ddec6b` / `#F0FF7C` (`#606a00` light text, `#F0FF7C` dark text)
  - **Active Sprint**: Neutral `#e7e8e9` (`#191c1d` light, `white/[0.08]` dark) with teal/mint icon
  - **In Progress (Task)**: Sky `#eef6ff` / `sky-700` (light), `sky-500/15` / `sky-300` (dark)
  - **Completed / Low / Success**: Mint `#e6f7f1`–`#d3f5e8` / `#006c52` (light), `#66deb4/15` / `#66deb4` (dark)
  - **At Risk / High / Danger**: `#ffdad6` / `#93000a` / `#ba1a1a` (light), `rose-500/15` / `rose-300`–`rose-400` (dark)

---

## 2. Color Palette & Utility Tokens

### 2.1 Canonical Color Tokens Matrix

| Category | Token / Class | Light Hex | Dark Hex | Usage |
|---|---|---|---|---|
| **App Canvas** | `--background` / `contentBg` | `#f3f3f3` | `#000000` | Main viewport background |
| **Sidebar BG** | `bg-sidebar` | `#17181c` | `#111316` | Floating left navigation sidebar |
| **Card Surface** | `bg-surface` | `#ffffff` | `#111316` | Page shells, dashboard widgets, chat cards |
| **Modal Surface** | — | `#ffffff` | `#14171c` | Dialogs, modals, floating toasts |
| **Elevated / Input BG** | — | `#f8f9fa` | `#15171b` | Form inputs, Kanban columns, secondary panels |
| **Nested / Hover Surface** | — | `#f3f3f3` | `#191c22` / `#1e2127` | Dropdowns, hover rows, received DM bubbles |
| **Primary CTA** | `accent.teal` | `#006c52` (hover `#005742`) | `#006c52` / `#66deb4` | Submit, Save, Send, Add buttons |
| **Mint Accent** | `accent.mint` | `#66deb4` (tint `#e6f7f1`) | `#66deb4` (tint `#66deb4/15`) | Online dots, unread pills, dark-mode icons & focus rings |
| **DM Own Bubble** | — | `#3eb386` | `#006c52` | Outgoing 1:1 DM message bubbles |
| **Lime Highlight** | `accent.lime` | `#F0FF7C` | `#F0FF7C/15` | `On Track` / `Medium` badges, sticky notes |
| **Borders** | — | `#e5e5e5` / `#e5e7eb` / `#bdc9c2` | `white/[0.08]` / `white/[0.12]` | Outer cards, dividers, form inputs |
| **Text Primary** | — | `#191c1d` | `#f4f4f5` (`zinc-100`) | Headings, titles, primary labels |
| **Text Muted** | — | `#3e4944` | `#a1a1aa` (`zinc-400`) | Subheadings, timestamps, metadata |

---

## 3. Typography Rules

- **Display / Heading Font**: `Funnel Display` (`font-['Funnel_Display',sans-serif]`)
- **Body / UI Font**: `DM Sans` (`font-sans`)

### Font Scale & Hierarchy
- **Display Heading (`H1`)**: `32px–42px`, `tracking-tight` (e.g. "Good Evening", "Project Portfolio", Project Title)
- **Section Heading (`H2`)**: `18px–22px`, `font-medium` (e.g. "Task Status", "Project Brief", "Key Milestones")
- **Card Subheading (`H3`)**: `15px–17px`, `font-medium`
- **Body Text**: `13.5px–14px`, `leading-[20px–21px]`
- **Caption / Badge**: `11px–12px`, `font-medium`

---

## 4. UI Components Specification

### 4.1 Navigation Sidebar (`Sidebar.tsx`)
- **Container**: Floating rounded rail (`w-[252px]` / collapsed `w-[80px]`, `h-full`, `rounded-[20px]`, `bg-[#17181c] dark:bg-[#111316]`).
- **Profile Header**: User avatar (Clerk image or `#006c52`→`#66deb4` gradient fallback), display name, email, plus quick **Create** (`#66deb4/15`) and **Join** (`white/[0.06]`) project buttons.
- **Primary Navigation**:
  - `Dashboard` (`/dashboard`) and `All Projects` (`/projects`) rendered as `46px` dark glassmorphic bevel buttons with thin-stroke `22×22px` Figma SVGs and `#66deb4` left active indicator pill.
  - Project quick-links list directly under `All Projects` with `#general` unread counters.
- **Chats Section (WhatsApp-Style Single Sidebar)**:
  - Scrollable list of all DM conversations ordered by most recent message with 1-line `lastMessagePreview`, `#66deb4` online dot, unread badge, `+` New Message modal trigger, and hover Delete Conversation button.
- **Footer**: `Settings` (`/settings`) and `Sign out`.

### 4.2 Modals & Drawers
- All modals (`CreateProjectModal`, `JoinProjectModal`, `TaskModal`, `TaskDetailModal`, `EditTeamModal`, `NewMessageModal`) render via `createPortal(..., document.body)` with full Light + Dark mode parity (`bg-white dark:bg-[#14171c]`, `rounded-[20px]`, `#006c52` / `#66deb4` CTAs & focus rings).

### 4.3 Chat Composers & Message Bubbles (`ChatInput.tsx`, `MessageBubble.tsx`)
- **Formatting Toolbar**: Shared `B`, `I`, `</> `, and `List` toolbar in both Project Conversation (`variant="channel"`) and Direct Messages (`variant="dm"`), preserving textarea focus/selection and rendering via an XSS-safe React inline markdown parser (`**bold**`, `_italic_`, `` `code` ``, `- bullet`).
- **Consecutive Grouping**: Tight vertical spacing between consecutive messages from the same sender (`space-y-0` stream + `mt-0 py-0.5` / `mt-0.5` continuation rows).
- **24h Ephemeral File Cards**: Inline raster image thumbnails, live `Expires in Xh Ym` countdown, and muted non-clickable `"File expired • Auto-deleted (24h)"` placeholders once expired.
- **Former Members**: Departed/removed project members display greyed-out avatars/names with a `"Former member"` badge in project channels.

---

## 5. Screen Layout Specifications

1. **Dashboard (`/dashboard`)**:
   - Pinned Greeting + 3 KPI Cards (`Task Completion`, `Active Projects`, `Team Velocity`) + `<ThemeToggle />`.
   - 3-Column Bento Grid fitting viewport height on `xl:` desktop with internal card scrolling (`Task Status`, `Completed Tasks` weekly pill bars, `Private Task`, `Ongoing Projects`, `Recent / Unread Chats`).
2. **All Projects (`/projects`)**:
   - Pinned header + Search, Status, Privacy, Member filters + Join Code button; internally scrollable Bento card grid + `+ New Project` card.
3. **Project Detail (`/projects/[id]`)**:
   - Pinned breadcrumb, title, status pill, completion bar, Share/Add Task actions, and 5 underline tabs: **`Overview`**, **`Board`**, **`List`**, **`Conversation`**, **`Settings`**.
   - **Overview**: Inline-editable Project Brief, High-Level Goals, Key Milestones (with progress slider), Team Roster, and Workspace Access.
   - **Board**: Horizontal drag-and-drop column reordering, click-to-rename columns, per-column internal vertical task scrolling, decoupled from `Task.status`.
   - **List**: Collapsible per-column task tables matching board columns.
   - **Conversation**: Slack-style `#project-slug` feed with internal message scrolling and pinned composer.
   - **Settings**: General metadata, privacy/join code management, leave project, and Danger Zone.
4. **Direct Messages (`/chats`)**:
   - Split-card layout (`h-full`): full-height chat panel + toggleable detached `300px` `ContactProfileDrawer` (avatar, quick actions, local time, shared projects, 24h Shared Files list, Delete Conversation). Auto-opens most recent DM when visited without `?dm=`.
5. **Settings (`/settings`) & Auth (`/sign-in`, `/sign-up`)**:
   - Theme switcher (`Light`, `Dark`, `System Sync`), Clerk profile/security shortcuts, and Clerk Auth screens styled with `#006c52` / `#66deb4` + `#17181c`.

---

## 6. Dark Mode Architecture & Theme Persistence

Synca uses class-based dark mode (`darkMode: 'class'` in `tailwind.config.js`) managed by `apps/web/src/context/ThemeContext.tsx`:

1. **Modes**: `'light' | 'dark' | 'system'` persisted in `localStorage` (`synca_theme`).
2. **Zero-FOUC**: Synchronous inline `<script>` in `apps/web/src/app/layout.tsx` applies `.dark` before first paint.
3. **OS Sync**: Listens to `window.matchMedia('(prefers-color-scheme: dark)')` when set to `'system'`.
4. **Standard Toggle**: `<ThemeToggle size="sm" | "md" />` from `@/components/shared/ThemeToggle`.
