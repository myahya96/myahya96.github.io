# Security Policy

## 1. Overview & Supported Versions

Security is taken seriously in **Korean Vocab Pop! (2K2KOREAN!)**. We appreciate responsible disclosure of security issues from researchers and contributors.

| Version | Supported          | Security Status                                    |
| ------- | ------------------ | -------------------------------------------------- |
| 1.0.x   | :white_check_mark: | Currently supported with active security patches. |
| < 1.0   | :x:                | Deprecated / unsupported.                          |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do not disclose it publicly or open a public GitHub issue**. Instead, report it through one of the following confidential channels:

1. **Email**: Send vulnerability reports directly to `mooseteastudios@gmail.com`.
2. **Subject Line**: `[SECURITY VULNERABILITY] Korean Vocab Pop! - <Brief Summary>`
3. **Information to Include**:
   - Description and potential impact of the issue.
   - Exact steps or minimal Proof of Concept (PoC) to reproduce the vulnerability.
   - Affected URLs, endpoints, or components.
   - Any proposed remediation or patches if available.

### Response Timeframes & SLAs
- **Initial Acknowledgement**: Within 48 hours of receipt.
- **Triage & Assessment**: Within 5 business days.
- **Remediation & Patching**: High/Critical severity issues are addressed within 14 calendar days; lower severity within 30 days.
- **Coordinated Disclosure**: We ask researchers to give us reasonable time to release a patch before disclosing details publicly.

---

## 3. Threat Model: Firebase Web API Keys & Architecture

### Is the Firebase Web API Key Supposed to Be Public?
**Yes.** In client-side web and mobile architectures, the Firebase API key (`apiKey: "AIzaSy..."`) is an **app identifier**, not a secret password or private server key:

- **Identity vs. Authorization**: The Firebase Web API key identifies your project to Google APIs and routes requests to the correct Firebase backend services. It does *not* grant administrative access to your database or user records.
- **Real Security Layer**: Authorization and data protection are strictly enforced by **Firebase Firestore Security Rules** and **Firebase Authentication**. Even if a malicious actor copies your `apiKey`, any request they send to Firestore or Storage is evaluated and blocked unless it satisfies your security rules.
- **Recommended Cloud Restrictions**: While public, maintainers should configure **HTTP Referrer Restrictions** (e.g. restricting to your production domain and development origins) and **API Restrictions** (limiting only to Identity Toolkit and Firestore APIs) in the [Google Cloud Console Credentials Manager](https://console.cloud.google.com/apis/credentials).

---

## 4. Scope: What Qualifies as a Security Vulnerability

### In Scope
- **Firestore Authorization Bypasses**: Bypassing Firestore rules to read, alter, or delete other users' private accounts, progress, or battle records.
- **Authentication Flaws**: Account takeover, authentication bypass, or session fixation in Email/Password or Google OAuth flows.
- **Cross-Site Scripting (XSS)**: Persistent or reflected script execution in flashcards, usernames, lobbies, or review screens.
- **Open Redirect & Phishing Vulnerabilities**: Bypassing server/client endpoint sanitizers to redirect authenticated users to third-party phishing domains.
- **Server Injection or DoS**: Remote code execution, prototype pollution, or crash vectors against `server.js`.

### Out of Scope (Do Not Submit)
- **Public Firebase API Key Discovery**: Reporting that `firebaseConfig.apiKey` is visible in client HTML/JS source code. (This is by design in client-side web applications.)
- **Denial of Service via Volume Flooding**: Automated volumetric HTTP spam or network DDoS against cloud hosting providers.
- **Missing Theoretical Headers**: Suggestions for headers that break core iframe embedding or popup authentication flows (e.g., demanding `X-Frame-Options: DENY` on apps embedded in platform previews).
- **Attacks Requiring Local Device Compromise**: Exploiting physical access, rooted devices, or developer tool manipulation on the user's own browser.

---

## 5. Security Controls Implemented in This Application

This repository incorporates defense-in-depth protections:

1. **Anti-Phishing & Safe OAuth Endpoint Verification**:
   - Server-side middleware scrubs query parameters (`redirect`, `returnUrl`, `next`, `target`, etc.) for dangerous schemes and protocol-relative paths (`//`, `/\`, `\\`).
   - Client-side `AuthEndpointSecurity` validates OAuth provider origins (`google.com`) and strictly traps post-auth navigation within verified internal application routes.
   - Cross-Origin-Opener-Policy (`same-origin-allow-popups`) prevents opener window hijacking during OAuth popup flows.
2. **Cryptographic Client Password Hashing**:
   - Passwords for email accounts undergo salted SHA-256 client-side cryptographic hashing prior to storage.
   - Strict password security validation blocks SQL/NoSQL injection tokens (brackets, squiggles, quotes, semicolons, comments).
3. **Session Lifecycle Management**:
   - 3-hour idle timeout for standard sessions.
   - Enforced 7-day to 14-day absolute session expiration.
4. **Input Sanitization & Rate Limiting**:
   - Real-time client rate limiter restricts authentication and lobby generation spam.
   - All rendered user input (usernames, display names) is stripped of delimiter syntax and dangerous characters.
5. **App Check Ready**:
   - Codebase supports Firebase App Check with reCAPTCHA Enterprise to block automated bots and unauthorized callers.
6. **Prior-Consent Cookie & Tracking Privacy Guard (UK PECR / GDPR)**:
   - Zero tracking cookies, analytics events, or marketing tokens run until an affirmative choice is selected on the cookie consent banner.
   - `CookieConsentManager` intercepts `document.cookie` writes to drop non-essential tracking cookies when consent is `pending` or `essential`.
   - Firebase Analytics is conditionally loaded and initialized strictly upon explicit user opt-in (`all`).

---

## 6. Guidelines for Contributors & Maintainers

- **Never Commit Private Service Account Keys**: Do not commit Google Cloud service account JSON keys, backend secrets, or production `.env` files containing server privileges to Git.
- **Audit Rules Changes**: Before deploying changes to Firestore, review security rules to guarantee that `request.auth.uid == resource.data.uid` or appropriate role policies remain intact.
- **Dependencies**: Regularly run `npm audit` and keep runtime dependencies updated.
