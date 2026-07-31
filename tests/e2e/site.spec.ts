import { expect, test } from '@playwright/test'

test('home page presents the product and routes into deployment', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /ONE CLIENT/i })).toBeVisible()
  await expect(page.getByText('CrossGram Desktop / Unified Inbox')).toBeVisible()
  await page.getByRole('link', { name: '开始部署' }).click({ force: true })
  await expect(page).toHaveURL(/\/docs$/)
  await expect(page.getByRole('heading', { name: /从一台服务器/ })).toBeVisible()
})

test('home includes visual narratives and compatibility matrix', async ({ page }) => {
  await page.goto('/')
  await page.locator('#features').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: /一套体验/ })).toBeVisible()
  await expect(page.getByText('NAGRAM / UNIFIED INBOX')).toBeVisible()
  await expect(page.getByText('历史消息拉取')).toBeVisible()
  await expect(page.locator('.matrix-title').getByText('QQ / QQNT', { exact: true })).toBeVisible()
})

test('downloads page groups compact clients by platform and only expands one selection', async ({ page }, testInfo) => {
  await page.goto('/downloads')
  await expect(page.getByRole('tab', { name: /Android/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: /Windows|macOS|Linux/ })).toHaveCount(0)
  await expect(page.locator('.client-card')).toHaveCount(8)
  const cardHeight = await page.locator('.client-card').first().evaluate(element => element.getBoundingClientRect().height)
  expect(cardHeight).toBeLessThan(100)
  if (testInfo.project.name === 'desktop') {
    const firstCard = page.locator('.client-card').first()
    const cardBox = await firstCard.boundingBox()
    await page.mouse.move(cardBox!.x + cardBox!.width * .8, cardBox!.y + cardBox!.height * .2)
    await expect.poll(() => firstCard.evaluate(element => getComputedStyle(element).getPropertyValue('--ry'))).not.toBe('0deg')
  }
  await expect(page.getByRole('button', { name: /Telegram Desktop/ })).not.toBeVisible()
  await page.getByRole('tab', { name: /Desktop/ }).click()
  await expect(page.getByRole('button', { name: /Telegram Desktop/ })).toBeVisible()
  await expect(page.locator('.client-card')).toHaveCount(6)
  await page.getByRole('tab', { name: /Android/ }).click()
  await page.getByRole('button', { name: /Nagram/ }).click()
  await expect(page.getByRole('region', { name: 'Nagram 下载选择器' })).toBeVisible()
  await expect(page.getByText('RECOMMENDED FOR MOST USERS')).toBeVisible()
  await expect(page.getByText('其他架构与安装格式')).toBeVisible()
})

test('home removes FREE overlay and uses translucent interactive image treatments', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.header')).toHaveCSS('top', '0px')
  await expect(page.locator('.header')).toHaveCSS('width', `${await page.evaluate(() => innerWidth)}px`)
  await expect(page.locator('.header')).toHaveCSS('border-radius', '0px')
  const blurLayers = page.locator('[data-progressive-blur-layer]')
  await expect(blurLayers).toHaveCount(13)
  const blurValues = await blurLayers.evaluateAll(elements =>
    elements.map(element => Number((element as HTMLElement).dataset.blur)))
  expect(Math.sqrt(blurValues.reduce((sum, value) => sum + value * value, 0))).toBeCloseTo(40, 2)
  expect(blurValues[0]).toBeGreaterThan(blurValues.at(-1)!)
  await expect(page.locator('.overlap-word')).toHaveCount(0)
  for (const decoration of ['SYSTEMS CONNECTED', 'QQNT CONNECTED', '12 CHANNELS', 'CONNECTED WORLDS']) {
    await expect(page.getByText(decoration, { exact: false })).toHaveCount(0)
  }
  await expect(page.locator('.stack > strong')).toHaveCount(0)
  await expect(page.locator('.shot-card').first()).toHaveCSS('backdrop-filter', /blur/)
  await expect(page.locator('.story article')).toHaveCSS('backdrop-filter', /blur/)
  await expect(page.locator('.shot-card img').first()).toBeVisible()
  await page.locator('.shot-card').first().hover()
  await expect(page.locator('.shot-card').first()).toHaveCSS('transition-property', /transform/)
})

test('both deployment paths contain actionable commands', async ({ page }) => {
  await page.goto('/docs/linux')
  await expect(page.getByText('curl -fsSL', { exact: false })).toBeVisible()
  await expect(page.getByText('sudo crossgram-update', { exact: true })).toBeVisible()
  await page.goto('/docs/windows')
  await expect(page.locator('pre').filter({ hasText: 'git clone https://github.com/std-microblock/crossgram.git' })).toBeVisible()
  await expect(page.getByText('QQNT Bridge', { exact: false }).first()).toBeVisible()
})

test('mobile navigation keeps brand and GitHub action without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion')
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'CrossGram 首页' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})
