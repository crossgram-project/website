# CrossGram Website

The product website, deployment handbook, feature matrix, and categorized
client downloads for CrossGram.

## Development

```bash
npm ci
npm run dev
```

## Verification

```bash
npm test
npm run build
npm run test:e2e:install
npm run test:e2e
```

`npm run sync:releases` reads the latest releases from repositories in the
`crossgram-project` organization and regenerates the download catalog. The
website groups the large asset sets by client, operating system, brand, and
architecture instead of rendering every asset at once.
CrossGram product website, deployment handbook, and client downloads
