# Design Decisions

This document is a chronological narrative of how this project actually got built: the scaffold it started from, the options that were on the table at each turn, what was picked, and why. Most of it happened through a collaborative back-and-forth — clarifying questions asked and answered before code was written, course corrections after review — rather than from a finished spec handed down up front. The goal here is to preserve that reasoning, not just the current state of the code (`CLAUDE.md` covers that).

It closes with an explicit list of what was consciously deferred, so a gap in the app reads as a decision, not an oversight.

## 1. Starting point (inherited, not decided)

The project began as an existing scaffold: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS, with a single `/api/crawl` route that fetched `news.ycombinator.com` and parsed it with cheerio, and a client page rendering the top 30 stories in a table sortable by score/comments (`b19558c`, `1174597`, `e4ffe71`). Everything from here on is a decision made during this project's collaborative build process, layered on top of that base.

## 2. Filtering feature & sort-UI refactor (found in progress)

At the start of this process, the working tree already had an uncommitted diff: a title-length filter (all / >5 words / ≤5 words) added to the crawler UI, and the sort controls moved from standalone buttons into clickable table headers in `NewsTable`. This wasn't designed through discussion — it was reviewed, described back to confirm understanding, and committed as-is (`828522f`). It's the foundation the rest of this document's decisions build on (the filter and sort state are what later get instrumented for usage tracking in §5).

## 3. Automated testing strategy

**The ask:** add automated tests for the fetch, sort, and filter features, none of which had any coverage.

**What made this non-trivial:** the sort and filter logic lived inline inside `page.tsx` (not exported), and the cheerio parsing lived inline inside the `/api/crawl` route handler — nothing was testable in isolation without first extracting it.

Options presented and decisions made:

- **Test runner: Vitest over Jest.** Faster, ESM-native, less config overhead for this TS/Next stack than Jest's `next/jest` integration.
- **Extract pure functions over UI-only testing.** Rather than only testing through rendered component interactions, `sortEntries`/`filterByTitleLength`/`parseHNEntries` were pulled out into `src/lib/*.ts` as small, exported, pure functions — enabling fast, isolated unit tests with no DOM rendering, at the cost of a (small, behavior-preserving) refactor.
- **Fixture-based parser testing + mocked `fetch` for the route.** Rather than hitting the real `news.ycombinator.com`, a small hand-crafted HTML fixture (`src/lib/__fixtures__/hn-sample.html`) exercises every branch of the parser (external link, internal `item?id=` link, missing score/comments, empty title), and `global.fetch` is mocked for the route-handler tests.
- **Component tests + CI both included; Playwright/E2E explicitly declined.** React Testing Library tests render the real page and drive it with `@testing-library/user-event`; a GitHub Actions workflow runs lint/test/build on every push. Full browser E2E was considered and explicitly ruled out as more setup/maintenance than this app's size warrants.

Two technical choices worth preserving the reasoning for:

- **Vitest environment: `node` by default, `jsdom` opt-in per file.** The API route tests need real Node/Fetch-API globals (`Response.json`); Vitest's `jsdom` environment can shadow those. Since most new test files are plain Node and only the page/component tests touch the DOM, `node` became the project default with a `// @vitest-environment jsdom` docblock opted into per file rather than the other way around.
- **`vi.stubGlobal("fetch", ...)` over `msw`.** This app only ever calls `fetch` from two or three call sites total — a full request-interception library was judged to be unjustified overhead versus just stubbing the global directly.

Result: `5d83d37`.

## 4. Data storage & login system

**The ask started open-ended:** "Let's add data storage. We can create a login system with a users table. Let's use MySQL for it. Let me know your thoughts." The recommendation given back: pair MySQL with an ORM (Prisma or Drizzle) rather than raw queries for schema/migration safety, and use Auth.js (NextAuth) with a Credentials provider rather than hand-rolling password hashing/session management, since that's exactly the area where hand-rolled auth tends to go wrong.

**Round one of locked-in choices** (stack):
- **Auth.js over hand-rolled auth** — hashing, CSRF, and session-cookie handling come for free and correctly, at the cost of adopting its conventions.
- **Prisma over Drizzle or raw `mysql2`** — mature migration tooling and generated types, worth the schema-DSL learning curve at this project's size.
- **MySQL via Docker Compose for local dev** — matches a self-hosted-style production setup rather than requiring a hosted dev database.

