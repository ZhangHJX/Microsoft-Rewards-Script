# Fork initialization

- updated_at: 2026-09-17
- author: Codex
- status: documentation-only

## Decisions

- Retain the public fork relationship to TheNetsky/Microsoft-Rewards-Script for upstream comparison and synchronization.
- Develop on `codex/single-account-cloud`, preserving the default `v4` branch as the initial upstream baseline.
- Treat CN and HK as independently tested compatibility targets. The cloud job processes exactly one account.
- Preserve automatic authentication capabilities; human handling is an exceptional recovery path. Detect page/rule-related observable changes and stop ineffective execution rather than repeatedly consuming resources.

## Verification boundary

Repository ownership, fork relationship, public visibility, and default branch were checked using GitHub repository metadata. This initialization changes documentation only. It does not modify executable code, workflows, repository settings, secrets, or account state.

## Rollback

The documentation commit can be reverted independently. No runtime migration or secret rotation is needed to undo this documentation change.
