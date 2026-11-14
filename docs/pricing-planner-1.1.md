# Price Watch 1.1 — local implementation

**Feature status: DONE — implementation complete and accepted by the owner on 14 November 2026.**

Verification: 121 automated tests, ESLint, production build and desktop/mobile browser checks passed. Completion covers the agreed 1.1 scope, including comparisons, workload mixes, budget scenarios, capability filters, reports, snapshots, explicit sharing, TCO handoff and feedback reporting. Deployment of this version has not been verified in this session.

Price history, market price-change charts, expanded cache pricing and a price index remain separate future enhancements. Ongoing provider-price maintenance and broader capability reviews are operational follow-up, not unfinished 1.1 implementation.

Local entry point: `http://localhost:3000/prices`. This iteration was requested for localhost review; it does not publish or push the changes.

## Decision tools

Choose a current model as baseline. Monthly difference is baseline cost less candidate cost; a positive difference represents lower modeled token cost, not guaranteed savings or ROI. Annualization assumes twelve identical months. Percentages are unavailable against a zero-cost baseline.

A mixed workload supports one to eight named request groups. Each group has its own input/output size and monthly request count. Billing mode, region, period and required cache-write duration are shared across groups. Groups are priced individually before aggregation, so a long-request tier is not applied incorrectly to a single average. Zero-volume groups do not add cost or invalidate an otherwise supported active workload.

Low and high demand change request counts, rounded to whole requests, while preserving request sizes. Budget headroom uses expected demand. The request-capacity estimate assumes the same mix and does not imply throughput, capacity reservations or guaranteed billing. A zero modeled per-request cost does not produce an infinite capacity claim.

## Suitability facts

Existing reviewed context and output capacities are checked independently. Structured-output, text and image-input support was reviewed on 14 November 2026 for GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Luna, using their individual `https://developers.openai.com/api/docs/models/<model-id>` pages. The pages explicitly list Text input/output, Image input only and Structured outputs supported; they also corroborate a 1,050,000-token API context window and 128,000 maximum output tokens already represented in the pricing adapters. Codex subscription-specific limits are not substituted for direct API limits.

The review is in `config/model-capabilities.ts`, with model-specific source links and review dates. Unreviewed capabilities remain unknown. A verification requirement excludes unknown values, without claiming those models lack the capability. Filtering for image support does not add image billing to this text-token cost model. No quality, latency or benchmark ranking is inferred.

## Privacy and reproducibility

All workload calculations, CSV import, snapshot import/export and reporting operate in the browser. CSV accepts exactly `name,input_tokens,output_tokens,requests`, one to eight aggregate rows and at most 64 KB. It does not need prompts, provider credentials or raw customer documents.

Editing no longer rewrites the address bar. Copy comparison link includes public model choices by default. Including workloads, group names, budget and planner assumptions requires a checkbox and confirmation. Anyone opening such a full link can read the URL, and its parameters reach the host; this is stated before sharing. Old shared links remain readable. Current-rate links are not historical quotes.

Comparison snapshots use `price-watch-1.1`, a 1 MB limit, model/tier validation and HTTPS source links. They retain the public rate data, source timestamps, billing settings, workload groups, baseline, budget and selections. Imported snapshots are explicitly historical and are not independently verified just by importing. They are recomputed at their saved comparison timestamp rather than silently updated to current prices. Return to current prices restores the live catalog and retains assumptions. Provider source excerpts are omitted from downloaded snapshots.

Print/PDF output includes the selected shortlist and baseline, or the filtered models if no shortlist is selected, plus workload groups, budget/scenario settings, source references and exclusions. The report marks historical data and never promises savings or model suitability based on price alone.

## TCO handoff

Use Carry my workload into TCO for an estimated current model with positive monthly volume. Both tabs confirm the transfer. Browser `postMessage` is restricted by exact origin and window identity, with no financial data in the URL, browser storage or server payload. Temporary listeners expire and are removed. One request maps to one attempted workflow task; other TCO assumptions remain illustrative.

Mixed groups use rounded-up average token counts because the TCO input contract requires whole numbers. Effective token rates are adjusted to preserve the monthly modeled token bill, including required cache writes. The result is a labeled manual snapshot, not a fabricated universal provider rate. Applying a current model afterward intentionally replaces those effective rates.

## Verification

`tests/pricing-planner.test.ts` covers mixed tiers, unsupported groups, zeros, baseline direction, demand scenarios, budgets, unknown capabilities, shared freshness, CSV validation, snapshot validation and precise TCO token-bill preservation.

`node --experimental-strip-types scripts/pricing-planner-browser.mjs` checks the real local provider catalog and UI flows, snapshot round-trip, sharing defaults and consent, PDF, CSV errors, mobile overflow and the cross-tab handoff. It uses a dedicated Chrome debugging session on port 9223. Evidence is written to `docs/pricing-planner-browser-qa.json`; screenshots, test files and PDFs remain ignored in `.browser-qa/`.

Public reporting contact: `sriram@sriramadvisory.com`. Email links use a generic subject and do not insert financial assumptions or attach files.
