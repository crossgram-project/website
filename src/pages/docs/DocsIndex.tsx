import { Link } from 'react-router-dom'
import Backdrop from '../../components/Backdrop'
import './docs.css'

const guides = [
  {
    to: '/docs/linux',
    meta: 'Automated',
    title: 'Linux 一键部署',
    description:
      '使用一键脚本部署 CrossGram Server 与 QQNT Bridge，包含 systemd 服务、更新命令和客户端配置生成。',
  },
  {
    to: '/docs/windows',
    meta: 'Manual',
    title: 'Windows 手动部署',
    description: '手动安装 Node.js、QQNT Bridge 与 CrossGram Server，适合本地体验和 Windows 常驻主机。',
  },
]

const flow = ['聊天平台', 'Platform Bridge', 'CrossGram Server', '你的客户端']

export default function DocsIndex() {
  return (
    <>
      <section className="docs-hero">
        <Backdrop />
        <div className="container docs-hero-inner">
          <p className="eyebrow">Deployment</p>
          <h1 className="docs-hero-title">部署文档</h1>
          <p className="lead docs-hero-lead">
            选择你的系统：Linux 提供 CrossGram Server 和 QQNT Bridge 一键脚本，Windows 使用透明、可检查的手动流程。
          </p>
        </div>
      </section>

      <section className="container docs-index-body">
        <nav className="docs-guides" aria-label="部署指南">
          {guides.map((guide) => (
            <Link key={guide.to} className="card card-hover docs-guide" to={guide.to}>
              <span className="docs-guide-meta">{guide.meta}</span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <span className="docs-guide-more">
                打开教程
                <span className="docs-guide-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="panel docs-flow-block">
          <div className="docs-flow-head">
            <h2 id="docs-flow-title">它是怎么连起来的</h2>
          </div>
          <ol className="docs-flow" aria-labelledby="docs-flow-title">
            {flow.map((step, index) => (
              <li key={step} className="docs-flow-step">
                <span className="docs-flow-num">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
