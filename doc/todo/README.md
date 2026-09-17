# Priorities

- updated_at: 2026-09-17
- author: Codex
- status: phase-1-complete; production-work-pending

- TODO P1 — Introduce structured run results and correct exit-code aggregation; regression-test all-account failure and valid zero activity.
- TODO P1 — Define a cloud entry point that rejects any account count other than one before side effects.
- TODO P1 — Separate unavailable/invalid balance data from numeric zero and record the data source.
- TODO P1 — Add persistent blocked states, bounded recovery, and deduplicated actionable notifications.
- TODO P2 — Preserve automatic authentication coverage and define controlled resume after personal intervention.
- TODO P2 — Validate session confidentiality, complete persistence, and same-account mutual exclusion in the chosen runtime.
- TODO P2 — Establish separate CN/HK compatibility evidence after offline checks pass.
- TODO P2 — Add an upstream-update review procedure with focused regression checks and rollback.

All priorities are implementation work, not claims of completed functionality. See the [plan](../plan/README.md) and [requirements](../plan/modules/single-account-cloud/requirements.md).

Completed baseline: build and 40 tests pass. Next: prioritize actual balance-parser contracts and unknown handling. See the [phase report](../operation-log/2026-09-17-phase-1.md).
