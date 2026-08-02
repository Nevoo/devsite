import { categories, type Photo } from './categories'

/**
 * The outings — the unit the archive is actually made of.
 *
 * The six categories are a taxonomy laid over the work after the fact. The
 * camera recorded something else, and it recorded it in the files: every frame
 * still carries DateTimeOriginal, and read back in order the archive is not six
 * kinds of photograph, it is a handful of times Rouven went somewhere with a
 * camera. Two frames three minutes apart (DSC03694 08:37, DSC03700 08:40) sit
 * in different galleries today, and nothing on the site can tell you they are
 * the same morning.
 *
 * That is what the globe is an index of. A category answers "does he shoot
 * weddings"; an outing answers "where has he been", which is the question a
 * travel diary exists to answer and the one the site could not answer at all.
 *
 * WHAT IS FACT IN HERE: every date, every time, and every grouping. All of it
 * was read out of the EXIF, none of it was inferred.
 *
 * BUT THE TIMES ARE CAMERA-LOCAL, NOT PLACE-LOCAL. Every frame carries
 * `OffsetTimeOriginal = +01:00`, so the body's clock was left on central
 * european time no matter where it was standing. Grouping is unaffected, since
 * relative order and spacing survive any fixed offset. Displaying a clock time
 * is not: trip-2023-10 reads 22:36 to 23:27 on the 22nd, which in Bali (UTC+8)
 * is 05:36 to 06:27 on the 23rd, and those frames are a sunrise. Until a stop
 * is placed, print the DATE and not the time.
 *
 * WHAT IS NOT IN HERE AT ALL: place. The cameras (ILCE-7, ILCE-7M4) have no
 * GPS receiver, so nothing can be recovered from the files — and WHERE turned
 * out not to be this file's business anyway. Place lives in places.ts, keyed
 * by sitting rather than by outing, because the two groupings cross rather
 * than nest: trip-2023-10 alone touches three places. A recalled place ships
 * there with a stated precision instead of being withheld — see the header of
 * places.ts and GLOBE-V2.md §2.3 for why "do not guess" was never supposed to
 * mean "do not write down what you know".
 *
 * (The old merge protocol — "move the frames onto the stop when it gets its
 * photographs" — is superseded by that layer. Frames stay here, keyed by when;
 * places.ts points at them by src.)
 */
export interface Outing {
  slug: string
  /** Rouven's name for it. Lowercase, his voice, not a place lookup. */
  title: string | null
  /** first and last capture, ISO, straight off the files. */
  from: string
  to: string
  /** frames in capture order, across whatever categories they were filed under */
  frames: { src: string; at: string }[]
}

const f = (category: string, id: string, at: string) => ({
  src: `/images/categories/${category}/gallery/DSC${id}.jpeg`,
  at,
})

