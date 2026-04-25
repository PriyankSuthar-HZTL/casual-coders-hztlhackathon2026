---
name: stackshift-development
description: >-
  Backend workflows: adding Cheerio detection rules, Contentstack schema generation,
  and testing the migration pipeline. Use when adding a component detector, modifying
  scraping logic, editing contentstack.ts, or debugging migration results.
---

# Stackshift Backend Development

## Adding a New Component Detector

1. Add the kind to `ComponentKind` in `src/types/index.ts`
2. Add a detection rule in `RULES` array in `src/lib/detector.ts`
3. Add schema generation in `generateContentTypeSchema()` in `src/lib/contentstack.ts`
4. Test with `npm run dev` against a page containing the component

## Testing the Migration Pipeline

- Authenticate in the UI, enable **dry-run** mode to preview payloads without writing
- Check API route responses in browser DevTools Network tab
- Run `npm run typecheck` before committing
