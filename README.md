# HN Crawler

A Next.js web app that crawls the top 30 stories from [Hacker News](https://news.ycombinator.com/) on demand, with sortable/filterable results, user accounts, and per-user usage tracking.

## Features

- On-demand crawl via a button click
- Displays rank, title (linked), score, and comment count for each story
- Client-side sort by score or comments (ascending/descending toggle)
- Client-side filter by title length (all / long / short)
- Login required to use the app — self-service registration with email + password
- Each user's filter/sort activity is logged and viewable on their own `/usage` page

## Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS**
- **cheerio** — server-side HTML parsing
- **MySQL** via **Prisma** ORM
- **Auth.js** (NextAuth v5) — Credentials provider, JWT sessions
- **Vitest** + **React Testing Library** — automated tests

## Getting Started

Requires [Docker](https://www.docker.com/) for local MySQL.

```bash
npm install                    # also runs `prisma generate`
cp .env.example .env           # fill in DATABASE_URL / AUTH_SECRET (see file for details)
docker compose up -d mysql     # start local MySQL
npx prisma migrate dev         # create the database schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and log in.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server at localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## How It Works

The whole app is gated behind login. Anonymous visitors are redirected to `/login`; new users can self-register at `/register`.

Once logged in, clicking **"Crawl Hacker News"** calls the `/api/crawl` endpoint, which:
1. Fetches `https://news.ycombinator.com/`
2. Parses the HTML with cheerio, extracting `tr.athing` story rows
3. Returns a JSON array of the top 30 entries

The frontend then renders the results, and lets you sort by score/comments and filter by title length — both entirely client-side. Every filter or sort change is logged (who, what, when) to a `usage_events` table; visit `/usage` (linked from the header) to see your own activity summary and history.

## More

- [`CLAUDE.md`](./CLAUDE.md) — detailed architecture and testing reference.
- [`DECISIONS.md`](./DECISIONS.md) — the story of how this project got built: what was considered at each step and why.
