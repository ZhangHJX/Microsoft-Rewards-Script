# Acceptance audit

- updated_at: 2026-09-17
- author: Codex
- status: incomplete; no-deployment-claim

| Requirement group | Evidence | Remaining verification/work |
| --- | --- | --- |
| Single account | initialization/count tests and Actions enforcement | manual gated workflow written; provisioning and actual execution pending |
| Concurrent triggers | real-process SQLite account lock tests | remote revision protocol tested; stable workflow concurrency configured, live overlap test pending |
| Credentials/log confidentiality | no credentials committed; sanitized result errors; raw diagnostics opt-in and new files/directories owner-only | lower-level log audit; orchestration tested with synthetic state; actual secrets/account pending; independent synthetic runner transfer passed run 35201883404 |
| Automatic authentication | upstream implementation retained | branch-specific login/session-recovery tests and real session expiry evidence |
| Bounded recovery | token/version and timeout tests | login-specific budgets and actual interaction fallback |
| Page/field changes | strict balance checks and partial read-only validation | complete response/task-shape contracts and delayed/unconfirmed outcomes |
| Balance evidence | source/time and successful/stopped account observations; initial evidence retained on later exceptions | durable artifacts, terminal-read evidence on cleanup failure and task attribution limits |
| Failure propagation | compiled method exit tests and explicit summaries | whole application/worker IPC lifecycle acceptance |
| Persistent blocks | real SQLite state and guard tests | failure classes beyond balance/restriction; synthetic cross-runner persistence passed run 35201883404 |
| Alerts | provider-result contracts and per-destination leases | real provider receipt, transient-failure escalation and recovery notifications |
| Resume | real child CLI with synthetic saved sessions | current CN/HK primary endpoint and session compatibility |
| Quiet operation | Logger local/worker routing tests | real multi-day duplicate/manual-intervention metrics |
| Runtime budget | real supervisor and descendant tests | DONE Linux run 35198757037; TODO timeout persistence/notification policy |
| Regional acceptance | user selected CN first; no real session yet | account email/login, then independent CN/HK evidence and multi-day observation |
| Upstream maintenance | fork/remote and focused commits | DONE documented procedure and local rollback trial; deployed rollback still pending |

241 tests passed locally and in Linux CI run 35201883404, which also passed independent producer/consumer/cleanup jobs; they are evidence for the listed scopes, not proof of every requirement. No live account, cloud earning job, actual notification delivery or multi-day acceptance has been performed. Keep the full original objective open.
