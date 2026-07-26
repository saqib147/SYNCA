---
trigger: always_on
---

Agent Execution & Documentation Protocols
1. Context Awareness Strategy
- Before executing any modification, consult `CONTEXT.md` and relevant files in `/docs/`.
- Maintain strictly accurate representations of endpoints, database models, and active architecture.

2. Automated Post-Change Protocol (Automatic Execution)
After completing any code edit, feature addition, refactor, or route update, you MUST execute the following steps in sequence:

1. Update `CONTEXT.md`:
   - If an API endpoint changed (e.g., updated `/user/all` to `/users/getall`), update the endpoint table immediately in `CONTEXT.md`.
   - Update model attributes, environment variable requirements, or architecture notes if modified.
2. Update `/docs/` Files:
   - Reflect route, schema, or structural changes in the corresponding detailed doc (`docs/api.md`, `docs/database.md`, etc.).
3. Append to `CHANGELOG.md`:
   - Log the edit under `[Unreleased]` or current date with a concise summary of changes and impacted modules.

3. Manual Sync Protocol (`sync-docs`)
When the user gives the command `sync-docs`, `/sync-docs`, or asks to sync documentation:
1. Scan all modified files in the codebase (run `git diff` or review recent file diffs).
2. Compare the code changes against `CONTEXT.md` and `/docs/`.
3. Reconcile any discrepancies (endpoints, schemas, function signatures, new packages).
4. Update `CONTEXT.md`, the matching `/docs/` files, and add an entry in `CHANGELOG.md` under `## [Manual Sync] - YYYY-MM-DD`.
5. Provide a summary response detailing what documentation was updated.