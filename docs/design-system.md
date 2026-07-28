# Synca Design System Specification

> **Design Source**: Derived directly from production Figma mockups in `/design/` (`Design System - Light Mode.png`, `Dashboard.png`, `Project Page.png`, `Project Detail Page.png`, `Personal Chat With Profile.png`).

---

## 1. Visual Language & Core Principles

- **Floating Dark Sidebar**: `#16191e` dark charcoal container with smooth rounded corners (`rounded-3xl`).
- **Clean Content Area**: `#f4f4f5` soft slate background with crisp white `#ffffff` cards and subtle borders (`#e4e4e7`).
- **High-Vibrancy Primary Accent**: Lime / Yellow-Green (`#d8f870` / `#c4ea48`) for primary CTAs (`Add Task +`, active tab pills, primary action buttons) paired with dark `#1a1a1a` typography.
- **Harmonious Status Palette**:
  - **On Track**: Green `#10b981` / `#8be6c1`
  - **Active Sprint**: Blue `#3b82f6` / Slate `#e2e8f0`
  - **At Risk**: Amber / Yellow `#f59e0b` / `#fde896`
  - **Blocked / Overdue**: Red `#ef4444` / `#f9c5d1`
  - **Completed**: Teal / Mint `#2ecc8f` / `#8be6c1`

---

## 2. Color Palette & Utility Tokens

### 2.1 Color Tokens Matrix

| Category | Token Name | Hex Code | Usage |
|---|---|---|---|
| **Sidebar BG** | `bg-sidebar` | `#16191e` | Main floating navigation sidebar |
| **Main Content BG** | `bg-content` | `#f4f4f5` | Main page body background |
| **Card Surface** | `bg-surface` | `#ffffff` | Dashboard widgets, project cards, chat panels |
| **Primary Accent** | `bg-accent-lime` | `#d8f870` | Primary buttons (`Add Task +`), active status pills |
| **Secondary Accent** | `bg-accent-mint` | `#8be6c1` | Completed badges, positive metric indicators |
| **Pastel Sticky Yellow** | `bg-sticky-yellow` | `#fde896` | ToDo sticky card background |
| **Pastel Sticky Pink** | `bg-sticky-pink` | `#f9c5d1` | Overdue / high priority sticky card |
| **Pastel Sticky Mint** | `bg-sticky-mint` | `#8be6c1` | Completed task sticky card |
| **Text Primary** | `text-zinc-900` | `#18181b` | Main headings, card titles |
| **Text Muted** | `text-zinc-500` | `#71717a` | Secondary text, timestamps, subtitles |
| **Text Sidebar Muted**| `text-zinc-400` | `#a1a1aa` | Unselected nav items, member titles |

---

## 3. Typography Rules

- **Heading Font Family**: `Funnel Display`, `Outfit`, or `Inter` (sans-serif)
- **Body Font Family**: `DM Sans` or `Inter`

### Font Scale & Hierarchy
- **Display Heading (`H1`)**: `32px` (`text-3xl`), `font-extrabold`, `tracking-tight` (e.g. "Good Evening Fazeel", "Project Portfolio")
- **Section Heading (`H2`)**: `24px` (`text-2xl`), `font-bold` (e.g. "Completed Projects", "Task Status")
- **Card Subheading (`H3`)**: `18px` (`text-lg`), `font-semibold` (e.g. "Develop API Endpoints")
- **Body Text**: `14px` (`text-sm`), `font-normal`, `leading-relaxed`
- **Caption / Badge**: `12px` (`text-xs`), `font-medium`

---

## 4. UI Components Specification

### 4.1 Navigation Sidebar (`Sidebar.tsx`)
- **Container**: Floating rounded box (`w-64 bg-[#16191e] rounded-3xl p-4 text-white flex flex-col justify-between`).
- **Profile Header**: Avatar image (38px circle), User Name ("Fazeel Ahmad"), Role ("UI UX Designer"), expandable chevron.
- **Main Navigation Items**:
  - `Dashboard` (`/dashboard`): Active state shows pill background with left accent bar (`#d8f870`).
  - `ToDo List` (`/todo`): Subtask count badge.
  - `All Projects` (`/projects`): Expandable tree showing active project items (`Develop API Endpoints`, `Alfa - Onboarding Flow`, `Flowfer - Build Dashboard`, `DevSec - Optimize Page Load`, `Signer - Optimize Page Load`).
- **Chats Section**:
  - List of team members with avatar, full name, role title, and online presence dot.
  - `More People` overflow button with avatar stack.
- **Footer**: `Settings` (`/settings`) and `Sign out` button.

### 4.2 Top Bar (`TopBar.tsx`)
- **Search Bar**: Rounded pill input (`bg-zinc-100 border-none rounded-full px-4 py-2 text-sm w-72`).
- **Action Group**: Notification bell icon with unread badge, user profile button, green `Share` pill CTA button.

### 4.3 Task & Project Cards
- **Project Card**:
  - Top status badge pill (`● On Track`, `● Active Sprint`, `● At Risk`).
  - Project Title & Description snippet.
  - Progress Bar with percentage indicator (`75%`, `32%`).
  - Assignee avatar stack + due date pill (`Oct 15`, `Sep 30`).
- **Sticky ToDo Card**:
  - Pastel background (`#fde896`, `#8be6c1`, `#f9c5d1`).
  - Colored top status dot.
  - Rich text content notes.
  - Bottom formatting bar (`B`, `I`, `U`, `/`, `=`, `≡`).

---

## 5. Screen Layout Specifications

1. **Dashboard Screen** (`/dashboard`):
   - Top Header Greeting: "Good Evening Fazeel" + Quick Stats (Task Completion `84.2%`, Active Projects `12`, Team Velocity `48 avg`).
   - 3-Column Layout:
     - Left: Task Status panel with tabs (`Upcoming`, `Overdue`, `Completed`) and task cards.
     - Center: Completed Projects bar chart & Private Task sticky section.
     - Right: Ongoing Projects list & Recent Chats activity panel.
2. **Project Portfolio Screen** (`/projects`):
   - Filter bar: Status dropdown (`All Statuses`), Priority dropdown, Assignee dropdown.
   - Grid layout of Project Cards + `+ New Project` dashed card button.
3. **Project Detail Screen** (`/projects/[id]`):
   - Tab bar: `Overview`, `List`, `Board`, `Timeline`, `Calendar`, `Dashboard`, `Conversation`.
   - Overview section: Project Brief, High-Level Goals, Key Milestones cards (`Completed`, `In Progress`, `Upcoming`), Connected Briefs files.
4. **Chat & Messaging Screen** (`/chat/[userId]`):
   - 1:1 conversation view with speech bubbles, timestamp dividers (`Today`), rich text file attachment cards, contact profile right drawer (profile avatar, email, local time, shared media grid).
