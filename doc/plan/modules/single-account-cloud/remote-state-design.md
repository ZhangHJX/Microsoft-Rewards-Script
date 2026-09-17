# Remote state transaction

- updated_at: 2026-09-17
- author: Codex
- status: adapter-tested; synthetic-live-round-trip-passed; workflow-pending

Use a dedicated state branch (default codex/rewards-state) and state.json in the user's repository. Only encrypted database bytes plus protocol metadata are stored; the encryption key stays in a separate secret. This avoids artifact/cache expiration and uses ordinary repository contents permissions. Repository history will grow with snapshots; monitor size and plan explicit archival/rotation. A private companion repository remains an option. Never write state to the code or upstream branch.

The Contents API replaces an existing file only with its current blob SHA. The adapter reads an exact revision, then changes ready -> pending with a unique run ID and that SHA before any account activity. Only the owner holding the resulting pending revision can publish ready with a replacement encrypted snapshot. Concurrent writers conflict. A pending latest state means the prior run may have changed the account without publishing: stop for recovery; never automatically reuse the previous ready snapshot. Missing state is also a stop, not implicit first-run provisioning. Provisioning is explicit and create-only.

A record contains version=1, phase=ready|pending, unique runId, updatedAt and encryptedState (base64). The adapter validates shape and limits, rejects non-file/symlink responses, and uses only fixed api.github.com URLs. All requests have timeouts, reject redirects, and return sanitized error codes. There are no blind mutation retries. An uncertain update may have committed; a subsequent fresh read must resolve it before further action.

GET Contents can omit base64 contents above 1 MB. In that case use the returned immutable blob SHA through GET Git blobs, not an untrusted download URL. Update uses PUT Contents with expected SHA and an explicit branch. Reference: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28 .

Implementation sequence: transport/protocol contract tests; adapter; synthetic live remote round trip; workflow orchestration with stable concurrency, state restore/begin/run/publish and manual initial provisioning. Local encryption/import authentication remains mandatory before account actions. A metadata-only ready record is not evidence that its payload can decrypt or restore. Branch write access and secret access are trusted; manual rollback of the branch cannot be detected without an independent freshness anchor.

Verified 2026-09-17: real GitHub temporary-branch provision/read/restore/begin/pending refusal/stale-write conflict/complete/read/restore succeeded with synthetic empty cookies and a real BlockStateStore block. The temporary branch was deleted successfully. This tests remote transport, not Actions runner orchestration or real account operation. Eleven offline tests cover protocol and error boundaries; full local suite now 225 tests.
