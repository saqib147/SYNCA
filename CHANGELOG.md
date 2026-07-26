# Changelog

All notable changes to the Synca project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
