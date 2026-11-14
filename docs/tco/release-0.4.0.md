# AI TCO calculator 0.4.0 — initial feedback release

Owner authorization: on 14 November 2026, the owner requested public release to collect user feedback and guide improvements. The earlier instructions explicitly deferred independent calculation-review sign-off, expanded accessibility/cross-browser review and production-environment verification. These are deferred checks, not passing independent reviews.

## Included

- All 33 financial-model inputs and the original three-year calculation behavior.
- Outcomes-only dashboard, annual breakdowns, cost charts and optional comparable human-only baseline.
- Searchable, printable explanations for all 33 inputs, shared with inline field help.
- Existing Price Watch integration: model/billing choices, matching USD token rates, request-tier rechecks, source provenance and strict freshness/capacity safeguards.
- Manual pricing, local scenario JSON import/export and printable result reports.
- Public issue-reporting email: `sriram@sriramadvisory.com`; no scenario data is automatically included in reports.
- Browser-local financial assumptions; no calculator analytics, session replay or server-side scenario persistence.

## Verification retained

- Full repository regression suite: 110 tests.
- All 174 workbook outputs compared across 58 scenarios: 10,092 assertions, zero unexplained differences.
- Next.js production build and TypeScript checks.
- Repository ESLint check, including navigation and React lifecycle corrections made during release preparation.
- Live provider verifier: 23 models validated from all 10 official provider sources.
- Chrome desktop/mobile flows, 33-field documentation coverage, guide search, JSON round-trip, printing and privacy smoke checks.
- Real-data pricing integration checks, including context-tier changes, USD safeguards, exact applied rates, incompatible-request blocking and manual detach.

## Delivery

Target: existing Vercel project `ainternals`, production domain `https://ainternals.com`, source repository `spanforge/Ainternals`, branch `main`.

Public paths:

- `/tools/ai-tco-calculator`
- `/tools/ai-tco-calculator/user-guide`
- `/tools/ai-tco-calculator/methodology`
- `/tools/ai-tco-calculator/privacy`

No database, new secret, paid service, account requirement or billing integration is introduced. Original ignored source documents, browser profiles, local logs and build outputs are excluded from the release commit.

Production delivery is confirmed only after the Vercel deployment succeeds and the public calculator and guide respond successfully. The authorization above does not itself claim that deployment has occurred.
