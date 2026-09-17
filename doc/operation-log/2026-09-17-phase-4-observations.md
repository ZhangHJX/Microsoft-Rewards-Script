# Phase 4: balance observation metadata

- updated_at: 2026-09-17
- author: Codex
- status: read-path-complete; result-persistence-pending
- baseline: 6e5c27c

getDashboardData now returns an ObservedDashboardData containing balanceObservation: validated value, source (dashboard or flyout), and observedAt (local ISO timestamp). Both actual response paths attach this metadata after validation. Payload-provided metadata is overwritten on a new returned object; the original response object is not mutated. getCurrentPoints remains numeric and its existing failure behavior is unchanged.

observedAt is local validation time, not server ledger-update time. Source identifies the endpoint family; flyout may internally select its valid userInfo balance fallback. The metadata alone does not prove task attribution or market eligibility.

Two new integration cases failed before implementation (untrusted primary metadata passed through; flyout metadata absent), then passed. Full build and 112 tests passed with no skips; targeted ESLint, formatting and whitespace checks passed. Tests use synthetic transport only.

Reassessment: read-path metadata is complete, but account results do not yet retain before/after observations. The next slice should carry these through results before persistent blocked state is implemented. Existing phase reports remain historical; the plan must not mark the broader observation requirement fully delivered until result retention is tested.
