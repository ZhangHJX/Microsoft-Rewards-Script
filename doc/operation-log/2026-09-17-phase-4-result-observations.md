# Phase 4: retain observations in account results

- updated_at: 2026-09-17
- author: Codex
- status: result-retention-complete; durable-storage-pending
- baseline: 70c5799

Normal Main results now carry the initial and final balance observations. The final read uses the same validated dashboard request path once and retains its metadata rather than discarding it through the numeric convenience interface. An account stopped for an upstream warning retains its initial observation with final=null, explicitly avoiding a fabricated second observation. runTasks copies this evidence to AccountStats, which is the existing worker report payload.

Two new aggregation regression cases failed before implementation and pass after it. Full build and all 114 tests pass, with targeted ESLint, formatting and whitespace checks passing. The tests exercise compiled aggregation with synthetic Main results; Main's changed wiring was reviewed and type-checked, not exercised with a real account. Existing dashboard tests verify actual metadata construction separately.

Limits: results are retained in memory/the existing report payload, not a durable artifact. An exception after the initial observation still produces a generic failed account result without partial observation retention. This is explicitly remaining work, not a claim of full failure diagnostics. Balance deltas do not prove task-level credit.

Reassessment: next implement persistent failure state and controlled resume, then connect partial observations to durable diagnostics. Storage must not contain credentials or raw responses. The same unresolved failure should prevent routine re-execution and repeated alerts, while a deliberate validation attempt is needed before clearing it. Define and test that state contract before integrating it with the account entry point. No real credentials are needed for the offline state-storage work.
