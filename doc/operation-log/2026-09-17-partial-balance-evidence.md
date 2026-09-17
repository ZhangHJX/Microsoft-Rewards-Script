# Initial balance evidence on partial failure

- updated_at: 2026-09-17
- author: Codex
- status: implemented; local-verification-passed

DONE: reproduced three failing regressions: initial zero and positive observations were lost on a later error; Main did not publish its validated initial observation before later dashboard processing. Main now reports that observation through an optional callback. The account runner retains only value, source and timestamp in account-local storage and includes it in failed results. No arbitrary exception fields are copied.

DONE: build and 192 tests passed; targeted ESLint and diff checks passed. Tests execute compiled production methods with synthetic browser/account dependencies, exercise cleanup after failure, verify unknown final balance/gains and failure classification, and verify no observation leaks into the next account. No real account activity was executed.

Reassessment: partial initial evidence is implemented, not a durable audit trail. A late cleanup failure can still discard the terminal observation. Failed run summaries remain unknown and exit unsuccessfully; an initial balance does not prove task completion. Cloud result persistence and whole-process acceptance remain open.

TODO: persist sanitized run evidence; verify authentication/session recovery; finish cloud state persistence and regional live acceptance.
