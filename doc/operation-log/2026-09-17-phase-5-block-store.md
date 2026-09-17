# Phase 5: persistent block-state store

- updated_at: 2026-09-17
- author: Codex
- status: store-complete; integration-pending
- baseline: d2f97c5

Added BlockStateStore with SQLite account isolation, stable same-reason revisions, notification acknowledgement, and token-checked validation completion. See the block-state design for transition rules and limits.

Nine tests use temporary databases, including multiple simultaneous connections, repeated errors, stale acknowledgement, failed validation, successful account-specific recovery, intervening failure, superseded validation and rejected inputs. Initial execution failed because the new module did not exist. After implementation all nine pass. Full build and all 123 tests pass; targeted ESLint, formatting and diff checks pass.

The tests do not yet prove a real process restart skips work or notification delivery is deduplicated. The store is not yet called by the runtime. No real sessions, accounts, network calls or notifications were used.

Reassessment: proceed directly to account-entry integration and tests that prove blocked accounts do not invoke Main. Keep automatic recovery policy separate from persistent storage: transient failures should not be permanently blocked by default. End-to-end resume and notification delivery remain open requirements.
