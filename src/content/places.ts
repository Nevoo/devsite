import { outings, photoOf } from './outings'
import type { Photo } from './categories'

/**
 * The place layer — where the work happened, recorded at the precision it is
 * actually known.
 *
 * outings.ts is the archive's WHEN: pure EXIF, read off the files, and proud of
 * it. This file is the archive's WHERE, and it works to a different standard on
 * purpose. The cameras carry no GPS, so no coordinate here can ever be read off
 * a file — but "unrecorded" is not the same as "unknown". Rouven knows which
 * venue the gig was in and which island the dawn frames came from, the same way
 * he knows which month he was in Bali. So this file does what a museum does
 * with a specimen label reading "near Kandy": it records the coordinate AND how
 * far it might be wrong, instead of refusing to record it at all.
 *
 * The rule, stated once: NO FIELD MAY CLAIM MORE PRECISION THAN IS KNOWN.
 * `precision` is shipped, rendered as a word ('to the venue', 'to the island'),
 * never as a ± figure. A place that would have to be guessed gets no entry.
 * See GLOBE-V2.md §2.3 and §8.1 for the full argument.
 *
 * The unit is the SITTING, not the outing: a contiguous run of frames at one
 * spot. One outing can touch three places (trip-2023-10 does) and one place can
 * be visited twice, so the two groupings cross rather than nest — which is why
 * this is a second array beside `outings` and not a field on it.
 *
 * `tz` is the payoff field. Every frame's EXIF clock is camera-local CET
 * (OffsetTimeOriginal +01:00, see outings.ts), which is why the site has never
 * printed a clock time. A placed sitting supplies the zone, and the zone turns
 * `22:36` into the `05:36` dawn it actually was. Times are only converted where
 * precision is better than 'region' — a timezone off by one is a confident lie.
 */
export type PlacePrecision = 'venue' | 'town' | 'island' | 'region'

export interface Place {
  slug: string
  /** the label that rides the pin, e.g. 'queenstown, nz'. Lowercase. */
  label: string
  /** [latitude, longitude]. Hand-recalled; honesty lives in `precision`. */
  coords: [number, number]
  /** how well the coordinate is actually known. Shipped, not smoothed away. */
  precision: PlacePrecision
  /** IANA zone, so camera-local EXIF can be printed as place-local time */
  tz: string
  /** srcs of the frames shot here, resolved through outings' photo map */
  frames: string[]
}

const src = (category: string, id: string) => `/images/categories/${category}/gallery/DSC${id}.jpeg`

/**
 * ⚠ EVERY FRAME-TO-PLACE ASSIGNMENT BELOW IS MOCK DATA. Rouven's call
 * (2026-07-26): "mock the places for now, the content gets switched out
 * anyway — just add the pictures to the existing locations around asia."
 * So all ten sittings ride the ten route stops, and no invented place exists
 * anywhere. The sittings themselves (the frame groupings) are real — grouped
 * by capture gap off the EXIF. Only the WHERE is fiction.
 *
 * The standard at the top of this file still holds for the real pass: when
 * the archive is refreshed, every entry either gets a place he can state
 * without hedging or gets no entry at all.
 *
 * Sittings with their own place later (a wedding venue, a gig venue) move up
 * here — the front of this array is the first thing the tour presents, which
 * makes the ordering editorial (GLOBE-V2.md §8.5).
 */
const photographed: Place[] = []

/**
 * The nomad route — real places, no frames imported yet. Moved here verbatim
 * from outings.ts, where they sat as frameless pseudo-outings. Newest first,
 * because the globe's tour opens on the front of the array.
 *
 * Coordinates are rough city centres, to about a kilometre — far finer than
 * the globe can resolve (one degree of latitude is under a pixel at rendered
 * size). Precision words are read off the labels themselves: a city stop is
 * 'town', bali is an island, and a label spanning two cities is a 'region'.
 * Timezones are facts of the coordinates, not recollections.
 *
 * Every stop carries a sitting (MOCK, see above) so the whole loop is
 * exercised: pin thumbnails, dated meta lines, the projection panel, and the
 * moment this layer was designed for — a route stop gaining photographs
 * without a line of code changing.
 */
