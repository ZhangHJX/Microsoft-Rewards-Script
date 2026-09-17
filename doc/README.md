# Fork development documentation

- updated_at: 2026-09-17
- author: Codex
- status: phase-2-first-slice-complete; live-validation-pending

This fork preserves TheNetsky's v4 compatibility work and adds a small, reviewable set of reliability changes. The initial baseline is `d0f07d74a0ed4dda127855d6e3dde98bf4c89d6e` (package version 4.3.2).

## Project map

- [Plan and milestones](plan/README.md)
- [Single-account cloud requirements](plan/modules/single-account-cloud/requirements.md)
- [Development priorities](todo/README.md)
- [Initialization record](operation-log/2026-09-17-initialization.md)

## Current status

Current: the flyout balance defects are fixed with 27 parser tests; 36 existing offline tests also pass. See [phase 2](operation-log/2026-09-17-phase-2.md). Primary dashboard validation and process failure propagation remain pending. Phase 1 results below are historical.

DONE: Create the public fork and a separate `codex/single-account-cloud` development branch.

DONE: Record the distinction between regional compatibility testing and concurrent multi-account execution.

DONE: Establish an offline baseline: build passes, 36 offline tests and 4 upstream parser characterization tests pass. Two tests reproduce existing balance defects; they do not certify production correctness. See the [phase report](operation-log/2026-09-17-phase-1.md) and [code disposition](plan/modules/single-account-cloud/code-disposition.md).

Run `npm run validate:fixture -- --fixture tests/fixtures/validation/cn.json` for a synthetic observation. The validation configuration applies only to this checker, not the upstream application. No Rewards workflow or credentials have been added, and no live account has been tested.

The default `v4` branch remains the upstream baseline. Review changes on the development branch before merging. Preserve the upstream license and copyright notices. Keep account credentials, cookies, tokens, and diagnostic account data out of source control, including this documentation tree.
