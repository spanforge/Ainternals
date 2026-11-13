# AInternals

AInternals — The Economics of Intelligence.

A responsive website introducing an early-stage AI economics startup, built with Next.js 16, React 19, TypeScript, and CSS Modules.

## Development

Use Node.js 24 (also declared in `.nvmrc` and `package.json`).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To use port 3001, run `npm run dev -- --port 3001`.

## Validation

```sh
npm run lint
npm run build
npm run typecheck
```

The production build also checks TypeScript. After building, use `npm run start -- --port 3001` to preview production locally.

## Vercel deployment

Import this Git repository into Vercel with these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root (`.`) |
| Node.js | 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Framework default (leave the override disabled) |

No environment variables, database, custom server, or `vercel.json` are required. Vercel's Next.js integration handles rendering, optimized images, and static assets. See the [Vercel build documentation](https://vercel.com/docs/builds/configure-a-build).

The canonical URL is `https://ainternals.com` in `app/layout.tsx`; configure that domain in Vercel, or update the metadata if the production domain changes. Vercel Analytics is already included; enable Web Analytics in the Vercel project to view traffic.

## Structure

- `app/page.tsx`: introduction, five areas of interest, and early-stage status.
- `app/page.module.css`: responsive layout and CSS framing of the original monogram.
- `app/globals.css`: shared colors, typography, reset, and accessibility utilities.
- `app/layout.tsx`: shared shell, metadata, and Vercel Analytics.
- `app/icon.png`: browser icon.
- `components/`: navigation, footer, and their CSS Modules.
- `public/ainternals-growth-monogram.png`: original supplied brand artwork.
- `next.config.ts`: permanent redirects from `/about` and `/spanforge`.
- `STYLE-GUIDE.md`: current visual and content conventions.

The site uses local system fonts and has no external font dependency. Generated build output, installed dependencies, local caches, environment files, and Vercel project state are excluded by `.gitignore`. Source files use UTF-8 without a byte-order mark, as specified in `.editorconfig`.

## AI Model Price Watch

`/prices` compares a curated set of 23 current API models across 10 providers with provider filtering, model search, and sortable input/output rates. The homepage includes a pausable ticker with a reduced-motion scrolling fallback. Official pricing links remain available when data cannot be fetched.

Prices are fetched directly from the ten providers' official documents. `lib/pricing/official-sources.ts` lists the exact URLs; `official-parsers.ts` contains provider-specific adapters. No aggregation feed or inference API key is used. Edit API identifiers and labels in `config/featured-models.ts`; run `npm run verify:pricing` to fetch all official sources and require validated rates for all 23 selected models.

Each official document has a 15-second timeout and a 3 MB response limit. Fetches happen server-side; only the selected normalized rates reach browsers. Each provider has its own Next.js Data Cache entry with a one-hour revalidation interval. This uses supported `unstable_cache` without enabling Cache Components across the existing site. Both pages render at request time using `connection()`, so timestamps and stale states are evaluated per request. Successful provider snapshots persist independently; failed revalidation throws to retain the prior entry. A cold instance with no valid cache displays unavailable rates. The cache key hashes the selection, source URLs and adapter version; increment `adapterVersion` when changing parser semantics.

Each row links to its actual official source and shows that provider's successful fetch timestamp and freshness. The summary shows the oldest successful provider fetch, not a claim that every provider was checked at the same instant. Parsing requires known model identities, table columns, billing scopes and USD units; changed or ambiguous structures fail closed. Missing rates show N/A. Cache, batch, priority, regional and peak/off-peak prices are distinguished. Google's published scheduled prices switch at their UTC boundary; expired promotional snapshots are suppressed pending a fresh check. See [the selection review](docs/model-selection.md).

```sh
npm test
npm run verify:pricing
npm run typecheck
npm run build
```

Before production release, deploy a Vercel preview and smoke-test `/`, `/prices`, mobile scrolling, keyboard sorting/filtering, reduced motion and source failures. Confirm persistence and failed revalidation behavior in that deployment. No database or scheduler is required. Provider layouts can change; inspect adapter failures rather than substituting an unvalidated number. Published list rates cannot guarantee a final invoice, which follows provider terms and actual usage.

