/**
 * Pure logic behind the download page. No React, no imports: everything here can be
 * exercised by `model.test.ts` and reused by the Playwright spec to derive expectations.
 */

export interface ReleaseAsset {
  name: string
  platform: string
  architecture: string
  brand: string
  brandLabel: string
  size: string
  url: string
}

export interface ReleaseClient {
  id: string
  name: string
  description: string
  repo: string
  release: string | null
  assets: ReleaseAsset[]
}

export interface ReleaseCatalog {
  updatedAt: string
  clients: ReleaseClient[]
}

export type Platform = 'Desktop' | 'Android' | 'iOS'

export interface BrandOption {
  id: string
  label: string
}

/** Tab order is fixed so the picker never reshuffles between data refreshes. */
const PLATFORM_ORDER: readonly Platform[] = ['Desktop', 'Android', 'iOS']

/** Asset platform order used inside one client's picker. */
const OS_ORDER: readonly string[] = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Other']

const DESKTOP_PLATFORMS = new Set(['Windows', 'macOS', 'Linux', 'Other'])

/**
 * Clients that ship no assets yet still need a tab. These ids are Android-only upstream;
 * everything else is treated as a desktop client.
 */
const ANDROID_CLIENT_IDS = new Set([
  'telegram',
  'nagram',
  'nnngram',
  'nullgram',
  'mercurygram',
  'forkgram',
  'telegram-x',
])

const OS_LABELS: Record<string, string> = { Other: '其他' }

const ARCHITECTURE_LABELS: Record<string, string> = { Default: '默认', Universal: '通用' }

/** Recommendation priority, mirroring the release generator's architecture classification. */
const ARCHITECTURE_PRIORITY = ['Universal', 'ARM64', 'x64', 'ARMv7', 'Default']

/** Known installer formats, longest suffix first so `.tar.xz` wins over a bare `.xz`. */
const ASSET_FORMATS = [
  '.tar.xz',
  '.tar.gz',
  '.tar.bz2',
  '.appimage',
  '.msixbundle',
  '.apk',
  '.ipa',
  '.upd',
  '.zip',
  '.exe',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
]

export function osLabel(platform: string): string {
  return OS_LABELS[platform] ?? platform
}

export function architectureLabel(architecture: string): string {
  return ARCHITECTURE_LABELS[architecture] ?? architecture
}

export function isReleased(client: ReleaseClient): boolean {
  return client.assets.length > 0
}

/** Product-level platform tabs a client belongs to (a client can belong to several). */
export function categoriesOf(client: ReleaseClient): Platform[] {
  const platforms = new Set(client.assets.map((asset) => asset.platform))
  const categories: Platform[] = []
  if ([...platforms].some((platform) => DESKTOP_PLATFORMS.has(platform))) categories.push('Desktop')
  if (platforms.has('Android')) categories.push('Android')
  if (platforms.has('iOS')) categories.push('iOS')
  if (categories.length) return categories
  return [ANDROID_CLIENT_IDS.has(client.id) ? 'Android' : 'Desktop']
}

/** Platforms that have at least one client, in tab order. */
export function platformsOf(clients: ReleaseClient[]): Platform[] {
  const present = new Set<Platform>()
  for (const client of clients) {
    for (const category of categoriesOf(client)) present.add(category)
  }
  return PLATFORM_ORDER.filter((platform) => present.has(platform))
}

export function clientsForPlatform(clients: ReleaseClient[], platform: Platform): ReleaseClient[] {
  return clients.filter((client) => categoriesOf(client).includes(platform))
}

/** First platform that actually has something downloadable, so the page never opens empty. */
export function defaultPlatform(clients: ReleaseClient[]): Platform | null {
  const platforms = platformsOf(clients)
  return platforms.find((platform) => clientsForPlatform(clients, platform).some(isReleased)) ?? platforms[0] ?? null
}

/**
 * Keep the current choice while it is still available, otherwise fall back to the first
 * option. Used for the platform tabs, the OS chips and the brand chips.
 */
export function pickPlatform<T extends string>(options: readonly T[], current: string | null): T | null {
  if (current) {
    const match = options.find((option) => option === current)
    if (match) return match
  }
  return options[0] ?? null
}

/** Asset platforms of one client, in a stable order. */
export function clientPlatforms(client: ReleaseClient): string[] {
  const present = new Set(client.assets.map((asset) => asset.platform))
  return OS_ORDER.filter((platform) => present.has(platform))
}

