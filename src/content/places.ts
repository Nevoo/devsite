import { outings, photoOf } from './outings.ts'
import type { Photo } from './categories.ts'

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
export type PlacePrecision = 'venue' | 'town' | 'island' | 'fiord' | 'country' | 'region'

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
const stillSrc = (category: string, name: string) =>
  `/images/categories/${category}/gallery/${name}.jpeg`

/**
 * THE MOCK ERA IS OVER (2026-08-12). Every frame-to-place assignment in this
 * file is now real, from two sources:
 *
 * DSC photo frames (`src(...)`): placed by Rouven's own recall — "the old
 * images are basically almost all in germany, some in portugal/lisbon, a few
 * in bali" — refined against what is visibly in frame (the Cabo da Roca
 * lighthouse, the warung signage on the bali shopfront street, the
 * Votivkirche's twin spires behind the tram wires — which is why the feb 2024
 * street walk pins to vienna, not germany).
 *
 * Video-still frames (`stillSrc(...)`, imported 2026-08 from the footage
 * archive): placed from Rouven's folder labels confirmed against what is in
 * frame and against the flight record in flights.ts. Stills carry no capture
 * EXIF — they are frames pulled from video — so they never print a clock time
 * and are absent from outings.ts on purpose.
 *
 * The standard at the top of this file holds: a frame whose place could only
 * be guessed got NO pin (the frankfurt platform still and the java volcano
 * still live in their galleries unplaced).
 *
 * The front of this array is the first thing the tour presents, which makes
 * the ordering editorial (GLOBE-V2.md §8.5) — germany leads because that is
 * where the bookable work (the wedding, the gig) lives.
 */
