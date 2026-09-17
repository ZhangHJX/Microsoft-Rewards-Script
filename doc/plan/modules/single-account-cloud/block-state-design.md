# Persistent blocked-state contract

- updated_at: 2026-09-17
- author: Codex
- status: store-implemented; runtime-integration-pending

Use the project's existing node:sqlite dependency with a separate caller-owned connection. Compared with a JSON file this permits atomic conditional updates across connections; compared with adding state to the global SessionStore it avoids coupling blocking to credentials/session serialization. The runtime will place the database under the configured private session directory, not source control.

The key is a normalized account-identity hash (not encryption). Stored values are an allowlisted reason, opaque revision, block time, notification acknowledgement and temporary validation token. Credentials and raw service responses are excluded.

A new reason creates a new revision and unacknowledged notification state. The same reason preserves revision/time/acknowledgement, but invalidates outstanding validation. Notification acknowledgement must match the current revision. A validation token never removes the block by itself; only a successful completion with the current token can remove it. Failed validation consumes its token and leaves the block in place. A newer validation or newly observed failure invalidates older completion attempts.

The store does not perform validation or send notifications. Only a runtime integration that has actually completed its validation may pass true to finishValidation. Delivery acknowledgements do not guarantee exactly-once messaging across process/network crashes; the integration must define retry behavior and avoid acknowledging before delivery.

Next integration gate: load state before account/browser work, skip unresolved blocks without replaying notifications, persist only confirmed failure classes, and expose a deliberate validation-only resume path. A generic transient failure must not become a permanent block without an explicit bounded-recovery policy. Database read/write failures must stop the guarded path rather than silently discard state.
