# SYNCA: A UNIFIED REAL-TIME TEAM COLLABORATION AND PROJECT MANAGEMENT PLATFORM

---

**A Final Year Project Report**  
Submitted in Partial Fulfillment of the Requirements for the Degree of  
**Bachelor of Science in Computer Science / Software Engineering**

---

| Field | Details |
|---|---|
| **Project Title** | Synca — Unified Real-Time Team Collaboration & Project Management Platform |
| **Student Name(s)** | *[Insert Student Name(s) & Roll Number(s)]* |
| **Supervisor** | *[Insert Supervisor Name & Designation]* |
| **Department** | *[Insert Department Name]* |
| **Institution** | *[Insert University / Institution Name]* |
| **Session / Year** | 2026 |

---

## Abstract

Modern software and knowledge-work teams routinely rely on a fragmented suite of disconnected tools: one platform for task tracking and Kanban boards (such as Trello, Jira, or Asana), a second platform for real-time team chat and direct messaging (such as Slack or Microsoft Teams), and a third service for ad-hoc file sharing and document exchange. This fragmentation introduces severe context-switching overhead, duplicated membership management, broken audit trails, and delayed feedback loops.

**Synca** is a unified, real-time, full-stack web collaboration platform engineered around a **Project-Centric Architecture** that brings project portfolio management, decoupled Kanban and List task tracking, milestone governance, real-time `#general` project channels, 1:1 Direct Messaging, and ephemeral 24-hour file sharing into a single viewport-locked workspace. Built as a TypeScript **Turborepo monorepo**, Synca pairs a **Next.js 14 (App Router)** frontend with a standalone **Express.js + Socket.io** backend, **MongoDB Atlas (Mongoose)** for persistent document storage, **Upstash Redis** for pub/sub WebSocket scaling, rate limiting, and ephemeral presence/typing state, **Clerk** for JWT authentication and identity management, and **Cloudinary** for multi-format file transfers with automated 24-hour lifecycle expiration.

This report documents the complete lifecycle of Synca across four core chapters: **Chapter 1 (Introduction)** details the problem space, objectives, functional and non-functional capabilities, REST/WebSocket APIs, security controls, and a screen-by-screen walkthrough of the user interface; **Chapter 2 (Design and Architecture)** presents the client-server, event-driven distributed architecture alongside formal UML Class, Use Case, Activity, Sequence, Package, Deployment, and Entity-Relationship diagrams; **Chapter 3 (Development Environment)** provides an exhaustive, beginner-friendly setup manual with verification and troubleshooting guides; and **Chapter 4 (Conclusion)** evaluates achievements, engineering lessons, current limitations, and the multi-phase future roadmap.

---

## Table of Contents

- **Front Matter**
  - Abstract
  - List of Figures
  - List of Tables
  - List of Abbreviations
- **Chapter 1: Introduction**
  - 1.1 Background and Motivation
  - 1.2 Problem Statement
  - 1.3 Purpose and Objectives of Synca
  - 1.4 Scope of the Project
  - 1.5 Target Users and Stakeholders
  - 1.6 Core Functional Features
    - 1.6.1 Project-Centric Workspace & Portfolio Management
    - 1.6.2 Role-Based Access Control (RBAC) & Join Code Onboarding
    - 1.6.3 Decoupled Kanban Board & Collapsible List Views
    - 1.6.4 Task Lifecycle, Subtasks, Comments & Personal Private Tasks
    - 1.6.5 Real-Time Messaging (Project Channels & 1:1 Direct Messages)
    - 1.6.6 Rich-Text Inline Markdown Formatting & Message Grouping
    - 1.6.7 Ephemeral 24-Hour File Transfers (All Types, 25 MB Limit)
    - 1.6.8 Departed & Removed Member Lifecycle Handling
    - 1.6.9 Scoped Three-Tier User Discovery
    - 1.6.10 Dual Light/Dark Design System & Viewport-Locked Desktop Shell
  - 1.7 Application Programming Interface (API) Overview
    - 1.7.1 RESTful HTTP API (`/api/v1`)
    - 1.7.2 Real-Time WebSocket Event Protocol (Socket.io)
  - 1.8 Authentication, Authorization, and Security Architecture
    - 1.8.1 Identity & JWT Session Verification (Clerk)
    - 1.8.2 Project-Scoped RBAC & Ownership Guards
    - 1.8.3 Transport, Injection, XSS, and Upload Hardening
  - 1.9 Screen-by-Screen User Interface Walkthrough
    - 1.9.1 Authentication Screens (Sign-In & Sign-Up)
    - 1.9.2 Personal Dashboard (`/dashboard`)
    - 1.9.3 Navigation Sidebar & WhatsApp-Style Chat List
    - 1.9.4 Project Portfolio (`/projects`)
    - 1.9.5 Create Project Modal & Join Project Modal
    - 1.9.6 Project Detail — Overview Tab
    - 1.9.7 Project Detail — Board Tab (Kanban)
    - 1.9.8 Project Detail — List Tab
    - 1.9.9 Project Detail — Conversation Tab (`#project-channel`)
    - 1.9.10 Project Detail — Settings Tab & Members/Roles Modal
    - 1.9.11 Task Creation/Edit Modal & Task Detail Drawer
    - 1.9.12 Direct Messages Hub & Contact Profile Drawer (`/chats`)
    - 1.9.13 New Message Modal (Scoped Search & Inline Email Lookup)
    - 1.9.14 User Settings & Theme Switcher (`/settings`)
