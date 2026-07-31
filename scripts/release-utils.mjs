const checksumPattern = /sha256|checksums?|\.sig$|\.cer$|\.json$|\.symbols\.|Test\.cer$/i
const brandNames = {
  cross: 'CrossGram',
  qq: 'QQ',
  wechat: '微信',
  wecom: '企业微信',
  dingtalk: '钉钉',
  discord: 'Discord',
}

export const sources = [
  {
    repo: 'crossgram-project/crossgram-desktop',
    releasePrefix: 'crossgram-',
    type: 'desktop-matrix',
    families: {
      tdesktop: ['Telegram Desktop', '经典、稳定的官方桌面体验'],
      'tdesktop-x64': ['TDesktop x64', '为 Windows 优化的桌面分支'],
      ayugram: ['AyuGram Desktop', '强调隐私与高级聊天能力'],
      materialgram: ['Materialgram', '更现代的 Material 桌面界面'],
    },
  },
  {
    repo: 'crossgram-project/crossgram-android',
    releasePrefix: 'crossgram-',
    type: 'android-matrix',
    families: {
      telegram: ['Telegram Android', '官方 Android 客户端体验'],
      nagram: ['Nagram', '功能丰富的 Android 分支'],
      nnngram: ['Nnngram', '轻快且高度可定制'],
      nullgram: ['Nullgram', '隐私与易用性兼顾'],
      mercurygram: ['Mercurygram', '现代 Android Telegram 分支'],
      forkgram: ['Forkgram', '简洁、实用的 Android 分支'],
    },
  },
  {
    repo: 'crossgram-project/crossgram-unigram',
    releasePrefix: 'crossgram-unigram-',
    type: 'single',
    client: ['unigram', 'Unigram', '为 Windows 设计的原生 TDLib 客户端'],
  },
  {
    repo: 'crossgram-project/crossgram-telegram-x',
    releasePrefix: 'crossgram-telegram-x-',
    type: 'single',
    client: ['telegram-x', 'Telegram X', '速度优先的 Android TDLib 客户端'],
  },
  {
    repo: 'crossgram-project/crossgram-mithka',
    releasePrefix: 'crossgram-mithka-',
    type: 'single',
    client: ['mithka', 'Mithka', '覆盖桌面与移动端的 Flutter 客户端'],
  },
]

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown size'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

export function assetPlatform(name) {
  if (/android|\.apk$/i.test(name)) return 'Android'
  if (/windows|\.exe$|\.msi|\.msix/i.test(name)) return 'Windows'
  if (/macos|darwin|\.dmg$/i.test(name)) return 'macOS'
  if (/linux|appimage|\.deb$|\.rpm$|\.tar\.xz$|\.tar\.gz$/i.test(name)) return 'Linux'
  if (/ios|xcframework/i.test(name)) return 'iOS'
  return 'Other'
}

export function assetArchitecture(name) {
  if (/universal/i.test(name)) return 'Universal'
  if (/arm64|aarch64/i.test(name)) return 'ARM64'
  if (/armeabi-v7a|armv7/i.test(name)) return 'ARMv7'
  if (/x86_64|amd64|x64/i.test(name)) return 'x64'
  if (/(^|[-_.])x86([-_.]|$)/i.test(name)) return 'x86'
  return 'Default'
}

function cleanAssets(assets) {
  return assets.filter(asset => !checksumPattern.test(asset.name)).map(asset => ({
    name: asset.name,
    platform: assetPlatform(asset.name),
    architecture: assetArchitecture(asset.name),
    size: formatBytes(asset.size),
    url: asset.browser_download_url,
  }))
}

function parseDesktop(source, release) {
  const clients = new Map()
  for (const [id, [name, description]] of Object.entries(source.families)) {
    clients.set(id, baseClient(id, name, description, source, release))
  }
  for (const asset of cleanAssets(release.assets ?? [])) {
    const family = [...clients.keys()].sort((a, b) => b.length - a.length).find(id => asset.name.includes(`-${id}-`))
    if (!family) continue
    const brand = Object.keys(brandNames).find(id => asset.name.includes(`-${id}-`)) ?? 'cross'
    clients.get(family).assets.push({ ...asset, brand, brandLabel: brandNames[brand] })
  }
  return [...clients.values()]
}

function parseAndroid(source, release) {
  const clients = new Map()
  for (const [id, [name, description]] of Object.entries(source.families)) {
    clients.set(id, baseClient(id, name, description, source, release))
  }
  for (const asset of cleanAssets(release.assets ?? [])) {
    const family = [...clients.keys()].find(id => asset.name.toLowerCase().startsWith(`${id}-`) || (id === 'telegram' && asset.name.toLowerCase().startsWith('telegram-release-')))
    if (!family) continue
    const brand = Object.keys(brandNames).find(id => asset.name.includes(`-${id}-`)) ?? 'cross'
    clients.get(family).assets.push({ ...asset, brand, brandLabel: brandNames[brand] })
  }
  return [...clients.values()]
}

function baseClient(id, name, description, source, release) {
  return { id, name, description, repo: source.repo, release: release.tag_name, assets: [] }
}

export function buildCatalog(resolvedSources, now = new Date()) {
  const clients = []
  for (const { source, release } of resolvedSources) {
    if (!release) {
      if (source.type === 'single') clients.push(baseClient(...source.client, source, { tag_name: null }))
      else for (const [id, values] of Object.entries(source.families)) clients.push(baseClient(id, ...values, source, { tag_name: null }))
      continue
    }
    if (source.type === 'desktop-matrix') clients.push(...parseDesktop(source, release))
    else if (source.type === 'android-matrix') clients.push(...parseAndroid(source, release))
    else clients.push({ ...baseClient(...source.client, source, release), assets: cleanAssets(release.assets ?? []).map(asset => ({ ...asset, brand: 'cross', brandLabel: 'CrossGram' })) })
  }
  return { updatedAt: now.toISOString(), clients }
}
