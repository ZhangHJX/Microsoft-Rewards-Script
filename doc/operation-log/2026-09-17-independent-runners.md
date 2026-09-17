# Independent Actions runner state acceptance

- updated_at: 2026-09-17
- author: Codex
- status: rehearsal-implemented; execution-pending

The offline workflow now offers an explicit synthetic state rehearsal, triggered by a trusted development-branch push with [state-rehearsal] in its commit message or an explicit dispatch input. Pull requests cannot enable the write-enabled rehearsal jobs. Ordinary offline tests remain read-only.

A producer job writes a synthetic session, persistent block and acknowledged notification to a temporary state branch. A separate consumer job restores it using the production cloud orchestrator, verifies the session and acknowledgement, changes the block, publishes after a simulated normal failure exit, and downloads/restores the new state again to verify persistence. A final job removes the temporary branch even after failures. No Rewards account, browser activity or real key is used; the fixture key is deliberately public and deterministic from the CI run identity.

The rehearsal adds separate write-scoped jobs only when explicitly requested. Cancellation-on-new-push is disabled so cleanup can finish. Manual workflow cancellation or runner loss may still require cleanup of a synthetic branch. Per-job limits are five minutes. This test proves state portability and orchestration on separate Actions machines; it does not prove real login, automatic earning or notification delivery.

Verification before dispatch: script syntax, targeted ESLint, Prettier and diff checks pass. Remote execution result will be recorded after the run.
