# Whole-Codebase Review

## Executive summary

The project has a clean, understandable shape and a good local-first premise. TypeScript strictness, Kysely parameterization, React's escaped rendering, foreign keys, and a workspace lockfile provide a solid baseline. The review found one high-impact data-integrity bug in manual-account editing, several mobile/accessibility problems, stale or misleading numeric metadata, a broken container health check, and meaningful deployment/security hardening work.

The confirmed UI findings were fixed and are documented with reproduction evidence in `dogfood-output/report.md`. Security findings and threat-model tradeoffs are in `security_best_practices_report.md`.

## Improvements applied

- Fixed manual-account editing so records are selected by ID rather than nullable address, and preserved descriptions during edits.
- Made add/edit dialogs close after successful requests and surfaced non-2xx API responses consistently.
- Reworked the fixed desktop sidebar into a phone-friendly, horizontally scrollable header below the `md` breakpoint.
- Added accessible form associations and record-specific names to edit/delete/expand controls.
- Added confirmation before cascading or destructive account, chain, token, and manual-balance deletion.
- Replaced the clickable portfolio table-row pattern with a keyboard-accessible expansion button and corrected Fragment/list keys.
- Removed state mutation from the React Query queue fetcher, made polling depend on query data, and added an HTTP status check.
- Reset an unavailable saved fiat currency to ETH instead of silently treating 1 ETH as 1 unit of fiat.
- Corrected Ethereum USDT from 18 to 6 decimals and replaced floating-number exponent construction with exact bigint exponentiation.
- Rejected negative manual balances, which the portfolio queries otherwise hide.
- Fixed the initial migration rollback so it also removes `networth`.
- Fixed the Docker health check's nonexistent port/path and improved dependency-layer caching.
- Removed an unused theme dependency, reused the existing Sonner wrapper, and separated button variants from the component module.

## Remaining recommendations

### Correctness and data model

1. **Store quantities without JavaScript floating-point loss.** `server/src/queues/workers/eth.ts` and `erc20.ts` convert token integers to `number`, and the database stores `balance`/`ethValue` as numeric values. This is adequate for a dashboard but not exact accounting. A future migration should store raw bigint amounts as decimal strings (plus decimals) and use a decimal library for fiat calculations.
2. **Make net-worth snapshots fresh.** `server/src/app.ts` writes the snapshot before it enqueues balance refreshes, so unattended snapshots can lag the chain by roughly one 12-hour interval. Enqueue first, wait for that refresh batch to settle, then snapshot.
3. **Add explicit API not-found/error handling.** Malformed JSON currently becomes a generic 500, and delete/update calls report success even when no row matched. Centralized JSON parsing and affected-row checks would make automation and UI errors clearer.

### Performance and maintainability

1. **Lazy-load the chart path.** The production bundle is about 913 kB minified (269 kB gzip), primarily because Recharts is loaded on the initial Home route even when the chart is hidden or the installation has too little history. Move the chart into a dynamically imported component and load it only when history and viewport conditions require it.
2. **Add tests around the data edges.** There is no automated test suite. Highest-value first tests: manual-account edit targeting, default token metadata, fiat fallback, empty-database queries, migration up/down, and queue-worker calculations.
3. **Make CI run lint/tests and use a frozen toolchain.** CI currently builds only. Add client lint, future tests, `bun audit`/dependency scanning, and a pinned Bun version with frozen-lockfile installation.
4. **Replace Vite preview in the production container.** A minimal static server or serving the built client from Hono would reduce the runtime dependency and vulnerability surface.
5. **Refresh documentation.** `client/README.md` is still Vite template text, while `server/README.md` has an incomplete endpoint checklist that no longer describes the API.

## Verification performed

- Baseline and final client/server TypeScript builds
- Client ESLint
- Prettier across the repository
- React Doctor before/after scan
- Bun dependency vulnerability audit
- Production-browser walkthrough at 1280 × 720, 375 × 812, and populated/empty states
- Add/edit flows for chains, manual accounts, tokens, and manual balances
- Browser accessibility tree, console, and page-error checks
- Docker Compose configuration validation
