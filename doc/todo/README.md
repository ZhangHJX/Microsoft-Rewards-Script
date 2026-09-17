# Priorities

- updated_at: 2026-09-17
- author: Codex
- status: phase-3-exit-selection-complete; remaining-work-pending

- DONE P1 — Correct account-failure exit-code selection; compiled-method tests cover failure, zero activity and missing reports.
- TODO P1 — Introduce structured run results, truthful summaries and end-to-end process/IPC verification.
- TODO P1 — Define a cloud entry point that rejects any account count other than one before side effects.
- TODO P1 — Separate unavailable/invalid balance data from numeric zero and record the data source.
- DONE P1 — Reject invalid flyout balances and preserve valid zero, with 27 parser tests.
- DONE P1 — Validate primary dashboard balances and getCurrentPoints error propagation; 32 integration tests pass.
- TODO P1 — Attach balance source and observation time.
- TODO P1 — Add persistent blocked states, bounded recovery, and deduplicated actionable notifications.
- TODO P2 — Preserve automatic authentication coverage and define controlled resume after personal intervention.
- TODO P2 — Validate session confidentiality, complete persistence, and same-account mutual exclusion in the chosen runtime.
- TODO P2 — Establish separate CN/HK compatibility evidence after offline checks pass.
- TODO P2 — Add an upstream-update review procedure with focused regression checks and rollback.

All priorities are implementation work, not claims of completed functionality. See the [plan](../plan/README.md) and [requirements](../plan/modules/single-account-cloud/requirements.md).

Completed baseline: build and 40 tests pass. Next: prioritize actual balance-parser contracts and unknown handling. See the [phase report](../operation-log/2026-09-17-phase-1.md).
