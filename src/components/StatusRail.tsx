import { useEffect, useState } from 'react'
import { categories } from '@/content/categories'
import { Ticker } from './Ticker'

const berlin = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const berlinNow = () => berlin.format(new Date())

/** Local time where the darkroom is. A clock is content, not decoration, so it
 *  keeps ticking under reduced motion — only the marquee carrying it pauses. */
export function Clock() {
  const [time, setTime] = useState(berlinNow)

  useEffect(() => {
    const id = setInterval(() => setTime(berlinNow()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <span className="ticker-clock">{time}</span> germany
    </>
  )
}

const frames = categories.reduce((n, category) => n + category.photos.length, 0)

/**
 * The live status rail: the site's one running readout, ink on the footer's
 * accent drench. Everything here is either true right now (the clock, the
 * frame count) or a standing fact — nothing decorative.
 */
export function StatusRail() {
  return (
    <div className="ticker-ink">
      <Ticker
        items={[
          'rouvens.work',
          <Clock />,
          'vol. 02',
          `${frames} frames in the archive`,
        ]}
      />
    </div>
  )
}