**Round two of locked-in choices** (scope, once the stack was settled):
- **Gate the whole app**, not just add auth infrastructure for later — anonymous visitors get redirected to `/login` for everything, including the API.
- **Self-service registration** via a public `/register` endpoint, not admin-seeded users only.
- **JWT sessions**, not database-backed sessions — no session table, no Auth.js Adapter needed (Credentials + database sessions aren't even compatible in Auth.js).
- **Password reset / email verification explicitly deferred** — register → login → logout only, to keep this iteration shippable without standing up an email provider.

**Version pins, verified against the live npm registry rather than assumed from training data** (the ecosystem here moves fast enough that this mattered):
- `next-auth@5.0.0-beta.32` — Auth.js v5 has never shipped a stable release; `beta` is what all current App Router documentation targets, so pinning to `latest` (still v4) would have been wrong.
- `prisma@6.19.2`, not the `latest` `7.x` — 7.x is a breaking rewrite requiring mandatory driver adapters and ESM-only client output; 6.x's plain `DATABASE_URL` + default generator output was judged not worth trading away for this project's size.
- `bcryptjs`, not `bcrypt` — pure JS with no native `.node` bindings to compile, avoiding Docker/CI build fragility for no real benefit at this scale.
- `mysql:8.4` (pinned), not `mysql:9.x`/`latest` — more battle-tested, fewer default-behavior surprises.

**A structural decision worth explaining:** Auth.js config is split into `src/auth.config.ts` (no providers, edge-safe) and `src/auth.ts` (the Credentials provider, which needs Prisma + bcryptjs — both Node-only). `middleware.ts` runs on the Edge runtime by default and can't load Prisma/bcryptjs, so it only ever imports the edge-safe config. This split exists specifically to keep the middleware bundle Edge-compatible.

Result: `f7c10d3`.

## 5. Usage tracking

**The ask:** add a "Hi `<email-local-part>`" greeting + logout link (mostly cosmetic — the existing logout control already did the right thing), plus a `usage_events` table recording at least a request timestamp and the applied filter.

**The ambiguity this actually had to resolve:** filtering and sorting are 100% client-side, applied in React state against data already fetched by one earlier `/api/crawl` call — there's no natural per-filter-change "request" hitting the server to attach a timestamp to. This had to be clarified before a schema or endpoint could be designed at all.

Locked-in choices:
- **Log on every filter *and* sort change**, via a new `POST /api/usage` endpoint called from the client — not just once per crawl (which would have made the logged filter value trivially always `"all"`, since filter resets on every new crawl).
- **Tie every event to `userId`** via a required foreign key, now that every request is authenticated — not anonymous/global counts.
- **Track sort key/direction too, alongside filter** — decided in the same pass rather than adding it in a second iteration later.
- **No viewing UI yet** — DB storage only for this phase (the UI came one phase later, §6).

**Two things discovered mid-build, not planned up front:**
- **`session.user.id` wasn't actually exposed.** Auth.js's default JWT/session callbacks don't propagate a custom `id` field returned from `authorize()` onto `session.user` — nothing had needed it before (`UserBar` only ever read `session.user.email`). Fixed with custom `jwt`/`session` callbacks in `auth.ts` copying the id across, plus a `src/types/next-auth.d.ts` module augmentation so TypeScript knows about the field.
- **A real test regression.** The existing `page.test.tsx` tests mocked `global.fetch` once per test, expecting exactly one call (the crawl). Once sort/filter clicks also called `fetch("/api/usage", ...)`, those same tests would have broken (an exhausted mock queue returns `undefined`, and `undefined.catch(...)` throws). Fixed by switching to a URL-aware `fetch` mock that branches on the request URL, and adding assertions on the logged usage payloads rather than just working around the crash.

Result: `344a276`.

## 6. Usage viewing page

**The ask:** a page to see the stored usage data, reachable only by logged-in users, showing their own usage, with a way back to the main app.

Locked-in choices:
- **A server component with a direct Prisma query, not a new `GET` endpoint.** Mirrors the existing `UserBar.tsx` pattern (`auth()` + Prisma, no client JS) — this is a read-only page, so there's no interactivity that would justify a client-side fetch round trip.
- **Both an all-time summary (counts per filter/sort key) and the raw chronological event list** — not one or the other, since a summary without any way to inspect individual events, or a raw list with no at-a-glance totals, would each have been half the answer.
- **Event list capped at the most recent 100; the summary counts are computed all-time via a separate `groupBy`, independent of that cap** — a summary is supposed to reflect total usage, not just whatever's currently visible in the table.

The page is protected by the same middleware allowlist as everything else, plus its own explicit `redirect("/login")` as defense-in-depth (consistent with `/api/usage`'s explicit 401 check even though middleware already covers it). Reachable via a new "Usage" link added to `UserBar`, with a "← Back to crawler" link on the page itself.

Result: `142da33`.

## 7. Code review & security hardening

A full review was run against three lenses: SOLID principles, OOP, and security.

**SOLID / OOP:** mostly not applicable by design — this is a small functional codebase (hooks, pure functions, functional route handlers) with no inheritance or polymorphism, and that's the right call for this stack, not a gap. One real issue did surface: the filter/sort label strings ("All", "> 5 words", "≤ 5 words", etc.) are duplicated verbatim between `page.tsx` and `usage/page.tsx` with no single source of truth — flagged as an Open/Closed-style risk (tweak the wording in one place, the other silently drifts) but not yet fixed (see §8).

**Security — two issues were judged severe enough to fix immediately, not just flag:**

- **`javascript:` URL scheme not filtered on scraped HN links.** `parseHNEntries.ts` took the `href` attribute from scraped HTML verbatim, and `NewsTable.tsx` rendered it directly as a clickable `<a href>`. `rel="noopener noreferrer"` blocks tab-nabbing but does *not* filter the URL scheme — a `javascript:` URI in a scraped (or spoofed) HN response would execute in this app's origin on click. **Fixed** by only accepting URLs matching `^https?://` (plus the already-safe internal `item?id=` rewrite) in the parser, verified against 30 live HN entries (no false positives) and a new fixture test case with a `javascript:` href.
- **Timing side-channel enabling email enumeration.** `verifyCredentials.ts` returned immediately for an unknown email, but ran a ~50-100ms `bcrypt.compare` for a known email with a wrong password — a measurable, exploitable timing gap that lets an attacker enumerate registered emails via repeated timed login attempts. **Fixed** by always running `bcrypt.compare` against a fixed dummy hash when the user isn't found, so both failure paths take comparable time. Verified live: correct credentials issue a real session cookie; wrong password and unknown email both produce the identical `CredentialsSignin` error with no distinguishing signal.

Result: `adca971`.

## 8. Consciously deferred / not done

These are decisions to *not* do something (yet), not oversights:

- **Password reset / email verification** — deferred from the start of the login-system work (§4) to keep that iteration shippable without an email provider.
- **Rate limiting on login/register** — flagged in the security review as a real, concrete gap (unlimited login attempts / registration spam are both currently possible), but calibrated as acceptable for a personal/local project rather than something requiring an immediate fix — worth closing before any public deployment.
- **`docker-compose.yml` credential/binding hardening** — the MySQL root/app-user passwords are hardcoded, weak, and now visible in a public repo, and the port binds to all interfaces. Harmless for its actual use (local dev tooling nothing deploys), but a naive `docker compose up` on an internet-facing host without a firewall would expose it. Recommended fix (not yet applied): bind `127.0.0.1:3306:3306` instead of `3306:3306`.
- **Filter/sort label duplication** between `page.tsx` and `usage/page.tsx` — flagged in the code review (§7), not yet refactored into a shared source of truth in `src/lib/`.
- **Exact (non-caret) Prisma version pinning** — `prisma` and `@prisma/client` are both `^6.19.2`; Prisma requires these two to match exactly and fails loudly (not silently) if they drift, so this fails safe, but pinning to an exact version would remove even that risk.
- **Playwright / end-to-end browser tests** — explicitly ruled out in §3 as more setup/maintenance than this app's size currently warrants.
- **No admin or cross-user usage view** — `/usage` is deliberately self-view-only (§6); there's no way for one user to see another's activity, by design, not by omission.

## 9. Commit reference

| Phase | Commit |
|---|---|
| §1 Initial scaffold | `b19558c`, `1174597`, `e4ffe71` |
| §2 Filter + sort-UI refactor | `828522f` |
| §3 Automated testing | `5d83d37` |
| §4 Login system + MySQL | `f7c10d3` |
| §5 Usage tracking | `344a276` |
| §6 Usage viewing page | `142da33` |
| §7 Security fixes | `adca971` |
