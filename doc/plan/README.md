# Development plan

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; full-goal-not-achieved

The target remains the [confirmed single-account cloud requirements](modules/single-account-cloud/requirements.md). Offline tests do not establish live compatibility. One account per deployment and independent CN/HK acceptance remain requirements; no multi-account scope expansion is planned.

| Stage | Current evidence | Remaining work |
| --- | --- | --- |
| Offline baseline | DONE: fixture CLI, build, test commands | Maintain focused regressions |
| Balance reliability | DONE: primary/flyout strict numeric validation; unknown failures rejected | DONE: source/time on dashboard reads; DONE: retain successful/stopped-account observations; DONE: initial observation retained on partial failure; TODO: durable evidence and complete data-shape validation |
| Result propagation | DONE: exit selection, explicit summaries, nullable account failures and fixed codes | TODO: auth-specific classification, true process/IPC validation, GUI nullable-total review |
| Single-account boundary | DONE: early account/process count guard, forced in Actions | DONE: shared-directory account lock including recovery; TODO: cross-runner scheduling concurrency |
| Recovery and notifications | DONE: persistent store and account-entry guard; bounded recovery controller and read-only command tested; per-destination block notifications integrated; quiet ordinary log routing implemented; real sessions pending | TODO: persistent blocked state, bounded recovery, deduplicated alerts, controlled resume |
| Session/runtime | DONE: bounded supervisor and encrypted local SQLite transfer | TODO: cloud transport/retention/freshness, deployment and runtime suitability |
| Regional acceptance | Neither market tested | TODO: separate CN/HK evidence and multi-day completion/intervention metrics |
| Upstream maintenance | DONE: fork/remotes, update procedure and isolated rollback rehearsal | TODO: actual future-upstream merge and deployed rollback acceptance |

Linux CI run 35198757037 passed all 187 tests. Next: address remaining items in the [acceptance audit](modules/single-account-cloud/acceptance-audit.md). The [upstream procedure](modules/single-account-cloud/upstream-maintenance.md) and isolated rollback rehearsal are complete. Review login/recovery integration against the same contracts. Obtain required user account/environment input when live acceptance is reached, rather than treating offline coverage as completion.

For each stage: reproduce the defect or failing acceptance test, implement the smallest coherent change, run affected regressions/build, review limitations, update this plan and operation log, commit and push. Never report an unexecuted check as passing.

Latest verification: build and 187 tests pass on macOS and Linux (run 35198757037); see [runtime-budget evidence](../operation-log/2026-09-17-phase-8-runtime-budget.md). Earlier operation logs are historical snapshots, not the current checklist. The [code-disposition inventory](modules/single-account-cloud/code-disposition.md) records the initial audit and should be interpreted alongside current changes.

Diagnostic privacy increment: raw capture now defaults off consistently with the example config; new capture files/directories use owner-only permissions. Build and 189 local tests pass. Raw opt-in captures are still sensitive; pre-existing files and general logs require separate review. See [phase evidence](../operation-log/2026-09-17-diagnostic-privacy.md).

Partial-failure increment: the initial validated observation is retained per account even if later execution throws; final balance and gains remain unknown. Build and 192 local tests pass. See [evidence](../operation-log/2026-09-17-partial-balance-evidence.md).

State-transfer increment: consistent SQLite snapshots are authenticated and encrypted for one account; restore refuses existing state. Build and 205 local tests pass, including actual production store round trips. Cloud transport is not yet wired. See [design and boundaries](modules/single-account-cloud/state-transfer-design.md).

State CLI increment: environment-secret export/import commands and exclusive ciphertext publication are tested in real child processes. Build and 214 local tests pass. Next: remote state transport and freshness/retention failure behavior before live deployment.

Remote-state increment: dedicated-branch Contents API adapter now enforces ready/pending conditional revisions and no blind retries. Synthetic live GitHub round trip and conflict protection passed; temporary branch removed. Build and 225 local tests pass. Next: workflow orchestration, initial session provisioning and independent runner acceptance. See [remote protocol](modules/single-account-cloud/remote-state-design.md).

Cloud orchestration increment: manual, disabled-by-default workflow and restore/claim/bounded-run/publish entry are implemented. Build and 241 local tests pass; real Rewards execution and initial provisioning remain pending. See [deployment contract](modules/single-account-cloud/cloud-workflow.md).
