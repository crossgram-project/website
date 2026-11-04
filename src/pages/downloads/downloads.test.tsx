import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Downloads from '../Downloads'
import type { ReleaseAsset, ReleaseClient } from './model'

afterEach(cleanup)

function makeAsset(
  name: string,
  platform: string,
  architecture: string,
  brand = 'cross',
  brandLabel = brand === 'cross' ? 'CrossGram' : brand,
): ReleaseAsset {
  return {
    name,
    platform,
    architecture,
    brand,
    brandLabel,
    size: '12 MB',
    url: `https://github.com/example/releases/download/v1/${name}`,
  }
}

function makeClient(overrides: Partial<ReleaseClient> & { id: string }): ReleaseClient {
  return {
    name: overrides.id,
    description: `${overrides.id} 的一句话说明`,
    repo: `example/${overrides.id}`,
    release: null,
    assets: [],
    ...overrides,
  }
}

const alphaAssets = [
  makeAsset('alpha-universal.dmg', 'macOS', 'Universal'),
  makeAsset('alpha-runtime-macos-universal.upd', 'macOS', 'Universal'),
  makeAsset('alpha-arm64.dmg', 'macOS', 'ARM64'),
  makeAsset('alpha-x64.dmg', 'macOS', 'x64'),
]

const betaAssets = [
  makeAsset('beta-arm64-wechat.apk', 'Android', 'ARM64', 'wechat', '微信'),
  makeAsset('beta-arm64-qq.apk', 'Android', 'ARM64', 'qq', 'QQ'),
  makeAsset('beta-x64-qq.apk', 'Android', 'x64', 'qq', 'QQ'),
  makeAsset('beta-armv7-qq.apk', 'Android', 'ARMv7', 'qq', 'QQ'),
]

const fixtures: ReleaseClient[] = [
  makeClient({ id: 'alpha', name: 'Alpha', release: 'crossgram-1', assets: alphaAssets }),
  makeClient({ id: 'beta', name: 'Beta', release: 'crossgram-2', assets: betaAssets }),
  makeClient({ id: 'gamma', name: 'Gamma', release: null, assets: [] }),
]

function renderPage(clients?: ReleaseClient[], updatedAt?: string) {
  return render(
    <MemoryRouter>
      {clients ? (
        <Downloads clients={clients} updatedAt={updatedAt} />
      ) : (
        <Downloads updatedAt={updatedAt} />
      )}
    </MemoryRouter>,
  )
}

function tab(name: string) {
  return screen.getByRole('tab', { name })
}

function picker(name: string) {
  return screen.getByRole('region', { name: `${name} 下载选择器` })
}

