import { expect, test, type Page } from '@playwright/test'
import { capabilities, closing, deploy, hero, matrix } from '../../src/pages/home/content'

function relativeLuminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((value) => {
      const channel = value / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

async function tokenColor(page: Page, token: string) {
  return page.evaluate((name) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${name})`
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, token)
}

test('hero shows the badge, the two-line headline and both CTAs', async ({ page }) => {
  await page.goto('/')

  const badge = page.locator('.home-hero .home-badge')
  await expect(badge).toBeVisible()
  await expect(badge).toContainText(hero.badge)

  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).toContainText(hero.title)
  await expect(heading).toContainText(hero.titleLine)

  await expect(page.getByRole('link', { name: hero.primaryCta.label })).toBeVisible()
  await expect(page.getByRole('link', { name: hero.secondaryCta.label })).toBeVisible()
})

test('the hero sits on the fluid backdrop with the screenshot in a plain frame', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.home-hero .backdrop')).toHaveCount(1)
  await expect(page.locator('.home-hero .backdrop-canvas')).toHaveCount(1)
  await expect(page.locator('.home-hero .hero-enter')).toHaveCount(2)
  await expect(page.locator('.home-hero .window-bar')).toHaveCount(0)

  const image = page.locator('.home-hero .window img')
  await expect(image).toHaveAttribute('loading', 'eager')
  await expect(image).toHaveAttribute('alt', hero.shot.alt)
})

test('下载客户端 navigates to the downloads page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: hero.primaryCta.label }).click()

  await expect(page).toHaveURL(/\/downloads$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: /CrossGram/ })).toHaveCount(0)
})

test('the capability section shows four cards with lazy screenshots', async ({ page }) => {
  await page.goto('/')

  const section = page.locator('#features')
  await section.scrollIntoViewIfNeeded()

  const cards = section.locator('article.card')
  await expect(cards).toHaveCount(capabilities.cards.length)
  await expect(section.getByRole('heading', { level: 2 })).toContainText(capabilities.title)

  for (const [index, card] of capabilities.cards.entries()) {
    const element = cards.nth(index)
    await expect(element.getByRole('heading', { level: 3 })).toHaveText(card.title)
    const image = element.locator('img')
    await expect(image).toHaveAttribute('alt', card.shot.alt)
    await expect(image).toHaveAttribute('loading', 'lazy')
  }
})

test('the compatibility matrix is visible after scrolling', async ({ page }) => {
  await page.goto('/')

  const table = page.getByRole('table', { name: new RegExp(matrix.title) })
  await table.scrollIntoViewIfNeeded()
  await expect(table).toBeVisible()
  await expect(page.getByRole('rowheader')).toHaveCount(matrix.rows.length)
  await expect(page.getByRole('rowheader', { name: '历史消息拉取' })).toBeVisible()
  await expect(page.getByText(/可能违反 Discord 服务条款/)).toBeVisible()
})

test('status chips use the brand colour for full support', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.home-chip-full').first()).toContainText('完整')
  await expect(page.locator('.home-chip-partial').first()).toContainText('部分')
  await expect(page.locator('.home-chip-none').first()).toContainText('暂不支持')

  const brand = await tokenColor(page, '--brand')
  const brandSoft = await tokenColor(page, '--brand-soft')
  const colors = await page.evaluate(() => {
    const read = (selector: string) => {
      const style = getComputedStyle(document.querySelector(selector)!)
      return { color: style.color, background: style.backgroundColor }
    }
    return { full: read('.home-chip-full'), none: read('.home-chip-none') }
  })

  expect(colors.full.color).toBe(brand)
  expect(colors.full.background).toBe(brandSoft)
  expect(colors.none.color).not.toBe(brand)
  expect(colors.none.background).not.toBe(brandSoft)
})

test.describe('deploy prompt', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('the prompt is fully visible and wraps instead of truncating', async ({ page }) => {
    await page.goto('/')

    const prompt = page.locator('.home-prompt-card .cmd-text')
    await expect(prompt).toHaveCount(1)
    expect(await prompt.textContent()).toBe(deploy.prompt)
    expect(await prompt.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
  })

  test('the copy button writes the prompt and flips the label', async ({ page }) => {
    await page.goto('/')

    const card = page.locator('.home-prompt-card').first()
    const button = card.getByRole('button', { name: /复制/ })
    await expect(button).toHaveText('复制')

    await button.click()
    await expect(button).toHaveText('已复制')

    // The OS clipboard normalises newlines to the platform convention.
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard.replace(/\r\n/g, '\n')).toBe(deploy.prompt)

    await expect(button).toHaveText('复制', { timeout: 4000 })
  })
})

test('the closing block offers three pill CTAs', async ({ page }) => {
  await page.goto('/')

  const closingBlock = page.locator('.home-closing')
  await closingBlock.scrollIntoViewIfNeeded()
  await expect(closingBlock.getByRole('heading', { level: 2 })).toHaveText(closing.title)

  for (const action of closing.actions) {
    await expect(closingBlock.getByRole('link', { name: action.label })).toBeVisible()
    await expect(closingBlock.getByRole('link', { name: action.label })).toHaveAttribute(
      'href',
      action.href,
    )
  }
})

test.describe('deep links', () => {
  // base.css disables smooth scrolling for reduced motion, so the hash scroll
  // is instant and the assertion below is deterministic.
  test.use({ reducedMotion: 'reduce' })

  test('/#features lands on the capability section', async ({ page }) => {
    await page.goto('/#features')

    await expect(page.locator('#features')).toHaveCount(1)

    const heading = page.getByRole('heading', { level: 2, name: capabilities.title })
    await expect(heading).toBeInViewport()

    const box = await heading.boundingBox()
    // The sticky header is 66px tall; the anchor must not hide the heading.
    expect(box!.y).toBeGreaterThanOrEqual(66)
    expect(box!.y).toBeLessThan(300)
  })
})

test('a 360px wide viewport has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  await page.getByRole('table').scrollIntoViewIfNeeded()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  await page.locator('.home-closing').scrollIntoViewIfNeeded()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})

test('dark scheme renders a dark page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'only asserts the dark colour scheme')

  await page.goto('/')

  const colors = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    text: getComputedStyle(document.body).color,
  }))

  expect(relativeLuminance(colors.background)).toBeLessThan(0.2)
  expect(relativeLuminance(colors.text)).toBeGreaterThan(0.5)
})
