import { Fragment, type ReactNode } from 'react'
import { Star } from './Star'

interface TickerProps {
  /** nodes, not just strings — the status rail carries a live clock */
  items: ReactNode[]
  /** alternate every other word as hollow outline type */
  mixed?: boolean
}

/** Endless marquee strip. Pure CSS loop, pauses under reduced motion. */
export function Ticker({ items, mixed = true }: TickerProps) {
  const group = (ariaHidden: boolean) => (
    <div className="ticker-group" aria-hidden={ariaHidden || undefined}>
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className={mixed && i % 2 === 1 ? 'outline' : undefined}>{item}</span>
          <Star className="ticker-star" />
        </Fragment>
      ))}
    </div>
  )

  return (
    <div className="ticker" role="marquee">
      <div className="ticker-track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  )
}
