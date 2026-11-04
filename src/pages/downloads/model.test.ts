import { describe, expect, it } from 'vitest'
import catalog from '../../data/releases.json'
import {
  architectureLabel,
  architectureSlug,
  assetFormat,
  assetTarget,
  brandOptions,
  buildsForPlatform,
  categoriesOf,
  clientBuildCount,
  clientPlatforms,
  clientsForPlatform,
  defaultPlatform,
  filterAssets,
  formatUpdatedAt,
  isReleased,
  isUpdatePackage,
  osLabel,
  osSlug,
  pickBrand,
  pickPlatform,
  platformsOf,
  recommendAsset,
  releasesUrl,
  repoUrl,
} from './model'
import type { ReleaseAsset, ReleaseCatalog, ReleaseClient } from './model'

const releaseCatalog = catalog as ReleaseCatalog

function makeAsset(name: string, platform: string, architecture: string, brand = 'cross'): ReleaseAsset {
  return {
    name,
    platform,
    architecture,
    brand,
    brandLabel: brand === 'cross' ? 'CrossGram' : brand,
    size: '10 MB',
    url: `https://github.com/example/repo/releases/download/v1/${name}`,
  }
}

function makeClient(overrides: Partial<ReleaseClient> & { id: string }): ReleaseClient {
  return {
    name: overrides.id,
    description: `${overrides.id} description`,
    repo: `example/${overrides.id}`,
    release: null,
    assets: [],
    ...overrides,
  }
}

describe('platform grouping', () => {
  it('classifies every desktop asset platform as the Desktop tab', () => {
    const client = makeClient({
      id: 'desk',
      assets: [
        makeAsset('desk-windows.zip', 'Windows', 'x64'),
        makeAsset('desk-macos.zip', 'macOS', 'Universal'),
        makeAsset('desk-linux.tar.gz', 'Linux', 'x64'),
        makeAsset('desk-other.zip', 'Other', 'x64'),
      ],
    })

    expect(categoriesOf(client)).toEqual(['Desktop'])
  })

  it('keeps Android and iOS apart from Desktop', () => {
    const android = makeClient({ id: 'droid', assets: [makeAsset('app.apk', 'Android', 'ARM64')] })
    const ios = makeClient({ id: 'ios', assets: [makeAsset('app.ipa', 'iOS', 'ARM64')] })

    expect(categoriesOf(android)).toEqual(['Android'])
    expect(categoriesOf(ios)).toEqual(['iOS'])
  })

  it('lists a cross-platform client on every tab it ships for', () => {
    const client = makeClient({
      id: 'both',
      assets: [makeAsset('both.exe', 'Windows', 'x64'), makeAsset('both.apk', 'Android', 'ARM64')],
    })

    expect(categoriesOf(client)).toEqual(['Desktop', 'Android'])
  })

  it('falls back on the client id when nothing is released yet', () => {
    expect(categoriesOf(makeClient({ id: 'nagram' }))).toEqual(['Android'])
    expect(categoriesOf(makeClient({ id: 'some-desktop' }))).toEqual(['Desktop'])
  })

  it('returns only the platforms that exist, in tab order', () => {
    const clients = [
      makeClient({ id: 'ios', assets: [makeAsset('a.ipa', 'iOS', 'ARM64')] }),
      makeClient({ id: 'droid', assets: [makeAsset('a.apk', 'Android', 'ARM64')] }),
      makeClient({ id: 'desk', assets: [makeAsset('a.exe', 'Windows', 'x64')] }),
    ]

    expect(platformsOf(clients)).toEqual(['Desktop', 'Android', 'iOS'])
    expect(platformsOf([clients[1]!])).toEqual(['Android'])
    expect(platformsOf([])).toEqual([])
  })

  it('filters the client list per platform', () => {
    const clients = [
      makeClient({ id: 'desk', assets: [makeAsset('a.exe', 'Windows', 'x64')] }),
      makeClient({ id: 'droid', assets: [makeAsset('a.apk', 'Android', 'ARM64')] }),
      makeClient({ id: 'forkgram', name: 'Forkgram 未发布', release: 'crossgram-1' }),
    ]

    expect(clientsForPlatform(clients, 'Desktop').map((client) => client.id)).toEqual(['desk'])
    expect(clientsForPlatform(clients, 'Android').map((client) => client.id)).toEqual([
      'droid',
      'forkgram',
    ])
    expect(clientsForPlatform(clients, 'iOS')).toEqual([])
  })

  it('opens on the first platform that has a downloadable client', () => {
    const clients = [
      makeClient({ id: 'desk-empty' }),
      makeClient({ id: 'droid', assets: [makeAsset('a.apk', 'Android', 'ARM64')] }),
    ]

    expect(defaultPlatform(clients)).toBe('Android')
    expect(defaultPlatform([])).toBeNull()
  })

  it('keeps a valid platform choice and resets a stale one', () => {
    expect(pickPlatform(['Desktop', 'Android'], 'Android')).toBe('Android')
    expect(pickPlatform(['Desktop', 'Android'], 'iOS')).toBe('Desktop')
    expect(pickPlatform(['Desktop', 'Android'], null)).toBe('Desktop')
    expect(pickPlatform([], 'Desktop')).toBeNull()
  })
})

