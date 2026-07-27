// Nexhood brand mark — real assets exported from the official Brand Identity
// Presentation (v1.0), not a recreation. Files live in /public/brand.
//
//   nexhood-logo-navy.svg    navy wordmark + red icon   → light backgrounds
//   nexhood-logo-white.svg   white wordmark + red icon  → dark backgrounds
//   nexhood-logo-outline.svg monochrome outline          → watermarks, subtle use
//   nexhood-icon.svg         icon only, red              → favicons, avatars, badges

const LOGO_SRC = {
  navy: '/brand/nexhood-logo-navy.svg',
  white: '/brand/nexhood-logo-white.svg',
  outline: '/brand/nexhood-logo-outline.svg',
} as const

const SIZES = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
} as const

export function ShieldMark({ className = '' }: { className?: string }) {
  return <img src="/brand/nexhood-icon.svg" alt="" className={className} />
}

export function Logo({
  className = '',
  variant = 'navy',
  size = 'md',
}: {
  className?: string
  variant?: keyof typeof LOGO_SRC
  size?: keyof typeof SIZES
}) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt="Nexhood"
      className={`${SIZES[size]} w-auto ${className}`}
    />
  )
}
