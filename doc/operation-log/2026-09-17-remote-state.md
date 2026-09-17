# Remote state protocol and live synthetic rehearsal

- updated_at: 2026-09-17
- author: Codex
- status: adapter-verified; earning-deployment-incomplete

DONE: added a dedicated-branch GitHub Contents API adapter with explicit baseline provisioning, ready/pending records, expected-blob-SHA updates and fixed sanitized errors. It rejects redirects, bounds response bodies, uses per-request timeouts and never blindly retries updates. Above the Contents inline limit, it retrieves the immutable blob by SHA. Missing state and unfinished pending state stop the next run.

DONE: eleven offline tests cover round trip, competing writers, stale completion, pending/missing state, create-only provisioning, blob fallback, failed authorization/server errors, malformed responses/records and a committed write whose response is lost. Build and 225 local tests pass, plus targeted ESLint, Prettier and diff checks.

DONE: real GitHub rehearsal on a temporary codex/rewards-state-rehearsal-* branch used synthetic session cookies and an actual local block store. Provision, read, decrypt/restore, pending claim, pending refusal, stale-SHA conflict, completion and final restore all passed. Tool result: syntheticRoundTrip=true, temporaryBranchRemoved=true. No Rewards account was accessed. The ignored rehearsal script remains local; no token or encryption key was printed or committed.

Reassessment: remote persistence is proven at adapter level. Actions lifecycle, missing initial session, runtime supervision integration and state-publication failure notification are not yet wired. Branch snapshots accumulate history and need size monitoring; trusted manual branch rollback needs separate handling. Workflow must authenticate/restore before beginning account activity and retain pending on uncertain publication.

TODO: implement workflow orchestration and cross-trigger concurrency; create explicit provisioning path; verify restoration between independent Actions runners; then perform authorized real-account/regional acceptance.
