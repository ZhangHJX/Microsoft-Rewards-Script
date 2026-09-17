# Fork development documentation

- updated_at: 2026-09-17
- author: Codex
- status: implementation-in-progress; live-validation-pending

This fork follows TheNetsky v4, baseline d0f07d74a0ed4dda127855d6e3dde98bf4c89d6e (4.3.2). Changes live on codex/single-account-cloud. Preserve upstream history, license and copyright notices.

## Current state

Implemented: primary/flyout balance validation, failed-account exit selection, explicit run summaries, nullable failed-account balances and fixed failure codes. Dashboard reads also attach local source/time metadata. Successful and stopped-account results retain their observations. A persistent block-state guard is integrated before account HTTP construction and Main. The bounded recovery controller and standalone read-only command are tested with synthetic sessions; real-session compatibility and notifications remain pending. Per-destination block notifications, quiet ordinary-log routing and the early single-account guard are integrated. Build and 176 tests pass. These include isolated compiled-method tests, not real account execution or operating-system worker validation.

[Current plan](plan/README.md), [requirements](plan/modules/single-account-cloud/requirements.md), [code disposition](plan/modules/single-account-cloud/code-disposition.md), [priorities](todo/README.md), [latest evidence](operation-log/2026-09-17-phase-7-scope-and-quiet.md).

No credentials or Rewards workflow have been configured. CN/HK live compatibility remains untested. The offline fixture configuration controls only its standalone checker; it does not enable or disable the upstream application.

Verification commands: npm run test:offline, npm run test:upstream-parser, npm run test:run-status. The latter two rebuild before testing. Never commit account credentials, cookies, tokens or unredacted diagnostic data.
