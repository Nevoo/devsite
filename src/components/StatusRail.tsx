import { useEffect, useState } from 'react'
import { frameCount } from '@/content/categories'
import { Ticker } from './Ticker'

const berlin = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const berlinNow = () => berlin.format(new Date())

/**
 * The live status rail: the site's one running readout, ink on the footer's
 * accent drench. Everything here is either true right now (the clock, the
 * frame count) or a standing fact — nothing decorative.
 *
 * Local time where the darkroom is. A clock is content, not decoration, so it
 * keeps ticking under reduced motion — only the marquee carrying it pauses.
 * The tick lives here, not in the item: the ticker renders its items twice for
 * the CSS loop, so a self-ticking clock component would run two intervals.
 */
export function StatusRail() {
  const [time, setTime] = useState(berlinNow)

  useEffect(() => {
    const id = setInterval(() => setTime(berlinNow()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="ticker-ink">
      <Ticker
        items={[
          'rouvens.work',
          <>
            <span className="ticker-clock">{time}</span> germany
          </>,
          'vol. 02',
          `${frameCount} frames in the journal`,
        ]}
      />
    </div>
  )
}
