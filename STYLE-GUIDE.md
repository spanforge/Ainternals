# AInternals design guide

- AI economics is the current focus. Use the supplied early-stage startup copy; avoid claims of established research, advisory services, or released products.
- Use the supplied logo at `public/ainternals-growth-monogram.png` without alteration. `app/icon.png` is the browser icon.
- Navy background #040b2b, section wash #091334, text #f4f7ff, muted text #b3bfd7, cyan accent #37d9ed, rules #233050.
- Georgia serif headings with italic cyan emphasis in the hero; Segoe UI/system sans-serif body text. Use readable 12px labels, thin rules, and restrained editorial spacing.
- Frame the supplied artwork to show its monogram using CSS, preserving the original file. Blend it into the navy background; use 280px on desktop and 112px on mobile. Present the five areas of interest as a numbered list.
- CSS Modules for component layout; shared tokens and accessibility utilities in global CSS.
- Responsive single-column layouts below 760px; navigation stays compact without a menu toggle.
- Preserve semantic headings, skip navigation, visible keyboard focus, and reduced-motion support.
