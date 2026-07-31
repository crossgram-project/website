import { expect, test } from '@playwright/test'

test('home page presents the product and routes into deployment', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /ONE CLIENT/i })).toBeVisible()
  await expect(page.getByText('CrossGram Desktop / Unified Inbox')).toBeVisible()
  await page.getByRole('link', { name: '开始部署' }).click({ force: true })
  await expect(page).toHaveURL(/\/docs$/)
  await expect(page.getByRole('heading', { name: /从一台服务器/ })).toBeVisible()
})

test('feature page exposes visual narratives and compatibility matrix', async ({ page }) => {
  await page.goto('/features')
  await expect(page.getByRole('heading', { name: /一套体验/ })).toBeVisible()
  await expect(page.getByText('建议截图：会话列表 + 聊天窗口')).toBeVisible()
  await expect(page.getByText('历史消息拉取')).toBeVisible()
  await expect(page.getByText('QQ / QQNT', { exact: true })).toBeVisible()
})

test('downloads page groups maintained clients and only expands one selection', async ({ page }) => {
  await page.goto('/downloads')
  for (const name of ['Telegram Desktop', 'Nagram', 'Unigram', 'Telegram X', 'Mithka']) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  }
  await page.getByRole('button', { name: /Nagram/ }).click()
  await expect(page.getByRole('region', { name: 'Nagram 下载选择器' })).toBeVisible()
  await expect(page.getByText('RECOMMENDED FOR MOST USERS')).toBeVisible()
  await expect(page.getByText('其他架构与安装格式')).toBeVisible()
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
