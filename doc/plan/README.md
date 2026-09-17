# Development plan

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; full-goal-not-achieved

The target remains the [confirmed single-account cloud requirements](modules/single-account-cloud/requirements.md). Offline tests do not establish live compatibility. One account per deployment and independent CN/HK acceptance remain requirements; no multi-account scope expansion is planned.

| Stage | Current evidence | Remaining work |
| --- | --- | --- |
| Offline baseline | DONE: fixture CLI, build, test commands | Maintain focused regressions |
| Balance reliability | DONE: primary/flyout strict numeric validation; unknown failures rejected | DONE: source/time on dashboard reads; DONE: retain successful/stopped-account observations; TODO: partial-failure observations, durable evidence and complete data-shape validation |
| Result propagation | DONE: exit selection, explicit summaries, nullable account failures and fixed codes | TODO: auth-specific classification, true process/IPC validation, GUI nullable-total review |
| Single-account boundary | DONE: early account/process count guard, forced in Actions | DONE: shared-directory account lock including recovery; TODO: cross-runner scheduling concurrency |
| Recovery and notifications | DONE: persistent store and account-entry guard; bounded recovery controller and read-only command tested; per-destination block notifications integrated; quiet ordinary log routing implemented; real sessions pending | TODO: persistent blocked state, bounded recovery, deduplicated alerts, controlled resume |
| Session/runtime | Not verified | TODO: confidential persistence, runtime suitability and resource budget |
| Regional acceptance | Neither market tested | TODO: separate CN/HK evidence and multi-day completion/intervention metrics |
| Upstream maintenance | Fork and upstream remote preserved | TODO: documented update review and rollback validation |

Next: add Linux offline CI, then address the [acceptance audit](modules/single-account-cloud/acceptance-audit.md) and upstream update/rollback procedure. Review login/recovery integration against the same contracts. Obtain required user account/environment input when live acceptance is reached, rather than treating offline coverage as completion.

For each stage: reproduce the defect or failing acceptance test, implement the smallest coherent change, run affected regressions/build, review limitations, update this plan and operation log, commit and push. Never report an unexecuted check as passing.

Latest verification: build and 187 tests pass; see [runtime-budget evidence](../operation-log/2026-09-17-phase-8-runtime-budget.md). Earlier operation logs are historical snapshots, not the current checklist. The [code-disposition inventory](modules/single-account-cloud/code-disposition.md) records the initial audit and should be interpreted alongside current changes.
