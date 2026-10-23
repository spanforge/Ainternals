# AInternals implementation plan

## Goal
Replace the existing SpanForge utility website with the supplied AInternals positioning: Engineer · Deploy · Operate. Preserve the complete narrative and all five numbered sections without inventing shipped products, customers, or metrics.

## Implementation
1. Read the installed Next.js guides for layouts, pages, metadata, and navigation before implementation.
2. Build a responsive, editorial single-page site with warm neutral backgrounds, ink typography, orange accents, numbered sections, and an original CSS/SVG engineering illustration.
3. Replace navigation and footer with AInternals branding and section anchors. Provide a keyboard-accessible mobile menu, skip link, visible focus states, and reduced-motion support.
4. Implement the supplied hero, purpose, six focus areas, two building directions, five principles, and contact section. Confirm the destination for the contact action.
5. Replace outdated metadata. Redirect legacy /about and /spanforge URLs to relevant new sections so previous claims are no longer served.
6. Update repository design and project documentation to reflect the new site.
7. Run TypeScript and production build checks. Check responsive layout and interaction behavior where preview tooling is available; document any verification limits.

## Scope
Use the existing Next.js checkout and hosting setup. No new hosted project or deployment is required for this repository rebuild. No backend contact form or unrequested product features.

## Acceptance criteria
- All supplied content appears in a cohesive responsive site.
- Navigation reaches every numbered section; contact uses the confirmed address.
- Previous utility counts and SpanForge marketing claims are removed from active routes and metadata.
- Layout remains readable on narrow screens, controls work with keyboard input, and decorative visuals are hidden from assistive technology.
- Build and type checks pass, or concrete environmental blockers are recorded.

## Implementation status
- Implemented all supplied content, responsive editorial styling, the engineering diagram, navigation, footer, metadata, and legacy redirects.
- Contact confirmed as `sriram@sriramadvisory.com`.
- Installed dependencies and read local Next.js 16.2.2 guides before implementation.
- TypeScript check passed. Production build and HTTP verification recorded below after final checks.
- Browser automation/visual preview tooling is unavailable in this session; visual viewport and keyboard interaction checks remain a manual verification limitation.
- Final production build passed with Next.js 16.2.2, including its TypeScript validation.
- Production HTTP checks passed: homepage 200; five section IDs; six focus areas; confirmed mailto link; UTF-8 copy; /about â†’ /#why and /spanforge â†’ /#building return 307.
- Removed the starter favicon and added an AInternals SVG icon. Preserved existing Vercel Analytics and hosting configuration.
- No deployment performed; this deliverable is the updated local repository.
