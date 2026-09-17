# Cloud workflow integration

- updated_at: 2026-09-17
- author: Codex
- status: implemented; disabled-by-default; live-account-unverified

The Single account cloud run workflow is manual-only and its account job requires repository variable REWARDS_CLOUD_ENABLED=true. It uses a stable repository-wide rewards-single-account concurrency group with cancellation disabled, one Ubuntu runner and a 45-minute job ceiling. The bounded account process has 30 minutes plus a five-second shutdown grace, leaving time for state publication. No schedule is enabled before initial account acceptance.

Flow: install locked dependencies without lifecycle scripts; build; install the browser; create a private temporary working directory; restore and authenticate the remote encrypted state; claim its current revision as pending; run exactly ACCOUNT_1; snapshot and publish the new ready state after an ordinary process exit; clean local state. A reported account failure still saves its block/notification state and returns failure. Timeout, external termination, thrown execution error and uncertain publication leave pending. A later run stops before account activity until explicit recovery.

The child receives a restricted environment with account credentials and basic runtime/browser paths. GitHub authorization and the state encryption key remain in the parent. Child output is suppressed in this cloud entry until the full lower-level log audit is complete; only sanitized parent result statuses reach Actions logs. Raw diagnostics and ordinary webhook forwarding are forced off, while dedicated block alerts remain configurable. Local invocation of the upstream entry keeps its ordinary logging behavior.

Configuration for eventual activation:

- secrets.REWARDS_STATE_KEY: 64 hexadecimal characters encoding an independently generated 32-byte key.
- secrets.REWARDS_ACCOUNT_EMAIL and optional PASSWORD, TOTP_SECRET, RECOVERY_EMAIL variants under the same REWARDS_ACCOUNT_ prefix.
- optional secrets.REWARDS_CONFIG_JSON: application configuration; cloud account/process/session/diagnostic boundaries override it.
- optional vars.REWARDS_REGION / REWARDS_LANGUAGE; otherwise auto / en.
- GitHub token contents:write is confined to the account job; credentials are not persisted by checkout.
- The codex/rewards-state branch and a valid encrypted baseline must already exist. Missing state is never auto-provisioned by a run.

The workflow is currently on the development branch. Before manual dispatch, make it discoverable from the repository default branch (or deliberately change the fork default while keeping v4 as the upstream tracking branch). This has not been done yet. Do not claim the manual workflow has run merely because offline CI passes.

Evidence: 241 local tests, including real SQLite restore/run/publish orchestration with synthetic execution, account/environment boundary checks, CLI missing-secret failure and real supervisor child-isolation/signal tests. Independent Actions runner state restoration, initial provisioning, live authentication, regional compatibility, automatic scheduling, runtime costs and failure notifications remain acceptance work.
