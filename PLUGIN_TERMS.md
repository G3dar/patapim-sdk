# PATAPIM API & Plugin Terms

This SDK and the PATAPIM Local API are provided so anyone can extend and automate PATAPIM. A few ground rules:

1. **Third-party code runs at the user's own risk.** Scripts, integrations and (future) plugins built on this API are not reviewed, endorsed or supported by the PATAPIM team unless explicitly stated.
2. **Don't circumvent plan limits.** Using the API to bypass, disable or interfere with PATAPIM's license verification or plan limits (e.g. terminal caps) is prohibited. Limits are enforced by the application regardless of how a request originates.
3. **Trademarks.** Don't use "PATAPIM" in your project's name in a way that implies it is official (e.g. "PATAPIM Pro Tools"). "X for PATAPIM" is fine.
4. **Local API = local trust.** Tokens grant real control over the user's machine (terminals, files, browser). Treat them like SSH keys: never commit them, never send them to a remote service.
5. **The SDK is MIT-licensed.** The PATAPIM application itself remains proprietary; this repo only covers the public API surface, client library, docs and examples.
