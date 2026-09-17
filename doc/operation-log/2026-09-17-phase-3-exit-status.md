# Phase 3: account failure propagation

- updated_at: 2026-09-17
- author: Codex
- status: exit-selection-slice-complete; end-to-end-validation-pending
- baseline: 7bcd706

## Implemented

Single-process execution now selects exit code 1 when an account result reports failure. Worker execution also checks for failed or missing account results. The primary process checks worker failures, account-result count and account success rather than relying on worker exit alone. Successful zero-point execution remains exit code 0.

## Evidence

Eight focused cases execute the actual compiled runTasks, runWorker and runMaster method bodies. TypeScript's parser extracts these methods without importing the application entry point. Transport/account execution, cluster events, webhook flushing and process exits are replaced with controlled test dependencies; no real account or operating-system worker is started.

Before the fix: 4 passed, 4 failed. Failures reproduced single-process and worker account failures selecting 0, and the primary process accepting failed/missing account reports. After the fix: 8/8 passed. Balance tests remain 59/59 and the offline suite 36/36, for 103 passing tests total. Full build, targeted ESLint, formatting and whitespace checks passed.

This proves exit-code selection in those compiled methods, not an end-to-end operating-system exit, IPC delivery guarantees, account activity correctness or live deployment success.

## Reassessment and remaining work

DONE: propagate existing success=false account results to exit selection; preserve successful zero activity.

TODO: structured failure classes and unknown balances in summaries. Failed accounts still carry upstream numeric zero placeholders in AccountStats, and the summary text still says Completed all accounts even when results contain failures. These are not fixed by changing the exit code.

TODO: test real IPC lifecycle separately; the existing listener-registration order and immediate worker exit after send require review before treating cluster transport as reliable. The target deployment remains one account per job, not a multi-account expansion.

Next slice: make run summaries explicitly report failure counts and avoid implying all accounts succeeded. Keep source/timestamp metadata, persistent blocks, alert deduplication and cloud acceptance on the plan; this phase does not complete those requirements.
