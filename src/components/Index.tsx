interface IndexProps {
  /** 1-based position */
  n: number
  /** total, when the mark should read `[ 01 / 12 ]` rather than `[ 01 ]` */
  of?: number
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The instrument register: `[ 01 ]` in mono, brackets muted, digits accent.
 * One mark for every meta-scale index on the site (gallery items, lightbox
 * counter, log rows) so they read as one system. Decorative — the position is
 * already in the accessible name of whatever it labels — hence aria-hidden.
 *
 * The display-scale `outline-accent` numbers on the work cards are a separate,
 * reserved register and do NOT use this.
 */
export function Index({ n, of, className }: IndexProps) {
  return (
    <span className={className ? `index-mark ${className}` : 'index-mark'} aria-hidden>
      {'[ '}
      <span className="index-mark-num">{pad(n)}</span>
      {of !== undefined && (
        <>
          {' / '}
          <span className="index-mark-num">{pad(of)}</span>
        </>
      )}
      {' ]'}
    </span>
  )
}
