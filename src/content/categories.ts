export interface Photo {
  /** the still. Always required, even on a clip: it is the poster frame, the
   *  no-WebGL fallback, the thing the loader preloads, and what a crawler and a
   *  social card get. Motion is an upgrade layered on top of it, never a
   *  replacement for it. */
  src: string
  width: number
  height: number
  /** concrete, subject-first description used by DOM image fallbacks */
  alt?: string
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

const photo = (category: string, id: string, width: number, height: number, alt: string): Photo => ({
  src: `${base}/${category}/gallery/DSC${id}.jpeg`,
  width,
  height,
  alt,
})

/** A frame pulled from footage rather than shot as a photograph — imported
 *  from the video-still archive (2026-08 pass), named by place instead of by
 *  camera counter. Same Photo shape; the different helper only marks the
 *  different provenance: stills carry no capture EXIF, so they never appear
 *  in outings.ts and never print a clock time. */
const still = (category: string, name: string, width: number, height: number, alt: string): Photo => ({
  src: `${base}/${category}/gallery/${name}.jpeg`,
  width,
  height,
  alt,
})

const cover = (
  category: string,
  width: number,
  height: number,
  alt: string,
  focus?: [number, number]
): Photo => ({
  src: `${base}/${category}/cover.jpeg`,
  width,
  height,
  alt,
  focus,
})

export const categories: Category[] = [
  {
    slug: 'nature',
    title: 'nature',
    tagline: 'i walk a long way to stand somewhere quiet',
    cover: cover('nature', 1024, 1280, 'a rock stack breaking through a fog bank under a hard blue sky'),
    photos: [
      photo('nature', '03694', 853, 1280, 'a thin waterfall dropping through dense jungle, ferns crowding the frame'),
      photo('nature', '03828', 853, 1280, 'a distant volcano at first light, seen past a blurred ridge of rock'),
      photo('nature', '03830', 1280, 720, 'two figures watching sunrise from a volcano ridge, sun flaring through grass'),
      photo('nature', '03855', 1280, 720, 'a hazy volcanic caldera at morning, village and terraces on the floor'),
      photo('nature', '03588', 1024, 1280, 'late sun through an orchard, a farmhouse roof behind the trees'),
      photo('nature', '8162', 1024, 1280, 'a rock stack breaking through a fog bank under a hard blue sky'),
      still('nature', 'still-milford-stirling-falls', 1920, 1080, 'a thin waterfall dropping from a hanging valley between dark fiord walls, mist caught on the ridgeline'),
      still('nature', 'still-milford-bowen-falls', 1920, 1080, 'a broad waterfall fanning down a rock face through rainforest into dark fiord water'),
      still('nature', 'still-milford-monkey-creek', 1920, 1080, 'a stony creek winding through scrub below snow-patched granite walls, cloud drifting across the peaks'),
      still('nature', 'still-doubtful-dawn-peaks', 1920, 1080, 'rocky summits glowing with first light above a thick bank of blue-grey fog'),
      still('nature', 'still-doubtful-mirror-arm', 1920, 1080, 'mirror-still fiord water reflecting mossy green cliffs, the near wall in silhouette'),
      still('nature', 'still-nz-misty-lake', 1920, 1080, 'morning mist drifting over a glassy lake, dark pines and a single golden willow on the far shore'),
      still('nature', 'still-nz-roys-bay', 1920, 1080, 'last light on a bare mountain across a choppy lake bay, framed by a dark overhanging branch'),
      still('nature', 'still-nz-creek-pool', 1920, 1080, 'a clear turquoise creek pool between grey schist rock and autumn-littered grassy banks'),
      still('nature', 'still-sydney-lightning', 1920, 1080, 'a lightning bolt splitting a storm sky over sydney harbour, a catamaran ferry mid-crossing below'),
      still('nature', 'still-dolomites-larch-ridge', 1920, 1080, 'a shadowed larch ridge falling away to a forested valley beneath the sunlit face of a dolomite peak'),
      still('nature', 'still-dolomites-sella-fence', 1920, 1080, 'a weathered wooden fence on a green pass beneath cumulus stacked over the sassolungo and sella massifs'),
      still('nature', 'still-dolomites-latemar', 1920, 1080, 'evening light raking across a flowering meadow toward the serrated ridgeline of a dolomite massif'),
      still('nature', 'still-tokyo-blossom', 1920, 1080, 'double cherry blossoms in full pink bloom, bronze leaves blurring into a deep blue sky'),
      still('nature', 'still-phangan-valley', 1920, 1080, 'a jungle valley at golden hour with a-frame cabin roofs in the foreground and a forested peak beyond'),
    ],
  },
  {
    slug: 'travel',
    title: 'travel',
    tagline: 'bali, lisbon, and the roads i took between them',
    cover: cover('travel', 1280, 720, 'a clifftop lighthouse over the Atlantic at sunset'),
    photos: [
      photo('travel', '03743', 960, 1280, 'a man standing in a waterfall pool with a camera in his hand'),
      photo('travel', '03700', 853, 1280, 'a hiker on a boulder below a tall jungle waterfall'),
      photo('travel', '03862', 1024, 1280, 'a hiker standing in dry summit grass at dawn'),
      photo('travel', '03816', 1024, 1280, 'a man at dawn looking across to a volcano from a ridge'),
      photo('travel', '8251', 1280, 720, 'a clifftop lighthouse over the Atlantic at sunset'),
      // vol. 02 — frames pulled from the footage, koh phangan back to cape town
      still('travel', 'still-phangan-beach', 1920, 1080, 'a man walking barefoot along white sand beneath leaning palms, turquoise sea stretching to a distant headland'),
      still('travel', 'still-phangan-scooter', 1920, 1080, 'a man on a scooter with an orange backpack pausing on a red-paved island road, palms and a white villa behind'),
      still('travel', 'still-tokyo-sensoji-pagoda', 1920, 1080, 'the gilded spire of senso-ji\'s five-storey pagoda catching last light above temple rooftops and trees'),
      still('travel', 'still-tokyo-pagoda-below', 1920, 1080, 'a five-storey pagoda from below at dusk, stacked eaves dark against a soft clouded sky'),
      still('travel', 'still-tokyo-tower', 1920, 1080, 'a man from behind gazing up at tokyo tower, red lattice rising over a temple roof'),
      still('travel', 'still-tokyo-sumida', 1920, 1080, 'a jogger on the sumida river promenade under a clear sky, bridges curving into the distance'),
      still('travel', 'still-milford-mitre-peak', 1920, 1080, 'a man at a stern railing beside a red ensign, a tall ship anchored under mitre peak'),
      still('travel', 'still-milford-ship', 1920, 1080, 'a small ship dwarfed by towering fiord walls, sunlight glittering on wind-chopped water'),
      still('travel', 'still-milford-eglinton', 1920, 1080, 'a lone figure standing in a wide tussock meadow, dark mountain ranges closing in on both sides'),
      still('travel', 'still-doubtful-sunrise-wake', 1920, 1080, 'sunrise cloud burning gold between dark fiord ridgelines, a boat\'s wake fading below'),
      still('travel', 'still-doubtful-stern', 1920, 1080, 'a man with an orange backpack at a stern rail, the boat\'s wake fanning across deep blue fiord water'),
      still('travel', 'still-nz-fiord-stern', 1920, 1080, 'a man with an orange pack at a boat\'s stern, wake churning down a fiord walled with forest'),
      still('travel', 'still-nz-wakatipu-tussock', 1920, 1080, 'a man in a dark tee standing on a golden tussock hillside above a deep blue lake, a bare peak rising across the water'),
      still('travel', 'still-nz-wakatipu-cairn', 1920, 1080, 'a lone figure on the stony shore of lake wakatipu, a rock cairn nearby and the remarkables rising beyond the turquoise water'),
      still('travel', 'still-nz-lake-swim', 1920, 1080, 'two swimmers in a cold lake off a pale stone beach, brown mountains rising under a moody sky'),
      still('travel', 'still-nz-boots', 1920, 1080, 'hiking boots mid-stride through dry golden grass, a steel-blue lake and dark ridge behind'),
      still('travel', 'still-nz-bluff', 1920, 1080, 'a person with arms spread wide on a windswept bluff above a grey lake and layered mountains'),
      still('travel', 'still-nz-alpine-stream', 1920, 1080, 'three hikers crossing a rocky alpine stream in single file below a rugged cirque of scree and tussock'),
      still('travel', 'still-nz-paddock-run', 1920, 1080, 'a man in a grey hoodie running across an open paddock, evening light on the mountain valley behind'),
      still('travel', 'still-nz-peters-lookout', 1920, 1080, 'two friends at a wooden lookout rail at dusk, a still glacial lake stretching toward snow-capped peaks'),
      still('travel', 'still-nz-wanaka-boulder', 1920, 1080, 'a man standing on a boulder at a gravel beach, hands behind his head, calm lake and golden hills beyond'),
      still('travel', 'still-nz-wanaka-dusk', 1920, 1080, 'a man at the water\'s edge of a lake beach at dusk, glowing clouds over dark ranges'),
      still('travel', 'still-sydney-opera-ferry', 1920, 1080, 'the sydney opera house from the harbour, a ferry sliding past and a tall ship heading in under haze'),
      still('travel', 'still-sydney-bridge-portrait', 1920, 1080, 'a man in a white sleeveless tee glancing aside under a pale sky, the sydney harbour bridge arching behind'),
      still('travel', 'still-bondi-steps', 1920, 1080, 'a man leaping down sandstone steps above bondi\'s coastal path, the crowded beach curving away behind'),
      still('travel', 'still-bondi-coastal-walk', 1920, 1080, 'a man walking the railed sandstone coastal path with deep-blue ocean and headlands stretching behind'),
      still('travel', 'still-bondi-lookout', 1920, 1080, 'a man seated on a stone wall looking back across bondi\'s turquoise bay toward the beach'),
      still('travel', 'still-bondi-rock-ramp', 1920, 1080, 'a man walking a concrete ramp across bondi\'s rock shelf, surf and a crowded beach behind'),
      still('travel', 'still-brisbane-river', 1080, 1920, 'a man in a striped shirt holding his phone before the brisbane river, city towers stacked along the far bank'),
      still('travel', 'still-brisbane-south-bank', 1080, 1920, 'a man sitting on the south bank lawn edge, brisbane\'s towers and expressway stacked across the river'),
      still('travel', 'still-hanoi-incense', 1920, 1080, 'a worker in a conical hat crouched among rows of fanned red incense bundles drying in a courtyard'),
      still('travel', 'still-bali-van', 1920, 1080, 'a man leaning out of a moving van window grinning, an indonesian roadside blurring past'),
      still('travel', 'still-java-volcano', 1920, 1080, 'a man with a camera looking up into towering volcanic steam over a dark crater'),
      // before the one-way east — the european chapters
      still('travel', 'still-dolomites-cinque-torri', 1920, 1080, 'a man standing on a jagged outcrop at golden hour, pale dolomite towers glowing around him'),
      still('travel', 'still-dolomites-summit', 1920, 1080, 'a man standing on a rocky summit beside a marker pole with red-white tape streaming in the wind, dolomite ridges behind'),
      still('travel', 'still-dolomites-funes', 1920, 1080, 'a woman walking down a meadow path above santa maddalena, church spire and cloud-wrapped odle peaks beyond'),
      still('travel', 'still-dolomites-pasture', 1920, 1080, 'a lone figure dwarfed by a broad alpine pasture, spruce forest and a dolomite rock wall towering behind'),
      still('travel', 'still-dolomites-carezza', 1920, 1080, 'a man in a cream cap in front of the latemar peaks and pine forest at carezza lake in the dolomites'),
      still('travel', 'still-barcelona-sagrada', 1920, 1080, 'the sagrada familia rising over the barcelona skyline toward the sea at dusk'),
      still('travel', 'still-cape-town-camps-bay', 1920, 1080, 'a man running across coastal boulders at sunset below the twelve apostles mountains in camps bay'),
    ],
  },
  {
    slug: 'street',
    title: 'street',
    tagline: 'i wait on the corner until somebody makes the frame',
    cover: cover('street', 960, 1280, 'a gothic church seen through tram wires above a line of traffic'),
    photos: [
      photo('street', '05320', 960, 1280, 'a passenger doubled over with hands over their face on a train'),
      photo('street', '05299', 960, 1280, 'a gothic church seen through tram wires above a line of traffic'),
      photo('street', '03647', 960, 1280, 'a wet shopfront street at blue hour, signage lit against the dusk'),
      still('street', 'still-tokyo-asakusa-station', 1920, 1080, 'a blue-hour crossing outside asakusa station, lit signs stacked above commuters heading home'),
      still('street', 'still-tokyo-denboin-dori', 1920, 1080, 'a red temple-style shopfront in asakusa at dusk, a masked shopper passing a paper umbrella stall'),
      still('street', 'still-tokyo-fugu-corner', 1920, 1080, 'a corner fugu restaurant in asakusa at golden hour, power lines crisscrossing the blue sky above'),
      still('street', 'still-tokyo-side-street', 1920, 1080, 'a narrow tokyo shopping street in low afternoon sun, clothing racks and signboards crowding the pavement'),
      still('street', 'still-bangkok-lazada-rider', 1920, 1080, 'a lazada delivery rider swinging his scooter through a sunlit soi, corrugated fence and wire tangle behind'),
      still('street', 'still-bangkok-cables', 1920, 1080, 'a bangkok utility pole drowning in looped black cables, a white tower and frangipani leaves against the blue sky'),
      still('street', 'still-bangkok-soi', 1920, 1080, 'a shaded bangkok soi running toward sunlit condo towers, one distant figure on the lane'),
      still('street', 'still-hanoi-pomelo', 1080, 1920, 'a pomelo vendor in a conical hat making a sale from her bicycle basket at a hanoi market'),
      still('street', 'still-frankfurt-ubahn', 1920, 1080, 'a man in a beanie waiting alone on the willy-brandt-platz u-bahn bench as a train blurs past'),
    ],
  },
  {
    slug: 'concerts',
    title: 'concerts',
    tagline: 'loud rooms, low light, and i keep the grain',
    // hero print: the landscape plate crops ~21% off a portrait source, biased
    // up so the kick and the stage flare stay in frame instead of the top haze
    cover: cover('concerts', 960, 1280, 'a singer kicking a leg up into three stage lights through smoke', [0.5, 0.42]),
    photos: [
      photo('concerts', '04137', 1280, 720, 'a bassist in a christmas-print jacket laughing under blue stage light'),
      photo('concerts', '04159', 1024, 1280, 'a singer in a bow tie shouting into a hand-held mic under green light'),
      photo('concerts', '04230', 960, 1280, 'a singer kicking a leg up into three stage lights through smoke'),
      photo('concerts', '04248', 1280, 720, 'a band mid-set under green beams, the crowd silhouetted below'),
      photo('concerts', '04330', 1280, 720, 'the view from the stage over a packed hall, hundreds of hands up'),
      photo('concerts', '04360', 960, 1280, 'a guitarist in profile under purple light, seen past a cymbal'),
    ],
  },
  {
    slug: 'weddings',
    title: 'weddings',
    tagline: 'i stay out of the way and take the day as it happened',
    cover: cover('weddings', 1280, 853, 'a couple walking out through thrown confetti, both laughing'),
    photos: [
      photo('weddings', '02799', 1280, 853, 'a couple embracing in the aisle as the guests applaud'),
      photo('weddings', '02640', 1280, 853, 'a bridal bouquet resting on a laid table between two glasses'),
      photo('weddings', '02729', 853, 1280, 'a bride with her eyes closed holding the groom in a long hug'),
      photo('weddings', '02936', 853, 1280, 'a speaker in a teal suit reading from a folded sheet'),
      photo('weddings', '02847', 853, 1280, 'a couple crossing an empty village street, veil trailing behind'),
      photo('weddings', '02597', 1280, 853, 'a bride laughing mid-ceremony, seen past a pillar'),
    ],
  },
  {
    slug: 'animals',
    title: 'animals',
    tagline: 'portraits, except the subject never holds still',
    cover: cover('animals', 1024, 1280, 'a dog lying in grass against a wall of crimson autumn leaves'),
    photos: [
      photo('animals', '00880', 960, 1280, 'a dog running through snow with a branch in its mouth'),
      photo('animals', '8270', 1024, 1280, 'a dog lying in grass against a wall of crimson autumn leaves'),
      still('animals', 'still-dolomites-bees', 1920, 1080, 'honeybees crowding the white lace of an umbellifer flower head against soft green bokeh'),
    ],
  },
]

const bySlug = new Map(categories.map((c) => [c.slug, c] as const))

export const getCategory = (slug: string | undefined) =>
  slug === undefined ? undefined : bySlug.get(slug)

/** every frame in the journal — the one count Journal and the status rail share */
export const frameCount = categories.reduce((n, c) => n + c.photos.length, 0)
