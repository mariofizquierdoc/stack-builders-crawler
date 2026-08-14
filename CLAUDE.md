# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Next.js web crawler that scrapes the top 30 Hacker News stories and presents them in a React UI with on-demand fetch and client-side sort controls.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Scraping:** cheerio (server-side HTML parsing)
- **Package manager:** npm

## Setup and Commands

```bash
npm install        # install dependencies
npm run dev        # development server at http://localhost:3000
npm run build      # production build
npm run start      # start production server
npm run lint       # run ESLint
npm test           # run the Vitest suite once
npm run test:watch # run Vitest in watch mode
```

## Architecture

```
src/
├── types/index.ts              # HNEntry interface
├── lib/
│   ├── sort.ts                 # sortEntries — pure sort logic
│   ├── filter.ts                # filterByTitleLength — pure filter logic
│   └── parseHNEntries.ts         # cheerio HTML parsing, extracted from the API route
├── app/
│   ├── layout.tsx              # Root layout with Tailwind globals
│   ├── page.tsx                # Main page (crawl button, filter, sort, table)
│   └── api/crawl/route.ts      # GET /api/crawl — fetches HN, delegates parsing to lib/parseHNEntries
└── components/
    └── NewsTable.tsx           # Sortable results table
```

The API route (`/api/crawl`) fetches `https://news.ycombinator.com/` and passes the HTML to `parseHNEntries` (`src/lib/parseHNEntries.ts`), which parses `tr.athing` rows with cheerio and returns an array of 30 `HNEntry` objects (rank, title, url, score, comments). Sorting and title-length filtering are implemented as pure functions in `src/lib/sort.ts` and `src/lib/filter.ts` so they can be unit tested independently of the React UI.

## Testing

Tests use Vitest + React Testing Library. `src/lib/*.test.ts` covers the pure sort/filter/parser logic (parser tests use the fixture at `src/lib/__fixtures__/hn-sample.html`); `src/app/api/crawl/route.test.ts` mocks `fetch` to test the API route's success/error paths; `src/app/page.test.tsx` renders the real page + table and drives crawl/sort/filter interactions with `@testing-library/user-event`. CI (`.github/workflows/ci.yml`) runs lint, test, and build on every push/PR to `main`.