describe('client assets', () => {
  const client = makeClient({
    id: 'mithka',
    release: 'crossgram-mithka-v0.1.0',
    assets: [
      makeAsset('m.apk', 'Android', 'ARM64'),
      makeAsset('m-linux.tar.gz', 'Linux', 'x64'),
      makeAsset('m-macos.zip', 'macOS', 'Universal'),
      makeAsset('m-windows.zip', 'Windows', 'x64'),
    ],
  })

  it('orders the OS choices consistently', () => {
    expect(clientPlatforms(client)).toEqual(['Windows', 'macOS', 'Linux', 'Android'])
    expect(clientPlatforms(makeClient({ id: 'none' }))).toEqual([])
  })

  it('reports whether a client has anything to download', () => {
    expect(isReleased(client)).toBe(true)
    expect(isReleased(makeClient({ id: 'none', release: 'crossgram-9' }))).toBe(false)
  })

  it('builds github links for the release page and the repo', () => {
    expect(releasesUrl(client)).toBe('https://github.com/example/mithka/releases')
    expect(repoUrl(client)).toBe('https://github.com/example/mithka')
  })
})

describe('brand filtering', () => {
  const androidBrands = [
    makeAsset('t-qq.apk', 'Android', 'ARM64', 'qq'),
    makeAsset('t-wechat.apk', 'Android', 'ARM64', 'wechat'),
    makeAsset('t-qq-x64.apk', 'Android', 'x64', 'qq'),
  ]

  it('lists each brand once, in order of appearance', () => {
    expect(brandOptions(androidBrands)).toEqual([
      { id: 'qq', label: 'qq' },
      { id: 'wechat', label: 'wechat' },
    ])
    expect(brandOptions([])).toEqual([])
  })

  it('hoists the neutral CrossGram brand to the front', () => {
    const brands = brandOptions([
      makeAsset('t-qq.apk', 'Android', 'ARM64', 'qq'),
      makeAsset('t-cross.apk', 'Android', 'ARM64'),
    ])

    expect(brands.map((brand) => brand.id)).toEqual(['cross', 'qq'])
  })

  it('defaults to CrossGram, otherwise to the first brand', () => {
    expect(pickBrand(brandOptions(androidBrands), null)).toBe('qq')
    expect(pickBrand(brandOptions([makeAsset('t-cross.apk', 'Android', 'ARM64')]), null)).toBe('cross')
    expect(pickBrand([], null)).toBeNull()
  })

  it('keeps a valid brand choice and resets a stale one', () => {
    const brands = brandOptions(androidBrands)

    expect(pickBrand(brands, 'wechat')).toBe('wechat')
    expect(pickBrand(brands, 'dingtalk')).toBe('qq')
  })

  it('filters candidates by OS and brand', () => {
    expect(filterAssets(androidBrands, 'Android', 'qq').map((asset) => asset.name)).toEqual([
      't-qq.apk',
      't-qq-x64.apk',
    ])
    expect(filterAssets(androidBrands, 'Android', 'cross')).toEqual([])
    expect(filterAssets(androidBrands, 'iOS', 'qq')).toEqual([])
  })

  it('keeps every brand when no brand is required', () => {
    expect(filterAssets(androidBrands, 'Android').map((asset) => asset.name)).toEqual([
      't-qq.apk',
      't-wechat.apk',
      't-qq-x64.apk',
    ])
  })
})

