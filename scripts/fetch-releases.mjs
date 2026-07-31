import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { buildCatalog, sources } from './release-utils.mjs'

const target = fileURLToPath(new URL('../src/data/releases.json', import.meta.url))
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'crossgram-website-release-sync',
  'X-GitHub-Api-Version': '2022-11-28',
}
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const resolved = await Promise.all(sources.map(async source => {
  const response = await fetch(`https://api.github.com/repos/${source.repo}/releases?per_page=20`, { headers })
  if (!response.ok) throw new Error(`${source.repo}: GitHub API returned ${response.status} ${response.statusText}`)
  const releases = await response.json()
  return { source, release: releases.find(release => !release.draft && release.tag_name.startsWith(source.releasePrefix)) ?? null }
}))

const catalog = buildCatalog(resolved)
await writeFile(target, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Updated ${catalog.clients.length} client families in ${target}`)
