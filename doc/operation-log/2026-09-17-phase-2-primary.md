# Phase 2: primary dashboard balance validation

- updated_at: 2026-09-17
- author: Codex
- status: balance-validation-slice-complete; process-status-pending
- baseline: c1061bd

## Change

Both dashboard sources now share requiredBalance and BalanceUnavailableError. Primary dashboard values must be nonnegative safe integers; missing userStatus and invalid balances throw BALANCE_UNAVAILABLE. A confirmed invalid balance skips transport retries and fallback, making the data incompatibility visible immediately. Valid zero remains valid. Actual transport failures retain the upstream retry/fallback behavior.

The getCurrentPoints caller propagates the same error. This is verified against the compiled BrowserFunc class using injected synthetic transport responses, without importing the application entry point or opening a browser. No credentials, real sessions or service requests were used.

## Tests and review

Before implementation, the initial 30 integration cases had 6 passes and 24 failures: invalid values were returned, and missing userStatus produced an unclassified TypeError. After implementation all 30 pass. Two additional regression tests verify the existing bounded transport fallback: valid fallback zero succeeds, invalid fallback rejects, each after exactly three transport calls.

- Full build: passed.
- Flyout parser regression tests: 27 passed.
- Primary dashboard/getCurrentPoints integration tests: 32 passed.
- Existing offline suite: 36 passed.
- Total: 95 passing tests, no skips.
- Targeted ESLint and formatting: passed; git diff whitespace check: passed.

Review confirmed the shared validator does not coerce strings or booleans, preserve an invalid primary over a valid flyout fallback, or expose raw response values in errors. The new early exit is limited to the typed balance error; transport errors continue through the existing path.

## Reassessment

DONE: primary and flyout numeric-balance validation and propagation through getCurrentPoints.

TODO: source and observation timestamps; full data-shape validation; structured account results and nonzero process exit on failure. A rejected getCurrentPoints promise alone does not establish the application's final exit status. Persistent blocks, deduplicated notifications, single-account cloud boundary and live regional acceptance remain incomplete.

Next priority: trace account and worker error aggregation to process exit, and write regression tests for all-account failure and valid zero activity before changing it. No real-account input is needed for this next offline step.
