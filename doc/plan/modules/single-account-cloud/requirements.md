# Single-account cloud reliability requirements

- updated_at: 2026-09-17
- author: Codex
- status: user-scope-confirmed; implementation-pending

## Scope

The intended deployment executes one Microsoft Rewards account per GitHub Actions job. It does not batch multiple Rewards accounts within one job. CN and HK are separate compatibility targets to be evaluated independently, not a requirement to run two accounts concurrently. A configured region is an input, not proof of service-side market eligibility or compatibility.

The operational goal is low-maintenance automation: retain supported automatic authentication and session recovery, detect breakage, and stop wasting resources. Human intervention is the last resort after automatic handling cannot complete. Requiring routine daily manual intervention is an acceptance failure.

## Acceptance criteria

### Account boundary

- The cloud entry point accepts exactly one account and rejects zero or multiple accounts before any browser startup or account action.
- Concurrent triggers for the same account do not start duplicate execution. The deployment must define a stable concurrency identity independent of trigger type.
- Credentials, session state, and logs are isolated for the selected account and are never committed or published as unredacted artifacts.

### Authentication and recovery

- Preserve upstream automatic authentication branches; do not replace supported handling with unconditional manual prompts.
- Restore valid sessions automatically. Attempt supported automatic reauthentication when a session expires.
- Bound attempts and total recovery time. An unsupported challenge or exhausted recovery budget yields an explicit `needs_user_action` or `blocked` result, not success.
- Do not claim future unknown challenges can always be solved. Record a sanitized reason and the next required action when personal confirmation is necessary.

### Page, task, and balance changes

- Detect missing required fields, incompatible page structures, invalid balance values, and incomplete data sources.
- Do not convert unknown values into zero or claim success solely because the process completed or an HTTP response acknowledged a request.
- Distinguish no available tasks, completed quotas, pending claims, delayed observations, failed execution, and unknown outcomes where the available evidence permits it.
- Track balance observation time and source. A balance change is not automatically attributed to an individual task.
- Detect observable incompatibility at the first run that encounters it. Do not promise advance knowledge of service changes between scheduled checks.

### Stop, notify, resume

- Stop affected operations when an incompatibility or persistent failure is confirmed. A known authentication block stops the account's dependent operations.
- Deduplicate notifications by account and error class. Do not rerun the full process or notify repeatedly while the same unresolved block remains.
- Transient network failures may be retried only within explicit budgets; ambiguous mutation outcomes must not trigger blind repeated submissions.
- After user intervention or a compatibility fix, perform a controlled validation before clearing the blocked state and resuming normal execution.
- Normal successful runs are quiet; notifications focus on newly actionable failures, significant changes, and recovery as configured.

### Verification

- Offline tests cover account-count rejection, failure propagation, absent/invalid balances, bounded recovery, alert deduplication, persisted blocks, and controlled resume.
- CN and HK use separate acceptance records identifying the tested revision, observed panel type, and observed capabilities. Success in one market does not establish success in the other.
- Live verification requires an appropriate account environment and explicit execution scope. No live verification has occurred at this stage.
- Record runtime minutes, automatic completion rate, manual interventions, and duplicate alerts during a multi-day acceptance period. A green workflow alone is insufficient evidence.

## Delivery constraints

Keep changes small enough to reconcile with upstream updates. Hosting cost, session storage, and runtime suitability must be verified separately from repository setup. A repository fork does not establish that a cloud deployment is ready or that any activity will receive points.
