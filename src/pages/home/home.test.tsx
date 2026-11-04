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

  it('frames the hero screenshot in a titled window', () => {
    const { container } = renderHome()
    const bar = screen.getByText(hero.shot.bar)
    expect(bar.className).toBe('window-bar')

    const window_ = bar.closest('.window') as HTMLElement
    expect(window_.className).toContain('home-hero-window')
    expect(window_.className).toContain('hero-enter')

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

  it('renders one command row per deploy card with the exact command', () => {
    const { container } = renderHome()
    const cards = Array.from(container.querySelectorAll('.home-deploy-card'))
    expect(cards).toHaveLength(deploy.cards.length)

    cards.forEach((card, index) => {
      expect(card.querySelector('h3')!.textContent).toBe(deploy.cards[index].title)
      expect(card.querySelector('.cmd-text')!.textContent).toBe(deploy.cards[index].command)
    })

    expect(deploy.cards[0].command).toContain('CROSSGRAM_PUBLIC_HOST=')
    expect(deploy.cards[1].command).toContain('git clone https://github.com/std-microblock/crossgram.git')
  })

  it('copies a command with the copy button and reverts the label after 1.2s', async () => {
    vi.useFakeTimers()
    const writeText = stubClipboard()
    const { container } = renderHome()

    const button = container.querySelector('.home-deploy-card .cmd-copy') as HTMLButtonElement
    expect(button.textContent).toBe('复制')

    await act(async () => {
      fireEvent.click(button)
    })

    expect(writeText).toHaveBeenCalledWith(deploy.cards[0].command)
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