const photographed: Place[] = [
  {
    // home base — the wedding, the gig, the orchard evening, both dogs.
    // 'country' because that is the precision actually stated ("basically
    // almost all in germany"); the single-zone country makes the tz exact
    // even so, which is why clock times may still print here.
    slug: 'germany',
    label: 'germany, de',
    coords: [51.0, 10.2],
    precision: 'country',
    tz: 'Europe/Berlin',
    frames: [
      src('weddings', '02597'),
      src('weddings', '02640'),
      src('weddings', '02729'),
      src('weddings', '02799'),
      src('weddings', '02847'),
      src('weddings', '02936'),
      src('concerts', '04137'),
      src('concerts', '04159'),
      src('concerts', '04230'),
      src('concerts', '04248'),
      src('concerts', '04330'),
      src('concerts', '04360'),
      src('nature', '03588'),
      src('animals', '00880'),
      src('animals', '8270'),
    ],
  },
  {
    // the feb 2024 street walk. The church through the tram wires is the
    // Votivkirche — vienna, not germany. Two frames, one sitting.
    slug: 'vienna',
    label: 'vienna, at',
    coords: [48.21, 16.37],
    precision: 'town',
    tz: 'Europe/Vienna',
    frames: [src('street', '05299'), src('street', '05320')],
  },
  {
    // the oct 2021 afternoon–sunset: the fog-bank spire and the lighthouse
    // are the same clifftop, and the lighthouse IS cabo da roca — the one
    // place in the archive known to the venue.
    slug: 'cabo-da-roca',
    label: 'cabo da roca, pt',
    coords: [38.78, -9.5],
    precision: 'venue',
    tz: 'Europe/Lisbon',
    frames: [src('travel', '8251'), src('nature', '8162')],
  },
  {
    slug: 'milford-sound',
    label: 'milford sound, nz',
    coords: [-44.63, 167.9],
    // 'region' on purpose: two of these frames are from the Milford Road
    // valleys (Eglinton, Monkey Creek), a good 40km before the fiord itself
    precision: 'region',
    tz: 'Pacific/Auckland',
    frames: [
      stillSrc('travel', 'still-milford-mitre-peak'),
      stillSrc('nature', 'still-milford-stirling-falls'),
      stillSrc('travel', 'still-milford-ship'),
      stillSrc('nature', 'still-milford-bowen-falls'),
      stillSrc('nature', 'still-milford-monkey-creek'),
      stillSrc('travel', 'still-milford-eglinton'),
    ],
  },
  {
    slug: 'doubtful-sound',
    label: 'doubtful sound, nz',
    coords: [-45.32, 167.01],
    precision: 'fiord',
    tz: 'Pacific/Auckland',
    frames: [
      stillSrc('nature', 'still-doubtful-dawn-peaks'),
      stillSrc('travel', 'still-doubtful-sunrise-wake'),
      stillSrc('nature', 'still-doubtful-mirror-arm'),
      stillSrc('travel', 'still-doubtful-stern'),
    ],
  },
  {
    slug: 'koh-phangan',
    label: 'koh phangan, th',
    coords: [9.73, 100.01],
    precision: 'island',
    tz: 'Asia/Bangkok',
    frames: [
      stillSrc('travel', 'still-phangan-beach'),
      stillSrc('travel', 'still-phangan-scooter'),
      stillSrc('nature', 'still-phangan-valley'),
    ],
  },
  {
    // the south island road trips beyond queenstown — wanaka, the mackenzie
    // lakes, the remarkables. One honest region pin instead of five guessed
    // town pins: the footage says south island, the exact shore is recalled
    // loosely, so 'region' is what is actually known.
    slug: 'south-island',
    label: 'south island, nz',
    coords: [-44.7, 169.2],
    precision: 'region',
    tz: 'Pacific/Auckland',
    frames: [
      stillSrc('travel', 'still-nz-peters-lookout'),
      stillSrc('nature', 'still-nz-misty-lake'),
      stillSrc('travel', 'still-nz-paddock-run'),
      stillSrc('travel', 'still-nz-wanaka-boulder'),
      stillSrc('nature', 'still-nz-roys-bay'),
      stillSrc('travel', 'still-nz-wanaka-dusk'),
      stillSrc('travel', 'still-nz-lake-swim'),
      stillSrc('travel', 'still-nz-boots'),
      stillSrc('travel', 'still-nz-bluff'),
      stillSrc('travel', 'still-nz-alpine-stream'),
      stillSrc('travel', 'still-nz-fiord-stern'),
      stillSrc('nature', 'still-nz-creek-pool'),
    ],
  },
  {
    // summer 2025, before the one-way east — val di funes, passo sella,
    // cinque torri, carezza. One massif, one pin.
    slug: 'dolomites',
    label: 'dolomites, it',
    coords: [46.5, 11.75],
    precision: 'region',
    tz: 'Europe/Rome',
    frames: [
      stillSrc('travel', 'still-dolomites-cinque-torri'),
      stillSrc('travel', 'still-dolomites-funes'),
      stillSrc('travel', 'still-dolomites-summit'),
      stillSrc('nature', 'still-dolomites-sella-fence'),
      stillSrc('travel', 'still-dolomites-pasture'),
      stillSrc('nature', 'still-dolomites-latemar'),
      stillSrc('nature', 'still-dolomites-larch-ridge'),
      stillSrc('travel', 'still-dolomites-carezza'),
      stillSrc('animals', 'still-dolomites-bees'),
    ],
  },
  {
    // early 2025 — the unlogged BER→DOH→CPT legs in flights.ts
    slug: 'cape-town',
    label: 'cape town, za',
    coords: [-33.95, 18.38],
    precision: 'town',
    tz: 'Africa/Johannesburg',
    frames: [stillSrc('travel', 'still-cape-town-camps-bay')],
  },
  {
    // sep 2025, the BER→BCN hop
    slug: 'barcelona',
    label: 'barcelona, es',
    coords: [41.39, 2.17],
    precision: 'town',
    tz: 'Europe/Madrid',
    frames: [stillSrc('travel', 'still-barcelona-sagrada')],
  },
]

/**
 * The nomad route — the vol. 02 stops, newest first, because the globe's
 * tour opens on the front of the array.
 *
 * Coordinates are rough city centres, to about a kilometre — far finer than
 * the globe can resolve (one degree of latitude is under a pixel at rendered
 * size). Precision words are read off the labels themselves: a city stop is
 * 'town', bali is an island, and a label spanning two cities is a 'region'.
 * Timezones are facts of the coordinates, not recollections.
 *
 * Frames here are real (see the provenance note above photographed). Stops
 * whose photographs are not imported yet carry an empty list and render as
 * 'frames to come' — the moment this layer was designed for is a stop
 * gaining photographs without a line of code changing.
 */
