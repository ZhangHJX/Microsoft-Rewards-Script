# Encrypted state transfer

- updated_at: 2026-09-17
- author: Codex
- status: local-transfer-implemented; cloud-integration-pending

The approved cloud persistence requirement needs a transportable snapshot of sessions.db and account-blocks.sqlite, including notification acknowledgements. Copying raw SQLite files can omit committed WAL transactions. Publishing raw artifacts exposes cookies. A cache alone can expire or be evicted. Use SQLite backup for consistent database images, then Node's AES-256-GCM with a random 96-bit nonce and a separate 256-bit secret key. No new cryptography implementation or dependency is needed.

The first increment provides export/import functions. Export holds the existing per-account lock, rejects missing databases, verifies the snapshot contains only the requested normalized account, and includes only the two known databases. No browser profile, diagnostics, lock files or arbitrary directory traversal is included. Import authenticates before writing and checks version, account identity, strict file allowlist and bounded payload sizes. Restore requires a new destination directory and validates both SQLite images in a private staging directory before exclusively creating the destination. Failures return a fixed code without raw database contents. Existing state is never overwritten by this interface.

The envelope uses a fixed format marker as authenticated associated data, a fresh nonce, a 128-bit tag and ciphertext. The encrypted JSON contains the version, normalized account hash, creation timestamp and base64 database images. The maximum plaintext is 32 MiB. Keys enter through function arguments now; a future CLI must read the key from an environment secret, never from command arguments or logs.

Tests use synthetic SQLite databases and cookies. Verify round-trip sessions, blocks and delivery rows; WAL inclusion; owner-only restore permissions; unique ciphertext; wrong key/account/tamper rejection before destination creation; missing databases and multiple-account rejection; refusal to overwrite existing state; lock contention.

Deployment follow-up remains required: CLI, secret provisioning, remote upload/download, selecting only the latest valid state, retention expiry detection, freshness/rollback protection, cross-trigger serialization and publication failure handling. Encryption authenticates content but does not prove it is the latest snapshot. Do not fall back silently to a fresh earning run when expected state is missing, stale or corrupt. No cloud persistence claim is made until end-to-end restoration is verified.

Crash boundary: consumers must await import completion. Ordinary restore failures remove the newly created destination; host termination can leave a partial directory. Deployment must check completion and must not reuse that directory automatically. Export assumes one account and all writers follow the shared account lock; it does not coordinate arbitrary external database writers.
