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
