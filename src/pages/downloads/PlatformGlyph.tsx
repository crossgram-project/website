import type { Platform } from './model'

type Props = { platform: Platform }

/** 16px line glyph so clients can be scanned by platform without an icon package. */
export default function PlatformGlyph({ platform }: Props) {
  if (platform === 'Android' || platform === 'iOS') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="4.4" y="1.7" width="7.2" height="12.6" rx="2" />
        <path d="M6.9 12.1h2.2" />
      </svg>
    )
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.7" y="2.9" width="12.6" height="8" rx="1.6" />
      <path d="M5.9 13.9h4.2M8 10.9v3" />
    </svg>
  )
}
