import { useState } from 'react'
import {
  architectureLabel,
  assetFormat,
  assetTarget,
  brandOptions,
  clientPlatforms,
  filterAssets,
  isUpdatePackage,
  osLabel,
  pickBrand,
  pickPlatform,
  recommendAsset,
  releasesUrl,
  repoUrl,
} from './model'
import type { ReleaseClient } from './model'

type Props = { client: ReleaseClient }

export default function ClientPicker({ client }: Props) {
  const platforms = clientPlatforms(client)

  const [platformChoice, setPlatformChoice] = useState<string | null>(null)
  const platform = pickPlatform(platforms, platformChoice)

  const platformAssets = platform ? client.assets.filter((asset) => asset.platform === platform) : []
  const brands = brandOptions(platformAssets)

  const [brandChoice, setBrandChoice] = useState<string | null>(null)
  const brand = pickBrand(brands, brandChoice)

  const candidates = platform && brand ? filterAssets(client.assets, platform, brand) : []
  const recommended = recommendAsset(candidates)

  return (
    <section className="dl-picker" aria-label={`${client.name} 下载选择器`}>
      <header className="dl-picker-head">
        <div className="dl-picker-id">
          {client.release && <p className="meta">{client.release}</p>}
          <h2>{client.name}</h2>
          <p className="dl-picker-desc">{client.description}</p>
        </div>
        <a className="dl-versions" href={releasesUrl(client)} target="_blank" rel="noreferrer">
          所有版本<span aria-hidden="true"> →</span>
        </a>
      </header>

      {recommended ? (
        <>
          <div className="dl-controls">
            <div className="dl-row">
              <span className="dl-row-label">系统</span>
              <div className="dl-chips" role="group" aria-label="系统">
                {platforms.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="dl-choice"
                    aria-pressed={item === platform}
                    onClick={() => setPlatformChoice(item)}
                  >
                    {osLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            {brands.length > 1 && (
              <div className="dl-row">
                <span className="dl-row-label">品牌渠道</span>
                <div className="dl-chips" role="group" aria-label="品牌渠道">
                  {brands.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="dl-choice"
                      aria-pressed={item.id === brand}
                      onClick={() => setBrandChoice(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel dl-recommend">
            <div className="dl-recommend-copy">
              <p className="dl-recommend-label">推荐下载</p>
              <p className="dl-recommend-title">{recommended.brandLabel}</p>
              <p className="dl-recommend-file">{recommended.name}</p>
              <p className="dl-recommend-meta">
                {client.release ?? '未发布'} · {recommended.size} · {assetFormat(recommended.name)} ·{' '}
                {architectureLabel(recommended.architecture)}
              </p>
            </div>

            <dl className="dl-stats">
              <div className="dl-stat">
                <dt>构建</dt>
                <dd>{candidates.length}</dd>
              </div>
              <div className="dl-stat">
                <dt>大小</dt>
                <dd>{recommended.size}</dd>
              </div>
              <div className="dl-stat">
                <dt>格式</dt>
                <dd>{assetFormat(recommended.name)}</dd>
              </div>
              <div className="dl-stat">
                <dt>目标</dt>
                <dd>{assetTarget(recommended)}</dd>
              </div>
            </dl>

            <a className="btn btn-primary dl-download" href={recommended.url} download>
              下载
            </a>
          </div>

          <table className="dl-table">
            <caption>全部构建 · {candidates.length}</caption>
            <thead>
              <tr>
                <th scope="col">文件</th>
                <th scope="col">大小</th>
                <th scope="col">架构</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((asset) => (
                <tr key={asset.url} data-recommended={asset === recommended}>
                  <td className="dl-table-file">
                    <a className="dl-file" href={asset.url} aria-label={`下载 ${asset.name}`} download>
                      {asset.name}
                    </a>
                    {asset === recommended && <span className="dl-flag dl-flag-rec">推荐</span>}
                    {isUpdatePackage(asset) && <span className="dl-flag">更新包</span>}
                  </td>
                  <td>{asset.size}</td>
                  <td>{architectureLabel(asset.architecture)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="panel dl-empty">
          <p className="dl-empty-label">即将发布</p>
          <p className="muted">这个客户端还没有可下载的构建，Release 发布后会自动出现在这里。</p>
          <a className="btn" href={repoUrl(client)} target="_blank" rel="noreferrer">
            在 GitHub 查看进度
          </a>
        </div>
      )}
    </section>
  )
}
