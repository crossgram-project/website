import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import releaseCatalog from '../../src/data/releases.json' with { type: 'json' }
import {
  brandOptions,
  clientPlatforms,
  clientsForPlatform,
  filterAssets,
  formatUpdatedAt,
  isReleased,
  isUpdatePackage,
  osLabel,
  pickBrand,
  platformsOf,
  recommendAsset,
} from '../../src/pages/downloads/model'
import type { Platform, ReleaseClient } from '../../src/pages/downloads/model'

const clients = releaseCatalog.clients as ReleaseClient[]
const released = clients.filter(isReleased)

/** Product platform tabs that actually exist in the release data. */
const platformTabs = platformsOf(clients)

function tabOf(client: ReleaseClient): Platform {
  const platform = platformTabs.find((item) =>
    clientsForPlatform(clients, item).some((candidate) => candidate.id === client.id),
  )
  if (!platform) throw new Error(`${client.id} is not listed on any platform tab`)
  return platform
}

/** The build the page must recommend for one client/OS/brand combination. */
function expectedDownload(client: ReleaseClient, platform: string, brand: string) {
  const asset = recommendAsset(filterAssets(client.assets, platform, brand))
  if (!asset) throw new Error(`no candidate for ${client.id}/${platform}/${brand}`)
  return asset
}

async function openClient(page: Page, client: ReleaseClient) {
  await page.goto('/downloads')
  await page.getByRole('tab', { name: tabOf(client), exact: true }).click()
  await page.getByRole('button', { name: client.name }).click()
  const picker = page.getByRole('region', { name: `${client.name} 下载选择器` })
  await expect(picker).toBeVisible()
  return picker
}

