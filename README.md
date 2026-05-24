# KaguraID

**A lightweight, dependency-free browser fingerprinting library** that collects 52 browser/device signals and generates identifiers with **KaguraHash-256**.

[![License: BSD-2-Clause](https://img.shields.io/badge/License-BSD%202--Clause-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)
[![Browser Support](https://img.shields.io/badge/browsers-Chrome%20%7C%20Firefox%20%7C%20Safari%20%7C%20Edge-informational.svg)](#browser-support)

## Features

- Runtime dependency-free (single UMD file, no network requests by library code)
- 52 signals total: 34 stable + 18 session-variant
- 3-layer IDs:
  - `visitorId` (stable signals only)
  - `sessionId` (all signals)
  - `stableId` (first 16 chars of `visitorId`)
- Device similarity scoring via weighted signal comparison (`matchComponents`)
- `debug` output with component-level visibility

## Quick Start

### 1. Use from source in browser

```html
<script src="./src/kagura-id.js"></script>
<script>
  (async () => {
    const fp = await kaguraId.load();
    const result = await fp.get();
    console.log(result.visitorId, result.confidence, result.stability);
  })();
</script>
```

### 2. Run local demo

```bash
git clone https://github.com/tomorrm/kagura-id.git
cd kagura-id
pnpm install
open example/demo.html          # macOS
xdg-open example/demo.html      # Linux
start example\demo.html         # Windows (cmd.exe)
```

## API

### `await kaguraId.load(options?)`

Initializes the agent after an idle tick.

`options`:
- `delayFallback?: number` default `50`
- `debug?: boolean` default `false`

Returns a fingerprint agent with `get()`.

### `await fp.get(options?)`

Collects all configured signals and returns:

```ts
{
  visitorId: string;   // 64-char hex, stable signals only
  sessionId: string;   // 64-char hex, all signals
  stableId: string;    // 16-char shorthand
  components: Record<string, { value: unknown; duration: number } | { error: unknown; duration: number }>;
  confidence: number;  // 0..1
  stability: number;   // 0..1
  version: string;
}
```

`options`:
- `debug?: boolean` prints detailed diagnostics to console

### `kaguraId.matchComponents(compA, compB)`

Returns weighted similarity:

```ts
{
  score: number; // 0..1
  verdict: "same" | "likely" | "unknown" | "different";
  matchedWeight: number;
  totalWeight: number;
  breakdown: Record<string, { matched: boolean; weight: number; stable: boolean }>;
}
```

### Other exports

- `kaguraId.componentsToDebugString(components)`
- `kaguraId.infHash256(input)`
- `kaguraId.VERSION`

## Signal Catalog

The library currently collects the following 52 signals. `stable=true` signals are used in `visitorId`.

| Signal | Stable | Weight | Timeout (ms) |
|---|---:|---:|---:|
| `canvas` | yes | 15 | 2000 |
| `fonts` | yes | 12 | 5000 |
| `webGlBasics` | yes | 12 | 1000 |
| `audio` | yes | 10 | 4000 |
| `webGlExtensions` | yes | 10 | 1000 |
| `shaderPrecision` | yes | 9 | 1000 |
| `hardware` | yes | 8 | 500 |
| `math` | yes | 8 | 500 |
| `webGL2Params` | yes | 8 | 1000 |
| `canvasNoise` | yes | 7 | 1000 |
| `fontLoadAPI` | yes | 7 | 2000 |
| `cssComputedStyle` | yes | 6 | 500 |
| `cssFeatures` | yes | 6 | 500 |
| `screen` | yes | 6 | 500 |
| `speechSynthesis` | yes | 6 | 2000 |
| `browserEnv` | yes | 5 | 500 |
| `domAPIs` | yes | 5 | 500 |
| `plugins` | yes | 5 | 500 |
| `timingJitter` | yes | 5 | 1000 |
| `userAgentData` | yes | 5 | 2000 |
| `vendorFlavors` | yes | 5 | 500 |
| `applePay` | yes | 4 | 500 |
| `deviceSensors` | yes | 4 | 500 |
| `intl` | yes | 4 | 500 |
| `mediaDevices` | yes | 4 | 2000 |
| `offscreenCanvas` | yes | 4 | 500 |
| `timezone` | yes | 4 | 500 |
| `visualPrefs` | yes | 4 | 500 |
| `extensionHints` | no | 3 | 500 |
| `locale` | yes | 3 | 500 |
| `pointerPrecision` | yes | 3 | 500 |
| `screenLuminance` | yes | 3 | 500 |
| `wasm` | yes | 3 | 500 |
| `webXR` | yes | 3 | 2000 |
| `workers` | yes | 3 | 500 |
| `audioLatency` | no | 2 | 1000 |
| `autofillHint` | no | 2 | 2000 |
| `gpuScore` | no | 2 | 2000 |
| `memory` | no | 2 | 500 |
| `permissions` | no | 2 | 2000 |
| `screenFrame` | no | 2 | 500 |
| `storageQuota` | no | 2 | 2000 |
| `webRTCCodecs` | no | 2 | 2000 |
| `webrtcIPs` | no | 2 | 2000 |
| `battery` | no | 1 | 2000 |
| `clipboardAccess` | no | 1 | 1000 |
| `connectionType` | no | 1 | 500 |
| `gamepad` | no | 1 | 500 |
| `network` | no | 1 | 500 |
| `performance` | no | 1 | 500 |
| `reducedData` | no | 1 | 500 |
| `windowContext` | no | 1 | 500 |

## Browser Support

- Chrome (latest stable)
- Firefox (latest stable)
- Safari (latest stable)
- Edge (latest stable)

Some individual signals are browser-dependent and may return fallback values (for example `supported: false`).

## Security and Privacy

- KaguraHash-256 is **not** a cryptographic hash and must not be used for passwords, key derivation, or integrity checks.
- Fingerprints are client-generated signals and should not be used as the sole authentication/authorization factor.
- Fingerprinting can be regulated as personal data depending on jurisdiction.

Read:
- [PRIVACY.md](PRIVACY.md)
- [SECURITY.md](SECURITY.md)

## Development

```bash
pnpm install
pnpm run lint
pnpm run format:check
```

Lint config is in `eslint.config.js`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and pull request flow.

## License

BSD-2-Clause. See [LICENSE](LICENSE).
