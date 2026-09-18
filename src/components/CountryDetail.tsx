import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { FramePop } from './FramePop'
import { framesAt, places } from '@/content/places'
import type { PlaceCluster } from '@/content/clusters'
import { responsiveSrcSet, responsiveThumbnailSrc } from '@/lib/responsiveImage'

const COUNTRY_SUFFIX = /,\s*[a-z]{2}$/i
const shortName = (label: string) => label.replace(COUNTRY_SUFFIX, '')

interface CountryDetailProps {
  ref: Ref<HTMLElement>
  cluster: PlaceCluster
  name: string
  onExit: () => void
}

/** Country navigation and photographs keep their place while the camera moves.
 * The parent drives --country-presence with the same reversible scene clock. */
export function CountryDetail({ ref, cluster, name, onExit }: CountryDetailProps) {
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null)
  const [openFrame, setOpenFrame] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef(new Map<string, HTMLButtonElement>())
  const members = cluster.memberIndices
  const { collection, photos } = useMemo(() => {
    const collection = (selectedPlace === null ? members : [selectedPlace]).flatMap((index) =>
      framesAt(places[index]).map((photo) => ({ photo, place: places[index] }))
    )
    return { collection, photos: collection.map(({ photo }) => photo) }
  }, [members, selectedPlace])

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [selectedPlace])

  return (
    <section ref={ref} tabIndex={-1} className="country-detail" aria-label={`${name}, photographs`}>
      <header className="country-heading">
        <button type="button" className="country-back" onClick={onExit}>
          <span aria-hidden>←</span> back to world
        </button>
        <h2>{name}<span className="accent">.</span></h2>
        <p>{members.length} {members.length === 1 ? 'place' : 'places'}
          <span aria-hidden> / </span>{cluster.totalFrameCount} photographs</p>
      </header>

      <div className="country-photos">
        <div className="country-collection-heading">
          <h3>the photographs</h3>
          <span className="country-photo-total" aria-live="polite">
            {String(collection.length).padStart(2, '0')}
          </span>
        </div>
        {members.length > 1 && (
          <nav className="country-places" aria-label="filter photographs by place">
            <button type="button" aria-pressed={selectedPlace === null}
              onClick={() => setSelectedPlace(null)}>all places</button>
            {members.map((index) => (
              <button key={places[index].slug} type="button"
                aria-pressed={selectedPlace === index}
                onClick={() => setSelectedPlace(index)}>
                {shortName(places[index].label)}
                <span>{framesAt(places[index]).length}</span>
              </button>
            ))}
          </nav>
        )}
        <div ref={listRef} className="country-photo-scroll" data-lenis-prevent
          tabIndex={0} role="region" aria-label="photograph collection">
          {collection.length ? (
            <ul className="country-photo-grid">
              {collection.map(({ photo, place }, index) => (
                <li key={`${place.slug}:${photo.src}`}>
                  <button type="button" className="country-photo"
                    ref={(node) => {
                      if (node) photoRefs.current.set(photo.src, node)
                      else photoRefs.current.delete(photo.src)
                    }}
                    aria-label={`open ${shortName(place.label)}, photograph ${index + 1} of ${collection.length}`}
                    onClick={() => setOpenFrame(index)}>
                    <img src={responsiveThumbnailSrc(photo)} srcSet={responsiveSrcSet(photo)}
                      sizes="(max-width: 700px) 44vw, (max-width: 1100px) 25vw, 18vw"
                      width={photo.width} height={photo.height} alt="" draggable={false}
                      loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
                    <span className="country-photo-caption">
                      <span>{shortName(place.label)}</span>
                      <span className="country-photo-number">{String(index + 1).padStart(2, '0')}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="country-photo-empty">photographs still to come.</p>}
        </div>
        <p className="country-photo-hint">select a photograph to take a closer look <span aria-hidden>↗</span></p>
      </div>
      {openFrame !== null && collection[openFrame] && (
        <FramePop
          label={shortName(collection[openFrame].place.label)}
          photos={photos}
          index={openFrame}
          sourceEl={() => photoRefs.current.get(collection[openFrame].photo.src) ?? null}
          sourceAngle={0}
          onStep={(direction) => setOpenFrame((current) =>
            current === null ? null : (current + direction + collection.length) % collection.length)}
          onClose={() => {
            photoRefs.current.get(collection[openFrame].photo.src)?.focus({ preventScroll: true })
            setOpenFrame(null)
          }}
        />
      )}
    </section>
  )
}
