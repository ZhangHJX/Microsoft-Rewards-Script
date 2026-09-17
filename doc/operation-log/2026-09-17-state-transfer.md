# Encrypted SQLite state transfer

- updated_at: 2026-09-17
- author: Codex
- status: local-transfer-tested; deployment-incomplete

DONE: added exportState/importState with a fixed two-database allowlist, SQLite online backup, account lock and database account ownership validation. Envelopes use standard Node AES-256-GCM with fresh nonces, a 32-byte key and an authenticated format marker. Import rejects invalid authentication, account identity, version, shape and size; validates database integrity before restoring into a new owner-only directory. No new dependency or real secret was added.

DONE: build and 205 tests pass locally; targeted ESLint, Prettier and diff checks pass. Thirteen new tests cover encrypted round trips, committed WAL inclusion, excluded extra files, permissions, wrong keys/accounts, tampering/truncation, existing destination refusal, account lock, foreign account rows in all four tables, missing stores/invalid key, and production SessionStore/BlockStateStore round trips including notification acknowledgement preservation.

Reassessment: this completes a local transport primitive only. It does not provision a key, upload state, choose the latest remote snapshot, enforce freshness or detect remote retention loss. Those are required before deploying. Both databases are mandatory; initial provisioning must explicitly create a legitimate baseline rather than treating missing state as safe. Raw capture/log audit remains open. See the state-transfer design for crash and locking assumptions.

TODO: add CLI with environment-only key input; wire remote publication/restoration and failure handling; verify cross-runner concurrency and freshness; complete actual account and regional acceptance.