describe('recommendation priority', () => {
  it('prefers Universal over everything else', () => {
    const candidates = [
      makeAsset('x64.zip', 'macOS', 'x64'),
      makeAsset('arm64.zip', 'macOS', 'ARM64'),
      makeAsset('universal.zip', 'macOS', 'Universal'),
    ]

    expect(recommendAsset(candidates)?.name).toBe('universal.zip')
  })

  it('falls back to ARM64, then x64, then ARMv7 and Default', () => {
    expect(
      recommendAsset([makeAsset('x64.zip', 'Linux', 'x64'), makeAsset('arm64.zip', 'Linux', 'ARM64')])?.name,
    ).toBe('arm64.zip')
    expect(
      recommendAsset([makeAsset('default.zip', 'Linux', 'Default'), makeAsset('x64.zip', 'Linux', 'x64')])?.name,
    ).toBe('x64.zip')
    expect(
      recommendAsset([makeAsset('default.zip', 'Linux', 'Default'), makeAsset('v7.apk', 'Android', 'ARMv7')])
        ?.name,
    ).toBe('v7.apk')
    expect(recommendAsset([makeAsset('v7.apk', 'Android', 'ARMv7')])?.name).toBe('v7.apk')
  })

  it('never recommends an update package while an installable build exists', () => {
    const upd = makeAsset('crossgram-tdesktop-runtime-windows-100000277.upd', 'Windows', 'Default')
    const zip = makeAsset('crossgram-tdesktop-runtime-windows-v7.3.1.zip', 'Windows', 'Default')

    expect(recommendAsset([upd, zip])?.name).toBe(zip.name)
    expect(recommendAsset([zip, upd])?.name).toBe(zip.name)
    // Even a Universal update payload loses against a plain x64 installer.
    expect(
      recommendAsset([
        makeAsset('crossgram-runtime-macos-universal.upd', 'macOS', 'Universal'),
        makeAsset('crossgram-macos-x64.zip', 'macOS', 'x64'),
      ])?.name,
    ).toBe('crossgram-macos-x64.zip')
  })

  it('recommends an update package only when it is the sole candidate', () => {
    const only = makeAsset('crossgram-tdesktop-runtime-linux-100000277.upd', 'Linux', 'Default')

    expect(recommendAsset([only])?.name).toBe(only.name)
  })

  it('returns null when there is nothing to recommend', () => {
    expect(recommendAsset([])).toBeNull()
  })
})

describe('asset formats', () => {
  it('reads the installer format from the file name', () => {
    expect(assetFormat('crossgram-tdesktop-runtime-windows-v7.3.1.zip')).toBe('.zip')
    expect(assetFormat('crossgram-tdesktop-runtime-linux-v7.3.1.tar.xz')).toBe('.tar.xz')
    expect(assetFormat('crossgram-mithka-0.1.6-linux-x64.tar.gz')).toBe('.tar.gz')
    expect(assetFormat('telegram-release-11.4.2-5469-arm64-qq-app.apk')).toBe('.apk')
    expect(assetFormat('Crossgram-Unigram-x64.msixbundle')).toBe('.msixbundle')
    expect(assetFormat('crossgram-tdesktop-runtime-windows-100000277.upd')).toBe('.upd')
  })

  it('falls back to the last extension, and to nothing for bare names', () => {
    expect(assetFormat('crossgram-installer.pkg')).toBe('.pkg')
    expect(assetFormat('crossgram-installer.unknown-ext')).toBe('.unknown-ext')
    expect(assetFormat('crossgram-installer')).toBe('')
  })

  it('flags update packages so they can be labelled', () => {
    expect(
      isUpdatePackage(makeAsset('crossgram-tdesktop-runtime-windows-100000277.upd', 'Windows', 'Default')),
    ).toBe(true)
    expect(
      isUpdatePackage(makeAsset('crossgram-tdesktop-runtime-windows-v7.3.1.zip', 'Windows', 'Default')),
    ).toBe(false)
  })
})

describe('catalog timestamp', () => {
  it('formats the ISO timestamp as UTC minutes', () => {
    expect(formatUpdatedAt('2026-11-03T23:22:26.580Z')).toBe('2026-11-03 23:22 UTC')
    expect(formatUpdatedAt('2026-01-02T03:04:05.000Z')).toBe('2026-01-02 03:04 UTC')
  })

  it('returns null for anything unparseable', () => {
    expect(formatUpdatedAt('')).toBeNull()
    expect(formatUpdatedAt('not-a-date')).toBeNull()
  })
})

