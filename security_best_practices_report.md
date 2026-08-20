# Security Best-Practices Review

## Executive summary

The application is reasonably safe against conventional frontend XSS: portfolio data is rendered through React's escaped JSX, the only `dangerouslySetInnerHTML` use generates CSS from a static chart configuration, no secrets are embedded in the client bundle, and there is no token/session storage. The main risk is the trust model around a powerful, unauthenticated local API. It accepts arbitrary RPC destinations, exposes portfolio and queue data, and currently opts every web origin into CORS. That is safe only while both ports remain unreachable to untrusted clients and the operator never visits a malicious page while the direct API is running.

Prioritized result: 3 high, 3 medium, and 1 low finding. The most urgent low-regression change is to remove or tightly restrict wildcard CORS. Authentication and RPC-destination policy need an explicit product decision because this project intentionally supports private local nodes.

## High severity

### SEC-001 — Wildcard CORS authorizes arbitrary websites to use the API

- **Rule ID:** REACT-CSRF-001 / cross-origin request boundary
- **Severity:** High
- **Location:** `server/src/api.ts:1-20`, with state-changing routes at `server/src/api.ts:32-42`
- **Evidence:** `api.use(cors())` uses Hono's default `Access-Control-Allow-Origin: *`. A runtime preflight from `https://attacker.example` returned `204` with `Access-Control-Allow-Origin: *`, allowed `POST`/`DELETE`, and allowed the requested `content-type` header.
- **Impact:** A malicious website opened by the machine's user can read portfolio data and submit JSON mutations to a directly reachable development API. It can add/delete records and trigger balance jobs without the user interacting with this app.
- **Fix:** Remove CORS because both the development and production clients already use the same-origin Vite proxy, or configure an exact allowlist of trusted origins.
- **Mitigation:** Bind the direct API to loopback only and firewall port 8579. Do not expose it through a reverse proxy.
- **False-positive notes:** The Docker Compose file publishes only port 8580, so the direct 8579 exposure is primarily a local-development or custom-deployment risk. Wildcard CORS is still unnecessary in the checked-in architecture.

### SEC-002 — No authentication protects portfolio data, destructive routes, or Bull Board

- **Rule ID:** REACT-AUTHZ-001 / server access-control boundary
- **Severity:** High when reachable by an untrusted LAN or the internet; accepted risk on a strictly trusted host/network
- **Location:** `README.md:21-24`; API routes in `server/src/api.ts:23-42`; Bull Board registration in `server/src/app.ts:16-27`
- **Evidence:** The README explicitly states there is no authentication. Every read/write/delete route and the `/dashboard` queue-management UI is mounted without an authentication or authorization middleware.
- **Impact:** Any client that can reach the service can view account addresses and balances, alter configuration, delete data, enqueue RPC work, and inspect or operate the job dashboard.
- **Fix:** Put the app behind an authenticated reverse proxy (recommended for a home-server tool), or add optional application-level authentication that covers both API and dashboard routes.
- **Mitigation:** Keep the service on a trusted VLAN or host-only interface; never port-forward it; document the boundary prominently next to the Docker instructions.
- **False-positive notes:** This is an explicit design choice, not an accidental omission. Severity falls substantially if network controls guarantee only one trusted user can reach port 8580.

### SEC-003 — Arbitrary RPC URLs create an SSRF primitive

- **Rule ID:** Server-side request destination validation
- **Severity:** High when combined with SEC-001 or SEC-002; Medium on a strictly single-user host
- **Location:** `server/src/handlers/chains.ts:7-26`
- **Evidence:** `rpcUrl` is validated only as a string and passed directly to `viem`'s HTTP transport; `getChainId()` immediately makes a server-side request to that destination.
- **Impact:** An untrusted caller can make the server send JSON-RPC requests to loopback, private-network, or cloud-metadata destinations. Error behavior and timing can reveal network reachability, and a compatible internal JSON-RPC endpoint may expose additional data or actions.
- **Fix:** First enforce authentication and same-origin access. Then require `http:`/`https:` URLs and add a configurable destination policy. Because local/private RPC nodes are a core feature, private ranges should be opt-in rather than unconditionally blocked.
- **Mitigation:** Run the container with restricted egress and isolate it from sensitive management networks.
- **False-positive notes:** Private and loopback RPC URLs are legitimate inputs for this project, so a blanket public-address-only allowlist would break intended functionality.

## Medium severity

### SEC-004 — RPC credentials are returned to and rendered by the browser

