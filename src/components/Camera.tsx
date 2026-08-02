interface CameraProps {
  size?: string
  className?: string
}

/** Chunky little camera — body with a punched-out lens ring and flash dot. */
export function Camera({ size = '1em', className }: CameraProps) {
  return (
    <svg
      className={className ? `camera ${className}` : 'camera'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M9.1 3.6c-.62 0-1.19.33-1.5.86l-.62 1.04H4.9A2.9 2.9 0 0 0 2 8.4v9.2a2.9 2.9 0 0 0 2.9 2.9h14.2a2.9 2.9 0 0 0 2.9-2.9V8.4a2.9 2.9 0 0 0-2.9-2.9h-2.08l-.62-1.04a1.75 1.75 0 0 0-1.5-.86H9.1ZM12 8.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm6.55-.15a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        clipRule="evenodd"
      />
      <circle cx="12" cy="13" r="2.7" />
    </svg>
  )
}
