# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | ✅ Active |
| < 1.0.0 | ❌ End of life |

Security fixes are provided for the latest `1.x` release line.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues using one of the following channels:

- **GitHub private vulnerability reporting** — use the "Security" tab on the repository page (preferred)

### What to include

- Description of the vulnerability and its potential impact
- Steps to reproduce (minimal reproduction preferred)
- Browser and OS version
- The version(s) of kagura.js affected
- Whether you have a proposed fix or mitigation

### Response timeline

| Stage | Target time |
|---|---|
| Acknowledgement | 72 hours |
| Initial triage | 7 days |
| Fix released (confirmed critical) | 14 days |
| Fix released (moderate) | 30 days |
| Public disclosure | After fix is released |

We will credit reporters in the changelog and release notes unless you request otherwise.

---

## Scope

The following are considered in-scope security issues:

- A signal collection function that exfiltrates user data beyond what is documented
- The KaguraHash-256 implementation producing collisions at a rate significantly higher than expected for a 256-bit hash
- A vulnerability that allows an attacker to manipulate the fingerprint result to impersonate another device
- Any code path that could lead to XSS when the library is embedded in a page
- Dependency or supply-chain issues (if a build pipeline is added in future)

The following are out of scope:

- Fingerprinting evasion (e.g. Brave returning spoofed values) — this is an intentional browser behaviour
- The inherent identifiability of browser fingerprinting in general — this is a feature, not a vulnerability
- Issues in the demo HTML file unrelated to the core library
- Social engineering attacks on maintainers

---

## Security Design Notes

**kagura.js is a client-side library.** It runs in the user's browser and its output is as trustworthy as any client-side data. Do not use fingerprint values as a sole authentication or authorisation mechanism.

**The library does not make network requests.** No data is transmitted by kagura.js itself. Data transmission is the responsibility of the application that calls `fp.get()`.

**KaguraHash-256 is not a cryptographic hash.** It is designed for speed and distribution quality, not security. Do not use it to hash passwords, derive keys, or verify data integrity in a security-critical context.
