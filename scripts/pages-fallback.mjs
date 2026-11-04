import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// GitHub Pages serves 404.html for unknown paths. Copying the SPA shell there
// lets deep links such as /docs/linux boot the client-side router instead of
// showing the Pages error page.
const dist = fileURLToPath(new URL('../dist/', import.meta.url))

await copyFile(`${dist}index.html`, `${dist}404.html`)
console.log('Copied dist/index.html to dist/404.html for client-side routes')
