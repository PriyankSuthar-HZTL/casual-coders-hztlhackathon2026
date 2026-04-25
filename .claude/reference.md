# Stackshift — Reference

## Architecture Patterns

### API Routes
- POST-only, `export const runtime = "nodejs"`
- Body typed as `{Action}Request`, response as `{ ok, ...data, error? }`
- Types in `src/types/index.ts` as `{Action}Request` / `{Action}Response` pairs

### Components
- `"use client"` on all interactive components
- State via `useStackshift()` Zustand hook with selectors
- Tailwind utility classes only — no CSS modules
- Steps in `src/components/steps/`, panels in `src/components/`

### Store
- Single store, persist key `stackshift-v1`
- Persisted: `config`, `connectionOk`, `contentTypeCount`, `stackName`, `connectedAt`
- In-memory: wizard state, components, matches, migration results
- `skipHydration: true` + `useStoreHydration()` for SSR safety

### Detection
- `src/lib/detector.ts` — scored structural rules against Cheerio DOM
- Generic patterns, not site-specific selectors
- Kinds: hero, feature_list, card_grid, testimonial, faq, cta_banner, rich_text, media_gallery, navigation, footer

### Contentstack Integration
- Auth: session token OR management token
- Regions: na, eu, au, azure-na, azure-eu, gcp-na
- Fuzzy token-based matching between components and content types

## Design System

- Palette: `paper`/`ink`, `accent` (red-orange), `brand-green`, `brand-yellow`
- Fonts: Inter Tight (sans), Fraunces (serif), JetBrains Mono (mono)
- Neo-brutalist `hard` shadows
- Animations: `fade-in`, `stage-in`, `scrim-in`, `conn-pulse`

## Environment Variables

- `NEXT_PUBLIC_DEFAULT_REGION` — default region (fallback `"na"`)
- Credentials entered in-app, stored in localStorage

## Coding Conventions

- Shared types in `src/types/index.ts` — Contentstack: `snake_case`, app: `camelCase`
- No `any` unless unavoidable
- One component per file, named export matching filename
- API response always includes `ok: boolean`