describe('Downloads page', () => {
  it('renders the page head and one tab per platform present in the data', () => {
    renderPage(fixtures)

    expect(screen.getByRole('heading', { level: 1, name: '下载客户端' })).toBeTruthy()
    expect(screen.getByRole('tablist', { name: '客户端平台' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual(['Desktop', 'Android'])
    expect(tab('Desktop').getAttribute('aria-selected')).toBe('true')
    expect(tab('Android').getAttribute('aria-selected')).toBe('false')
  })

  it('nests the picker in one card and the recommendation in a panel', () => {
    renderPage(fixtures)

    const card = screen.getByRole('region', { name: '下载选择器' })

    expect(card.classList.contains('card')).toBe(true)
    expect(card.contains(screen.getByRole('tablist', { name: '客户端平台' }))).toBe(true)
    expect(card.contains(picker('Alpha'))).toBe(true)

    const recommended = within(picker('Alpha')).getByRole('link', { name: '下载' }).parentElement!
    expect(recommended.classList.contains('panel')).toBe(true)
    expect(recommended.classList.contains('dl-recommend')).toBe(true)

    const note = screen.getByRole('region', { name: '关于品牌渠道' })
    expect(note.classList.contains('card')).toBe(true)
    expect(within(note).getByRole('heading', { level: 3, name: '关于品牌渠道' })).toBeTruthy()
  })

  it('switches the visible client list when another tab is selected', () => {
    renderPage(fixtures)

    expect(screen.getByRole('button', { name: /Alpha/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Beta/ })).toBeNull()

    fireEvent.click(tab('Android'))

    expect(tab('Android').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: /Beta/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('dl-tab-Android')
  })

  it('moves between tabs with the arrow keys', () => {
    renderPage(fixtures)

    fireEvent.keyDown(tab('Desktop'), { key: 'ArrowRight' })

    expect(tab('Android').getAttribute('aria-selected')).toBe('true')
  })

  it('shows the picker of the client that was clicked', () => {
    renderPage(fixtures)

    expect(picker('Alpha')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Gamma/ }))

    expect(picker('Gamma')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Alpha 下载选择器' })).toBeNull()
  })

  it('opens on the first platform that has a downloadable client', () => {
    const clients = [
      makeClient({ id: 'desk-soon', name: 'DeskSoon', release: 'crossgram-9' }),
      makeClient({ id: 'beta', name: 'Beta', release: 'crossgram-2', assets: betaAssets }),
    ]

    renderPage(clients)

    expect(tab('Android').getAttribute('aria-selected')).toBe('true')
    expect(picker('Beta')).toBeTruthy()
  })

  it('links the recommended build to an installable release asset', () => {
    renderPage(fixtures)

    const region = picker('Alpha')
    const recommended = within(region).getByRole('link', { name: '下载' })

    // The `.upd` updater payload sits in the same release and must not be what we recommend.
    expect(alphaAssets[1]!.name).toMatch(/\.upd$/)
    expect(recommended.getAttribute('href')).toBe(alphaAssets[0]!.url)
    expect(within(region).getByText('CrossGram')).toBeTruthy()
    expect(within(region).getByText(/crossgram-1 · 12 MB · \.dmg · 通用/)).toBeTruthy()
    expect(within(region).queryByRole('group', { name: '品牌渠道' })).toBeNull()
  })

  it('lists every build in the compact table and flags the updater payload', () => {
    renderPage(fixtures)

    const region = picker('Alpha')
    const table = within(region).getByRole('table', { name: /全部构建/ })

    expect(region.querySelector('details')).toBeNull()
    expect(within(table).getByRole('columnheader', { name: '文件' })).toBeTruthy()

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.querySelector('a')?.getAttribute('href'))).toEqual(
      alphaAssets.map((asset) => asset.url),
    )

    const updaterRow = within(table).getByText(alphaAssets[1]!.name).closest('tr') as HTMLElement
    expect(within(updaterRow).getByText('更新包')).toBeTruthy()

    const buildRow = within(table).getByText(alphaAssets[2]!.name).closest('tr') as HTMLElement
    expect(within(buildRow).queryByText('更新包')).toBeNull()
    expect(within(buildRow).queryByText('推荐')).toBeNull()

    const recommendedRow = within(table).getByText(alphaAssets[0]!.name).closest('tr') as HTMLElement
    expect(within(recommendedRow).getByText('推荐')).toBeTruthy()
  })

  it('summarises the current selection in four mono stat cells', () => {
    renderPage(fixtures)

    const stats = picker('Alpha').querySelector('.dl-stats') as HTMLElement

    expect(within(stats).getByText(String(alphaAssets.length))).toBeTruthy()
    expect(within(stats).getByText('12 MB')).toBeTruthy()
    expect(within(stats).getByText('.dmg')).toBeTruthy()
    expect(within(stats).getByText('macos-universal')).toBeTruthy()
  })

  it('shows the catalog freshness as formatted meta text', () => {
    renderPage(fixtures, '2026-11-03T23:22:26.580Z')

    expect(screen.getByText('下载数据同步于 2026-11-03 23:22 UTC')).toBeTruthy()
  })

  it('drops the freshness line when the timestamp is unusable', () => {
    renderPage(fixtures, 'not-a-date')

    expect(screen.queryByText(/下载数据同步于/)).toBeNull()
  })

  it('switches the recommended build when another brand is chosen', () => {
    renderPage(fixtures)
    fireEvent.click(tab('Android'))

    const region = picker('Beta')
    const brandGroup = within(region).getByRole('group', { name: '品牌渠道' })

    expect(within(brandGroup).getAllByRole('button').map((element) => element.textContent)).toEqual(['微信', 'QQ'])
    expect(
      within(region).getByRole('link', { name: '下载' }).getAttribute('href'),
    ).toBe(betaAssets[0]!.url)

    fireEvent.click(within(brandGroup).getByRole('button', { name: 'QQ' }))

    expect(within(brandGroup).getByRole('button', { name: 'QQ' }).getAttribute('aria-pressed')).toBe('true')
    expect(
      within(region).getByRole('link', { name: '下载' }).getAttribute('href'),
    ).toBe(betaAssets[1]!.url)
  })

  it('shows the recommended row plus the other architectures in the build table', () => {
    renderPage(fixtures)
    fireEvent.click(tab('Android'))

    const region = picker('Beta')
    fireEvent.click(
      within(within(region).getByRole('group', { name: '品牌渠道' })).getByRole('button', { name: 'QQ' }),
    )

    const table = within(region).getByRole('table', { name: /全部构建/ })

    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getAllByRole('link').map((element) => element.getAttribute('href'))).toEqual([
      betaAssets[1]!.url,
      betaAssets[2]!.url,
      betaAssets[3]!.url,
    ])
    expect(within(table).getByText('beta-x64-qq.apk')).toBeTruthy()
  })

  it('shows the platform totals next to the segmented control', () => {
    renderPage(fixtures)

    const toolbar = within(screen.getByRole('tablist', { name: '客户端平台' }).parentElement!)
    expect(toolbar.getByText('2 个客户端 · 4 个构建')).toBeTruthy()

    fireEvent.click(tab('Android'))

    expect(toolbar.getByText('1 个客户端 · 4 个构建')).toBeTruthy()
  })

  it('shows the release tag and build count on every client tile', () => {
    renderPage(fixtures)

    const alphaTile = screen.getByRole('button', { name: /Alpha/ })
    expect(within(alphaTile).getByText(/crossgram-1 · 4 个构建/)).toBeTruthy()

    fireEvent.click(tab('Android'))

    const betaTile = screen.getByRole('button', { name: /Beta/ })
    expect(within(betaTile).getByText(/crossgram-2 · 4 个构建/)).toBeTruthy()
  })

  it('shows the coming-soon state for a client without assets', () => {
    renderPage(fixtures)
    fireEvent.click(screen.getByRole('button', { name: /Gamma/ }))

    const region = picker('Gamma')

    expect(within(region).getByText('即将发布')).toBeTruthy()
    expect(within(region).getByRole('link', { name: '在 GitHub 查看进度' }).getAttribute('href')).toBe(
      'https://github.com/example/gamma',
    )
    expect(within(region).getByRole('link', { name: '所有版本' }).getAttribute('href')).toBe(
      'https://github.com/example/gamma/releases',
    )
    expect(within(region).queryByRole('link', { name: '下载' })).toBeNull()
  })
})

