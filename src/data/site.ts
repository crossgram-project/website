export const nav = [
  { href: '/', label: '首页' },
  { href: '/#features', label: '功能' },
  { href: '/downloads', label: '下载' },
  { href: '/docs', label: '部署文档' },
]

export const featureGroups = [
  {
    kicker: '01 / Native feel',
    title: '会话列表、未读数量和搜索，都还是你熟悉的样子。',
    body: '不同平台的群聊被整理进同一套会话列表。头像、预览、时间与未读状态保留原生客户端的浏览节奏，不需要重新学习另一套界面。',
    visual: 'conversation',
    chips: ['历史消息', '原生会话', '全局搜索', '未读状态'],
  },
  {
    kicker: '02 / Rich messages',
    title: '图片、引用与聊天记录，不会被压成一行纯文本。',
    body: '群聊图片、引用消息与转发记录继续以消息卡片呈现。你可以顺着上下文阅读，而不是面对一串失去结构的机器人转发。',
    visual: 'media',
    chips: ['图片消息', '引用回复', '聊天记录', '消息上下文'],
  },
  {
    kicker: '03 / Actions',
    title: '大文件也留在会话里，发送进度一眼可见。',
    body: '文件名、体积、进度和发送状态直接出现在聊天气泡中。日常传图和大文件直传都不需要跳到额外的下载工具。',
    visual: 'actions',
    chips: ['文件直传', '实时进度', '发送状态', '会话内完成'],
  },
  {
    kicker: '04 / Your server',
    title: '平台账号、登录码与连接状态，由你自己的 WebUI 管理。',
    body: 'CrossGram Server 与平台 Bridge 都可自行部署。虚拟手机号、轮换登录码和账号状态集中展示，客户端只连接你指定的入口。',
    visual: 'server',
    chips: ['自托管', '账号状态', '轮换登录码', '可观测 WebUI'],
  },
]

export const matrix = [
  ['历史消息拉取', 'full', 'full', 'full'],
  ['文字 / 图片 / 文件', 'full', 'full', 'full'],
  ['私聊与群聊', 'full', 'full', 'full'],
  ['频道 / 子频道', 'none', 'full', 'partial'],
  ['成员与管理员信息', 'full', 'full', 'full'],
  ['撤回消息', 'full', 'full', 'full'],
  ['编辑消息', 'partial', 'full', 'partial'],
  ['转发', 'full', 'full', 'none'],
  ['表情回应', 'full', 'full', 'none'],
  ['头像同步', 'full', 'full', 'full'],
  ['表情包查看', 'full', 'partial', 'none'],
] as const
