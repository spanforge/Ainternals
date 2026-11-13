# Price Watch release candidate

## Included

- Official-source pricing for 23 selected models from 10 providers.
- Per-request and monthly uncached text-token estimates, with whole-request context-tier selection.
- Standard/validated Batch, Alibaba deployment scope, explicit DeepSeek peak/off-peak scenarios, and Kimi cache-write TTL options.
- A four-model shortlist, shareable workload/filter URLs, CSV download, and responsive mobile cards.
- Explicit example workload presets, sticky focus-aware section shortcuts, 44px touch targets, tablet cards and compact mobile/tablet shortlist summaries.
- Actual before/after changes on refresh, source excerpts and document hashes, provider freshness and fail-closed estimates.
- Structured provider-failure logs and a 30-day model-selection review-due signal.

## Local verification

Use Node 24. Run:

```sh
npm test
npm run typecheck
npm run verify:pricing
npm run build
npm start -- --port 3000
node scripts/smoke-pricing.mjs
```

Run `node scripts/browser-pricing.mjs --full-refresh` against an isolated Chromium instance on debugging port 9222. It checks ticker controls, provider filters, long-context calculation, a four-model selection limit, share-link restoration, downloaded CSV content, invalid inputs, unsupported Batch behavior, full refresh, and mobile cards/overflow. On Windows use `npm.cmd` when PowerShell script execution is restricted.

## Before production

1. Deploy this source to the existing Vercel project's preview environment. No new database, secret or scheduled job is needed. This workspace has no linked Vercel project, so a preview deployment is not part of the local verification.
2. Confirm all ten sources succeed from the preview's runtime region. Public documentation sites can behave differently by deployment environment. Check per-provider timestamps, source hashes, one-hour cache reuse and refresh after the 60-second cooldown.
3. Check Standard/Batch and boundary requests: 100K/100K+1 (Haiku), 199,999/200K (Grok), 272K/272K+1 (OpenAI), and 512K/512K+1 (MiniMax). Check Kimi write charges and Alibaba region availability.
4. Confirm request counts, share URLs and CSV agree with the displayed totals. Verify keyboard interaction, focus indicators, reduced motion and mobile cards. Shared URLs intentionally display current pricing, not a saved price history.
5. Inspect `official_pricing_check_failed` logs and configure a hosting log alert if notification is wanted. Review official model catalogs monthly and after major releases; update `selectionReviewedOn` only after that review.
6. Promote the verified preview using the existing production deployment process.

## Deliberate limits

The calculator estimates the published token charges represented by its selected scope. It does not predict a final invoice or model quality. It excludes taxes, paid tools, retries, cache-hit savings, regional uplifts and subscriptions. It includes Kimi's selected cache-write charges. DeepSeek off-peak eligibility depends on the provider's calendar; users select the scenario explicitly. Unsupported billing options produce no estimate.

Context and output limits are enforced where reviewed metadata is available. For other models, confirm request capacity with the provider. Evidence is retained with the cached current snapshot; it is not an immutable historical archive. Notifications require hosting alert configuration. The application does not send email or other external messages.
