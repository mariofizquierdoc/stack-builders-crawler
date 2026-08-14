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
```

## Architecture

```
src/
├── types/index.ts              # HNEntry interface
├── app/
│   ├── layout.tsx              # Root layout with Tailwind globals
│   ├── page.tsx                # Main page (crawl button, sort, table)
│   └── api/crawl/route.ts      # GET /api/crawl — fetches & parses HN
└── components/
    └── NewsTable.tsx           # Sortable results table
```

The API route (`/api/crawl`) fetches `https://news.ycombinator.com/`, parses `tr.athing` rows with cheerio, and returns an array of 30 `HNEntry` objects (rank, title, url, score, comments).
