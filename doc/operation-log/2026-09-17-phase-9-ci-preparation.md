# Phase 9: Linux CI preparation

- updated_at: 2026-09-17
- author: Codex
- status: linux-offline-ci-passed

Added Offline reliability tests on ubuntu-latest/Node 24, with read-only repository permissions, pinned official checkout/setup-node commits, a 10-minute job limit, lockfile installation without lifecycle scripts and npm run test:reliability. It contains no account secrets, browser install, application startup, recurring schedule or reward execution.

Local workflow format/diff checks passed. GitHub rejected the push of e99f25f because the current OAuth credential lacks workflow scope. No CI run was created. The user authorized starting the scope refresh, and the device authorization process is pending. Do not report Linux tests as passed before a real run completes.

Independent progress: fetched upstream v4 (no newer upstream commits) and completed the isolated rollback rehearsal documented in upstream-maintenance.md (build and 180 tests passed on the rollback candidate).

Authorization completed and the push succeeded. Linux run 35198757037 is testing head 80d2dcaf9b2d47737dc0e9ce665796f8f802ac47; the run completed successfully.

Verified Linux result: https://github.com/ZhangHJX/Microsoft-Rewards-Script/actions/runs/35198757037 — build and 187/187 tests passed, zero failures/skips. Job duration 16 seconds; test duration approximately 3 seconds. No account secrets or real service operations were configured.
