import { FaAndroid, FaApple, FaArrowRight, FaGithub, FaLinux, FaWindows } from 'react-icons/fa6'
import { TbBrandTelegram, TbDownload, TbServerBolt } from 'react-icons/tb'

const map = { android: FaAndroid, apple: FaApple, arrow: FaArrowRight, github: FaGithub, linux: FaLinux, telegram: TbBrandTelegram, download: TbDownload, server: TbServerBolt, windows: FaWindows }

export function Icon({ name, size = 20 }: { name: keyof typeof map; size?: number }) {
  const Component = map[name]
  return <Component size={size} aria-hidden="true" />
}
