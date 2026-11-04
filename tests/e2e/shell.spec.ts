import { expect, test } from '@playwright/test'

test('header navigation reaches every page and marks the active entry', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: '主导航' })
  await expect(nav.getByRole('link', { name: '首页' })).toHaveClass(/active/)

  await nav.getByRole('link', { name: '下载' }).click()
  await expect(page).toHaveURL(/\/downloads$/)
  await expect(nav.getByRole('link', { name: '下载' })).toHaveClass(/active/)

  await nav.getByRole('link', { name: '部署文档' }).click()
  await expect(page).toHaveURL(/\/docs$/)
  await expect(nav.getByRole('link', { name: '部署文档' })).toHaveClass(/active/)
})

test('footer exposes the primary destinations', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toBeVisible()
  await expect(footer.getByRole('link', { name: '下载' })).toHaveAttribute('href', '/downloads')
  await expect(footer.getByRole('link', { name: '部署文档' })).toHaveAttribute('href', '/docs')
})

test('unknown routes render the not-found page instead of a blank screen', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('heading', { name: '页面未找到' })).toBeVisible()
  await page.getByRole('link', { name: '返回首页' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('document title follows the active route', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/CrossGram/)
  await page.goto('/docs/linux')
  await expect(page).toHaveTitle(/Linux 一键部署/)
})

test('the site follows the system colour scheme without a manual toggle', async ({ page }, testInfo) => {
  await page.goto('/')
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const isDark = (() => {
    const [r, g, b] = background.match(/\d+/g)!.map(Number)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  })()
  expect(isDark).toBe(testInfo.project.name === 'desktop-dark')
  await expect(page.getByRole('button', { name: /深色|浅色|主题|theme/i })).toHaveCount(0)
})

test('no page scrolls horizontally on a narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion')
  for (const path of ['/', '/downloads', '/docs', '/docs/linux', '/docs/windows']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow, `${path} must not overflow horizontally`).toBe(false)
  }
})
