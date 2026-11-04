import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DocsIndex from './DocsIndex'
import DocsLinux from './DocsLinux'
import DocsWindows from './DocsWindows'

const installerCommand = `curl -fsSL https://raw.githubusercontent.com/std-microblock/crossgram/main/deploy/install.sh \\
  | sudo CROSSGRAM_PUBLIC_HOST=203.0.113.10 sh`

function renderPage(path: string, page: ReactElement) {
  return render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>)
}

function stubClipboard() {
  const writeText = vi.fn((_text: string) => Promise.resolve())
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}

afterEach(() => {
  cleanup()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
})

describe('DocsLinux', () => {
  it('renders the one-line installer with the public host variable', () => {
    renderPage('/docs/linux', <DocsLinux />)

    const installer = screen.getByText(/CROSSGRAM_PUBLIC_HOST=203\.0\.113\.10/)
    expect(installer.tagName).toBe('CODE')
    expect(installer.closest('.code-block')).not.toBeNull()
    expect(installer.textContent).toContain(
      'https://raw.githubusercontent.com/std-microblock/crossgram/main/deploy/install.sh',
    )
  })

  it('keeps the update and service commands', () => {
    renderPage('/docs/linux', <DocsLinux />)

    expect(screen.getByText('sudo crossgram-update').tagName).toBe('CODE')
    const status = screen.getByText(/sudo systemctl status crossgram/)
    expect(status.textContent).toContain('sudo journalctl -u crossgram -f')
    expect(screen.getByText(/sudo crossgram-client-config --host 203\.0\.113\.10/)).toBeTruthy()
  })

  it('shows the heading, the sidebar guide link and the login steps', () => {
    renderPage('/docs/linux', <DocsLinux />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Linux 一键部署')
    expect(screen.getByText('LINUX / DEPLOYMENT')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '文档导航' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Linux 一键部署' }).className).toContain('active')
    expect(screen.getByRole('link', { name: 'Windows 手动部署' }).className).not.toContain('active')
    expect(screen.getByText(/每 30 秒轮换的六位登录码/)).toBeTruthy()
  })
})

describe('DocsWindows', () => {
  it('renders the git clone build commands', () => {
    renderPage('/docs/windows', <DocsWindows />)

    const clone = screen.getByText(/git clone https:\/\/github\.com\/std-microblock\/crossgram\.git/)
    expect(clone.tagName).toBe('CODE')
    expect(clone.textContent).toContain('yarn install')
    expect(clone.textContent).toContain('yarn build')
  })

  it('documents the QQNT bridge bearer token', () => {
    renderPage('/docs/windows', <DocsWindows />)

    expect(screen.getByText(/并记录 bearer token/)).toBeTruthy()
    const tokenVar = screen.getByText('QQNT_BRIDGE_TOKEN')
    expect(tokenVar.tagName).toBe('CODE')
    const endpointUsages = screen
      .getAllByText(/http:\/\/127\.0\.0\.1:18767\/v1/)
      .map((node) => node.textContent?.trim())
    expect(endpointUsages).toContain('http://127.0.0.1:18767/v1')
  })

  it('keeps the app.yml sample and the binary patch command', () => {
    const { container } = renderPage('/docs/windows', <DocsWindows />)

    const samples = Array.from(container.querySelectorAll('.code-block code')).map(
      (node) => node.textContent ?? '',
    )
    const appYml = samples.find((text) => text.includes('- id: mtproto01'))
    expect(appYml).toBeDefined()
    expect(appYml).toContain('rsaKeyPath: ./data/rsa-key.json')
    expect(appYml).toContain("name: '@mtproto-relay/platform-qqnt'")

    const patch = samples.find((text) => text.includes('binary_patch/patch-tdesktop.cjs'))
    expect(patch).toContain('--port 4430 "C:\\Path\\To\\Telegram.exe"')
  })
})

describe('DocsIndex', () => {
  it('links to both deployment guides', () => {
    renderPage('/docs', <DocsIndex />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('部署文档')
    expect(screen.getByRole('link', { name: /Linux 一键部署/ }).getAttribute('href')).toBe('/docs/linux')
    expect(screen.getByRole('link', { name: /Windows 手动部署/ }).getAttribute('href')).toBe('/docs/windows')
  })

  it('labels the cards with mono metadata and explains the flow', () => {
    const { container } = renderPage('/docs', <DocsIndex />)

    expect(screen.getByText('Automated')).toBeTruthy()
    expect(screen.getByText('Manual')).toBeTruthy()
    expect(container.querySelectorAll('.docs-guide.card')).toHaveLength(2)
    expect(container.querySelector('.backdrop')).not.toBeNull()
    expect(container.querySelector('.backdrop-canvas')).not.toBeNull()
    expect(container.querySelector('.panel.docs-flow-block')).not.toBeNull()
    expect(screen.getByRole('list').tagName).toBe('OL')
    for (const label of ['聊天平台', 'Platform Bridge', 'CrossGram Server', '你的客户端']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })
})

describe('code blocks', () => {
  const pages: Array<[string, ReactElement]> = [
    ['/docs/linux', <DocsLinux />],
    ['/docs/windows', <DocsWindows />],
  ]

  it.each(pages)('every block in %s holds a language tag and copyable text', (_path, page) => {
    const { container, unmount } = renderPage(_path, page)

    const blocks = Array.from(container.querySelectorAll('.code-block'))
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(['bash', 'powershell', 'yaml']).toContain(block.getAttribute('data-lang'))
      const code = block.querySelector('code')
      expect(code).not.toBeNull()
      expect((code?.textContent ?? '').trim().length).toBeGreaterThan(0)
    }

    unmount()
  })

  it('tags each Windows block with its own language', () => {
    const { container } = renderPage('/docs/windows', <DocsWindows />)

    const langs = Array.from(container.querySelectorAll('.code-block')).map((block) =>
      block.getAttribute('data-lang'),
    )
    expect(langs).toEqual(['powershell', 'yaml', 'bash'])
  })

  it('copies the exact command and flips the button label', async () => {
    const writeText = stubClipboard()
    const { container } = renderPage('/docs/linux', <DocsLinux />)

    const wrapper = container.querySelector('.docs-code')
    expect(wrapper).not.toBeNull()
    const button = within(wrapper as HTMLElement).getByRole('button', { name: '复制' })

    fireEvent.click(button)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(installerCommand))
    await waitFor(() => expect(button.textContent).toBe('已复制'))
    expect(button.getAttribute('data-copied')).toBe('true')

    await waitFor(() => expect(button.textContent).toBe('复制'), { timeout: 2600, interval: 50 })
    expect(button.getAttribute('data-copied')).toBe('false')
  })

  it('stays quiet when the clipboard is unavailable', async () => {
    const { container } = renderPage('/docs/linux', <DocsLinux />)

    const wrapper = container.querySelector('.docs-code') as HTMLElement
    const button = within(wrapper).getByRole('button', { name: '复制' })
    fireEvent.click(button)

    await waitFor(() => expect(button.textContent).toBe('复制'))
    expect(button.getAttribute('data-copied')).toBe('false')
  })
})
