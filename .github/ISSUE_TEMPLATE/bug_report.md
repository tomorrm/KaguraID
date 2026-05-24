---
name: Bug report
about: Report incorrect behaviour or a broken signal
title: "[Bug] "
labels: bug
assignees: ''
---

## Describe the bug

A clear and concise description of the problem.

## Steps to reproduce

1. Open browser X on OS Y
2. Load the page with KaguraID
3. Call `fp.get()`
4. Observe result

## Expected behaviour

What you expected to happen.

## Actual behaviour

What actually happened. Include the relevant signal value or error message.

## Reproduction

Paste a minimal HTML snippet or link to a reproduction here:

```html
<script src="kagura-id.js"></script>
<script>
  kaguraId.load().then((fp) => fp.get({ debug: true })).then((r) => console.log(r));
</script>
```

## Debug output

Paste the `[KaguraID] Debug:` console output here (run with `fp.get({ debug: true })`).

```
version: 1.0.0
userAgent: ...
visitorId: ...
components: ...
```

## Environment

- **KaguraID version:**
- **Browser & version:**
- **OS:**
- **Signal(s) involved** (if known):

## Additional context

Any other context about the problem.
