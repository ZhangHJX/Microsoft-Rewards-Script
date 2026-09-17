# Fork development documentation

- updated_at: 2026-09-17
- author: Codex
- status: requirements-recorded; implementation-pending

This fork preserves TheNetsky's v4 compatibility work and adds a small, reviewable set of reliability changes. The initial baseline is `d0f07d74a0ed4dda127855d6e3dde98bf4c89d6e` (package version 4.3.2).

## Project map

- [Plan and milestones](plan/README.md)
- [Single-account cloud requirements](plan/modules/single-account-cloud/requirements.md)
- [Development priorities](todo/README.md)
- [Initialization record](operation-log/2026-09-17-initialization.md)

## Current status

DONE: Create the public fork and a separate `codex/single-account-cloud` development branch.

DONE: Record the distinction between regional compatibility testing and concurrent multi-account execution.

TODO: Implement and validate the requirements in small changes. None of the proposed capabilities is delivered by this documentation commit. No Rewards workflow has been added or enabled, no account credentials have been configured, and no live account has been tested.

The default `v4` branch remains the upstream baseline. Review changes on the development branch before merging. Preserve the upstream license and copyright notices. Keep account credentials, cookies, tokens, and diagnostic account data out of source control, including this documentation tree.
