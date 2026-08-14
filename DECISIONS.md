# Design Decisions

This document is a chronological narrative of how this project actually got built: the scaffold it started from, the options that were on the table at each turn, what was picked, and why. Most of it happened through a collaborative back-and-forth — clarifying questions asked and answered before code was written, course corrections after review — rather than from a finished spec handed down up front. The goal here is to preserve that reasoning, not just the current state of the code (`CLAUDE.md` covers that).

It closes with an explicit list of what was consciously deferred, so a gap in the app reads as a decision, not an oversight.

## 1. Starting point (inherited, not decided)

The project began as an existing scaffold: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS, with a single `/api/crawl` route that fetched `news.ycombinator.com` and parsed it with cheerio, and a client page rendering the top 30 stories in a table sortable by score/comments (`b19558c`, `1174597`, `e4ffe71`). Everything from here on is a decision made during this project's collaborative build process, layered on top of that base.

## 2. Filtering feature & sort-UI refactor (found in progress)

At the start of this process, the working tree already had an uncommitted diff: a title-length filter (all / >5 words / ≤5 words) added to the crawler UI, and the sort controls moved from standalone buttons into clickable table headers in `NewsTable`. This wasn't designed through discussion — it was reviewed, described back to confirm understanding, and committed as-is (`828522f`). It's the foundation the rest of this document's decisions build on (the filter and sort state are what later get instrumented for usage tracking in §5).

## 3. Automated testing strategy

The sort and filter logic lived inline inside `page.tsx` (not exported), and the cheerio parsing lived inline inside the `/api/crawl` route handler — nothing was testable in isolation without first extracting it.

Options considered and decisions made:

- **Test runner: Vitest over Jest.** Faster, ESM-native, less config overhead for this TS/Next stack than Jest's `next/jest` integration.
- **Extract pure functions over UI-only testing.** Rather than only testing through rendered component interactions, `sortEntries`/`filterByTitleLength`/`parseHNEntries` were pulled out into `src/lib/*.ts` as small, exported, pure functions — enabling fast, isolated unit tests with no DOM rendering, at the cost of a (small, behavior-preserving) refactor.
- **Fixture-based parser testing + mocked `fetch` for the route.** Rather than hitting the real `news.ycombinator.com`, a small hand-crafted HTML fixture (`src/lib/__fixtures__/hn-sample.html`) exercises every branch of the parser (external link, internal `item?id=` link, missing score/comments, empty title), and `global.fetch` is mocked for the route-handler tests.
- **Component tests + CI both included; Playwright/E2E explicitly declined.** React Testing Library tests render the real page and drive it with `@testing-library/user-event`; a GitHub Actions workflow runs lint/test/build on every push. Full browser E2E was considered and explicitly ruled out as more setup/maintenance than this app's size warrants.

Result: `5d83d37`.

## 4. Data storage & login system

The idea was to pair MySQL with an ORM (Prisma or Drizzle) rather than raw queries for schema/migration safety, and use Auth.js (NextAuth) with a Credentials provider rather than hand-rolling password hashing/session management.

**Round one of locked-in choices** (stack):
- **Auth.js over hand-rolled auth** — hashing, CSRF, and session-cookie handling come for free and correctly, at the cost of adopting its conventions.
- **Prisma over Drizzle or raw `mysql2`** — mature migration tooling and generated types.
- **MySQL via Docker Compose for local dev** — matches a self-hosted-style production setup rather than requiring a hosted dev database.

**Round two of locked-in choices** (scope, once the stack was settled):
- **Gate the whole app**, not just add auth infrastructure for later — anonymous visitors get redirected to `/login` for everything, including the API.
- **Self-service registration** via a public `/register` endpoint.
- **JWT sessions**, not database-backed sessions — no session table, no Auth.js Adapter needed (Credentials + database sessions aren't even compatible in Auth.js).
- **Password reset / email verification explicitly deferred** — register → login → logout only, to keep this iteration shippable without standing up an email provider.

Result: `f7c10d3`.

## 5. Usage tracking

Filtering and sorting are 100% client-side, applied in React state against data already fetched by one earlier `/api/crawl` call — there's no natural per-filter-change "request" hitting the server to attach a timestamp to.

Locked-in choices:
- **Log on every filter *and* sort change**, via a new `POST /api/usage` endpoint called from the client — not just once per crawl (which would have made the logged filter value trivially always `"all"`, since filter resets on every new crawl).
- **Tie every event to `userId`** via a required foreign key, now that every request is authenticated — not anonymous/global counts.
- **Track sort key/direction too, alongside filter** — decided in the same pass rather than adding it in a second iteration later.
- **No viewing UI yet** — DB storage only for this phase.

Result: `344a276`.

## 6. Usage viewing page

Locked-in choices:
- **A server component with a direct Prisma query, not a new `GET` endpoint.** Mirrors the existing `UserBar.tsx` pattern (`auth()` + Prisma, no client JS) — this is a read-only page, so there's no interactivity that would justify a client-side fetch round trip.
- **Both an all-time summary (counts per filter/sort key) and the raw chronological event list** — not one or the other, since a summary without any way to inspect individual events, or a raw list with no at-a-glance totals, would each have been half the answer.
- **Event list capped at the most recent 100; the summary counts are computed all-time via a separate `groupBy`, independent of that cap** — a summary is supposed to reflect total usage, not just whatever's currently visible in the table.

The page is protected by the same middleware allowlist as everything else, plus its own explicit `redirect("/login")` as defense-in-depth (consistent with `/api/usage`'s explicit 401 check even though middleware already covers it). Reachable via a new "Usage" link added to `UserBar`, with a "← Back to crawler" link on the page itself.

Result: `142da33`.

## 7. Code review & security hardening

A full review was run: 

**Security — two issues were judged severe enough to fix:**

- **`javascript:` URL scheme not filtered on scraped HN links.** `parseHNEntries.ts` took the `href` attribute from scraped HTML verbatim, and `NewsTable.tsx` rendered it directly as a clickable `<a href>`. `rel="noopener noreferrer"` blocks tab-nabbing but does *not* filter the URL scheme — a `javascript:` URI in a scraped (or spoofed) HN response would execute in this app's origin on click. **Fixed** by only accepting URLs matching `^https?://` (plus the already-safe internal `item?id=` rewrite) in the parser, verified against 30 live HN entries (no false positives) and a new fixture test case with a `javascript:` href.
- **Timing side-channel enabling email enumeration.** `verifyCredentials.ts` returned immediately for an unknown email, but ran a ~50-100ms `bcrypt.compare` for a known email with a wrong password — a measurable, exploitable timing gap that lets an attacker enumerate registered emails via repeated timed login attempts. **Fixed** by always running `bcrypt.compare` against a fixed dummy hash when the user isn't found, so both failure paths take comparable time. Verified live: correct credentials issue a real session cookie; wrong password and unknown email both produce the identical `CredentialsSignin` error with no distinguishing signal.

Result: `adca971`.

## 8. Commit reference

| Phase | Commit |
|---|---|
| §1 Initial scaffold | `b19558c`, `1174597`, `e4ffe71` |
| §2 Filter + sort-UI refactor | `828522f` |
| §3 Automated testing | `5d83d37` |
| §4 Login system + MySQL | `f7c10d3` |
| §5 Usage tracking | `344a276` |
| §6 Usage viewing page | `142da33` |
| §7 Security fixes | `adca971` |
