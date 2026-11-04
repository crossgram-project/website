import { expect, test } from '@playwright/test'

test.describe('deployment docs', () => {
  test('the index offers both deployment guides and the connection flow', async ({ page }) => {
    await page.goto('/docs')

    await expect(page.getByRole('heading', { level: 1, name: '部署文档' })).toBeVisible()
    const guides = page.getByRole('navigation', { name: '部署指南' })
    await expect(guides.getByRole('link', { name: /Linux 一键部署/ })).toHaveAttribute('href', '/docs/linux')
    await expect(guides.getByRole('link', { name: /Windows 手动部署/ })).toHaveAttribute('href', '/docs/windows')
    await expect(page.getByText('Automated', { exact: true })).toBeVisible()
    await expect(page.getByText('Manual', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '它是怎么连起来的' })).toBeVisible()
    await expect(page.getByText('Platform Bridge')).toBeVisible()
  })

  test('the index cards navigate to each guide', async ({ page }) => {
    await page.goto('/docs')

    await page.getByRole('link', { name: /Linux 一键部署/ }).click()
    await expect(page).toHaveURL(/\/docs\/linux$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Linux 一键部署' })).toBeVisible()

    await page.goBack()
    await page.getByRole('link', { name: /Windows 手动部署/ }).click()
    await expect(page).toHaveURL(/\/docs\/windows$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Windows 手动部署' })).toBeVisible()
  })

  test('a deep link to /docs/linux renders the installer commands', async ({ page }) => {
    await page.goto('/docs/linux')

    const installer = page.locator('.code-block code').first()
    await expect(installer).toContainText(
      'curl -fsSL https://raw.githubusercontent.com/std-microblock/crossgram/main/deploy/install.sh',
    )
    await expect(installer).toContainText('| sudo CROSSGRAM_PUBLIC_HOST=203.0.113.10 sh')
    await expect(page.locator('.code-block', { hasText: 'sudo crossgram-update' })).toHaveCount(1)
    await expect(
      page.locator('.code-block', { hasText: 'sudo crossgram-client-config --host 203.0.113.10' }),
    ).toHaveCount(1)
    await expect(page.getByText(/bearer token 应写入/)).toBeVisible()
  })

  test('command blocks carry a language tag left of the copy button', async ({ page }) => {
    await page.goto('/docs/windows')

    const panel = page.locator('.code-block').first()
    const tag = await panel.evaluate((element) => {
      const style = getComputedStyle(element, '::before')
      return { content: style.content, left: style.left, transform: style.textTransform }
    })
    expect(tag.content).toContain('powershell')
    expect(tag.transform).toBe('uppercase')
    expect(tag.left).not.toBe('auto')
    expect(Number.parseFloat(tag.left)).toBeLessThan(24)

    const panelBox = await panel.boundingBox()
    const buttonBox = await page.locator('.docs-code-copy').first().boundingBox()
    expect(panelBox).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    expect(buttonBox!.x).toBeGreaterThan(panelBox!.x + panelBox!.width / 2)
  })

  test('the copy button copies the command and confirms it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/docs/linux')

    const wrapper = page.locator('.docs-code').first()
    const button = wrapper.getByRole('button', { name: '复制' })
    await button.click()

    await expect(wrapper.getByRole('button', { name: '已复制' })).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('curl -fsSL https://raw.githubusercontent.com/std-microblock/crossgram')
    expect(copied).toContain('| sudo CROSSGRAM_PUBLIC_HOST=203.0.113.10 sh')

    // Back to the idle label after the 1.2s confirmation window.
    await expect(wrapper.getByRole('button', { name: '复制' })).toBeVisible({ timeout: 3000 })
  })

  test('the sidebar switches between the guides', async ({ page }) => {
    await page.goto('/docs/linux')

    const side = page.getByRole('navigation', { name: '文档导航' })
    await expect(side.getByRole('link', { name: 'Linux 一键部署' })).toHaveClass(/active/)

    await side.getByRole('link', { name: 'Windows 手动部署' }).click()
    await expect(page).toHaveURL(/\/docs\/windows$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Windows 手动部署' })).toBeVisible()
    await expect(side.getByRole('link', { name: 'Windows 手动部署' })).toHaveClass(/active/)
    await expect(
      page.locator('.code-block', { hasText: 'git clone https://github.com/std-microblock/crossgram.git' }),
    ).toHaveCount(1)

    await side.getByRole('link', { name: 'Linux 一键部署' }).click()
    await expect(page).toHaveURL(/\/docs\/linux$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Linux 一键部署' })).toBeVisible()
  })

  test('a 360px viewport has no horizontal overflow and long commands scroll in place', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion')
    await page.setViewportSize({ width: 360, height: 720 })

    for (const path of ['/docs', '/docs/linux', '/docs/windows']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(overflow, `${path} must not scroll horizontally`).toBe(false)
    }

    await page.goto('/docs/linux')
    const side = page.getByRole('navigation', { name: '文档导航' })
    await expect(side.getByRole('link', { name: 'Linux 一键部署' })).toBeVisible()
    const installer = page.locator('.code-block').first()
    const scrollsInside = await installer.evaluate((node) => node.scrollWidth > node.clientWidth)
    expect(scrollsInside, 'the long installer command scrolls inside its own block').toBe(true)
  })

  test('the article stays readable on the dark colour scheme', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'dark-only assertion')
    await page.goto('/docs/linux')

    const metrics = await page.evaluate(() => {
      const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const channel = (value: number) => {
        const ratio = value / 255
        return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
      }
      const luminance = (rgb: number[]) =>
        0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
      const paragraph = document.querySelector('.prose p')
      if (!paragraph) throw new Error('no .prose paragraph rendered')
      const text = luminance(parse(getComputedStyle(paragraph).color))
      const background = luminance(parse(getComputedStyle(document.body).backgroundColor))
      return {
        text,
        background,
        ratio: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
      }
    })

    expect(metrics.background).toBeLessThan(0.2)
    expect(metrics.text).toBeGreaterThan(metrics.background)
    expect(metrics.ratio).toBeGreaterThan(4.5)
  })
})
