# Phase 7: single-account scope and quiet log routing

- updated_at: 2026-09-17
- author: Codex
- status: scope-and-routing-complete; runtime-acceptance-pending
- baseline: 1a4eb68

Added singleAccount=true to configuration defaults and the example. Initialization checks the loaded accounts before experimental warnings or run execution. Single-account mode requires exactly one account and clusters=1. GitHub Actions (GITHUB_ACTIONS=true) enforces the boundary even if the local compatibility switch is false. Local singleAccount=false retains the upstream multi-account interface; zero accounts still fail.

Added webhook.forwardLogs=false by default. Logger still writes local console output but does not forward routine records unless explicitly enabled. The primary process also ignores forwarded worker log messages when this setting is disabled. Dedicated per-destination block notifications bypass ordinary log filtering and continue to work. Set webhook.forwardLogs=true only when detailed remote log forwarding is wanted.

Verification: six scope cases, six Logger routing cases, three actual compiled initialization cases and one config-default/override case. Missing guard and four quiet-routing cases failed before implementation. Build and prior regressions passed; the resulting suite contains 176 passing tests. Targeted lint, formatting and diff checks passed. Config-default testing prints the upstream expected missing-field warnings.

This is a code-level boundary, not a completed GitHub Actions deployment. It neither establishes runner suitability nor prevents separate jobs/machines sharing one account from overlapping. Runtime locking, persistent storage transport, timeout budget and regional live acceptance remain open. Quiet mode currently reports persistent blocks; generic transient failures are not yet a complete deduplicated notification policy.

Reassessment: next implement same-account mutual exclusion and execution-budget handling, then audit acceptance requirements and identify the concrete live environment/account inputs needed. Preserve local session data and never publish credentials as artifacts.
