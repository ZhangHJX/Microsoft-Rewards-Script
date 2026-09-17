# Diagnostic privacy increment

- updated_at: 2026-09-17
- author: Codex
- status: implemented; local-verification-passed

DONE: reproduced implicit raw capture and permissive filesystem creation with two failing tests. Config validation now defaults errorDiagnostics to false, matching config.example.json. Explicit true retains upstream capture behavior. Newly created diagnostic directories use 0700 and files use 0600. Both capture paths are tested with a permissive process umask and synthetic browser output; no live account was accessed.

DONE: build and 189 reliability tests pass; targeted ESLint, Prettier and diff checks pass. The test recursively verifies directory and file modes for ordinary errors and unknown login pages.

Limitations: HTML, screenshots, raw URLs and error details remain sensitive when explicitly enabled. Modes protect against other local users on POSIX, not the account owner, privileged users or artifact upload. Existing files/directories are not retroactively hardened. Do not publish raw captures or include them in cloud artifacts. No claim of comprehensive log redaction or encrypted session persistence is made.

TODO: complete lower-level log review; implement confidential cloud state transport; verify real authentication and independent regional acceptance. Keep the full plan open.
