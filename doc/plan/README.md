# Development plan

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; full-goal-not-achieved

The target remains the [confirmed single-account cloud requirements](modules/single-account-cloud/requirements.md). Offline tests do not establish live compatibility. One account per deployment and independent CN/HK acceptance remain requirements; no multi-account scope expansion is planned.

| Stage | Current evidence | Remaining work |
| --- | --- | --- |
| Offline baseline | DONE: fixture CLI, build, test commands | Maintain focused regressions |
| Balance reliability | DONE: primary/flyout strict numeric validation; unknown failures rejected | DONE: source/time on dashboard reads; TODO: retain observations in account results and complete data-shape validation |
| Result propagation | DONE: exit selection, explicit summaries, nullable account failures and fixed codes | TODO: auth-specific classification, true process/IPC validation, GUI nullable-total review |
| Single-account boundary | Not implemented | TODO: validate exactly one account before side effects and define stable concurrency identity |
| Recovery and notifications | Not implemented | TODO: persistent blocked state, bounded recovery, deduplicated alerts, controlled resume |
| Session/runtime | Not verified | TODO: confidential persistence, runtime suitability and resource budget |
| Regional acceptance | Neither market tested | TODO: separate CN/HK evidence and multi-day completion/intervention metrics |
| Upstream maintenance | Fork and upstream remote preserved | TODO: documented update review and rollback validation |

Next: retain before/after balance observations in account results, then implement persisted failure-state behavior with offline tests. Review login/recovery integration against the same contracts. Obtain required user account/environment input when live acceptance is reached, rather than treating offline coverage as completion.

For each stage: reproduce the defect or failing acceptance test, implement the smallest coherent change, run affected regressions/build, review limitations, update this plan and operation log, commit and push. Never report an unexecuted check as passing.

Latest verification: build and 112 tests pass; see [observation evidence](../operation-log/2026-09-17-phase-4-observations.md). Earlier operation logs are historical snapshots, not the current checklist. The [code-disposition inventory](modules/single-account-cloud/code-disposition.md) records the initial audit and should be interpreted alongside current changes.
