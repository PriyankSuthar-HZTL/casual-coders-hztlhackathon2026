# CLAUDE.md — Stackshift

Migrate live-page content into Contentstack. Scrapes a URL, detects components via Cheerio heuristics, matches to content types, creates entries via Stack Management API.

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5.7 (strict), Tailwind 3.4, Zustand 5, Cheerio, axios

**Commands:** `npm run dev` | `npm run build` | `npm run lint` | `npm run typecheck`

**Path alias:** `@/*` → `./src/*`

For architecture, structure, patterns, and conventions see [reference.md](.claude/reference.md).
