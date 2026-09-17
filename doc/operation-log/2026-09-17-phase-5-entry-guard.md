# Phase 5: persistent account entry guard

- updated_at: 2026-09-17
- author: Codex
- status: entry-guard-integrated; resume-notification-integration-pending
- baseline: 226cef8

runTasks now invokes runUnlessBlocked before constructing the account HTTP client or calling Main. The guard opens account-blocks.sqlite under the configured session directory, checks existing state, and closes its connection after the invocation. Existing blocks return ACCOUNT_BLOCKED. Confirmed BALANCE_UNAVAILABLE failures and warning-stopped results are persisted; generic transient exceptions are not permanently blocked. Storage initialization/read/write errors fail closed as STATE_STORAGE_FAILED.

The account layer retains these classifications. Repeated ACCOUNT_BLOCKED results do not emit another ACCOUNT-ERROR record, though ordinary start/end logs and their existing webhook routing remain; this is not complete notification deduplication.

Five guard tests cover persisted failure followed by a new invocation, warning restriction, transient failure, account isolation and storage failure. A compiled account-entry test initially invoked both HTTP construction and Main while blocked, then passed after integration. Full build and all 129 tests pass; targeted ESLint, formatting and whitespace checks pass.

Verification limits: tests use temporary state databases and synthetic account callbacks. They prove persistence across closed/reopened guard invocations, not a deployed scheduler, real account login or an operating-system restart. Existing run-status tests explicitly substitute a pass-through guard except the new entry-boundary test; store behavior has its own real SQLite tests.

Reassessment: next implement a validation-only recovery operation that uses current store tokens and never calls the full Main executor, then connect actionable notifications and delivery acknowledgements. No user-facing resume command exists yet, so this branch is still development work and is not ready for deployment. Same-account concurrency locking, early config validation and complete crash recovery remain open.
