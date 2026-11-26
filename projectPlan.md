# Plan: Maths Tutor Web App ("SumCraft - Maths Games") — Next.js on Vercel

## Context
Build a fun, child-friendly (ages 8–14) maths tutor where each page teaches **one concept** through a custom, interactive visualisation. Students practise on randomly generated problems and earn rewards (points, medals, a joke). First concept: **Bus Stop (short) division**. `c:\Code\maths-games` is currently empty and not a git repo, so this is greenfield.

Hard constraint: **£0 running cost** on Vercel's free Hobby plan for <10 students. The design achieves this by being almost entirely static/client-side: no database, no auth, no paid APIs. Progress is stored in the browser (`localStorage`), jokes come from a bundled list, and pages are statically rendered. Usage will stay far below Hobby limits (100 GB bandwidth/month, generous function invocations). Note: Hobby is for non-commercial use, which suits this project.

## Tech stack
- **Next.js (App Router) + TypeScript**, created with `create-next-app` (Tailwind and ESLint enabled, `src/` directory)
- **Tailwind CSS** for a bright, chunky, rounded look; **Fredoka** (headings) and **Nunito** (body) via `next/font/google`, both self-hosted at build time with no runtime cost
- **Framer Motion** for the visualisation animations; **canvas-confetti** for celebrations
- **Zustand** with the `persist` middleware for points and medals in `localStorage`
- **Vitest** for unit tests of the pure maths logic; **Playwright** for one smoke test of each page
- **GitHub repo + Vercel Git integration**: every push to `main` deploys to production and every PR gets a preview URL. A free GitHub Actions workflow runs lint, typecheck and tests on PRs.

## Architecture / folder layout
```
src/
  app/
    layout.tsx                  # fonts, global theme, header showing the points badge
    page.tsx                    # landing page: hero, topic cards
    topics/bus-stop-division/page.tsx
    trophies/page.tsx           # medal cabinet (M3)
  lib/
    topics.ts                   # topic registry (slug, title, emoji, colour, difficulty levels) used by the landing page
    random.ts                   # seedable RNG helper (mulberry32), so tests are deterministic
    maths/busStop.ts            # pure algorithm: solveBusStop(dividend, divisor) -> steps[]
    maths/busStopGenerator.ts   # generateProblem(level) -> {dividend, divisor}
    rewards/store.ts            # Zustand store: points, streak, medals, solved count per topic (M3)
    rewards/rules.ts            # scoring and medal thresholds (M3)
  data/jokes.ts                 # about 100 curated, kid-safe maths jokes (M3)
  components/
    ui/ (Button, Card, Mascot, PointsBadge, Modal)
    busStop/
      BusStopBoard.tsx          # the "bus stop" bracket with input cells for quotient digits and carried remainders
      PlaceValueVisualiser.tsx  # blocks animation (M2)
      StepNarrator.tsx          # speech bubble from a mascot explaining each step
      PracticePanel.tsx         # brings together the generator, board, checking and rewards
```
Adding each future concept means adding one registry entry and one `app/topics/<slug>/` folder, which keeps the "one page, one concept" idea.

### Core algorithm (shared by every milestone)
`solveBusStop(dividend, divisor)` returns an ordered list of steps, one per digit of the dividend:
`{ placeValue: 'thousands'|'hundreds'|'tens'|'ones', carriedIn, working /* carriedIn*10 + digit */, quotientDigit, remainderOut }`
plus the final `{ quotient, remainder }`. The board (M1), the visualiser (M2) and answer checking all read from this one source of truth.

### Problem generator levels
| Level | Dividend | Divisor | Carries | Final remainder |
|---|---|---|---|---|
| 1 Warm-up | 2–3 digits | 2–5 | none | no |
| 2 Explorer | 3 digits | 2–9 | yes | no |
| 3 Champion | 4 digits | 2–9 | yes | optional |
| 4 Legend | 4 digits | 2–12 | yes | yes |

The generator builds the problem as `divisor × quotient + remainder` so the level's rules are always met, and it rejects trivial cases.

## Milestone 1: Landing page and Bus Stop division page
1. Scaffold the app, set up the Tailwind theme (bright palette tokens, rounded-2xl cards, large tap targets of at least 44px), create the GitHub repo and connect it to Vercel. Confirm the first deploy from `main`.
2. **Landing page**: a friendly mascot hero ("Pick a maths mission!") and a grid of topic cards from `topics.ts`. Bus Stop Division is live; a few cards marked "Coming soon" (e.g. Fractions, Times Tables) show where the app is heading.
3. **Bus Stop page**:
   - A short "How it works" intro with a static worked example.
   - Level picker and a "New problem" button.
   - `BusStopBoard`: the dividend sits under the bracket, the divisor outside, and there are empty cells above for each quotient digit plus small superscript cells for carried remainders. Students fill these in **step by step, left to right**. Each entry is checked against `solveBusStop` with gentle feedback (wiggle plus a hint such as "How many 7s fit into 23?"). A "Hint" button shows the times-table row for the divisor.
   - On completion: a success state (confetti and a "Next problem" button).