### Visitor refresh

The dashboard's **Refresh prices** button checks official providers independently and reports changed/unchanged data and partial failures. It fetches and validates before expiring only successful providers' tags with `updateTag`; failed providers retain their prior cache entries. A warm process coalesces concurrent checks, reuses successful checks for 60 seconds, and applies a five-minute failure cooldown per provider. This is lightweight throttling, not a globally strict rate limit across serverless instances.

Adapters read official Markdown tables, labeled pricing rows, regional HTML tables with rowspans, and Kimi's literal embedded pricing-table data. No fetched JavaScript is executed. Changes to an input format must include a parser regression test and a live `verify:pricing` run. Tests cover all ten adapters, cache-vs-base columns, context and region selection, effective dates, failures and concurrent refreshes.

Ticker hover/focus pausing applies to the moving viewport only, so focusing or hovering the Pause/Resume control does not prevent resuming. For browser regression tests, launch an isolated Chromium instance with remote debugging on port 9222, then run `node scripts/browser-pricing.mjs --full-refresh` against the local app. It checks movement, pause/resume, reduced motion, a fresh source check after cooldown, repeated refresh, and mobile overflow.

### Workload estimates and comparisons

The calculator applies published structured tiers to input tokens per request, billed output tokens per request, and requests per month. OpenAI, Haiku, Grok and MiniMax context thresholds apply to the full request rather than only the excess tokens. Default estimates use Standard processing and uncached text input. Batch is available only when validated (currently OpenAI, Anthropic, Google and xAI); other choices show **Not estimated**. DeepSeek peak/off-peak is an explicit workload scenario, not an inferred schedule. Alibaba supports the parsed Singapore/International, US/Virginia and EU/Frankfurt regional scopes where published; missing scopes are not substituted with Global pricing.

Kimi totals include separately published 5-minute or 1-hour cache writes for all uncached input. No cache-hit savings are assumed. Tools, taxes, retries, regional uplifts, subscriptions and other unmodeled charges are excluded. Reviewed context/output capacities are enforced where available; absent capacities are explicitly flagged for provider confirmation. Stale, expired, ambiguous and unsupported rates cannot enter monthly-cost ordering as numeric estimates.

Users can shortlist up to four models, sort by monthly estimate, share workload/filter/selection URLs, and export visible rows to CSV. Shared URLs load current source snapshots; they do not pin historical prices. CSV includes billing assumptions, estimates, excluded costs, timestamps and source hashes, with formula injection protection. Mobile uses cards instead of the wide desktop table.

The responsive view uses cards below 1200px, with two columns on tablets and one on phones. Mobile/tablet shortlists show aligned monthly costs in a compact summary, with expandable breakdowns instead of four full cards. Main touch controls have 44px activation areas; text form controls use 16px fonts. Sticky shortcuts move both scroll position and keyboard focus to results, the shortlist, or workload editing, respecting reduced motion.

Illustrative Short chat and Document summary presets set only input/output token counts and monthly requests. They preserve processing, region, period and Kimi TTL choices. Editing counts switches to Custom. Preset assumptions are explicit and editable; they are not measured usage or model recommendations. Phones use a preset dropdown to keep the calculator compact. Shared URLs continue to preserve the actual counts and billing choices.

Each source snapshot retains a bounded excerpt of the extracted official pricing rows plus a SHA-256 of the fetched document. Refresh reports actual input/output/cache-write and billing-scope changes against the previous successful check; changing source HTML/hash alone is not a price movement. This does not create a historical database or an indefinite audit archive.

Source failures emit structured `official_pricing_check_failed` server log events with the provider and retry delay; no document payload or secrets are logged. A selection older than 30 days emits `model_selection_review_due` and displays a review-due notice. Configure log-based alerts in the hosting dashboard if notifications are required. No external messaging integration is configured. Follow [the release checklist](docs/price-watch-release.md) before publishing.
