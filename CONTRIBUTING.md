# Contributing to kagura.js

Thank you for your interest in contributing. This document covers how to report issues, propose changes, and submit pull requests.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Conventions](#coding-conventions)
- [Adding a New Signal](#adding-a-new-signal)
- [Commit Message Format](#commit-message-format)

---

## Code of Conduct

All contributors are expected to be respectful and constructive. Harassment, discrimination, or hostile behaviour of any kind is not tolerated. Issues and pull requests that violate this standard will be closed.

---

## Reporting Bugs

Before opening a bug report, please:

1. Check that the bug is reproducible on the latest version.
2. Search existing issues to avoid duplicates.

When opening an issue, include:

- Browser name and version
- Operating system
- A minimal reproduction (inline HTML + script is ideal)
- The signal name(s) involved, if known
- Actual vs. expected output

---

## Suggesting Features

Open a GitHub Issue with the `[Feature]` prefix. Describe:

- The use case you are solving
- How the proposed API or signal would work
- Any known limitations or privacy implications

For new signals specifically, see [Adding a New Signal](#adding-a-new-signal).

---

## Development Setup

kagura.js is distributed as a single runtime file (`src/kagura.js`) with no runtime dependencies.
For contributor checks (lint/format), use the Node.js toolchain from `package.json`.

```bash
git clone https://github.com/tomorrm/kagurajs.git
cd kagurajs
npm install
npm run lint
npm run format:check
open example/demo.html          # macOS
xdg-open example/demo.html      # Linux
start example\demo.html         # Windows (cmd.exe)
```

ESLint configuration lives in `eslint.config.js`.

---

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-new-signal
   ```

2. Make your changes. Keep each commit focused on a single concern.

3. Run lint and format checks before pushing:
   ```bash
   npm run lint
   npm run format:check
   ```

4. Open a pull request against `main`. Fill in the PR template (title, motivation, testing notes).

5. A maintainer will review your PR. Please respond to review comments promptly.

**Pull requests that do the following will be accepted faster:**
- Include a clear description of the change and why it is needed
- Reference a related issue if one exists
- Touch only the files necessary for the change
- Pass linting and formatting checks

**Pull requests that will be closed without review:**
- Add signals that collect personally identifiable information without explicit user consent
- Reduce test coverage without justification
- Have vague commit messages or PR descriptions

---

## Coding Conventions

kagura.js is a UMD bundle targeting modern browsers. Follow these conventions:

**Style:**
- 2-space indentation
- Semicolons required
- Double quotes for strings in source code
- Maximum line length: 120 characters
- Prefer `const` for values that do not change and `let` when reassignment is needed

**Naming:**
- `camelCase` for all variables and functions
- `SCREAMING_SNAKE_CASE` for module-level constants
- Signal collection functions follow the pattern `collectXxx()` where `Xxx` is the signal name in PascalCase

**Error handling:**
- All signal collection functions must wrap their body in `try/catch` and return a fallback value (e.g. `{ supported: false }` or `-1`) on failure — never throw
- All async signals must resolve (not reject) in all cases

**Comments:**
- Keep comments minimal and use them to explain *why*, not *what*

---

## Adding a New Signal

A signal is an entry in the `SOURCES` table in `kagura.js`. Each entry has the shape:

```js
signalName: {
  stable:  boolean,  // true → included in visitorId hash; false → sessionId only
  weight:  number,   // 1–15; discriminating power for fuzzy matching
  timeout: number,   // max ms before the signal resolves with a timeout result
  fn:      () => any | Promise<any>,
}
```

**Checklist for a new signal:**

- [ ] The signal returns a consistent value across page loads on the same device
- [ ] The collection function is wrapped in `try/catch` and never throws
- [ ] An appropriate `timeout` is set (500 ms for synchronous-equivalent, up to 5000 ms for heavy async)
- [ ] `stable: true` is only set if the value does not change across normal browser sessions (e.g. not battery level, network type, or gamepad count)
- [ ] `weight` reflects actual discriminating power — prefer starting at 2–4 and adjusting based on testing
- [ ] The signal does not store or transmit raw PII (IP addresses, user identifiers, etc.)
- [ ] The signal is documented in the Signal Catalog section of `README.md`
- [ ] The signal is listed in `CHANGELOG.md` under the next version

**Minimal signal template:**

```js
// ── 5-XX. My new signal ──
function collectMySignal() {
  try {
    if (!window.SomeAPI) return { supported: false };
    return {
      supported: true,
      value: window.SomeAPI.someProperty,
    };
  } catch(e) {
    return { supported: false };
  }
}

// In SOURCES:
mySignal: { stable: true, weight: 4, timeout: 500, fn: () => collectMySignal() },
```

---

## Commit Message Format

```
type(scope): short summary in imperative mood

Optional body explaining why the change was made.
Reference issues with "Fixes #123" or "Closes #456".
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples:**
```
feat(signals): add speechSynthesis voice locale detection
fix(hash): correct infHash256 loop bound for 1-3 byte inputs
docs(readme): add fuzzy matching usage example
chore(ci): fix eslint glob on Alpine Linux
```

One logical change per commit. Squash fixup commits before opening a PR.
