import { useRef, useState } from 'react'
import releases from '../data/releases.json'
import Backdrop from '../components/Backdrop'
import ClientPicker from './downloads/ClientPicker'
import PlatformGlyph from './downloads/PlatformGlyph'
import {
  buildsForPlatform,
  categoriesOf,
  clientBuildCount,
  clientsForPlatform,
  defaultPlatform,
  formatUpdatedAt,
  isReleased,
  pickPlatform,
  platformsOf,
} from './downloads/model'
import type { Platform, ReleaseCatalog, ReleaseClient } from './downloads/model'
import './downloads/downloads.css'

const catalog = releases as ReleaseCatalog

type Props = {
  clients?: ReleaseClient[]
  /** Raw catalog timestamp; rendered as a formatted UTC line. */
  updatedAt?: string
}

export default function Downloads({ clients = catalog.clients, updatedAt = catalog.updatedAt }: Props) {
  const platforms = platformsOf(clients)

  const [platformChoice, setPlatformChoice] = useState<Platform | null>(null)
  const platform = pickPlatform(platforms, platformChoice ?? defaultPlatform(clients))

  const visibleClients = platform ? clientsForPlatform(clients, platform) : []
  const buildCount = platform ? buildsForPlatform(clients, platform) : 0

  const [clientChoice, setClientChoice] = useState<string | null>(null)
  const client =
    visibleClients.find((item) => item.id === clientChoice) ??
    visibleClients.find(isReleased) ??
    visibleClients[0]

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const syncedAt = formatUpdatedAt(updatedAt)

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = platforms.length - 1
    let next: number | null = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    setPlatformChoice(platforms[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="dl-page">
      <div className="dl-hero">
        <Backdrop />
        <div className="container">
          <header className="page-head dl-page-head">
            <p className="eyebrow">客户端发行版</p>
            <h1>下载客户端</h1>
            <p className="lead">
              选择客户端 → 系统 → 品牌渠道，得到一个推荐构建；全部资产都在对应的 GitHub Release 里。
            </p>
            {syncedAt && <p className="meta dl-synced">下载数据同步于 {syncedAt}</p>}
          </header>
        </div>

        <div className="container">
          <section className="card dl-shell" aria-label="下载选择器">
            <div className="dl-toolbar">
              <div className="dl-tabs" role="tablist" aria-label="客户端平台">
                {platforms.map((item, index) => (
                  <button
                    key={item}
                    ref={(element) => {
                      tabRefs.current[index] = element
                    }}
                    type="button"
                    role="tab"
                    id={`dl-tab-${item}`}
                    className="dl-tab"
                    aria-selected={item === platform}
                    aria-controls="dl-panel"
                    tabIndex={item === platform ? 0 : -1}
                    onClick={() => setPlatformChoice(item)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="meta dl-toolbar-count">
                {visibleClients.length} 个客户端 · {buildCount} 个构建
              </p>
            </div>

            <div
              className="dl-panel"
              id="dl-panel"
              role="tabpanel"
              aria-labelledby={platform ? `dl-tab-${platform}` : undefined}
            >
              <ul className="dl-tiles">
                {visibleClients.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="dl-tile"
                      aria-pressed={item.id === client?.id}
                      onClick={() => setClientChoice(item.id)}
                    >
                      <span className="dl-tile-top">
                        <span className="dl-tile-index" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="dl-tile-glyph">
                          <PlatformGlyph platform={categoriesOf(item)[0]} />
                        </span>
                      </span>
                      <span className="dl-tile-name">{item.name}</span>
                      <span className="dl-tile-meta">
                        {isReleased(item) && item.release ? item.release : '即将发布'} ·{' '}
                        {clientBuildCount(item)} 个构建
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dl-detail">
              {client ? (
                <ClientPicker key={client.id} client={client} />
              ) : (
                <p className="muted dl-no-client">这个平台下暂时没有客户端。</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