/** newest first */
export const outings: Outing[] = [
  {
    slug: 'street-2024-02',
    title: null,
    from: '2024-02-13T16:53:44',
    to: '2024-02-13T18:09:59',
    frames: [f('street', '05299', '2024-02-13T16:53:44'), f('street', '05320', '2024-02-13T18:09:59')],
  },
  {
    // six frames inside 83 minutes: one gig, one room, one set
    slug: 'gig-2023-12',
    title: null,
    from: '2023-12-23T21:55:19',
    to: '2023-12-23T23:18:59',
    frames: [
      f('concerts', '04137', '2023-12-23T21:55:19'),
      f('concerts', '04159', '2023-12-23T22:01:13'),
      f('concerts', '04230', '2023-12-23T22:26:18'),
      f('concerts', '04248', '2023-12-23T22:30:54'),
      f('concerts', '04330', '2023-12-23T22:47:04'),
      f('concerts', '04360', '2023-12-23T23:18:59'),
    ],
  },
  {
    // The big one, and the clearest proof the categories are a costume: one
    // week produced nine frames that the site currently files under three
    // different galleries, alternating between `nature` and `travel` minute by
    // minute on what is plainly one afternoon and one dawn.
    slug: 'trip-2023-10',
    title: null,
    from: '2023-10-16T11:28:13',
    to: '2023-10-22T23:29:32',
    frames: [
      f('street', '03647', '2023-10-16T11:28:13'),
      f('nature', '03694', '2023-10-19T08:37:37'),
      f('travel', '03700', '2023-10-19T08:40:35'),
      f('travel', '03743', '2023-10-19T09:31:08'),
      f('travel', '03816', '2023-10-22T22:36:58'),
      f('nature', '03828', '2023-10-22T23:05:45'),
      f('nature', '03830', '2023-10-22T23:05:52'),
      f('nature', '03855', '2023-10-22T23:27:12'),
      f('travel', '03862', '2023-10-22T23:29:32'),
    ],
  },
  {
    slug: 'nature-2023-09',
    title: null,
    from: '2023-09-28T17:04:56',
    to: '2023-09-28T17:04:56',
    frames: [f('nature', '03588', '2023-09-28T17:04:56')],
  },
  {
    // six frames inside 75 minutes: one wedding, one afternoon
    slug: 'wedding-2023-08',
    title: null,
    from: '2023-08-26T13:38:42',
    to: '2023-08-26T14:52:24',
    frames: [
      f('weddings', '02597', '2023-08-26T13:38:42'),
      f('weddings', '02640', '2023-08-26T13:51:17'),
      f('weddings', '02729', '2023-08-26T14:05:13'),
      f('weddings', '02799', '2023-08-26T14:12:50'),
      f('weddings', '02847', '2023-08-26T14:22:55'),
      f('weddings', '02936', '2023-08-26T14:52:24'),
    ],
  },
  {
    slug: 'animals-2023-01',
    title: null,
    from: '2023-01-21T15:29:28',
    to: '2023-01-21T15:29:28',
    frames: [f('animals', '00880', '2023-01-21T15:29:28')],
  },
  {
    slug: 'animals-2021-10',
    title: null,
    from: '2021-10-29T14:02:40',
    to: '2021-10-29T14:02:40',
    frames: [f('animals', '8270', '2021-10-29T14:02:40')],
  },
  {
    slug: 'trip-2021-10',
    title: null,
    from: '2021-10-10T13:36:53',
    to: '2021-10-10T18:36:50',
    frames: [
      f('nature', '8162', '2021-10-10T13:36:53'),
      f('travel', '8251', '2021-10-10T18:36:50'),
    ],
  },
]

/* One published photograph is missing from this list on purpose:
   images/categories/events/gallery/DSC09296.jpeg (2022-05-18). The folder
   exists on disk but no `events` category is declared in categories.ts, so the
   frame is not reachable anywhere on the site. It gets an outing the moment it
   gets a category. */

/** every photo the site knows about, by src, so an outing can resolve frames */
const bySrc = new Map<string, Photo>(
  categories.flatMap((c) => [c.cover, ...c.photos]).map((p) => [p.src, p])
)

/** the Photo records for an outing, in capture order; unresolvable srcs drop */
export const framesOf = (outing: Outing): Photo[] =>
  outing.frames.map((frame) => bySrc.get(frame.src)).filter((p): p is Photo => Boolean(p))

/** a single frame by src — how places.ts resolves its sittings */
export const photoOf = (src: string): Photo | undefined => bySrc.get(src)

const outingBySrc = new Map<string, Outing>(
  outings.flatMap((o) => o.frames.map((frame) => [frame.src, o] as const))
)

/** which outing a frame belongs to — the projection caption's link target */
export const outingOf = (src: string): Outing | undefined => outingBySrc.get(src)

export const getOuting = (slug: string | undefined) => outings.find((o) => o.slug === slug)

/**
 * What the hero counts under the globe — derived, so it can never go stale.
 *
 * Places are counted in places.ts, not here, and the two counts only get to
 * share a line once the frames themselves are placed: "10 places · 28 frames"
 * over a globe where none of the 28 came from any of the 10 is three separate
 * facts set with one separator and read as one sentence.
 */
export const archiveStats = () => {
  const frames = outings.reduce((n, o) => n + o.frames.length, 0)
  const span = outings.map((o) => o.from.slice(0, 4)).sort()
  return {
    outings: outings.length,
    frames,
    from: span[0],
    to: span[span.length - 1],
  }
}
