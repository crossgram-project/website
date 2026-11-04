import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import {
  capabilities,
  closing,
  deploy,
  hero,
  matrix,
  statusGlyph,
  statusLabel,
  statusShort,
  type MatrixStatus,
} from './content'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// jsdom has no canvas implementation; the hero Backdrop then renders its CSS
// gradient fallback, which is all the DOM assertions below care about.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
})

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Home />
    </MemoryRouter>,
  )
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

const statuses = Object.keys(statusLabel) as MatrixStatus[]

describe('Home page', () => {
  it('renders the two-line display headline as the only h1', () => {
    renderHome()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)

    const h1 = headings[0]
    expect(h1.className).toContain('display')
    expect(h1.textContent).toContain(hero.title)
    expect(h1.querySelector('.home-hero-line')!.textContent).toBe(hero.titleLine)
  })

  it('shows the platform badge above the headline', () => {
    const { container } = renderHome()
    const badge = container.querySelector('.home-badge')!
    expect(badge.textContent).toContain(hero.badge)
    expect(badge.querySelector('span')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('points the hero CTAs at downloads and docs', () => {
    renderHome()
    const primary = screen.getByRole('link', { name: hero.primaryCta.label })
    const secondary = screen.getByRole('link', { name: hero.secondaryCta.label })

    expect(primary.getAttribute('href')).toBe('/downloads')
    expect(secondary.getAttribute('href')).toBe('/docs')
    expect(primary.className).toContain('btn-primary')
    expect(primary.querySelector('svg')).not.toBeNull()
  })

  it('shows the hero screenshot in a plain rounded frame with no window chrome', () => {
    const { container } = renderHome()
    const window_ = container.querySelector('.window.home-hero-window') as HTMLElement
    expect(window_).not.toBeNull()
    expect(window_.className).toContain('hero-enter')
    expect(window_.querySelector('.window-bar')).toBeNull()

    const image = window_.querySelector('img')!
    expect(image.getAttribute('src')).toBe(hero.shot.src)
    expect(image.getAttribute('alt')).toBe(hero.shot.alt)
    expect(image.getAttribute('loading')).toBe('eager')

    expect(container.querySelectorAll('.backdrop')).toHaveLength(1)
    expect(container.querySelector('.backdrop-canvas')).not.toBeNull()
  })

  it('renders the four capability cards with lazy screenshots', () => {
    const { container } = renderHome()
    const cards = Array.from(container.querySelectorAll('#features article.card'))
    expect(cards).toHaveLength(capabilities.cards.length)

    capabilities.cards.forEach((card, index) => {
      const element = cards[index]
      expect(element.querySelector('h3')!.textContent).toBe(card.title)

      const image = element.querySelector('img')!
      expect(image.getAttribute('src')).toBe(card.shot.src)
      expect(image.getAttribute('alt')).toBe(card.shot.alt)
      expect(image.getAttribute('loading')).toBe('lazy')
      expect(image.getAttribute('alt')!.trim()).not.toBe('')
    })
  })

  it('renders every capability row of the compatibility matrix with status glyphs', () => {
    renderHome()
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('rowheader')
    expect(rows).toHaveLength(matrix.rows.length)

    for (const row of matrix.rows) {
      const header = within(table).getByRole('rowheader', { name: row.capability })
      expect(header.textContent).toBe(row.capability)

      const cells = Array.from(header.closest('tr')!.querySelectorAll('td'))
      expect(cells).toHaveLength(matrix.columns.length)
      cells.forEach((cell, index) => {
        const status = row.support[index]
        const chip = cell.querySelector('.home-chip')!
        expect(chip.classList.contains(`home-chip-${status}`)).toBe(true)
        expect(chip.textContent).toContain(statusShort[status])
        expect(cell.getAttribute('aria-label')).toBe(statusLabel[status])
      })
    }
  })

  it('explains the status chips in a legend above the table', () => {
    const { container } = renderHome()
    const items = Array.from(container.querySelectorAll('.home-legend li'))
    expect(items.map((item) => item.textContent)).toEqual(
      statuses.map((status) => `${statusGlyph[status]}${statusLabel[status]}`),
    )
  })

  it('uses only the three documented status levels', () => {
    expect(statuses).toEqual(['full', 'partial', 'none'])
    expect(statuses.map((status) => statusGlyph[status])).toEqual(['●', '◐', '—'])
  })

  it('offers one copyable deploy prompt instead of shell commands', () => {
    const { container } = renderHome()
    const cards = Array.from(container.querySelectorAll('.home-prompt-card'))
    expect(cards).toHaveLength(1)

    const prompt = cards[0].querySelector('.cmd-text')!.textContent
    expect(prompt).toBe(deploy.prompt)
    expect(deploy.prompt).toContain('CROSSGRAM_PUBLIC_HOST=')
    expect(deploy.prompt).toContain('crossgram-client-config')
    expect(deploy.prompt).toContain('https://crossgram.microblock.cc/docs/linux')
    expect(cards[0].querySelector('.cmd-copy')).not.toBeNull()
    expect(screen.getByRole('link', { name: /查看完整文档/ }).getAttribute('href')).toBe('/docs')
  })

  it('copies the deploy prompt with the copy button and reverts the label after 1.2s', async () => {
    vi.useFakeTimers()
    const writeText = stubClipboard()
    const { container } = renderHome()

    const button = container.querySelector('.home-prompt-card .cmd-copy') as HTMLButtonElement
    expect(button.textContent).toBe('复制')

    await act(async () => {
      fireEvent.click(button)
    })

    expect(writeText).toHaveBeenCalledWith(deploy.prompt)
    expect(button.textContent).toBe('已复制')
    expect(button.getAttribute('data-copied')).toBe('true')

    act(() => {
      vi.advanceTimersByTime(1300)
    })

    expect(button.textContent).toBe('复制')
    expect(button.getAttribute('data-copied')).toBe('false')
  })

  it('offers the three closing links', () => {
    renderHome()
    expect(screen.getByRole('link', { name: '查看部署教程' }).getAttribute('href')).toBe('/docs')
    expect(screen.getByRole('link', { name: '客户端下载' }).getAttribute('href')).toBe('/downloads')

    const github = screen.getByRole('link', { name: 'GitHub' })
    expect(github.getAttribute('href')).toBe(closing.actions[2].href)
    expect(github.getAttribute('target')).toBe('_blank')
  })

  it('exposes the stable #features anchor used by the docs sidebar', () => {
    const { container } = renderHome()
    const anchor = container.querySelector('#features')
    expect(anchor).not.toBeNull()
    expect(anchor!.tagName).toBe('SECTION')
    expect(anchor!.querySelectorAll('article')).toHaveLength(capabilities.cards.length)
  })
})