4. Unit tests for `busStop.ts` (property test: `quotient*divisor + remainder === dividend`) and for the generator's level rules.

## Milestone 2: Visualisation of how Bus Stop works
`PlaceValueVisualiser` shows **sharing place-value blocks between groups** (the meaning of division), kept in sync with the board:
- Dividend shown as Dienes-style blocks: thousand cubes, hundred flats, ten rods, one cubes (SVG with Framer Motion).
- The divisor is shown as N "buses" or "bus stop" groups, each a coloured lane.
- For each step from `solveBusStop`:
  1. Share the blocks in the current column equally into the N groups (animated); each group's count is the **quotient digit**, which pops into the bracket.
  2. The leftover blocks are the **remainder**. Each is "exchanged" (broken apart with a sparkle) into 10 blocks of the next column down and slides over. This is the carried digit that appears as the small superscript number.
  3. The mascot narrates: "1 thousand left over, so swap it for 10 hundreds. Now we have 12 hundreds."
- Controls: Play / Pause / Step forward / Step back / Speed. Two modes:
  - **Watch mode**: animates a generated or chosen example.
  - **Practise mode**: the visualisation runs one step behind the student's input, so each correct answer "plays" its step. It also shows wrong answers visually (e.g. "8 won't fit evenly, you'd need 24 hundreds!").
- Large numbers: to avoid visual clutter, show up to about 15 blocks per column individually and use a stack with a count label above that.
- Respect `prefers-reduced-motion` (instant transitions).

## Milestone 3: Points, medals and jokes
- **Scoring (`rules.ts`)**: base points by level (10/20/30/50), +5 if no hints were used, and a streak bonus (×1.5 at 3 in a row, ×2 at 5). A points badge in the header with a count-up animation.
- **Medals per topic**: Bronze at 5 solved, Silver at 15, Gold at 30, plus fun badges ("No-Hint Hero", "Streak Star (5)", "Legend Level Cleared", "Remainder Wrangler"). Unlocking one shows a modal with a medal animation.
- **Trophy cabinet page** (`/trophies`) showing earned and locked medals. Add a "Reset progress" option, and an optional player nickname so siblings sharing a device can each have their own profile (profiles keyed in `localStorage`).
- **Jokes**: a curated `data/jokes.ts` of about 100 kid-safe maths jokes (`{setup, punchline}`). After each correct answer, a joke card appears with a "Tap to reveal the punchline" interaction. Jokes are not repeated until all have been shown (the shown list is kept in the store).
  - **Why preset rather than Gemini**: it costs nothing, has no API key or rate limits, works offline, is instant, and its content is guaranteed suitable for children. Gemini's free tier would technically fit the budget, but it adds a server route, key management, latency and moderation risk for content shown to children. If wanted later, add `app/api/joke/route.ts` that calls Gemini with a strict prompt, a short timeout and safety settings, and **falls back to the local list** on any failure. Keep the key in Vercel environment variables. This is optional and out of scope by default.
- Persistence caveat: progress lives on one browser or device. That's acceptable for <10 students. If shared progress across devices is ever needed, a free option is a Vercel Marketplace store such as Upstash Redis or Neon on its free tier, but it isn't needed now.

## Engagement and design principles (all milestones)
- Bright, high-contrast palette, a consistent mascot (an original character, e.g. a cheerful bus called "Divvy"), short sentences, emoji, large numerals.
- Mistakes are never punished: gentle hints, no lost points, the streak simply resets.
- Mobile and tablet first (many children use iPads); numeric keypad input (`inputMode="numeric"`).
- Accessibility: keyboard navigable, ARIA live region for feedback, colour is never the only signal.
- Optional sound effects (off by default, toggle in the header).

## Free-tier checklist
- All pages statically rendered with no serverless functions, so bandwidth is the only cost driver and it stays at a few MB per student session.
- No database, no image optimisation-heavy assets (use SVG), no paid add-ons. Vercel Web Analytics on Hobby is optional and free within limits.

## Verification
- `npm run lint && npm run typecheck && npm test` (Vitest: algorithm properties and generator rules for all 4 levels).
- `npm run dev` and check manually on desktop and in a phone-sized viewport: landing page, then Bus Stop, then solve one problem at each level, including a wrong entry, a hint, and a problem with a final remainder.
- M2: step through 4-digit examples with carries in every column (e.g. 5,432 ÷ 7) and check the animation, the board digits and the narration agree at each step, both forward and back.
- M3: solve 5 problems, then check the Bronze medal, points and streak; reload the page and check the progress persists; check jokes don't repeat; reset progress.
- Playwright smoke test: load the landing page, navigate to Bus Stop, solve a seeded problem, and check the success and joke card appear.
- Push to `main`, then confirm the Vercel production deploy succeeds and the PR preview URLs work.
