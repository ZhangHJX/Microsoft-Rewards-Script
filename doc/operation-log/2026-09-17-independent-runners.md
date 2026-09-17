# Independent Actions runner state acceptance

- updated_at: 2026-09-17
- author: Codex
- status: passed-on-independent-Actions-runners

The offline workflow now offers an explicit synthetic state rehearsal, triggered by a trusted development-branch push with [state-rehearsal] in its commit message or an explicit dispatch input. Pull requests cannot enable the write-enabled rehearsal jobs. Ordinary offline tests remain read-only.

A producer job writes a synthetic session, persistent block and acknowledged notification to a temporary state branch. A separate consumer job restores it using the production cloud orchestrator, verifies the session and acknowledgement, changes the block, publishes after a simulated normal failure exit, and downloads/restores the new state again to verify persistence. A final job removes the temporary branch even after failures. No Rewards account, browser activity or real key is used; the fixture key is deliberately public and deterministic from the CI run identity.

The rehearsal adds separate write-scoped jobs only when explicitly requested. Cancellation-on-new-push is disabled so cleanup can finish. Manual workflow cancellation or runner loss may still require cleanup of a synthetic branch. Per-job limits are five minutes. This test proves state portability and orchestration on separate Actions machines; it does not prove real login, automatic earning or notification delivery.

Verification before dispatch: script syntax, targeted ESLint, Prettier and diff checks pass. Remote execution result will be recorded after the run.

## Verified result

Run 35201883404 on commit 46300ca completed successfully: offline 14s, producer 14s, independent consumer 17s, cleanup 7s. The offline suite passed 241 tests. The consumer verified session contents, existing block and notification acknowledgement, published a changed block after a simulated failed account result, then restored that new remote snapshot and verified the changed block. Cleanup completed successfully.

Evidence: https://github.com/ZhangHJX/Microsoft-Rewards-Script/actions/runs/35201883404 . These are four job durations, not a claim about real account runtime or billing. The user selected CN for the first real acceptance; account email and browser login are still pending.