- **Chapter 2: Design and Architecture**
  - 2.1 Architectural Style and Rationale
  - 2.2 High-Level System Architecture
  - 2.3 Architecture Decision Records (ADRs 001–010)
  - 2.4 Backend Layered Architecture & Middleware Pipeline
  - 2.5 Frontend Architecture & State Management
  - 2.6 Database Design & Entity-Relationship Diagram (ERD)
  - 2.7 UML Class Diagram
  - 2.8 UML Use Case Diagram
  - 2.9 UML Activity Diagrams
  - 2.10 UML Sequence Diagrams
  - 2.11 UML Package Diagram
  - 2.12 UML Deployment Diagram
- **Chapter 3: Development Environment**
  - 3.1 System & Software Prerequisites
  - 3.2 Installing Core Developer Tools (Node.js, Git, VS Code)
  - 3.3 Provisioning External Cloud Services
    - 3.3.1 MongoDB Atlas Setup
    - 3.3.2 Upstash Redis Setup
    - 3.3.3 Clerk Authentication Setup
    - 3.3.4 Cloudinary Media Storage & API Key Role Setup
  - 3.4 Cloning the Repository & Exploring the Monorepo
  - 3.5 Configuring Environment Variables
  - 3.6 Installing Dependencies & Starting the Development Servers
  - 3.7 Verifying the Installation
  - 3.8 Useful Workspace Commands & Database Scripts
  - 3.9 Troubleshooting Common Setup Issues
- **Chapter 4: Conclusion**
  - 4.1 Project Summary
  - 4.2 Evaluation Against Project Objectives
  - 4.3 Key Engineering Challenges and Lessons Learned
  - 4.4 Current Limitations
  - 4.5 Future Work Roadmap
  - 4.6 Concluding Remarks
- **References**
  - 5.1 Comparable Software Platforms & Industry Benchmarks
  - 5.2 Technical Documentation & Web Resources
  - 5.3 Books & Academic Literature

---

## List of Figures

- **Figure 1.1**: Synca Sign-In Screen (`/sign-in`)
- **Figure 1.2**: Synca Sign-Up Screen (`/sign-up`)
- **Figure 1.3**: Personal Dashboard — Light Mode (`/dashboard`)
- **Figure 1.4**: Personal Dashboard — Dark Mode (`/dashboard`)
- **Figure 1.5**: Left Navigation Sidebar (Expanded & Collapsed States)
- **Figure 1.6**: Project Portfolio Page (`/projects`)
- **Figure 1.7**: Two-Step Create Project Modal
- **Figure 1.8**: Join Project with 6-Character Code Modal
- **Figure 1.9**: Project Detail — Overview Tab (`/projects/[id]`)
- **Figure 1.10**: Project Detail — Kanban Board Tab with Drag-and-Drop Columns
- **Figure 1.11**: Project Detail — Collapsible List View Tab
- **Figure 1.12**: Project Detail — Conversation Tab with Formatting Toolbar & File Cards
- **Figure 1.13**: Project Detail — Settings Tab & Join Code Management
- **Figure 1.14**: Members, Invites & Roles Modal (`EditTeamModal`)
- **Figure 1.15**: Create / Edit Task Modal (`TaskModal`)
- **Figure 1.16**: Slide-Over Task Detail Drawer (`TaskDetailModal`)
- **Figure 1.17**: Direct Messages Hub & Detachable Contact Profile Drawer (`/chats`)
- **Figure 1.18**: New Message Modal with Inline Exact-Email Lookup
- **Figure 1.19**: User Settings & Appearance Theme Switcher (`/settings`)
- **Figure 2.1**: High-Level System Architecture Diagram
- **Figure 2.2**: MongoDB Entity-Relationship Diagram (ERD)
- **Figure 2.3**: UML Class Diagram — Core Domain Models
- **Figure 2.4**: UML Use Case Diagram — Actors and System Capabilities
- **Figure 2.5**: UML Activity Diagram — Task Creation & Kanban Column Movement
- **Figure 2.6**: UML Activity Diagram — Ephemeral 24-Hour File Upload & Expiration Lifecycle
- **Figure 2.7**: UML Sequence Diagram — Real-Time Messaging via Socket.io & Redis
- **Figure 2.8**: UML Sequence Diagram — Authenticated File Upload & 15-Minute Cleanup Sweeper
- **Figure 2.9**: UML Sequence Diagram — Member Removal & Automatic Task Unassignment
- **Figure 2.10**: UML Package Diagram — Turborepo Monorepo Structure
- **Figure 2.11**: UML Deployment Diagram — Production Cloud Topology
- **Figure 3.1 – 3.10**: Step-by-Step Development Environment & Cloud Setup Screenshots

---

## List of Abbreviations

| Abbreviation | Full Form |
|---|---|
| **ADR** | Architecture Decision Record |
| **API** | Application Programming Interface |
| **BSON** | Binary JSON (MongoDB document format) |
| **CORS** | Cross-Origin Resource Sharing |
| **CSP** | Content Security Policy |
| **CRUD** | Create, Read, Update, Delete |
| **DM** | Direct Message (1:1 private conversation) |
| **DOM** | Document Object Model |
| **ERD** | Entity-Relationship Diagram |
| **FOUC** | Flash of Unstyled Content |
| **FYP** | Final Year Project |
| **HSTS** | HTTP Strict Transport Security |
| **JWT** | JSON Web Token |
| **KPI** | Key Performance Indicator |
| **MIME** | Multipurpose Internet Mail Extensions |
| **MVP** | Minimum Viable Product |
| **ODM** | Object Document Mapper |
| **OWASP** | Open Web Application Security Project |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SWR** | Stale-While-Revalidate |
| **TTL** | Time-To-Live |
| **UI / UX** | User Interface / User Experience |
| **UML** | Unified Modeling Language |
| **WSS** | WebSocket Secure |
| **XSS** | Cross-Site Scripting |
