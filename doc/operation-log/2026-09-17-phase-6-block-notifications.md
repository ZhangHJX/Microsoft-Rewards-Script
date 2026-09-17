# Phase 6: per-destination block notifications

- updated_at: 2026-09-17
- author: Codex
- status: block-notifications-integrated; quiet-log-routing-pending
- baseline: dc5fee7

Added a block_deliveries table keyed by normalized account hash, block revision and destination hash. Atomic leases prevent simultaneous claims during the lease; successful destinations remain acknowledged, failed destinations are eligible for later attempts, stale tokens/revisions cannot acknowledge new state. A five-minute lease allows recovery after a crashed sender. Destination URLs/tokens are hashed before storage.

The account guard now invokes a notification hook for existing blocks and newly confirmed balance/restriction blocks. runTasks supplies all enabled Discord/ntfy/Telegram destinations. Messages contain an account hash label, reason, revision and recovery guidance, not raw account responses or credentials. Sends use the confirmed boolean results introduced in the previous phase. No new destination was configured and no real notification was sent.

Three new store tests cover destination isolation, concurrent claims, failed retry, expired lease and stale acknowledgement. One delivery test proves one successful destination sends once while a failing destination retries, and a new revision notifies again. One guard-hook test confirms new/existing blocks invoke notification handling without repeating work. Initial store/delivery tests failed before implementation. Full build and 160 tests pass; targeted lint, formatting and diff checks pass.

Limits: ordinary Logger forwarding still exists independently and can generate additional notifications. Therefore quiet success and full notification deduplication are not yet satisfied. The compiled account-entry tests stub the guard; hook behavior and destination delivery are exercised in separate tests. Actual provider responses, long queue delays beyond lease expiry and process crashes around provider acceptance remain unverified. Exactly-once external delivery is not promised.

Reassessment: next make ordinary log forwarding opt-in for the single-account reliability mode, preserving local logs and allowing actionable block notifications to be the default. Then implement the early single-account boundary and check runtime persistence/concurrency requirements. Existing delivery records are small but retention cleanup remains a maintenance consideration.
