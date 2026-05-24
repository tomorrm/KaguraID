## Summary

<!-- One or two sentences describing what this PR does. -->

## Motivation

<!-- Why is this change needed? Reference related issues with "Fixes #123" or "Related to #456". -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New signal (new fingerprint signal added to `SOURCES`)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing behaviour to change)
- [ ] Documentation update

## Changes

<!-- List the files changed and a brief description of each change. -->

- `src/kagura-id.js` — …
- `README.md` — …

## Signal checklist (for new signals only)

- [ ] Collection function wrapped in `try/catch` and never throws
- [ ] Returns a fallback value (`{ supported: false }` or `-1`) on failure
- [ ] `stable: true` only if value is consistent across normal browser sessions
- [ ] `weight` reflects actual discriminating power (justify the value)
- [ ] `timeout` set appropriately (500 ms for sync-equivalent; up to 5000 ms for heavy async)
- [ ] Does not collect raw PII (IP addresses, user identifiers, etc.)
- [ ] Signal documented in README.md Signal Catalog
- [ ] Signal listed in CHANGELOG.md

## Testing

<!-- Describe how you tested this change. Paste relevant console output or screenshots. -->

Tested on:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome (Android)
- [ ] Safari (iOS)

## Lint / format

- [ ] `eslint src/**/*.js` passes with no errors
- [ ] `prettier --check src/**/*.js` passes

## Breaking change notes

<!-- If this is a breaking change, describe what downstream consumers need to do. -->
