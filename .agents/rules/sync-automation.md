---
trigger: always_on
---

# Agent Execution, Documentation & Phase Tracking Protocols

## 1. Context Awareness Strategy
- Before executing any modification, consult `CONTEXT.md` and relevant files in `/docs/`.
- Maintain strictly accurate representations of endpoints, database models, active architecture, and active phase status.

## 2. Automated Post-Change Protocol (Automatic Execution)
After completing any code edit, feature addition, refactor, or route update, you MUST execute the following in sequence:
1. **Update `CONTEXT.md`**:
   - Update endpoints, models, or environment variables if changed.
   - Update active phase step checkboxes `[x]` and recalculate completion percentage (e.g., `Phase 0: 60%`).
2. **Update `/docs/` Files**: Reflect changes in `docs/api.md`, `docs/database.md`, etc.
3. **Append to `CHANGELOG.md`**: Record concise updates.

## 3. Manual Sync Protocol (`sync-docs`)
When the user gives the command `sync-docs`:
1. Scan git diffs across the codebase.
2. Reconcile `CONTEXT.md`, `/docs/`, and phase completion state.
3. Log the sync in `CHANGELOG.md` under `## [Manual Sync] - YYYY-MM-DD`.

## 4. Phase-Based Execution Protocol
1. **Single Phase Focus**: Work exclusively on the currently active phase. Do not write code for future phases.
2. **Phase Completion**: When all steps of the active phase are done:
   - Mark the phase status as `Completed (100%)` in `CONTEXT.md`.
   - Record the phase milestone in `CHANGELOG.md`.
   - Notify the user: *"Phase X is 100% complete! Let me know when you're ready to plan Phase [X+1]."*
3. **Phase Planning Command**: When the user requests `Plan Phase X`:
   - Break Phase X down into clear, numbered, atomic steps.
   - Record the step checklist under Phase X in `CONTEXT.md`.
   - Wait for the user to approve or begin step 1.