const route: Place[] = [
  {
    slug: 'tokyo',
    label: 'tokyo, jp',
    coords: [35.68, 139.65],
    precision: 'town',
    tz: 'Asia/Tokyo',
    // the apr–may 2026 stay, all pulled from the footage
    frames: [
      stillSrc('travel', 'still-tokyo-sensoji-pagoda'),
      stillSrc('street', 'still-tokyo-asakusa-station'),
      stillSrc('travel', 'still-tokyo-tower'),
      stillSrc('street', 'still-tokyo-denboin-dori'),
      stillSrc('travel', 'still-tokyo-pagoda-below'),
      stillSrc('street', 'still-tokyo-fugu-corner'),
      stillSrc('street', 'still-tokyo-side-street'),
      stillSrc('travel', 'still-tokyo-sumida'),
      stillSrc('nature', 'still-tokyo-blossom'),
    ],
  },
  {
    slug: 'queenstown',
    label: 'queenstown, nz',
    coords: [-45.03, 168.66],
    precision: 'town',
    tz: 'Pacific/Auckland',
    // the mar 2026 lakefront — the two frames where lake wakatipu is
    // unmistakably in frame
    frames: [
      stillSrc('travel', 'still-nz-wakatipu-tussock'),
      stillSrc('travel', 'still-nz-wakatipu-cairn'),
    ],
  },
  {
    slug: 'sydney',
    label: 'sydney, au',
    coords: [-33.87, 151.21],
    precision: 'town',
    tz: 'Australia/Sydney',
    // the feb–mar 2026 harbour and bondi frames
    frames: [
      stillSrc('travel', 'still-sydney-opera-ferry'),
      stillSrc('nature', 'still-sydney-lightning'),
      stillSrc('travel', 'still-sydney-bridge-portrait'),
      stillSrc('travel', 'still-bondi-steps'),
      stillSrc('travel', 'still-bondi-coastal-walk'),
      stillSrc('travel', 'still-bondi-lookout'),
      stillSrc('travel', 'still-bondi-rock-ramp'),
    ],
  },
  {
    slug: 'brisbane',
    label: 'brisbane & gold coast, au',
    coords: [-27.47, 153.03],
    precision: 'region',
    tz: 'Australia/Brisbane',
    // the feb 2026 riverside. Region precision on purpose: it exercises the
    // honest branch where no clock time is ever printed.
    frames: [
      stillSrc('travel', 'still-brisbane-river'),
      stillSrc('travel', 'still-brisbane-south-bank'),
    ],
  },
  {
    slug: 'da-nang',
    label: 'da nang, vn',
    coords: [16.05, 108.21],
    precision: 'town',
    tz: 'Asia/Ho_Chi_Minh',
    // travelled dec 2025 + jan 2026, photographs not imported yet
    frames: [],
  },
  {
    slug: 'bangkok',
    label: 'bangkok, th',
    coords: [13.76, 100.5],
    precision: 'town',
    tz: 'Asia/Bangkok',
    // the 2026 street frames
    frames: [
      stillSrc('street', 'still-bangkok-lazada-rider'),
      stillSrc('street', 'still-bangkok-cables'),
      stillSrc('street', 'still-bangkok-soi'),
    ],
  },
  {
    slug: 'chiang-mai',
    label: 'chiang mai, th',
    coords: [18.79, 98.98],
    precision: 'town',
    tz: 'Asia/Bangkok',
    // travelled dec 2025 – jan 2026, photographs not imported yet
    frames: [],
  },
  {
    slug: 'hanoi',
    label: 'hanoi, vn',
    coords: [21.03, 105.85],
    precision: 'town',
    tz: 'Asia/Ho_Chi_Minh',
    // the dec 2025 stay — the incense yard is quang phu cau,
    // administratively hanoi
    frames: [
      stillSrc('travel', 'still-hanoi-incense'),
      stillSrc('street', 'still-hanoi-pomelo'),
    ],
  },
  {
    slug: 'bromo',
    label: 'bromo, east java, id',
    coords: [-7.94, 112.95],
    precision: 'region',
    tz: 'Asia/Jakarta',
    // the dec 2025 overland leg (flights.ts: SUB→DPS was the flight back),
    // photographs not imported yet
    frames: [],
  },
  {
    slug: 'bali',
    label: 'bali, id',
    coords: [-8.41, 115.19],
    precision: 'island',
    tz: 'Asia/Makassar',
    // the whole oct 2023 trip — the shopfront street (warung signage, rupiah
    // prices), the jungle waterfall morning, and the 22nd's dawn: the frames
    // outings.ts:21-27 always said were a sunrise, and with the island's tz
    // they finally print as one, 05:36–06:29. Plus the van window frame from
    // the 2025–26 stays.
    frames: [
      src('street', '03647'),
      src('nature', '03694'),
      src('travel', '03700'),
      src('travel', '03743'),
      src('travel', '03816'),
      src('nature', '03828'),
      src('nature', '03830'),
      src('nature', '03855'),
      src('travel', '03862'),
      stillSrc('travel', 'still-bali-van'),
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
 * more authority than the date it came from (GLOBE-V2.md §8.8). 'country'
 * passes only because the one country entry (germany) has a single zone — a
 * multi-zone country must use 'region' instead.
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
