export interface Photo {
  /** the still. Always required, even on a clip: it is the poster frame, the
   *  no-WebGL fallback, the thing the loader preloads, and what a crawler and a
   *  social card get. Motion is an upgrade layered on top of it, never a
   *  replacement for it. */
  src: string
  width: number
  height: number
  /** optional footage for this surface. When set, the plane paints `src` first
   *  and swaps to the video the moment it can play, so the frame is never empty
   *  and never pops. Left unset, everything behaves exactly as before. */
  clip?: string
  /** crop centre 0..1, like object-position, for planes that don't match the
   *  source ratio. Clamped to the crop's real slack, so it's a no-op when the
   *  plane and the image have the same aspect. Defaults to centred. */
  focus?: [number, number]
}

export interface Category {
  slug: string
  title: string
  /** First person, lowercase, one concrete thing about how this work gets made.
   *  Shown on the work index, the featured sections and the gallery header, so
   *  it is the only place most visitors meet the photographer rather than the
   *  photographs. A wall label ("loud rooms, low light") is a description any
   *  gallery could have written; a stance ("i keep the grain") is a claim only
   *  he can make. If a line here stops being true, it comes out. */
  tagline: string
  cover: Photo
  photos: Photo[]
}

const base = '/images/categories'

const photo = (category: string, id: string, width: number, height: number): Photo => ({
  src: `${base}/${category}/gallery/DSC${id}.jpeg`,
  width,
  height,
})

const cover = (
  category: string,
  width: number,
  height: number,
  focus?: [number, number]
): Photo => ({
  src: `${base}/${category}/cover.jpeg`,
  width,
  height,
  focus,
})

export const categories: Category[] = [
  {
    slug: 'nature',
    title: 'nature',
    tagline: 'i walk a long way to stand somewhere quiet',
    cover: cover('nature', 1024, 1280),
    photos: [
      photo('nature', '03694', 853, 1280),
      photo('nature', '03828', 853, 1280),
      photo('nature', '03830', 1280, 720),
      photo('nature', '03855', 1280, 720),
      photo('nature', '03588', 1024, 1280),
      photo('nature', '8162', 1024, 1280),
    ],
  },
  {
    slug: 'travel',
    title: 'travel',
    tagline: 'bali, lisbon, and the roads i took between them',
    cover: cover('travel', 1280, 720),
    photos: [
      photo('travel', '03743', 960, 1280),
      photo('travel', '03700', 853, 1280),
      photo('travel', '03862', 1024, 1280),
      photo('travel', '03816', 1024, 1280),
      photo('travel', '8251', 1280, 720),
    ],
  },
  {
    slug: 'street',
    title: 'street',
    tagline: 'i wait on the corner until somebody makes the frame',
    cover: cover('street', 960, 1280),
    photos: [
      photo('street', '05320', 960, 1280),
      photo('street', '05299', 960, 1280),
      photo('street', '03647', 960, 1280),
    ],
  },
  {
    slug: 'concerts',
    title: 'concerts',
    tagline: 'loud rooms, low light, and i keep the grain',
    // hero print: the landscape plate crops ~21% off a portrait source, biased
    // up so the kick and the stage flare stay in frame instead of the top haze
    cover: cover('concerts', 960, 1280, [0.5, 0.42]),
    photos: [
      photo('concerts', '04137', 1280, 720),
      photo('concerts', '04159', 1024, 1280),
      photo('concerts', '04230', 960, 1280),
      photo('concerts', '04248', 1280, 720),
      photo('concerts', '04330', 1280, 720),
      photo('concerts', '04360', 960, 1280),
    ],
  },
  {
    slug: 'weddings',
    title: 'weddings',
    tagline: 'i stay out of the way and take the day as it happened',
    cover: cover('weddings', 1280, 853),
    photos: [
      photo('weddings', '02799', 1280, 853),
      photo('weddings', '02640', 1280, 853),
      photo('weddings', '02729', 853, 1280),
      photo('weddings', '02936', 853, 1280),
      photo('weddings', '02847', 853, 1280),
      photo('weddings', '02597', 1280, 853),
    ],
  },
  {
    slug: 'animals',
    title: 'animals',
    tagline: 'portraits, except the subject never holds still',
    cover: cover('animals', 1024, 1280),
    photos: [
      photo('animals', '00880', 960, 1280),
      photo('animals', '8270', 1024, 1280),
    ],
  },
]

export const getCategory = (slug: string | undefined) =>
  categories.find((c) => c.slug === slug)

/** categories featured on the landing page, in order */
export const featured = ['nature', 'concerts', 'travel', 'weddings']
  .map((slug) => getCategory(slug)!)
