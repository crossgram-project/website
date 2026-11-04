import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Backdrop from '../components/Backdrop'
import {
  capabilities,
  closing,
  deploy,
  hero,
  matrix,
  statusGlyph,
  statusLabel,
  statusShort,
  type Cta,
  type MatrixStatus,
  type Screenshot,
} from './home/content'
import './home/home.css'

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 2.2v7.6m0 0 3-3m-3 3-3-3M3 13h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CtaLink({ cta, primary = false }: { cta: Cta & { primary?: boolean }; primary?: boolean }) {
  const className = primary || cta.primary ? 'btn btn-primary' : 'btn'

  if (cta.external) {
    return (
      <a className={className} href={cta.href} target="_blank" rel="noreferrer">
        {cta.label}
      </a>
    )
  }

  return (
    <Link className={className} to={cta.href}>
      {cta.label}
    </Link>
  )
}

function WindowShot({
  shot,
  className = '',
  loading = 'lazy',
}: {
  shot: Screenshot
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  return (
    <div className={`window ${className}`.trim()}>
      <div className="window-bar">{shot.bar}</div>
      <img
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        loading={loading}
        decoding="async"
      />
    </div>
  )
}

function CommandRow({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="cmd">
      <code className="cmd-text">{command}</code>
      <button
        type="button"
        className="cmd-copy"
        data-copied={copied}
        aria-label={copied ? `${label}，已复制` : label}
        onClick={copy}
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <Backdrop />
        <div className="container home-hero-inner">
          <div className="home-hero-copy hero-enter">
            <p className="home-badge">
              <span aria-hidden="true">✦</span>
              {hero.badge}
            </p>
            <h1 className="display home-hero-title">
              {hero.title}
              <span className="home-hero-line">{hero.titleLine}</span>
            </h1>
            <p className="lead home-hero-lead">{hero.lead}</p>
            <div className="home-actions">
              <Link className="btn btn-primary" to={hero.primaryCta.href}>
                <DownloadIcon />
                {hero.primaryCta.label}
              </Link>
              <CtaLink cta={hero.secondaryCta} />
            </div>
          </div>
          <WindowShot shot={hero.shot} className="home-hero-window hero-enter hero-enter-delay" loading="eager" />
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">{capabilities.eyebrow}</p>
            <h2>{capabilities.title}</h2>
            <p className="lead">{capabilities.lead}</p>
          </div>
          <div className="home-cards">
            {capabilities.cards.map((card) => (
              <article key={card.id} className="card card-hover home-card">
                <div className="home-card-copy">
                  <h3>{card.title}</h3>
                  <p className="muted">{card.body}</p>
                </div>
                <figure className="home-card-media">
                  <img
                    src={card.shot.src}
                    alt={card.shot.alt}
                    width={card.shot.width}
                    height={card.shot.height}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">{matrix.eyebrow}</p>
            <h2 id="compat-title">{matrix.title}</h2>
            <p className="lead">{matrix.lead}</p>
          </div>
          <div className="card home-table-card">
            <ul className="home-legend" aria-label="支持程度">
              {(Object.keys(statusLabel) as MatrixStatus[]).map((status) => (
                <li key={status}>
                  <span className={`status-${status}`} aria-hidden="true">
                    {statusGlyph[status]}
                  </span>
                  {statusLabel[status]}
                </li>
              ))}
            </ul>
            <div className="home-table-scroll">
              <table className="table home-table" aria-labelledby="compat-title">
                <thead>
                  <tr>
                    <th scope="col">能力</th>
                    {matrix.columns.map((column) => (
                      <th key={column} scope="col" className="home-status-cell">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.capability}>
                      <th scope="row">{row.capability}</th>
                      {row.support.map((status, index) => (
                        <td
                          key={matrix.columns[index]}
                          className="home-status-cell"
                          aria-label={statusLabel[status]}
                        >
                          <span className={`home-chip home-chip-${status}`}>
                            <span aria-hidden="true">{statusGlyph[status]}</span>
                            {statusShort[status]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted home-footnote">{matrix.footnote}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">{deploy.eyebrow}</p>
            <h2>{deploy.title}</h2>
            <p className="lead">{deploy.lead}</p>
          </div>
          <div className="home-deploy-grid">
            {deploy.cards.map((card) => (
              <article key={card.id} className="card home-deploy-card">
                <h3 className="mono">{card.title}</h3>
                <p className="muted">{card.body}</p>
                <CommandRow command={card.command} label={`复制 ${card.title} 命令`} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-closing">
        <div className="container home-closing-inner">
          <h2>{closing.title}</h2>
          <p className="lead">{closing.lead}</p>
          <div className="home-actions">
            {closing.actions.map((action) => (
              <CtaLink key={action.label} cta={action} primary={action.primary} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
