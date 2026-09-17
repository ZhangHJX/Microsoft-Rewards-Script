# Phase 9: Linux CI preparation

- updated_at: 2026-09-17
- author: Codex
- status: workflow-committed; authorization-pending

Added Offline reliability tests on ubuntu-latest/Node 24, with read-only repository permissions, pinned official checkout/setup-node commits, a 10-minute job limit, lockfile installation without lifecycle scripts and npm run test:reliability. It contains no account secrets, browser install, application startup, recurring schedule or reward execution.

Local workflow format/diff checks passed. GitHub rejected the push of e99f25f because the current OAuth credential lacks workflow scope. No CI run was created. The user authorized starting the scope refresh, and the device authorization process is pending. Do not report Linux tests as passed before a real run completes.

Independent progress: fetched upstream v4 (no newer upstream commits) and completed the isolated rollback rehearsal documented in upstream-maintenance.md (build and 180 tests passed on the rollback candidate).
