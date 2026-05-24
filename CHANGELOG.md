# Changelog

All notable changes to KaguraID are documented here.

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). Breaking changes increment `MAJOR`, new backward-compatible features increment `MINOR`, and bug fixes increment `PATCH`.

---

## [1.0.0] — 2026-05-18

### Added

- Initial public release of `KaguraID` as a UMD browser library
- 52-signal collection pipeline with per-signal timeout and fallback handling
- KaguraHash-256 based ID generation:
  - `visitorId` (stable signals)
  - `sessionId` (all signals)
  - `stableId` (16-char shorthand)
- Weighted component matching API (`matchComponents`) with score and verdict output
- Interactive browser demo at `example/demo.html`
- OSS support documentation:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `PRIVACY.md`
  - `CODE_OF_CONDUCT.md`
