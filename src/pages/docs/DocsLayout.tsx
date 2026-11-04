import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import './docs.css'

type DocsLayoutProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

type CodeLang = 'bash' | 'powershell' | 'yaml'

const guides = [
  { to: '/docs/linux', label: 'Linux 一键部署' },
  { to: '/docs/windows', label: 'Windows 手动部署' },
]

/**
 * Command panel. The language tag comes from `.code-block[data-lang]`; the copy
 * button (shared `.cmd-copy` pill, positioned by `.docs-code-copy`) copies the
 * command verbatim and flips to `已复制` for 1.2s. Copying is best-effort: no
 * toast, no error UI.
 */
export function CodeBlock({ lang, children }: { lang: CodeLang; children: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard blocked or unavailable: stay in the idle state.
    }
  }

  return (
    <div className="docs-code">
      <div className="code-block docs-code-panel" data-lang={lang} data-testid="code-block">
        <code>{children}</code>
      </div>
      <button
        type="button"
        className="cmd-copy docs-code-copy"
        data-copied={copied ? 'true' : 'false'}
        onClick={copyCommand}
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  )
}

export default function DocsLayout({ eyebrow, title, description, children }: DocsLayoutProps) {
  return (
    <div className="container docs-shell">
      <div className="docs-shell-inner">
        <nav className="panel docs-side" aria-label="文档导航">
          <Link className="docs-side-link docs-side-back" to="/docs">
            ← 返回部署文档
          </Link>
          <p className="docs-side-group">Docs</p>
          {guides.map((guide) => (
            <NavLink
              key={guide.to}
              to={guide.to}
              className={({ isActive }) => (isActive ? 'docs-side-link active' : 'docs-side-link')}
            >
              {guide.label}
            </NavLink>
          ))}
          <p className="docs-side-group">Links</p>
          <Link className="docs-side-link" to="/downloads">
            客户端下载
          </Link>
          <Link className="docs-side-link" to="/#features">
            功能矩阵
          </Link>
        </nav>

        <article className="docs-article">
          <header className="docs-head">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lead">{description}</p>
          </header>
          <div className="prose">{children}</div>
        </article>
      </div>
    </div>
  )
}
