# Phase 8: process-level runtime supervision

- updated_at: 2026-09-17
- author: Codex
- status: bounded-entry-tested; deployment-pending
- baseline: 5557b73

Added scripts/main/run-bounded.mjs and npm run start:bounded. The entry supervises the existing compiled application in a separate POSIX process group with a 30-minute budget and 5-second termination grace. It preserves ordinary exit codes, returns 124 on timeout, forwards SIGINT/SIGTERM, and kills remaining group descendants after the leader exits. Invalid budgets and spawn failure return nonzero. No application timer is relied on to interrupt an unresponsive child.

The ordinary upstream npm start remains unbounded for compatibility; deployments must explicitly use start:bounded or their own equivalent supervisor. No Rewards execution was started in this phase.

Seven real-process tests cover success/failure exit codes, an unresponsive child, invalid budgets, spawn failure, CLI timeout status and cessation of descendant activity. Full build and 187 tests pass; targeted lint, formatting and diff checks pass. Tests ran on macOS. Linux CI validation remains needed. Windows is explicitly rejected rather than pretending process-group cleanup is supported.

Limits: descendants that deliberately create a new session/process group can escape this supervisor. A host crash or externally killed supervisor still requires runner-level cleanup. A runtime timeout does not currently create a persisted account block or notification. The local account lock is released by process termination, not while an unresponsive child is still being awaited.

Reassessment: next add Linux offline CI (no credentials/browser tasks), then perform acceptance-gap review and upstream maintenance documentation. Runtime state transfer, scheduler concurrency, session confidentiality and live regional completion metrics remain necessary before deployment can be claimed ready.
