# Upstream synchronization and rollback

- updated_at: 2026-09-17
- author: Codex
- status: procedure-recorded; local-rollback-rehearsed

Keep origin as the user's fork and upstream as TheNetsky/Microsoft-Rewards-Script. Work on codex/single-account-cloud; retain v4 as the upstream baseline. Do not overwrite the fork branch with an upstream reset or enable automatic deployment after sync.

## Update procedure

1. Fetch upstream v4 and record its SHA plus the verified fork SHA.
2. Inspect the upstream diff, particularly browser/auth, dashboard parsing, session storage, configuration schema, notifications and dependencies.
3. Create an isolated update worktree/branch from the verified fork; merge upstream/v4 there. Resolve conflicts explicitly against the acceptance requirements, not by choosing one entire side.
4. Install the lockfile with lifecycle scripts disabled for offline validation. Run npm run test:reliability and focused lint/format checks. Run Linux offline CI and verify the exact tested head SHA.
5. Review configuration/database compatibility. Offline tests do not authorize claims about live login or points. If affected, perform the separate account acceptance procedure before promoting the revision.
6. Record outcomes in doc/operation-log, then integrate through a reviewable change. Preserve the previously verified revision until acceptance completes.

## Rollback procedure

Stop the deployed process/job first and retain the session/state directory securely. Revert the relevant change on an isolated branch or deploy the previously verified revision; do not delete database files or force-reset shared branch history. Check schema compatibility before older code opens newer state. Run the offline suite on the candidate rollback and record which capabilities are intentionally removed. Resume only after controlled validation.

Local rehearsal on 2026-09-17: created a disposable detached worktree at e99f25f, reverted df4be92 (runtime supervisor) without committing, and ran build plus 180 remaining tests successfully. The temporary worktree was removed. The active worktree and commits were unchanged. This proves that one feature patch can be rolled back cleanly; it does not prove arbitrary database downgrades or deployed rollback.

Upstream check on 2026-09-17: fetched v4 and found no newer commits beyond d0f07d74a0ed4dda127855d6e3dde98bf4c89d6e. There was no new upstream change to merge or validate.
