# AInternals

A responsive Next.js 16 / React 19 website introducing AInternals: engineering, deploying, and operating enterprise Agentic AI.

## Development

Run `npm ci`, then `npm run dev`. Open http://localhost:3000.

## Validation

Run `npx tsc --noEmit` and `npm run build`.

## Structure

- `app/page.tsx`: supplied narrative and five numbered sections.
- `app/page.module.css`: responsive page composition and engineering diagram.
- `app/globals.css`: design tokens, reset, buttons, accessibility utilities.
- `components/Nav.tsx`: section navigation and mobile disclosure menu.
- `components/Footer.tsx`: brand statement and copyright.
- `app/layout.tsx`: shared shell, metadata, existing Vercel Analytics.
- `/about` and `/spanforge`: redirects to the new narrative.

Contact links open `sriram@sriramadvisory.com` in the visitor’s email app. No contact backend or external font service is required. See `implementationplan.md` for scope and acceptance criteria.