/** Brands available for the given assets; the neutral CrossGram brand is listed first. */
export function brandOptions(assets: ReleaseAsset[]): BrandOption[] {
  const labels = new Map<string, string>()
  for (const asset of assets) {
    if (!labels.has(asset.brand)) labels.set(asset.brand, asset.brandLabel)
  }
  const options = [...labels.entries()].map(([id, label]) => ({ id, label }))
  const neutral = options.findIndex((option) => option.id === 'cross')
  if (neutral > 0) options.unshift(...options.splice(neutral, 1))
  return options
}

/** Default to CrossGram when it exists, otherwise the first brand offered. */
export function pickBrand(brands: BrandOption[], current: string | null): string | null {
  if (current) {
    const match = brands.find((brand) => brand.id === current)
    if (match) return match.id
  }
  return brands.find((brand) => brand.id === 'cross')?.id ?? brands[0]?.id ?? null
}

/** Assets of one OS, optionally narrowed to one brand. */
export function filterAssets(assets: ReleaseAsset[], platform: string, brand?: string): ReleaseAsset[] {
  return assets.filter(
    (asset) => asset.platform === platform && (brand === undefined || asset.brand === brand),
  )
}

/** Best build for most people: an installable package first, then the widest architecture. */
export function recommendAsset(candidates: ReleaseAsset[]): ReleaseAsset | null {
  return candidates.reduce<ReleaseAsset | null>(
    (best, asset) => (best === null || recommendationRank(asset) < recommendationRank(best) ? asset : best),
    null,
  )
}

/**
 * Lower is better. Update payloads (`.upd`) rank behind every installable build, so a
 * Telegram Desktop release never points people at the updater package instead of the zip.
 * Ties keep the release's own asset order.
 */
function recommendationRank(asset: ReleaseAsset): number {
  const updatePenalty = isUpdatePackage(asset) ? ARCHITECTURE_PRIORITY.length + 1 : 0
  const architecture = ARCHITECTURE_PRIORITY.indexOf(asset.architecture)
  return updatePenalty + (architecture === -1 ? ARCHITECTURE_PRIORITY.length : architecture)
}

/** File extension as shown to users, e.g. `.zip`, `.tar.xz`, `.apk`. */
export function assetFormat(name: string): string {
  const lower = name.toLowerCase()
  const known = ASSET_FORMATS.find((format) => lower.endsWith(format))
  if (known) return known
  const dot = lower.lastIndexOf('.')
  return dot === -1 ? '' : lower.slice(dot)
}

/** Telegram Desktop publishes updater payloads next to the real installers. */
export function isUpdatePackage(asset: ReleaseAsset): boolean {
  return assetFormat(asset.name) === '.upd'
}

/** `2026-11-03T23:22:26.580Z` → `2026-11-03 23:22 UTC`. */
export function formatUpdatedAt(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  return `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

const OS_SLUGS: Record<string, string> = {
  Windows: 'win',
  macOS: 'macos',
  Linux: 'linux',
  Android: 'android',
  iOS: 'ios',
  Other: 'other',
}

const ARCHITECTURE_SLUGS: Record<string, string> = {
  Default: 'any',
  Universal: 'universal',
  ARM64: 'arm64',
  ARMv7: 'armv7',
  x64: 'x64',
  x86: 'x86',
}

/** `Windows` → `win`, `macOS` → `macos`. */
export function osSlug(platform: string): string {
  return OS_SLUGS[platform] ?? platform.toLowerCase()
}

/** `Default` → `any`, `ARM64` → `arm64`. */
export function architectureSlug(architecture: string): string {
  return ARCHITECTURE_SLUGS[architecture] ?? architecture.toLowerCase()
}

/** Compact target token for the stat grid, e.g. `win-x64`, `android-arm64`. */
export function assetTarget(asset: ReleaseAsset): string {
  return `${osSlug(asset.platform)}-${architectureSlug(asset.architecture)}`
}

/** Number of downloadable builds one client publishes. */
export function clientBuildCount(client: ReleaseClient): number {
  return client.assets.length
}

/** Number of downloadable builds behind one platform tab. */
export function buildsForPlatform(clients: ReleaseClient[], platform: Platform): number {
  return clientsForPlatform(clients, platform).reduce(
    (total, client) => total + clientBuildCount(client),
    0,
  )
}

export function releasesUrl(client: ReleaseClient): string {
  return `https://github.com/${client.repo}/releases`
}

export function repoUrl(client: ReleaseClient): string {
  return `https://github.com/${client.repo}`
}