test('shows one tab per platform and opens on a platform that has builds', async ({ page }) => {
  await page.goto('/downloads')

  await expect(page.getByRole('heading', { level: 1, name: '下载客户端' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: '客户端平台' })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(platformTabs.length)

  const first = platformTabs.find((platform) =>
    clientsForPlatform(clients, platform).some(isReleased),
  )
  await expect(page.getByRole('tab', { name: first!, exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  // The head sits centred over the shader backdrop, the picker lives in one full-width card.
  await expect(page.locator('.dl-page-head')).toHaveCSS('text-align', 'center')
  await expect(page.locator('.backdrop')).toHaveCount(1)
  await expect(page.getByRole('region', { name: '下载选择器', exact: true })).toHaveClass(/card/)
})

test('lays the clients out as a compact tile grid', async ({ page }, testInfo) => {
  await page.goto('/downloads')

  const columns = await page
    .locator('.dl-tiles')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)

  expect(columns).toBe(testInfo.project.name === 'mobile' ? 1 : 3)

  const tile = await page.locator('.dl-tile').first().boundingBox()
  expect(tile!.height).toBeGreaterThanOrEqual(70)
  expect(tile!.height).toBeLessThanOrEqual(96)
})

test('the android tab lists android clients and downloads the chosen brand build', async ({ page }) => {
  const brandClient = clientsForPlatform(clients, 'Android')
    .filter(isReleased)
    .find((client) => brandOptions(filterAssets(client.assets, 'Android')).length > 1)
  expect(brandClient).toBeTruthy()

  const client = brandClient!
  const brands = brandOptions(filterAssets(client.assets, 'Android'))
  const defaultExpected = expectedDownload(client, 'Android', pickBrand(brands, null)!)
  const chosenBrand = brands[brands.length - 1]!
  const chosenExpected = expectedDownload(client, 'Android', chosenBrand.id)
  expect(chosenBrand.id).not.toBe(pickBrand(brands, null))

  await page.goto('/downloads')
  await page.getByRole('tab', { name: 'Android', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Android', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('button', { name: client.name })).toBeVisible()

  const picker = await openClient(page, client)
  await expect(picker.getByRole('link', { name: '下载', exact: true })).toHaveAttribute(
    'href',
    defaultExpected.url,
  )

  const brandGroup = picker.getByRole('group', { name: '品牌渠道' })
  await brandGroup.getByRole('button', { name: chosenBrand.label, exact: true }).click()
  await expect(
    brandGroup.getByRole('button', { name: chosenBrand.label, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(picker.getByRole('link', { name: '下载', exact: true })).toHaveAttribute(
    'href',
    chosenExpected.url,
  )
})

test('the system chips switch the recommended build', async ({ page }) => {
  const client = clientsForPlatform(clients, 'Desktop')
    .filter(isReleased)
    .find((item) => clientPlatforms(item).length > 1)
  expect(client).toBeTruthy()

  const target = client!
  const systems = clientPlatforms(target)
  const chosenSystem = systems[systems.length - 1]!
  const brandId = pickBrand(brandOptions(filterAssets(target.assets, chosenSystem)), null)!
  const expected = expectedDownload(target, chosenSystem, brandId)

  const picker = await openClient(page, target)
  const osGroup = picker.getByRole('group', { name: '系统' })
  await expect(osGroup.getByRole('button')).toHaveCount(systems.length)

  await osGroup.getByRole('button', { name: osLabel(chosenSystem), exact: true }).click()
  await expect(
    osGroup.getByRole('button', { name: osLabel(chosenSystem), exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(picker.getByRole('link', { name: '下载', exact: true })).toHaveAttribute(
    'href',
    expected.url,
  )
})

test('the build table lists every candidate of the chosen system', async ({ page }) => {
  let chosen: { client: ReleaseClient; platform: string; brand: string } | undefined
  for (const client of released) {
    for (const platform of clientPlatforms(client)) {
      for (const brand of brandOptions(filterAssets(client.assets, platform))) {
        if (filterAssets(client.assets, platform, brand.id).length > 1) {
          chosen = { client, platform, brand: brand.id }
          break
        }
      }
      if (chosen) break
    }
    if (chosen) break
  }
  expect(chosen).toBeTruthy()

  const { client, platform, brand } = chosen!
  const candidates = filterAssets(client.assets, platform, brand)
  expect(candidates.length).toBeGreaterThan(1)

  const picker = await openClient(page, client)
  await picker
    .getByRole('group', { name: '系统' })
    .getByRole('button', { name: osLabel(platform), exact: true })
    .click()

  const brandGroup = picker.getByRole('group', { name: '品牌渠道' })
  if ((await brandGroup.count()) > 0) {
    const label = brandOptions(filterAssets(client.assets, platform)).find(
      (option) => option.id === brand,
    )!.label
    await brandGroup.getByRole('button', { name: label, exact: true }).click()
  }

  const table = picker.getByRole('table', { name: /全部构建/ })
  await expect(table).toBeVisible()
  await expect(table.locator('tbody tr')).toHaveCount(candidates.length)
  await expect(table.locator('tr[data-recommended="true"]')).toHaveCount(1)
  await expect(picker.locator('details')).toHaveCount(0)

  for (const asset of candidates) {
    await expect(table.getByRole('link', { name: `下载 ${asset.name}` })).toHaveAttribute(
      'href',
      asset.url,
    )
    const row = table.locator('tr', { hasText: asset.name })
    if (isUpdatePackage(asset)) await expect(row.getByText('更新包')).toBeVisible()
    else await expect(row.getByText('更新包')).toHaveCount(0)
  }

  await expect(picker.getByRole('link', { name: '所有版本', exact: true })).toHaveAttribute(
    'href',
    `https://github.com/${client.repo}/releases`,
  )
})

test('shows the catalog freshness as formatted metadata', async ({ page }) => {
  const formatted = formatUpdatedAt(releaseCatalog.updatedAt)
  expect(formatted).toBeTruthy()

  await page.goto('/downloads')

  await expect(page.getByText(`下载数据同步于 ${formatted}`)).toBeVisible()
})

test('recommends the installable Telegram Desktop build, not the updater payload', async ({ page }) => {
  const tdesktop = clients.find((client) => client.id === 'tdesktop')
  expect(tdesktop).toBeTruthy()

  const updater = tdesktop!.assets.find((asset) => isUpdatePackage(asset) && asset.platform === 'Windows')
  expect(updater).toBeTruthy()

  const picker = await openClient(page, tdesktop!)
  await picker
    .getByRole('group', { name: '系统' })
    .getByRole('button', { name: 'Windows', exact: true })
    .click()

  const download = picker.getByRole('link', { name: '下载', exact: true })
  await expect(download).toHaveAttribute('href', /\.(zip|tar\.xz|tar\.gz|apk|exe|msixbundle)$/)
  await expect(download).not.toHaveAttribute('href', /\.upd$/)
  await expect(download).toHaveAttribute(
    'href',
    recommendAsset(filterAssets(tdesktop!.assets, 'Windows', 'cross'))!.url,
  )
  await expect(picker.getByText(/^crossgram-277 · [\d.]+ MB · \.zip · /)).toBeVisible()

  // Every build of the selection is listed in the compact table, updater payload included.
  const table = picker.getByRole('table', { name: /全部构建/ })
  const updaterRow = table.locator('tr', { hasText: updater!.name })
  await expect(updaterRow.getByText('更新包')).toBeVisible()
  await expect(table.getByRole('link', { name: `下载 ${updater!.name}` })).toHaveAttribute(
    'href',
    updater!.url,
  )
  await expect(table.locator('tr[data-recommended="true"]')).toContainText('-v7.3.1.zip')
})

test('a client without builds shows the coming-soon state with its repository', async ({ page }) => {
  const client = clients.find((item) => !isReleased(item))
  expect(client).toBeTruthy()

  const picker = await openClient(page, client!)

  await expect(picker.getByText('即将发布', { exact: true })).toBeVisible()
  await expect(picker.getByRole('link', { name: '在 GitHub 查看进度' })).toHaveAttribute(
    'href',
    `https://github.com/${client!.repo}`,
  )
  await expect(picker.getByRole('link', { name: '所有版本', exact: true })).toHaveAttribute(
    'href',
    `https://github.com/${client!.repo}/releases`,
  )
  await expect(picker.getByRole('link', { name: '下载', exact: true })).toHaveCount(0)
})

test('the page renders dark in the dark colour scheme', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'dark scheme check runs for desktop-dark only')

  await page.goto('/downloads')

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const channels = background.match(/\d+/g)?.slice(0, 3).map(Number) ?? []
  expect(channels.length).toBe(3)
  expect(Math.max(...channels)).toBeLessThan(80)
})

test('no horizontal overflow on a narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile layout check runs for the mobile project only')

  const brandClient = clientsForPlatform(clients, 'Android')
    .filter(isReleased)
    .find((client) => brandOptions(filterAssets(client.assets, 'Android')).length > 1)!

  const picker = await openClient(page, brandClient)
  await expect(picker.getByRole('table', { name: /全部构建/ })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