describe('selection summary', () => {
  it('builds compact target tokens for the stat grid', () => {
    expect(osSlug('Windows')).toBe('win')
    expect(osSlug('macOS')).toBe('macos')
    expect(osSlug('Other')).toBe('other')
    expect(architectureSlug('Default')).toBe('any')
    expect(architectureSlug('ARM64')).toBe('arm64')
    expect(assetTarget(makeAsset('a.zip', 'Windows', 'x64'))).toBe('win-x64')
    expect(assetTarget(makeAsset('a.apk', 'Android', 'ARM64'))).toBe('android-arm64')
    expect(assetTarget(makeAsset('a.zip', 'macOS', 'Universal'))).toBe('macos-universal')
  })

  it('counts builds per client and per platform tab', () => {
    const clients = [
      makeClient({
        id: 'desk',
        assets: [
          makeAsset('d.zip', 'Windows', 'x64'),
          makeAsset('d.dmg', 'macOS', 'Universal'),
          makeAsset('d.tar.xz', 'Linux', 'x64'),
        ],
      }),
      makeClient({ id: 'droid', assets: [makeAsset('a.apk', 'Android', 'ARM64')] }),
      makeClient({ id: 'soon', release: 'crossgram-3' }),
    ]

    expect(clients.map(clientBuildCount)).toEqual([3, 1, 0])
    expect(buildsForPlatform(clients, 'Desktop')).toBe(3)
    expect(buildsForPlatform(clients, 'Android')).toBe(1)
    expect(buildsForPlatform(clients, 'iOS')).toBe(0)
  })
})

describe('labels', () => {
  it('translates the generator specific values', () => {
    expect(architectureLabel('Default')).toBe('默认')
    expect(architectureLabel('Universal')).toBe('通用')
    expect(architectureLabel('ARM64')).toBe('ARM64')
    expect(osLabel('Other')).toBe('其他')
    expect(osLabel('Windows')).toBe('Windows')
  })
})

describe('release catalog data', () => {
  it('describes every client', () => {
    expect(releaseCatalog.clients.length).toBeGreaterThan(0)
    for (const client of releaseCatalog.clients) {
      expect(client.id).not.toBe('')
      expect(client.name).not.toBe('')
      expect(client.description).not.toBe('')
      expect(client.repo).toMatch(/^[\w.-]+\/[\w.-]+$/)
    }
  })

  it('only offers https github release downloads', () => {
    const urls = releaseCatalog.clients.flatMap((client) => client.assets.map((asset) => asset.url))
    const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\/[\w.-]+\/[\w.-]+$/

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url).toMatch(pattern)
  })

  it('groups the real catalog into known platforms', () => {
    const platforms = platformsOf(releaseCatalog.clients)

    expect(platforms).toContain('Desktop')
    expect(platforms).toContain('Android')
    for (const platform of platforms) expect(['Desktop', 'Android', 'iOS']).toContain(platform)
  })

  it('recommends the installable tdesktop builds, never the updater payload', () => {
    const tdesktop = releaseCatalog.clients.find((client) => client.id === 'tdesktop')!
    const windows = recommendAsset(filterAssets(tdesktop.assets, 'Windows', 'cross'))

    expect(windows?.name).toBe('crossgram-tdesktop-runtime-windows-v7.3.1.zip')
    expect(assetFormat(windows!.name)).toBe('.zip')
    expect(isUpdatePackage(windows!)).toBe(false)
    expect(recommendAsset(filterAssets(tdesktop.assets, 'Linux', 'cross'))?.name).toBe(
      'crossgram-tdesktop-runtime-linux-v7.3.1.tar.xz',
    )
    expect(recommendAsset(filterAssets(tdesktop.assets, 'macOS', 'cross'))?.name).toBe(
      'crossgram-tdesktop-runtime-macos-v7.3.1.zip',
    )
  })

  it('never recommends an update package anywhere in the real catalog', () => {
    let checked = 0
    for (const client of releaseCatalog.clients) {
      for (const platform of clientPlatforms(client)) {
        for (const brand of brandOptions(filterAssets(client.assets, platform))) {
          const candidates = filterAssets(client.assets, platform, brand.id)
          const recommended = recommendAsset(candidates)
          expect(recommended).not.toBeNull()
          expect(isUpdatePackage(recommended!)).toBe(false)
          checked += 1
        }
      }
    }
    expect(checked).toBeGreaterThan(10)
  })
})
