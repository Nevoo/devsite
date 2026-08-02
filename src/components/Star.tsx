interface StarProps {
  size?: string
  className?: string
}

/** Eight-point spark — the site's recurring mark (ticker, hero, footer). */
export function Star({ size = '1em', className }: StarProps) {
  return (
    <svg
      className={className ? `star ${className}` : 'star'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0c.6 6.4 5 10.9 12 12-7 1.1-11.4 5.6-12 12-.6-6.4-5-10.9-12-12C7 10.9 11.4 6.4 12 0Z" />
    </svg>
  )
}
