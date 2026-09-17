# Phase 5: read-only recovery command

- updated_at: 2026-09-17
- author: Codex
- status: command-integrated; live-compatibility-unverified
- baseline: a88920b

Added recover:account, a standalone command that never imports the bot entry point. It opens the saved session database read-only, selects exactly the requested account/platform, filters cookies for the fixed primary dashboard endpoint, and supplies a bounded validator to the recovery controller. It does not log cookies, passwords or raw responses. It does not write updated session cookies.

The validator makes one GET request with redirects disabled and a 256 KiB JSON body limit. It requires an enrolled-account flag, a valid balance and an explicitly empty warning list. Only BALANCE_UNAVAILABLE and ACCOUNT_RESTRICTED can be cleared by this evidence. Generic FLOW_FAILED is not cleared by a readable balance. Missing/expired cookies, invalid response or failure retain the block. No complete account executor is invoked.

## Usage

After building, run from the repository:

    npm run recover:account -- --session-dir ./sessions --account YOUR_ACCOUNT_EMAIL --platform desktop

Use the actual configured session directory; platform is desktop by default, or mobile. This command performs a real read-only request when run with a saved session. It was not run against a real user account during development. Exit codes: 0 resumed/not_blocked; 2 still_blocked/timed_out; 1 invalid arguments or command/storage failure. The result is one sanitized JSON status. A successful resume does not itself start normal tasks.

## Verification and limits

Eight validator tests cover valid zero, incomplete fields, warnings, unenrolled state, cookie scope/expiry, HTTP/non-JSON failure and unrelated failure classes. Three real child-process CLI tests use temporary SQLite sessions and a preload that replaces fetch with synthetic responses; they prove command wiring, actual process exit, successful unblock, retained warning block and missing-argument rejection. Initial tests failed before implementation. Full build and 149 tests pass; targeted lint, format and diff checks pass.

Primary endpoint support remains unverified with current real CN/HK sessions. The source labels this endpoint legacy; incompatibility will preserve the block rather than infer success from a partial fallback. Saved-session identity is selected from the existing local database; this phase does not independently prove the service response's account identity. Proxy-only environments and new interactive login are not supported by this command. Recovery HTTP uses ordinary fetch and no fingerprint impersonation.

Reassessment: command/controller integration is now concrete. Next implement notification delivery acknowledgement/deduplication, then early single-account configuration validation and final runtime/acceptance review. Live evidence and session setup remain future user/environment dependencies; no credentials are needed for the next notification tests.
