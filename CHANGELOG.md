# Changelog

## 0.4.0 — 2026-11-14

- Integrated the existing Price Watch provider loader and billing-tier matcher with TCO model selection.
- Added standard/batch, relevant region/period/cache options, source timestamps and rate provenance. Token changes re-evaluate tiers locally; stale, missing, ambiguous, expired or over-capacity pricing pauses linked results and export.
- Linked provider rates require an explicit single-request assumption and USD; no currency conversion or silent relabeling occurs.
- Included mandatory Moonshot cache-write charges in the labeled effective input rate. Other API/tool assumptions are retained separately.
- Added model/billing-only handoff links from Price Watch. Scenario inputs and results are never sent to the catalog endpoint or providers.
- Scenario JSON retains the selected rate snapshot and reference. Imports preserve historical assumptions in manual mode instead of overwriting them with current prices.
- Existing financial formulas and 33-field defaults remain unchanged.

## 0.3.0 — 2026-11-14

- Added the owner's email as a public reporting route on the calculator, User Guide and documentation pages. Email links contain a generic subject and no scenario data.

- Added a searchable, printable User Guide covering all 33 fields with definitions, rationale, entry guidance, sources, examples, effects, common mistakes and zero/off guidance.
- Reused the same field content in expandable calculator help; guide links open separately to preserve the current scenario.
- Grouped token-price change and pricing reference with model pricing; separated the three human-only assumptions.
- Added plain-language result interpretation and clearer present-value labels.
- Replaced technical field names in displayed errors with user-facing labels and removed dollar-specific token-price hints.
- Retained the existing financial model, defaults and scenario compatibility.

## 0.2.0 — 2026-11-14

- Refined the planning period into an aligned “3 years” display.
- Replaced spreadsheet-specific instructions with guidance for the online calculator.
- Removed public formulas, calculation disclosures, cell/row references, source-repository links and internal release-gate copy.
- Reworked the annual view as an outcomes-only breakdown and cleaned up printed reports and documentation pages.
- Separated public presentation content from the original workbook extraction; source-formula text is no longer imported by public pages or components.
- Financial calculations, defaults and internal parity verification are unchanged.

## 0.1.0 — 2026-11-14

- Added the free AI TCO calculator at `/tools/ai-tco-calculator`.
- Preserved Workbook V1.0 financial calculations, 33 input defaults and validations.
- Added dashboard, all 33 annual model rows, eight-category annual chart, ten-line Year 1 cost mix and source guidance.
- Added browser-local JSON import/export, print reports, formula disclosures and separate app/model versions.
- Scoped existing analytics to marketing routes and added calculator security headers.
- Added independent source-formula parity tests and a 174-formula traceability matrix.

Local development preview. Public release requires browser accessibility/privacy review and reviewer sign-off. No financial model changes.
