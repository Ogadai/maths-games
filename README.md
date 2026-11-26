# SumCraft - Maths Games

A fun maths tutor for 8 to 14 year olds. Each page teaches one concept with an interactive visualisation and randomly generated practice problems. See [projectPlan.md](projectPlan.md) for the roadmap.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # unit tests (Vitest)
npm run test:e2e     # browser tests (Playwright); first run: npx playwright install chromium
```

## Deploy (Vercel Hobby, free)

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project**, import the repo and keep the defaults (Next.js is detected automatically).
3. Every push to `main` now deploys to production, and every pull request gets a preview URL.

The app is fully static (no database, no API keys), so it runs comfortably within the free tier.

## Adding a new concept

1. Add an entry to [src/lib/topics.ts](src/lib/topics.ts).
2. Create `src/app/topics/<slug>/page.tsx`, putting the pure maths logic in `src/lib/maths/` with unit tests next to it.
