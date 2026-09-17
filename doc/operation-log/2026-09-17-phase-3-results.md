# Phase 3: nullable account results and failure classes

- updated_at: 2026-09-17
- author: Codex
- status: result-contract-slice-complete; remaining-plan-open
- baseline: 11bd6d3

Failed or absent account results now use null for initial, final and collected points. Successful observed zero stays zero. Removing the inner catch allows BALANCE_UNAVAILABLE to reach account aggregation. Account results use a fixed error-code vocabulary: BALANCE_UNAVAILABLE, FLOW_FAILED and ACCOUNT_RESTRICTED. Generic exception contents are not copied into this layer's logs or results. This does not establish redaction throughout lower-level logging.

Four regression cases cover missing results, known balance failures, unknown exceptions with secret-like strings and valid zero. Before the fix, three failed and one passed. After the fix all pass. Full build, all 110 tests, targeted ESLint, formatting and whitespace checks passed. The compiled-method test isolation and absence of live-account evidence remain as documented in prior phases.

Nullable fields are retained in account results. Numeric aggregate reduction uses neutral placeholders internally, but any failed result causes the published aggregate to remain unknown. All current producers of null account balances also set success=false. External malformed IPC validation remains unimplemented.

Reassessment: the basic result contract now distinguishes unknown from zero and preserves known balance errors. Authentication-specific classification, observation source/time, persistent blocked state and notification deduplication are still required. Next priority is observation metadata, then persisted failure state and controlled resume; no account credentials are required for those offline increments.
