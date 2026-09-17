# Phase 3: explicit run summaries

- updated_at: 2026-09-17
- author: Codex
- status: summary-slice-complete; remaining-requirements-open
- baseline: f36ba3b

Single-process and primary-process summaries now say Run finished with explicit status, accountsFailed and accountsMissing fields. Failed runs use red rather than green output and report aggregate points/balances as unknown instead of combining failure placeholders into a seemingly verified total. Individual AccountStats still contain upstream placeholders and need a separate contract change.

The log parser supports both the new format and historical Completed all accounts records. New unknown totals remain null, including in summarizeRunState. Historical records have status=null: their wording is not proof of success.

Verification: added three parser tests (all initially failed), expanded existing compiled run-method assertions (two initially failed), and reproduced then fixed a null-to-zero summary fallback. Full build passed. The combined suite passed 106 tests with no skips; targeted ESLint, formatting and diff whitespace checks passed. Compiled-method harness limits from the preceding phase still apply; no live account, process deployment or browser UI test was performed.

Reassessment: exit selection and textual/parser summaries now agree for the tested cases. Next priority is account-result contracts: represent unavailable balances explicitly and retain sanitized failure classifications rather than generic Flow failed. Source/time metadata, persistent blocks, deduplicated alerts, single-account entry validation and actual deployment remain open. GUI consumers outside the parser have not been verified against nullable totals.