- **Rule ID:** REACT-CONFIG-001 / secret minimization
- **Severity:** Medium
- **Location:** `server/src/handlers/chains.ts:58-60`; `client/src/components/ChainCard.tsx:123-127`
- **Evidence:** `getChains()` selects every column, including `rpcUrl`, and the Chains table renders the full value. Provider URLs commonly embed API keys in the path or query string.
- **Impact:** Anyone with UI/API access can recover RPC credentials. URLs may also appear in screenshots, browser tooling, and error messages.
- **Fix:** Return a redacted display URL by default and provide a deliberate reveal/edit flow. Consider storing provider credentials separately from the non-secret endpoint template.
- **Mitigation:** Use locally hosted or restricted provider keys and avoid placing secrets in query strings where possible.
- **False-positive notes:** The checked-in default URLs are public and contain no credentials. This finding applies when users supply authenticated provider endpoints.

### SEC-005 — Browser security headers are absent

- **Rule ID:** REACT-CSP-001 / REACT-HEADERS-001
- **Severity:** Medium
- **Location:** `client/vite.config.ts:20-27`; no edge/server header configuration is present elsewhere in the repository
- **Evidence:** A runtime request to port 8580 returned only `Vary`, `Content-Type`, cache, ETag, date, and connection headers. It did not include CSP, `X-Content-Type-Options`, clickjacking protection, `Referrer-Policy`, or `Permissions-Policy`.
- **Impact:** A future injection bug would have a larger blast radius, the UI can be framed, and browsers receive no explicit referrer or feature policy.
- **Fix:** Configure headers on the actual production static server or reverse proxy. Start with `default-src 'self'`, an application-tested script/style policy, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and a conservative referrer/permissions policy.
- **Mitigation:** Set these headers at an upstream proxy if Vite preview remains temporarily.
- **False-positive notes:** An external reverse proxy may already add headers in a deployment not represented by this repository. Verify the final public response.

### SEC-006 — Dependency audit reports vulnerable build/runtime transitive packages

- **Rule ID:** REACT-SUPPLY-001
- **Severity:** Medium overall; several individual advisories are rated High/Critical
- **Location:** `bun.lock`; dependency definitions in `package.json`, `client/package.json`, and `server/package.json`; runtime dependency copy in `Dockerfile:31-38`
- **Evidence:** `bun audit` on 2026-08-20 reported 60 advisories: 2 critical, 35 high, 17 moderate, and 6 low. Affected trees include Vite/Rollup/PostCSS, Tailwind/node-tar, ESLint transitive packages, and `concurrently`/`shell-quote`. The runtime image copies the complete root `node_modules` because it launches Vite preview and `concurrently` in production.
- **Impact:** Most findings require malicious build inputs or affected library APIs and are not directly exposed by normal portfolio requests, but the production image unnecessarily carries the vulnerable build toolchain. A compromised dependency or crafted build input can affect CI artifacts.
- **Fix:** Update within compatible ranges, re-audit, and replace Vite preview in production with a minimal static server so the runtime image can contain production dependencies only.
- **Mitigation:** Build from reviewed lockfile changes, use immutable CI artifacts, and avoid processing untrusted archives/config files in the build pipeline.
- **False-positive notes:** Audit severity does not equal application exploitability. Each remaining advisory should be evaluated against the exact invoked code path after upgrades.

## Low severity

### SEC-007 — Builds and container bases are not fully reproducible or least-privileged

- **Rule ID:** Supply-chain and container hardening
- **Severity:** Low
- **Location:** `Dockerfile:2,16,27`; `.github/workflows/build.yml:16-22`; `README.md:46-48`; `docker-compose.yml:27-31`
- **Evidence:** Bun is selected as `latest` in CI, base images use floating major/minor tags, installs do not enforce a frozen lockfile, and the runtime image has no non-root `USER` directive.
- **Impact:** The same commit can produce different artifacts over time, upstream tag movement can introduce unexpected changes, and a compromised process has broader write access inside its container.
- **Fix:** Pin Bun and image digests on a maintenance cadence, use `bun install --frozen-lockfile --ignore-scripts`, and run the final process as a dedicated non-root user with correct volume permissions.
- **Mitigation:** Keep image scanning enabled and review automated dependency/image update pull requests.
- **False-positive notes:** Container root is namespaced and is not automatically host root; the practical impact depends on mounts and container-runtime configuration.

## Reviewed areas with no confirmed vulnerability

- No attacker-controlled HTML reaches the chart component's `dangerouslySetInnerHTML`; its current ID and color configuration are module/static values.
- No `eval`, `new Function`, `document.write`, unsafe `postMessage`, service worker, client-side auth token storage, or third-party script tag was found.
- Account, token, and chain strings are rendered through normal React interpolation and receive React's escaping.

## Reference guidance

- [Hono CORS middleware](https://hono.dev/docs/middleware/builtin/cors)
- [Hono secure headers middleware](https://hono.dev/docs/middleware/builtin/secure-headers)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
