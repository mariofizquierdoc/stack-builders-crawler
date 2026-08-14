# HN Crawler

A Next.js web app that crawls the top 30 stories from [Hacker News](https://news.ycombinator.com/) on demand, displaying them in a sortable table.

## Features

- On-demand crawl via a button click
- Displays rank, title (linked), score, and comment count for each story
- Client-side sort by score or comments (ascending/descending toggle)

## Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS**
- **cheerio** — server-side HTML parsing

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server at localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## How It Works

Clicking **"Crawl Hacker News"** calls the `/api/crawl` endpoint, which:
1. Fetches `https://news.ycombinator.com/`
2. Parses the HTML with cheerio, extracting `tr.athing` story rows
3. Returns a JSON array of the top 30 entries

The frontend then renders the results and allows sorting by score or comment count.