const route: Place[] = [
  {
    slug: 'tokyo',
    label: 'tokyo, jp',
    coords: [35.68, 139.65],
    precision: 'town',
    tz: 'Asia/Tokyo',
    // the feb 2024 street walk
    frames: [src('street', '05299'), src('street', '05320')],
  },
  {
    slug: 'queenstown',
    label: 'queenstown, nz',
    coords: [-45.03, 168.66],
    precision: 'town',
    tz: 'Pacific/Auckland',
    // the sep 2023 evening
    frames: [src('nature', '03588')],
  },
  {
    slug: 'sydney',
    label: 'sydney, au',
    coords: [-33.87, 151.21],
    precision: 'town',
    tz: 'Australia/Sydney',
    // the aug 2023 wedding afternoon
    frames: [
      src('weddings', '02597'),
      src('weddings', '02640'),
      src('weddings', '02729'),
      src('weddings', '02799'),
      src('weddings', '02847'),
      src('weddings', '02936'),
    ],
  },
  {
    slug: 'brisbane',
    label: 'brisbane & gold coast, au',
    coords: [-27.47, 153.03],
    precision: 'region',
    tz: 'Australia/Brisbane',
    // jan 2023, one animal frame. region precision on purpose: it exercises
    // the honest branch where no clock time is ever printed.
    frames: [src('animals', '00880')],
  },
  {
    slug: 'da-nang',
    label: 'da nang, vn',
    coords: [16.05, 108.21],
    precision: 'town',
    tz: 'Asia/Ho_Chi_Minh',
    // oct 2021, one animal frame
    frames: [src('animals', '8270')],
  },
  {
    slug: 'bangkok',
    label: 'bangkok, th',
    coords: [13.76, 100.5],
    precision: 'town',
    tz: 'Asia/Bangkok',
    // the dec 2023 gig
    frames: [
      src('concerts', '04137'),
      src('concerts', '04159'),
      src('concerts', '04230'),
      src('concerts', '04248'),
      src('concerts', '04330'),
      src('concerts', '04360'),
    ],
  },
  {
    slug: 'chiang-mai',
    label: 'chiang mai, th',
    coords: [18.79, 98.98],
    precision: 'town',
    tz: 'Asia/Bangkok',
    // the oct 2023 19th morning
    frames: [src('nature', '03694'), src('travel', '03700'), src('travel', '03743')],
  },
  {
    slug: 'hanoi',
    label: 'hanoi, vn',
    coords: [21.03, 105.85],
    precision: 'town',
    tz: 'Asia/Ho_Chi_Minh',
    // the oct 2023 16th, one street frame
    frames: [src('street', '03647')],
  },
  {
    slug: 'bromo',
    label: 'bromo, east java, id',
    coords: [-7.94, 112.95],
    precision: 'region',
    tz: 'Asia/Jakarta',
    // the oct 2021 day out
    frames: [src('nature', '8162'), src('travel', '8251')],
  },
  {
    slug: 'bali',
    label: 'bali, id',
    coords: [-8.41, 115.19],
    precision: 'island',
    tz: 'Asia/Makassar',
    // the oct 2023 22nd dawn — the frames outings.ts:21-27 always said were a
    // sunrise. with the island's tz they finally print as one: 05:36–06:29.
    frames: [
      src('travel', '03816'),
      src('nature', '03828'),
      src('nature', '03830'),
      src('nature', '03855'),
      src('travel', '03862'),
    ],
  },
]

/**
 * Photographed places first, in the order listed — which is the order the
 * globe's tour presents them, so the front of `photographed` is an editorial
 * decision (GLOBE-V2.md §8.5: if the wedding client is the priority, the
 * wedding goes first). The route stops follow, newest first, as today.
 */
export const places: Place[] = [...photographed, ...route]

/** the places that actually hold photographs — the projection panel's tray */
export const placesWithFrames = places.filter((p) => p.frames.length > 0)

/* The arc layer no longer derives from this file: the legs the globe draws
   are the real flights in flights.ts, airport to airport, not a chain drawn
   through the route stops. This sheet stays the authority on WHERE the work
   happened; flights.ts is the authority on how the camera moved between. */

/** EXIF capture stamp per src, straight out of outings.ts — never re-entered */
const atBySrc = new Map<string, string>(
  outings.flatMap((o) => o.frames.map((frame) => [frame.src, frame.at] as const))
)

/** which place a frame was shot at, for the verso stamp on other surfaces */
export const placeOf = new Map<string, Place>(
  places.flatMap((p) => p.frames.map((frameSrc) => [frameSrc, p] as const))
)

/** the Photo records for a place, in capture order; unresolvable srcs drop */
export const framesAt = (place: Place): Photo[] =>
  place.frames.map((s) => photoOf(s)).filter((p): p is Photo => Boolean(p))

/** earliest capture at this place, ISO camera-local, or null if none/unknown */
export const firstAt = (place: Place): string | null => {
  const stamps = place.frames.map((s) => atBySrc.get(s)).filter((a): a is string => Boolean(a))
  return stamps.length ? stamps.slice().sort()[0] : null
}

/** the honesty mechanic, rendered: a word a person would say, never a number */
export const precisionWord = (p: PlacePrecision) => `to the ${p}`

/**
 * Camera-local EXIF ('2023-10-22T22:36:58', clock left on CET) printed as the
 * place's own wall time — the conversion outings.ts:21-27 parked "until a stop
 * is placed". Only runs where the place is known well enough that the zone is
 * certain; at 'region' precision a time off by a whole hour would print with
 * more authority than the date it came from (GLOBE-V2.md §8.8).
 */
export const localTime = (at: string, place: Place): string | null => {
  if (place.precision === 'region') return null
  const utc = new Date(`${at}+01:00`)
  if (Number.isNaN(utc.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: place.tz,
  }).format(utc)
}
