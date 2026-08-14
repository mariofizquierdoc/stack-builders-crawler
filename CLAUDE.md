# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Next.js web crawler that scrapes the top 30 Hacker News stories and presents them in a React UI with on-demand fetch and client-side sort controls. The app is gated behind a login (email + password); registered users' credentials are stored in MySQL.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Scraping:** cheerio (server-side HTML parsing)
- **Database:** MySQL via Prisma ORM
- **Auth:** Auth.js (NextAuth v5) — Credentials provider, JWT sessions, no OAuth/Adapter
- **Package manager:** npm

## Setup and Commands

```bash
npm install         # install dependencies (also runs `prisma generate` via postinstall)
docker compose up -d mysql   # start local MySQL (see docker-compose.yml)
npx prisma migrate dev       # apply schema to local MySQL
npm run dev         # development server at http://localhost:3000
npm run build       # production build
npm run start       # start production server
npm run lint        # run ESLint
npm test            # run the Vitest suite once
npm run test:watch  # run Vitest in watch mode
```

Copy `.env.example` to `.env` and fill in `DATABASE_URL`/`AUTH_SECRET` before running the app (see `.env.example` for how the values map to `docker-compose.yml`'s MySQL credentials).

## Architecture

```
prisma/schema.prisma             # User + UsageEvent models (usage_events tracks filter/sort usage per user)
src/
├── types/index.ts               # HNEntry interface
├── types/next-auth.d.ts          # Module augmentation: adds `id` to Session.user and JWT
├── auth.config.ts                # Edge-safe Auth.js config (pages, authorized() route allowlist) — used by middleware
├── auth.ts                       # Full Auth.js config (Credentials provider, jwt/session callbacks exposing user.id) — Node-only
├── middleware.ts                  # Gates every route except /login, /register, /api/auth/*, /api/register
├── lib/
│   ├── sort.ts                   # sortEntries — pure sort logic
│   ├── filter.ts                  # filterByTitleLength — pure filter logic
│   ├── parseHNEntries.ts           # cheerio HTML parsing, extracted from the API route
│   ├── prisma.ts                  # Prisma client singleton (hot-reload-safe)
│   └── auth/verifyCredentials.ts   # email+password lookup against MySQL, bcrypt compare
├── app/
│   ├── layout.tsx                # Root layout; renders UserBar above {children}
│   ├── page.tsx                  # Main page (crawl button, filter, sort, table) — behind auth; POSTs /api/usage on every filter/sort interaction
│   ├── login/page.tsx             # Login form (next-auth/react signIn)
│   ├── register/page.tsx          # Self-service registration form
│   └── api/
│       ├── crawl/route.ts          # GET /api/crawl — fetches HN, delegates parsing to lib/parseHNEntries
│       ├── register/route.ts       # POST /api/register — zod validation, bcrypt hash, Prisma create
│       ├── usage/route.ts          # POST /api/usage — logs {userId, filter, sortKey, sortDir} to usage_events
│       └── auth/[...nextauth]/route.ts  # Auth.js's own GET/POST handlers
└── components/
    ├── NewsTable.tsx             # Sortable results table
    └── UserBar.tsx                # Server component: shows "Hi <email local-part>" + logout
```

The API route (`/api/crawl`) fetches `https://news.ycombinator.com/` and passes the HTML to `parseHNEntries` (`src/lib/parseHNEntries.ts`), which parses `tr.athing` rows with cheerio and returns an array of 30 `HNEntry` objects (rank, title, url, score, comments). Sorting and title-length filtering are implemented as pure functions in `src/lib/sort.ts` and `src/lib/filter.ts` so they can be unit tested independently of the React UI.

The whole app (including `/api/crawl` and `/api/usage`) is gated behind login via `src/middleware.ts`, which delegates the allow/deny decision to `authConfig.callbacks.authorized` in `src/auth.config.ts`. Auth.js config is deliberately split in two: `auth.config.ts` has no providers and is safe to bundle into the Edge middleware; `auth.ts` adds the Credentials provider (which needs Prisma + bcryptjs, both Node-only) and is only ever imported from server-side code (route handlers, server components), never from `middleware.ts`. Sessions are JWT-based — no session table, no Auth.js Adapter. `auth.ts`'s `jwt`/`session` callbacks copy the DB user id onto `token`/`session.user.id` (not exposed by default) so route handlers can attribute data to a user; `src/types/next-auth.d.ts` augments Auth.js's types accordingly. Password reset/email verification are out of scope for now.

Filtering and sorting happen entirely client-side against already-fetched data (no server round-trip) — `page.tsx` fires a fire-and-forget `POST /api/usage` on every filter-radio or sort-header interaction (and once right after a crawl completes, with the reset `all`/no-sort state), recording `{userId, filter, sortKey, sortDir, createdAt}` to the `usage_events` table (FK to `users`, `onDelete: Cascade`).

## Testing

Tests use Vitest + React Testing Library. `src/lib/*.test.ts` covers the pure sort/filter/parser/auth logic (parser tests use the fixture at `src/lib/__fixtures__/hn-sample.html`; `verifyCredentials.test.ts` mocks `@/lib/prisma` and `bcryptjs`); `src/app/api/crawl/route.test.ts`, `src/app/api/register/route.test.ts`, and `src/app/api/usage/route.test.ts` mock `fetch`/`@/lib/prisma`/`@/auth` to test each route's success/error paths; `src/components/UserBar.test.tsx` mocks `@/auth` and renders the resolved server component directly (`render(await UserBar())`); `src/app/page.test.tsx` renders the real page + table, uses a URL-aware `fetch` mock (distinguishing `/api/crawl` from `/api/usage`, since sort/filter interactions now also hit `/api/usage`), and drives crawl/sort/filter interactions with `@testing-library/user-event`, asserting on the logged usage payloads. Full Auth.js `signIn`/middleware/cookie flows are intentionally not covered by automated tests — verify those manually (register → login → confirm `/` and `/api/crawl` are gated → logout). CI (`.github/workflows/ci.yml`) runs `prisma generate`, lint, test, and build on every push/PR to `main`, using dummy `DATABASE_URL`/`AUTH_SECRET` values (no real DB needed since Prisma is mocked in tests and `prisma generate` doesn't require connectivity).
