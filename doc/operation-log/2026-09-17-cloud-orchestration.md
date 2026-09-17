# Cloud entry and manual workflow

- updated_at: 2026-09-17
- author: Codex
- status: local-integration-tested; real-deployment-pending

DONE: implemented encrypted restore -> conditional pending claim -> bounded child -> encrypted ready publication. Corrupt or pending state never starts a child. Normal failure exits preserve updated local blocks; uncertain or abnormal termination never publishes a ready marker. Added the cloud entry with private config/session working directory, restricted child environment and sanitized output.

DONE: added a manual-only Actions workflow gated by REWARDS_CLOUD_ENABLED, with stable concurrency and job/runtime ceilings. No real secrets were provisioned and no account job was launched. It remains on the development branch, so default-branch discovery is still a deployment step.

DONE: build and 241 local tests pass, plus targeted ESLint, Prettier and diff checks. Sixteen additional tests cover orchestration outcomes, corrupted state, pending/claim conflicts, publication failure, account/environment settings, missing-secret entry failure and actual supervisor process isolation/termination. A regression caught externally signaled child exit being reported as ordinary; it now reports signaled so orchestration retains pending.

Reassessment: configured workflow is not deployed acceptance. Initial session provisioning, independent runners, actual supported login/recovery branches, separate regions, schedule activation and multi-day observation remain. Public child logs are suppressed pending the full audit; no raw diagnostic upload is configured.
