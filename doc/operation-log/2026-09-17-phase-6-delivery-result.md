# Phase 6: explicit notification delivery results

- updated_at: 2026-09-17
- author: Codex
- status: sender-contract-complete; persisted-deduplication-integration-pending
- baseline: 1a2d234

Discord, ntfy and Telegram senders now return a boolean after queued delivery completes. Missing configuration and caught delivery errors return false. Telegram additionally requires its response body's ok=true. Existing logger callers can ignore this additive return value. Requests explicitly use retries=0: an ambiguous POST result must not be blindly repeated inside the transport.

Six tests execute the actual compiled sender modules with controlled HTTP/queue dependencies. All failed before the change and pass after it. Full build and 155 tests pass; targeted lint, formatting and diff checks pass. No external notification was sent. Queue scheduling and actual provider behavior are not established by these tests.

Reassessment: persisted acknowledgement can now depend on an actual sender result, rather than treating swallowed errors as success. Next integrate current-revision acknowledgement with account block delivery; keep unacknowledged failures eligible for later attempts. Define per-destination acknowledgement so one failed channel does not resend to another channel that already succeeded. Repeated ordinary log forwarding remains a separate source of notifications and must be accounted for before claiming quiet operation.

Acknowledgement means provider acceptance, not that the user read the message. Process failure between provider acceptance and local acknowledgement can still cause a duplicate on retry; no exactly-once delivery guarantee is claimed.
