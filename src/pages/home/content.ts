import { site } from '../../data/site'

export type Screenshot = {
  src: string
  alt: string
  width: number
  height: number
  /** Label rendered in the window title bar. */
  bar: string
}

export type Cta = { label: string; href: string; external?: boolean }

export const hero = {
  badge: '连接 QQ · Discord · Matrix',
  title: 'CrossGram',
  titleLine: '所有聊天，一个客户端',
  lead: 'CrossGram 在你自己的服务器上把 QQ、Discord 与 Matrix 翻译成 MTProto，会话与历史留在原平台，界面还是你熟悉的 Telegram 客户端。',
  primaryCta: { label: '下载客户端', href: '/downloads' } satisfies Cta,
  secondaryCta: { label: '开始部署', href: '/docs' } satisfies Cta,
  shot: {
    src: '/screenshots/home/native-conversations.webp',
    alt: 'CrossGram 桌面客户端截图：不同平台的会话排在同一份会话列表中',
    width: 1068,
    height: 1144,
    bar: 'crossgram://unified-inbox',
  } satisfies Screenshot,
}

export const capabilities = {
  eyebrow: 'Capabilities',
  title: '一个客户端，装下所有平台的对话。',
  lead: '下面都是真实界面截图：统一的会话列表、完整的消息结构、文件传输，以及你自己管理账号的控制台。',
  cards: [
    {
      id: 'unified-inbox',
      title: '统一会话',
      body: '不同平台的私聊与群聊进入同一份列表，头像、未读与时间都保留。',
      shot: {
        src: '/screenshots/home/mobile-chat-list.webp',
        alt: '手机客户端的会话列表截图：多平台的私聊与群聊排列在一起',
        width: 890,
        height: 1796,
        bar: 'nagram://dialogs',
      },
    },
    {
      id: 'rich-messages',
      title: '富消息与转发',
      body: '图片、引用与聊天记录继续以消息卡片呈现，上下文不会丢。',
      shot: {
        src: '/screenshots/home/mobile-forwarded-history.webp',
        alt: '手机客户端的聊天记录截图：转发的一组历史消息保留了原始发送者与上下文',
        width: 854,
        height: 1436,
        bar: 'telegram://forwarded',
      },
    },
    {
      id: 'file-transfer',
      title: '文件直传',
      body: '文件名、体积与进度直接出现在气泡里，大文件不用离开会话。',
      shot: {
        src: '/screenshots/home/mobile-file-transfer.webp',
        alt: '手机客户端的文件消息截图：气泡中显示文件名、体积与发送进度',
        width: 880,
        height: 588,
        bar: 'transfer://file',
      },
    },
    {
      id: 'self-hosted',
      title: '自托管控制台',
      body: '平台账号、登录码与连接状态集中在你的 WebUI，客户端只连接你指定的入口。',
      shot: {
        src: '/screenshots/home/server-platform-account.webp',
        alt: 'CrossGram Server 的 WebUI 截图：平台账号与登录码集中展示',
        width: 1500,
        height: 1208,
        bar: 'server://platform-accounts',
      },
    },
  ],
} as const

export type MatrixStatus = 'full' | 'partial' | 'none'

export type MatrixRow = {
  capability: string
  support: [MatrixStatus, MatrixStatus, MatrixStatus]
}

export const statusLabel: Record<MatrixStatus, string> = {
  full: '完整支持',
  partial: '部分支持',
  none: '暂不支持',
}

export const statusGlyph: Record<MatrixStatus, string> = {
  full: '●',
  partial: '◐',
  none: '—',
}

export const statusShort: Record<MatrixStatus, string> = {
  full: '完整',
  partial: '部分',
  none: '暂不支持',
}

export const matrix = {
  eyebrow: 'Compatibility',
  title: '现在支持到哪里。',
  lead: '同一份能力表覆盖 QQ / QQNT、Discord 与 Matrix 三个适配器。',
  columns: ['QQ / QQNT', 'Discord', 'Matrix'] as const,
  rows: [
    { capability: '历史消息拉取', support: ['full', 'full', 'full'] },
    { capability: '文字 / 图片 / 文件', support: ['full', 'full', 'full'] },
    { capability: '私聊与群聊', support: ['full', 'full', 'full'] },
    { capability: '频道 / 子频道', support: ['none', 'full', 'partial'] },
    { capability: '成员与管理员信息', support: ['full', 'full', 'full'] },
    { capability: '撤回消息', support: ['full', 'full', 'full'] },
    { capability: '编辑消息', support: ['partial', 'full', 'partial'] },
    { capability: '转发', support: ['full', 'full', 'none'] },
    { capability: '表情回应', support: ['full', 'full', 'none'] },
    { capability: '头像同步', support: ['full', 'full', 'full'] },
    { capability: '表情包查看', support: ['full', 'partial', 'none'] },
  ] satisfies MatrixRow[],
  footnote:
    'Discord 适配器以普通用户账号自动化方式运行，可能违反 Discord 服务条款。请使用可承受风险的独立账号。',
}

export const deploy = {
  eyebrow: 'Quick start',
  title: '一条命令部署',
  lead: 'Linux 用一键脚本装好 CrossGram Server 与 QQNT Bridge；Windows 上克隆仓库手动构建。',
  cards: [
    {
      id: 'linux',
      title: 'LINUX · 一键脚本',
      body: '在空的 Linux 服务器上执行，把地址换成你自己的公网入口。',
      command:
        'curl -fsSL https://raw.githubusercontent.com/std-microblock/crossgram/main/deploy/install.sh \\\n| sudo CROSSGRAM_PUBLIC_HOST=203.0.113.10 sh',
    },
    {
      id: 'source',
      title: 'WINDOWS · 源码构建',
      body: '克隆仓库后按文档构建，Windows 上没有一键脚本。',
      command: 'git clone https://github.com/std-microblock/crossgram.git',
    },
  ],
} as const

export const closing = {
  title: '把聊天搬进你自己的服务器。',
  lead: '从下载客户端到自托管部署，教程与源码都在仓库里。',
  actions: [
    { label: '查看部署教程', href: '/docs', primary: true, external: false },
    { label: '客户端下载', href: '/downloads', primary: false, external: false },
    { label: 'GitHub', href: site.github, primary: false, external: true },
  ],
} as const
