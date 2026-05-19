# Privacy Considerations

kagura.js collects browser and hardware characteristics to generate a probabilistic device identifier. This document describes what is collected, what is not collected, and the legal and ethical responsibilities of anyone who deploys this library.

---

## What kagura Collects

kagura collects **browser and device attributes** — not personal data in the traditional sense. The collected signals include:

- Rendering output from Canvas 2D and WebGL (used as a hash input, not stored as an image)
- Installed fonts (detected by measuring text dimensions, not by reading font files)
- Audio processing characteristics (a numeric sum, not a recording)
- Screen resolution, color depth, and pixel ratio
- Hardware concurrency and device memory
- Installed browser plugins and their MIME types
- Timezone, locale, and language settings
- CSS feature support flags
- Speech synthesis voice locale list
- Media device counts (camera, microphone, speaker — count only, no stream access)
- Browser extension presence indicators (based on global JavaScript variables)
- `performance.now` precision level

**kagura does NOT collect:**
- Raw IP addresses (WebRTC collects only whether a local/private IP exists and whether IPv6 is available)
- Usernames, email addresses, or any account credentials
- Precise geolocation
- Microphone or camera audio/video streams
- Browsing history, cookies, or localStorage from other origins
- The content of any form field

---

## The Nature of Fingerprint Data

Browser fingerprinting occupies a grey area in privacy law. The resulting identifier is:

- **Probabilistic** — it may match different users on identical hardware
- **Not unique by itself** — it requires server-side storage and comparison to identify returning visitors
- **Potentially considered personal data** under GDPR if it can be linked (directly or indirectly) to a natural person

The European Data Protection Board (EDPB) and various national DPAs have confirmed that fingerprint identifiers can constitute personal data under Article 4(1) of the GDPR when used to track individuals. Similar positions are held under CCPA (California), PIPEDA (Canada), and APPI (Japan).

---

## Legal Obligations by Jurisdiction

This section is informational only and does not constitute legal advice. Consult a qualified attorney for your specific situation.

### European Union — GDPR + ePrivacy Directive

The ePrivacy Directive (as implemented in EU member states) requires **prior informed consent** before storing information on a user's device or accessing information already stored. Fingerprinting — even without cookies — likely falls within this scope.

Required actions:
- Obtain explicit, freely given, specific consent before running kagura
- Disclose fingerprinting in your Privacy Policy and Cookie/Tracking Notice
- Provide a mechanism for users to withdraw consent
- Maintain a record of consent (Article 7(1) GDPR)

Lawful bases other than consent (e.g. legitimate interests) are unlikely to be sufficient for non-essential tracking under current guidance.

### United States — CCPA / CPRA (California)

Under CCPA, a fingerprint identifier may qualify as a "unique personal identifier." If your service is subject to CCPA:
- Disclose the collection of fingerprint data in your Privacy Policy
- Provide a "Do Not Sell or Share My Personal Information" link if fingerprint data is shared with third parties
- Honor opt-out requests

### Other Jurisdictions

Similar obligations exist under LGPD (Brazil), PDPA (Thailand), PDPD (Vietnam), and many others. Review applicable law before deploying in new markets.

---

## Recommended Implementation Practices

### Consent gate

Do not call `kagura.load()` until the user has given consent.

```js
// Example: only run after consent is confirmed
if (userHasConsented()) {
  const fp = await kagura.load();
  const result = await fp.get();
  sendToServer(result.visitorId);
}
```

### Data minimisation

Only send the signals you actually need to your server. Avoid logging the full `components` object unless necessary for debugging.

```js
// Send only what you need
const { visitorId, confidence } = await fp.get();
sendToServer({ visitorId, confidence });
```

### Retention limits

Do not retain fingerprint identifiers longer than necessary. Define a retention period (e.g. 90 days) and enforce it server-side.

### Do Not Track

kagura does not automatically respect the `DNT` header. You may choose to skip collection when `navigator.doNotTrack === "1"`.

```js
if (navigator.doNotTrack === "1") return;
const fp = await kagura.load();
```

### Security

- Transmit fingerprint data over HTTPS only
- Store hashed identifiers server-side rather than raw component values
- Do not use fingerprints as a sole authentication factor

---

## Use Case Guidance

| Use case | Notes |
|---|---|
| Fraud detection (after login) | Generally considered legitimate interest; still requires disclosure |
| Bot detection | Generally acceptable; disclose in terms of service |
| Anonymous analytics without consent | Legally risky in EU/UK; avoid |
| Cross-site tracking | Not supported by kagura by design; prohibited under GDPR |
| Replacing cookies without consent | Prohibited under ePrivacy Directive |
| Security / account integrity | Acceptable with disclosure; pair with explicit user notice |

---

## Responsible Disclosure

If you discover a privacy or security vulnerability in kagura.js, please report it privately rather than opening a public issue. Email the maintainers at the address listed in the repository or use GitHub's private vulnerability reporting feature.

We will acknowledge reports within 72 hours and aim to release a fix within 14 days for confirmed issues.

---

## Further Reading

- [EDPB Guidelines on the use of cookies and similar technologies](https://edpb.europa.eu/our-work-tools/documents/public-consultations/2019/guidelines-22019-processing-personal_en)
- [ICO guidance on cookies and similar technologies](https://ico.org.uk/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/)
- [Electronic Frontier Foundation — Cover Your Tracks](https://coveryourtracks.eff.org/)
- [W3C Privacy Interest Group](https://www.w3.org/Privacy/)
