export const nav = [
  { href: '/', label: '首页' },
  { href: '/features', label: '功能' },
  { href: '/downloads', label: '下载' },
  { href: '/docs', label: '部署文档' },
]

export const featureGroups = [
  {
    kicker: '01 / Native feel',
    title: '不是转发机器人，是真正的 Telegram 体验。',
    body: '会话、历史、成员和媒体被映射为原生 MTProto 对象。搜索、回复、撤回、表情回应，都留在你熟悉的客户端里。',
    visual: 'conversation',
    chips: ['历史消息', '原生会话', '全局搜索', '未读状态'],
  },
  {
    kicker: '02 / Rich messages',
    title: '让跨平台消息，保留它应有的质感。',
    body: '文字、图片、文件与图文混排统一呈现；QQ 合并转发、Discord 频道和 Matrix 房间也有针对性的语义映射。',
    visual: 'media',
    chips: ['图片与文件', '图文混排', '合并转发', '频道与话题'],
  },
  {
    kicker: '03 / Actions',
    title: '每一次操作，都跨过平台边界。',
    body: '回复、编辑、撤回、转发与 reaction 从客户端直达源平台，不需要在多个应用之间来回跳转。',
    visual: 'actions',
    chips: ['回复', '编辑与撤回', '转发', 'Reaction'],
  },
  {
    kicker: '04 / Your server',
    title: '你的消息，经过你自己的基础设施。',
    body: 'CrossGram Server 与 QQNT Bridge 都可自行部署。配置、密钥和媒体缓存由你掌控，客户端只连接你指定的入口。',
    visual: 'server',
    chips: ['自托管', '独立密钥', '多账号', '可观测 WebUI'],
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
