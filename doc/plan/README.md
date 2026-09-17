# Development milestones

- updated_at: 2026-09-17
- author: Codex
- status: proposed; implementation-pending

Owner: Codex for code changes and offline verification; account owner for any authentication that requires personal interaction.

1. **Reliable results:** account failures reach the process exit status; missing balances remain unknown; valid zero activity is not treated as an error.
2. **Single-account execution boundary:** cloud execution rejects configurations containing zero or multiple accounts before opening a browser or submitting any activity. The ordinary upstream local interface need not be removed.
3. **Bounded recovery:** preserve supported automatic authentication methods, limit recovery by attempts and elapsed time, and persist interruption state.
4. **Change detection and notification:** distinguish authentication problems, incompatible page/data structures, and unconfirmed results; stop affected work, deduplicate alerts, and validate recovery before resuming.
5. **Runtime integration:** validate confidential session persistence, account-level mutual exclusion, runtime budgets, and the suitability of the selected host. Repository hosting, CI, and the runtime are separate decisions; do not assume GitHub Actions usage eligibility from available free minutes.
6. **Separate regional acceptance:** evaluate CN and HK independently against real supported account environments. No regional success is inferred from a locale setting or from the other region's result.

See [requirements](modules/single-account-cloud/requirements.md) for acceptance criteria. Each implementation change should have a focused regression test and a recorded result before advancing to runtime or live-account verification.

## Upstream maintenance

- Retain upstream commit history and the `upstream` remote.
- Review upstream changes on a separate update branch before integrating them.
- Prefer focused patches and narrow interfaces over widespread file moves.
- Do not automatically deploy an unreviewed upstream update.
- Keep an identifiable previously verified revision for rollback.
