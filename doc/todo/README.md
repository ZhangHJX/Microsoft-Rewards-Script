# Priorities

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; full-goal-open

- TODO P1 — Provision the first real CN session; independent synthetic runner transfer is verified.
- TODO P1 — Verify actual Actions overlap handling and bounded deployment; concurrency and runtime budgets are now configured.
- TODO P1 — Cover automatic authentication/session recovery and real expiry; classify unsupported challenges and bounded failures.
- TODO P1 — Finish response/task contracts, durable result evidence and whole-process/IPC acceptance.
- TODO P1 — Complete lower-level log confidentiality audit and runtime-timeout notification policy.
- TODO P2 — Verify real notification delivery, recovery alerts and transient-failure escalation.
- TODO P2 — Obtain separate CN/HK live evidence and multi-day runtime/completion/intervention metrics.
- TODO P2 — Verify deployed rollback and a future upstream update through the documented procedure.

DONE: account boundary; shared-directory lock; validated balances/source/time; initial evidence on partial failures; explicit failed summaries; persistent blocks; bounded read-only recovery; per-destination notification acknowledgement; quiet normal forwarding; bounded process supervisor; opt-in private raw diagnostics; local encrypted state transfer and CLI.

Current local verification: build and 241 tests pass; synthetic live GitHub state transport and independent Actions producer/consumer/cleanup passed (run 35201883404). Tests are scoped evidence, not real account or deployed acceptance. The [plan](../plan/README.md), [acceptance audit](../plan/modules/single-account-cloud/acceptance-audit.md) and [requirements](../plan/modules/single-account-cloud/requirements.md) remain authoritative. Historical operation logs retain earlier test counts.
