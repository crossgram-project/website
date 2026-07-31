import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const gallery = (page: Page) => page.locator('[data-hero-gallery]')
const dots = (page: Page) => page.locator('[data-hero-dot]')
const frontShot = (page: Page) => gallery(page).locator('[data-hero-shot].front')

const settledState = async (page: Page) => {
  await expect(gallery(page)).not.toHaveClass(/swapping/)
  // The deal is keyframe driven with no fill; once settled, no animation may linger.
  const animations = () => gallery(page).evaluate(element =>
    [...element.querySelectorAll('[data-hero-shot]')].flatMap(shot =>
      shot.getAnimations().filter(animation => animation.playState !== 'finished')).length)
  await expect.poll(animations).toBe(0)
  return {
    front: await frontShot(page).getAttribute('data-hero-shot'),
    animations: await animations(),
  }
}

test('hero gallery deals cards on autoplay and settles without leaking animations', async ({ page }) => {
  await page.goto('/')
  await expect(frontShot(page)).toHaveAttribute('data-hero-shot', '0')
  await expect(dots(page).nth(0)).toHaveClass(/active/)
  // Autoplay interval is 4800ms; wait for the deal to complete.
  await expect(frontShot(page)).toHaveAttribute('data-hero-shot', '1', { timeout: 8000 })
  await expect(dots(page).nth(1)).toHaveClass(/active/)
  const state = await settledState(page)
  expect(state.front).toBe('1')
  expect(state.animations).toBe(0)
})

test('hero gallery dot click deals a visible card swap with clean end state', async ({ page }) => {
  await page.goto('/')
  await dots(page).nth(1).click()
  // The deal choreography must actually run (cards carry deal classes mid-flight).
  await expect(gallery(page)).toHaveClass(/swapping/)
  await expect(gallery(page).locator('.deal-out')).toHaveCount(1)
  await expect(gallery(page).locator('.deal-in')).toHaveCount(1)
  const state = await settledState(page)
  expect(state.front).toBe('1')
  expect(state.animations).toBe(0)
})

test('hero gallery honors the latest target when clicked rapidly mid-deal', async ({ page }) => {
  await page.goto('/')
  await dots(page).nth(1).click()
  await expect(gallery(page)).toHaveClass(/swapping/)
  // Clicks during the deal queue: only the last one wins.
  await dots(page).nth(0).click()
  await dots(page).nth(1).click()
  const state = await settledState(page)
  expect(state.front).toBe('1')
  expect(state.animations).toBe(0)
  // And the queue keeps working for the next click.
  await dots(page).nth(0).click()
  expect((await settledState(page)).front).toBe('0')
})

test('hero gallery pauses autoplay while scrolled away and resumes when visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop-only: mobile layout scrolls differently')
  await page.goto('/')
  await expect(frontShot(page)).toHaveAttribute('data-hero-shot', '0')
  // Scrolled away before the first 4.8s tick: autoplay must not fire offscreen.
  await page.locator('.manifesto').scrollIntoViewIfNeeded()
  await page.waitForTimeout(5600)
  await expect(frontShot(page)).toHaveAttribute('data-hero-shot', '0')
  // Back into view: autoplay resumes and advances within one interval.
  await page.evaluate(() => scrollTo(0, 0))
  await expect(frontShot(page)).toHaveAttribute('data-hero-shot', '1', { timeout: 8000 })
})

test('hero gallery cards never vanish mid-deal', async ({ page }) => {
  await page.goto('/')
  await dots(page).nth(1).click()
  // No flash: both cards must stay visible throughout the whole deal.
  for (let i = 0; i < 10; i++) {
    const opacities = await gallery(page).evaluate(element =>
      [...element.querySelectorAll('[data-hero-shot]')].map(shot => Number(getComputedStyle(shot).opacity)))
    for (const opacity of opacities) expect(opacity).toBeGreaterThan(0.3)
    await page.waitForTimeout(120)
  }
})

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

test('hero gallery switches without leaking filled animations and never drops queued targets', async ({ page }) => {
  await page.goto('/')
  const gallery = page.locator('[data-hero-gallery]')
  await expect(gallery.locator('[data-hero-shot].front')).toHaveAttribute('data-hero-shot', '0')
  await page.locator('[data-hero-dot="1"]').click()
  await expect(gallery.locator('[data-hero-shot].front')).toHaveAttribute('data-hero-shot', '1')
  // The keyframed deal must settle: no swapping class, no animation leftovers.
  await expect(gallery).not.toHaveClass(/swapping/)
  const running = () => gallery.evaluate(element =>
    [...element.querySelectorAll('[data-hero-shot]')].flatMap(shot =>
      shot.getAnimations().filter(animation => animation.playState !== 'finished')).length)
  await expect.poll(running).toBe(0)
  // Interrupt a deal mid-flight with the opposite target: the final state must match
  // the last request instead of being swallowed.
  await page.locator('[data-hero-dot="0"]').click()
  await page.waitForTimeout(180)
  await page.locator('[data-hero-dot="1"]').click()
  await expect(gallery).not.toHaveClass(/swapping/, { timeout: 6000 })
  await expect(gallery.locator('[data-hero-shot].front')).toHaveAttribute('data-hero-shot', '1')
  // Clicking the front card advances to the next shot.
  await gallery.locator('[data-hero-shot].front').click()
  await expect(gallery).not.toHaveClass(/swapping/, { timeout: 6000 })
  await expect(gallery.locator('[data-hero-shot].front')).toHaveAttribute('data-hero-shot', '0')
  await expect(page.locator('[data-hero-dot="0"]')).toHaveClass(/active/)
})

test('mobile navigation keeps brand and GitHub action without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion')
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'CrossGram 首页' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})
