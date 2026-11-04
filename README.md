# CrossGram Website

The product website, deployment handbook, and client downloads for CrossGram.
A small static React app: Vite + React 19 + TypeScript + React Router, deployed to
GitHub Pages.

## Development

```bash
npm ci
npm run dev          # http://127.0.0.1:5173
```

## Verification

```bash
npm test             # vitest unit + component tests
npm run build        # tsc --noEmit, vite build, GitHub Pages 404 fallback
npm run test:e2e:install
npm run test:e2e     # playwright: desktop, desktop-dark, mobile
```

## Pages

| Route            | Source                            |
| ---------------- | --------------------------------- |
| `/`              | `src/pages/Home.tsx`              |
| `/downloads`     | `src/pages/Downloads.tsx`         |
| `/docs`          | `src/pages/docs/DocsIndex.tsx`    |
| `/docs/linux`    | `src/pages/docs/DocsLinux.tsx`    |
| `/docs/windows`  | `src/pages/docs/DocsWindows.tsx`  |

Shared chrome (`src/app/`), design tokens (`src/styles/tokens.css`) and base
typography/utilities (`src/styles/base.css`) are the only styling layer; every page adds
its own small CSS file. The site has no design-token toggle: it follows the operating
system colour scheme through `prefers-color-scheme`.

## Download catalog

`npm run sync:releases` reads the latest releases from repositories in the
`crossgram-project` organization and regenerates `src/data/releases.json`. CI runs it
every six hours and commits the refreshed file. The downloads page groups the large asset
sets by client, operating system, brand, and architecture instead of rendering every
asset at once.

## Deployment

`.github/workflows/website.yml` builds `dist/`, uploads it as the Pages artifact, and
deploys it on every push to `main`. `scripts/pages-fallback.mjs` copies `dist/index.html`
to `dist/404.html` so deep links such as `/docs/linux` boot the client-side router.
