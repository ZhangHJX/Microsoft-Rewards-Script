# Phase 5: bounded validation controller

- updated_at: 2026-09-17
- author: Codex
- status: controller-tested; live-validator-and-command-pending
- baseline: b6f4d32

Added validateBlockedAccount: inspect current block, acquire a token conditional on its revision, call a supplied validator with an AbortSignal, then clear only if it returns literal true within budget and the token is still current. Failure/exception, superseded state and timeout leave the block intact. Timeout consumes the token so a late success cannot clear it. The caller supplies a budget of 1..300000 ms.

Nine tests cover success, failure, exception, timeout with late completion, intervening failure, absent block, invalid budget, nonboolean response and a revision change between inspection and token acquisition. The last race was reproduced (incorrectly resumed) before adding conditional token acquisition. Full build and 138 tests pass; targeted ESLint, formatting and diff checks pass.

The controller does not call Main, start a browser or access a real account. It still needs a reason-specific read-only validator and user-facing command. This is not yet a complete user recovery flow. AbortSignal is cooperative: timeout prevents state clearing but cannot forcibly stop an arbitrary validator that ignores cancellation; the concrete integration must honor cancellation or use process isolation. Synchronous event-loop blocking also cannot be interrupted by this timer.

Reassessment: keep controller as the shared recovery boundary. Next define a read-only validation adapter and command, including how existing sessions are selected without invoking full task execution. Notification acknowledgement integration remains separate and incomplete. Account restriction must be explicitly checked; a readable balance alone does not prove the restriction has cleared.
