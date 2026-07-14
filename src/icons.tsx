import type { SVGProps } from 'react'

// Custom nav icons for concepts astryx's semantic set doesn't cover (home, quotes, blocks).
// currentColor lets astryx drive the color via SideNavItem state.
const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
  </svg>
)

export const QuoteIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 7H4v5h5V9c0 2-1 3-3 3.5" fill="currentColor" stroke="none" />
    <path d="M17 7h-3v5h5V9c0 2-1 3-3 3.5" fill="currentColor" stroke="none" />
  </svg>
)

export const BlocksIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
)

export const DbIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
)

// 포맷: 코드 꺾쇠 </>
export const CodeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m8 8-4 4 4 4" />
    <path d="m16 8 4 4-4 4" />
  </svg>
)
