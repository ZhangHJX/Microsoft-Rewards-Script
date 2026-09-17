# Priorities

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; full-goal-open

- TODO P1 — Wire the tested remote state adapter into workflow orchestration with restore/begin/run/publish and explicit failure handling.
- TODO P1 — Define cross-trigger Actions concurrency and bounded deployment; verify state survives independent runners.
- TODO P1 — Cover automatic authentication/session recovery and real expiry; classify unsupported challenges and bounded failures.
- TODO P1 — Finish response/task contracts, durable result evidence and whole-process/IPC acceptance.
- TODO P1 — Complete lower-level log confidentiality audit and runtime-timeout notification policy.
- TODO P2 — Verify real notification delivery, recovery alerts and transient-failure escalation.
- TODO P2 — Obtain separate CN/HK live evidence and multi-day runtime/completion/intervention metrics.
- TODO P2 — Verify deployed rollback and a future upstream update through the documented procedure.

DONE: account boundary; shared-directory lock; validated balances/source/time; initial evidence on partial failures; explicit failed summaries; persistent blocks; bounded read-only recovery; per-destination notification acknowledgement; quiet normal forwarding; bounded process supervisor; opt-in private raw diagnostics; local encrypted state transfer and CLI.

Current local verification: build and 225 tests pass; synthetic live GitHub state transport passed. Tests are scoped evidence, not real account or deployed acceptance. The [plan](../plan/README.md), [acceptance audit](../plan/modules/single-account-cloud/acceptance-audit.md) and [requirements](../plan/modules/single-account-cloud/requirements.md) remain authoritative. Historical operation logs retain earlier test counts.
