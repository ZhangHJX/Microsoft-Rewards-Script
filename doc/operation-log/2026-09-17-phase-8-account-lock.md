# Phase 8: same-account process exclusion

- updated_at: 2026-09-17
- author: Codex
- status: shared-directory-lock-integrated; cross-runner-lock-pending
- baseline: 0995b94

Added an account-specific SQLite transaction lock under sessionPath/account-locks, keyed by normalized account hash. BEGIN IMMEDIATE with zero busy timeout rejects a second owner as ACCOUNT_BUSY. Locks are separate from block/session databases and from other accounts. Operating-system process cleanup releases SQLite locks, avoiding stale PID-file expiration guesses.

Both runUnlessBlocked and the standalone recovery command acquire the same lock. The account guard holds it through account execution and block notification handling, releasing on completion/failure. Storage failure fails closed. No lock is forcibly stolen on a wall-clock timeout.

Three lock tests cover same-account exclusion, independent accounts, a real child process denied while held and admitted after release, and a child exiting without explicit cleanup. A guard overlap test initially executed the prohibited second callback, then passed after integration. Full build and all 180 tests pass; targeted lint, formatting and diff checks pass. No real account or external message was used.

Limit: contenders must use the same directory on a filesystem supporting SQLite locks. Separate Actions runners with separate copies are not mutually excluded by this lock; a stable account-level scheduler concurrency group remains required. Database files must not be removed/replaced while a holder is active. Network-filesystem lock correctness and Linux runner behavior have not been verified in this environment.

Reassessment: next add a hard process-level runtime budget rather than releasing the account lock while work might still be running. Then audit the full plan, including cloud state persistence, real login compatibility and multi-day acceptance; those cannot be certified by the current offline suite.
