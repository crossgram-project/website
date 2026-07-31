import { useMemo, useState } from 'react'
import { FaAndroid, FaApple, FaChevronDown, FaGithub, FaLinux, FaWindows } from 'react-icons/fa6'
import { TbDownload, TbLayersIntersect } from 'react-icons/tb'

type Asset = { name: string; platform: string; architecture: string; brand: string; brandLabel: string; size: string; url: string }
type Client = { id: string; name: string; description: string; repo: string; release: string | null; assets: Asset[] }

const platformIcon: Record<string, typeof FaWindows> = { Windows: FaWindows, Linux: FaLinux, macOS: FaApple, iOS: FaApple, Android: FaAndroid }
const accents = ['acid', 'cyan', 'violet', 'pink']
const platformOrder = ['Desktop', 'Android', 'Windows', 'macOS', 'Linux', 'iOS', 'Other']
const androidClientIds = new Set(['telegram', 'nagram', 'nnngram', 'nullgram', 'mercurygram', 'forkgram', 'telegram-x'])

function clientPlatforms(client: Client) {
  const platforms = [...new Set(client.assets.map(asset => asset.platform))]
  if (platforms.length) return platforms
  if (androidClientIds.has(client.id)) return ['Android']
  return ['Desktop']
}

function Choice({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className={active ? 'choice active' : 'choice'} onClick={onClick}>{children}</button>
}

export default function DownloadExplorer({ clients }: { clients: Client[] }) {
  const [selectedClient, setSelectedClient] = useState(clients.find(client => client.assets.length)?.id ?? clients[0]?.id)
  const client = clients.find(item => item.id === selectedClient) ?? clients[0]
  const availablePlatforms = useMemo(() => [...new Set(clients.flatMap(clientPlatforms))]
    .sort((a, b) => platformOrder.indexOf(a) - platformOrder.indexOf(b)), [clients])
  const [clientPlatformChoice, setClientPlatformChoice] = useState<string | null>(null)
  const clientPlatform = clientPlatformChoice && availablePlatforms.includes(clientPlatformChoice)
    ? clientPlatformChoice
    : (clientPlatforms(client).find(item => availablePlatforms.includes(item)) ?? availablePlatforms[0])
  const visibleClients = clients.filter(item => clientPlatforms(item).includes(clientPlatform))
  const platforms = useMemo(() => [...new Set(client?.assets.map(asset => asset.platform) ?? [])], [client])
  const [platformChoice, setPlatformChoice] = useState<string | null>(null)
  const platform = platforms.includes(platformChoice ?? '') ? platformChoice! : platforms[0]
  const platformAssets = client?.assets.filter(asset => asset.platform === platform) ?? []
  const brands = [...new Map(platformAssets.map(asset => [asset.brand, asset.brandLabel])).entries()]
  const [brandChoice, setBrandChoice] = useState<string | null>(null)
  const brand = brands.some(([id]) => id === brandChoice) ? brandChoice! : (brands.find(([id]) => id === 'cross')?.[0] ?? brands[0]?.[0])
  const candidates = platformAssets.filter(asset => asset.brand === brand)
  const recommended = candidates.find(asset => asset.architecture === 'Universal') ?? candidates.find(asset => asset.architecture === 'ARM64') ?? candidates.find(asset => asset.architecture === 'x64') ?? candidates[0]
  const PlatformIcon = platformIcon[platform] ?? TbLayersIntersect

  const selectClient = (id: string) => {
    setSelectedClient(id)
    setPlatformChoice(null)
    setBrandChoice(null)
  }

  const selectClientPlatform = (nextPlatform: string) => {
    setClientPlatformChoice(nextPlatform)
    const currentStillVisible = clientPlatforms(client).includes(nextPlatform)
    if (!currentStillVisible) {
      const nextClient = clients.find(item => clientPlatforms(item).includes(nextPlatform) && item.assets.length)
        ?? clients.find(item => clientPlatforms(item).includes(nextPlatform))
      if (nextClient) selectClient(nextClient.id)
    }
  }

  if (!client) return null
  return (
    <div className="download-explorer">
      <div className="client-browser" data-reveal>
        <div className="client-platforms" role="tablist" aria-label="客户端平台">
          {availablePlatforms.map(item => {
            const Icon = platformIcon[item] ?? TbLayersIntersect
            const count = clients.filter(client => clientPlatforms(client).includes(item)).length
            return <button
              className={item === clientPlatform ? 'platform-tab active' : 'platform-tab'}
              onClick={() => selectClientPlatform(item)}
              role="tab"
              aria-selected={item === clientPlatform}
              key={item}
            ><Icon /><span>{item}</span><small>{count}</small></button>
          })}
        </div>
        <div className="client-grid" aria-label={`${clientPlatform} 客户端`}>
          {visibleClients.map((item) => {
            const index = clients.indexOf(item)
            return <button
              className={`client-card ${item.id === client.id ? 'selected' : ''}`}
              onClick={() => selectClient(item.id)}
              data-tilt
              key={item.id}
            >
              <span className={`client-glyph ${accents[index % accents.length]}`}><TbLayersIntersect /></span>
              <span className="client-copy"><strong>{item.name}</strong><small>{item.description}</small></span>
              <em>{item.release ?? 'SOON'}</em>
            </button>
          })}
        </div>
      </div>

      <section className="picker" aria-label={`${client.name} 下载选择器`} data-reveal>
        <div className="picker-head">
          <div><small>SELECTED CLIENT</small><h2>{client.name}</h2><p>{client.description}</p></div>
          <a href={`https://github.com/${client.repo}/releases`}><FaGithub /> 所有版本</a>
        </div>
        {client.assets.length ? (
          <>
            <div className="pick-row">
              <span>01 / 系统</span><div>{platforms.map(item => { const Icon = platformIcon[item] ?? TbLayersIntersect; return <Choice key={item} active={item === platform} onClick={() => { setPlatformChoice(item); setBrandChoice(null) }}><Icon />{item}</Choice> })}</div>
            </div>
            {brands.length > 1 && <div className="pick-row"><span>02 / 品牌渠道</span><div>{brands.map(([id, label]) => <Choice key={id} active={id === brand} onClick={() => setBrandChoice(id)}>{label}</Choice>)}</div></div>}
            <div className="recommend">
              <div className="recommend-icon"><PlatformIcon /></div>
              <div><small>RECOMMENDED FOR MOST USERS</small><h3>{recommended?.brandLabel} · {recommended?.architecture}</h3><p>{recommended?.name} <i>·</i> {recommended?.size}</p></div>
              {recommended && <a href={recommended.url}><TbDownload /> 下载</a>}
            </div>
            {candidates.length > 1 && (
              <details>
                <summary>其他架构与安装格式 <FaChevronDown /></summary>
                <div className="alternatives">{candidates.filter(asset => asset !== recommended).map(asset => <a href={asset.url} key={asset.name}><span><b>{asset.architecture}</b><small>{asset.name} · {asset.size}</small></span><TbDownload /></a>)}</div>
              </details>
            )}
          </>
        ) : (
          <div className="empty-release"><TbLayersIntersect /><div><h3>这个客户端正在准备首个公开构建</h3><p>仓库已经纳入自动索引；Release 发布后会自动出现在这里。</p></div><a href={`https://github.com/${client.repo}`}>查看开发进度</a></div>
        )}
      </section>
    </div>
  )
}