describe('Downloads page with the real release catalog', () => {
  it('groups the real catalog into Desktop and Android and recommends a github asset', () => {
    renderPage()

    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual(['Desktop', 'Android'])

    const region = picker('Telegram Desktop')
    const recommended = within(region).getByRole('link', { name: '下载' })

    expect(recommended.getAttribute('href')).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\//)
    // Telegram Desktop ships an updater payload (`…-100000277.upd`) next to the real build.
    expect(recommended.getAttribute('href')).toMatch(/-v7\.3\.1\.zip$/)
    expect(within(region).getByText(/crossgram-277 · 77 MB · \.zip · 默认/)).toBeTruthy()
    expect(within(region).getByRole('link', { name: '所有版本' }).getAttribute('href')).toBe(
      'https://github.com/crossgram-project/crossgram-desktop/releases',
    )
    expect(screen.getByText(/^下载数据同步于 \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/)).toBeTruthy()
    expect(screen.getByText(/^\d+ 个客户端 · \d+ 个构建$/)).toBeTruthy()

    // The updater payload stays reachable in the full build table, clearly labelled.
    const table = within(region).getByRole('table', { name: /全部构建/ })
    const updaterRow = within(table)
      .getByText(/crossgram-tdesktop-runtime-windows-\d+\.upd/)
      .closest('tr') as HTMLElement
    expect(within(updaterRow).getByText('更新包')).toBeTruthy()
    expect(within(table).getByText(/windows-v7\.3\.1\.zip/)).toBeTruthy()
  })

  it('shows the coming-soon state for a real client that has no builds yet', () => {
    renderPage()
    fireEvent.click(tab('Android'))
    fireEvent.click(screen.getByRole('button', { name: /Nagram/ }))

    const region = picker('Nagram')

    expect(within(region).getByText('即将发布')).toBeTruthy()
    expect(within(region).getByRole('link', { name: '在 GitHub 查看进度' }).getAttribute('href')).toBe(
      'https://github.com/crossgram-project/crossgram-android',
    )
  })
})
