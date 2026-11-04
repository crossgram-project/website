export type NavItem = { href: string; label: string }

export const nav: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/downloads', label: '下载' },
  { href: '/docs', label: '部署文档' },
]

export const site = {
  name: 'CrossGram',
  tagline: '用你喜欢的 Telegram 客户端连接 QQ、Discord、Matrix 与更多聊天平台。',
  github: 'https://github.com/std-microblock/crossgram',
  serverRepo: 'https://github.com/std-microblock/crossgram',
}

const titles: Record<string, string> = {
  '/': 'CrossGram — 用你喜欢的客户端连接所有聊天',
  '/downloads': '下载 — CrossGram',
  '/docs': '部署文档 — CrossGram',
  '/docs/linux': 'Linux 一键部署 — CrossGram',
  '/docs/windows': 'Windows 手动部署 — CrossGram',
}

export function pageTitle(pathname: string): string {
  return titles[pathname] ?? '页面未找到 — CrossGram'
}
