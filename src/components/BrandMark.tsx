interface Props {
  size?: number
  className?: string
}

/** Calendar + play-mark monogram for Watchlist. */
export function BrandMark({ size = 40, className = '' }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="#0c1220" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="12.5" stroke="#3d5a80" strokeWidth="1.5" />
      <rect x="12" y="16" width="40" height="36" rx="6" fill="#152238" stroke="#8eb4e8" strokeWidth="1.75" />
      <rect x="12" y="16" width="40" height="11" rx="6" fill="#2a6fd6" />
      <rect x="12" y="22" width="40" height="5" fill="#2a6fd6" />
      <path d="M22 16V12.5" stroke="#8eb4e8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M42 16V12.5" stroke="#8eb4e8" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="35" r="2.1" fill="#6f8fb8" />
      <circle cx="32" cy="35" r="2.1" fill="#6f8fb8" />
      <circle cx="42" cy="35" r="2.1" fill="#d4a017" />
      <circle cx="22" cy="44" r="2.1" fill="#6f8fb8" />
      <circle cx="32" cy="44" r="2.1" fill="#d4a017" />
      <path d="M40.5 41.5L47 45.2L40.5 48.9V41.5Z" fill="#e8f0ff" />
    </svg>
  )
}
