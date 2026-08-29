import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import { webglAvailable } from '@/lib/webgl'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { FramePop } from '@/components/FramePop'
import {
  solvePlateLayout,
  AUTO_OPEN_MIN_FRAMES,
  type PlateLayout,
  type StackInput,
} from '@/components/plateLayout'
import { useUI } from '@/stores/ui'
import type { GlobePointer, PinProjection, ScaleState } from '@/canvas/Globe'
import { clusters, type PlaceCluster } from '@/content/clusters'
import { places, framesAt, firstAt, precisionWord, type Place } from '@/content/places'
import { flightArcs, waypointAirports } from '@/content/flights'

/**
 * The fan's spread per card, degrees — MUST mirror the CSS
 * (.globe-pin-selected .globe-pickup-card). The pop flies out of a rotated
 * card and slides back into one, so it needs the card's real resting angle.
 */
const FAN_STEP = 20

/**
 * The resting pile: top card straight, the rest peeking out alternately —
 * mirrored into `--jitter` on every card, and read back below so a card that
 * flies out to viewer scale leaves at the angle it was actually lying at.
 */
const cardJitter = (k: number) => (k === 0 ? 0 : (k % 2 ? -1 : 1) * (2 + k * 2))

/**
 * The same pile at plate scale, degrees — MUST mirror the CSS
 * (.globe-frame[data-phase='plate'] .globe-pickup-card, --print-scatter).
 * The plate stack is a stack of prints and does NOT fan, so a print popping
 * out of it must not fly from a fan angle it was never holding.
 */
const PRINT_SCATTER = 4
const printAngle = (k: number) =>
  Math.max(-PRINT_SCATTER, Math.min(PRINT_SCATTER, cardJitter(k) * 0.45))

/**
 * The plate stack's own box, mirrored from site.css (--print-plate-h, 3:2, and
 * the caption line beneath). One definition, three readers: the pin loop's
 * viewport clamp, the layout solver's collision boxes, and the fallbacks the
 * solver uses when a caption has not been measured yet.
 */
const PRINT_PLATE_VH = 0.11
/**
 * The widest caption any enterable cap prints is 41 characters
 * (`milford sound, nz · to the region · [ 6 ]`); at 0.6rem mono that is ~276px,
 * so ~140px each side of the anchor. Mirrors .globe-print-caption.
 */
const PRINT_CAPTION_HALF_W = 140

const plateBounds = () => {
  const printHeight = window.innerHeight * PRINT_PLATE_VH
  const printWidth = printHeight * 1.5
  return {
    printHeight,
    printWidth,
    horizontalClearance: Math.min(
      window.innerWidth * 0.44,
      Math.max(window.innerWidth * 0.06, printWidth / 2 + 8, PRINT_CAPTION_HALF_W)
    ),
    verticalClearance: Math.min(
      window.innerHeight * 0.44,
      Math.max(window.innerHeight * 0.06, printHeight + 34)
    ),
  }
}
type PlateBounds = ReturnType<typeof plateBounds>
const clampToTable = (x: number, y: number, bounds: PlateBounds) => ({
  x: Math.max(
    bounds.horizontalClearance,
    Math.min(window.innerWidth - bounds.horizontalClearance, x)
  ),
  y: Math.max(bounds.verticalClearance, Math.min(window.innerHeight - bounds.verticalClearance, y)),
})

/**
 * The landing beat the sheet spreads on, seconds after the plate settles.
 * CONCEPT-COUNTRY-ZOOM-V2 §5 times the dive in one clock: stacks land at
 * ~1.5s, the sheet spreads at ~2.0s — so the sheet lags its own ground by half
 * a second, exactly the way the captions lag theirs.
 */
const AUTO_OPEN_DELAY_S = 0.5
/** how long the sheet takes to develop in, and how far apart its frames arrive */
const SHEET_DEVELOP_S = 0.85
const SHEET_FRAME_LAG = 0.028
/** the open sheet's id, so the stack that spread it can point at it (aria-controls) */
const SHEET_DOM_ID = 'globe-contact-sheet'
/** a pan of this many pixels invalidates the layout; under it the table has not moved */
const RESOLVE_DRIFT_PX = 24
/** and never more often than this, whatever the drag does */
const RESOLVE_INTERVAL_S = 0.3

const GlobeView = lazy(() => import('./GlobeView'))

/**
 * The waypoint layer: cities the route flew through that hold no photographs.
 * A city already wearing a place pin keeps the pin — a mono label under the
 * same word would just double it — so anything within ~2.5° (~275km) of a
 * place drops out here. Everything else gets a small instrument-register
 * label, which is what keeps the sphere's far side from reading as empty
 * ocean between pins.
 */
const nearAPlace = ([lat, lng]: [number, number]) =>
  places.some((p) => Math.hypot(p.coords[0] - lat, p.coords[1] - lng) < 2.5)
const waypoints = waypointAirports.filter((a) => !nearAPlace(a.coords))

/* Module scope, and that matters. These used to be built inline in the render
   body, so every WorldGlobe render handed the canvas fresh array identities —
   which re-ran Globe's seed pass and re-rolled the entrance's random tiebreaks.
   Harmless in practice (the one render that lands mid-entrance is the reveal
   flip, while the dots are still parked in the dust) but it is a live wire
   under a sequence whose whole premise is that nothing is decided twice.
   `places` and `waypoints` are module constants; so are these. */
const pinCoords = places.map((p) => p.coords)
const pinPrecisions = places.map((place) => place.precision)
const pinWeights = places.map((place) => framesAt(place).length)
const waypointCoords = waypoints.map((a) => a.coords)

/* The static fallback needs the same congestion truth as the live globe.
   clusters.ts is pure deployment-data math, so keeping this lookup at module
   scope adds no Three.js/canvas dependency and decides every grouping once. */
const clusterForPlace = new Int16Array(places.length).fill(-1)
clusters.forEach((cluster, clusterIndex) => {
  for (const placeIndex of cluster.memberIndices) clusterForPlace[placeIndex] = clusterIndex
})

/* ONE FACE PER COUNTRY (v4.1). At world scale a country shows exactly one
   thing: a small photo preview standing on its heaviest place. Singleton
   piles, chip-only clusters and bare text labels were three different rest
   presentations for the same kind of object; now the heaviest member's stack
   is the country's face, every other member presentation waits for the
   landed table, and the preview's card count is capped in CSS. */
const previewPlaceForCluster = new Int16Array(clusters.length).fill(-1)
clusters.forEach((cluster, clusterIndex) => {
  let best = -1
  let bestFrames = 0
  for (const placeIndex of cluster.memberIndices) {
    const count = framesAt(places[placeIndex]).length
    if (count > bestFrames) {
      best = placeIndex
      bestFrames = count
    }
  }
  previewPlaceForCluster[clusterIndex] = best
})

const regionNames = new Intl.DisplayNames('en', { type: 'region' })
const withoutCountrySuffix = (label: string) => label.replace(/,\s*[a-z]{2}$/i, '')

/**
 * The display title IS the unit now: a cluster is a country (v3), so the
 * title is the country's display name, full stop. The heaviest-member
 * heuristic this replaces existed to paper over cross-border caps like
 * `germany · vienna · dolomites` — a grouping that can no longer be built.
 * The member list still demotes to the instrument meta line under the title
 * and stays whole in the chip's accessible name.
 */
const clusterLabel = (cluster: PlaceCluster) =>
  (regionNames.of(cluster.countryCode) ?? cluster.countryCode).toLocaleLowerCase('en')
/** the demoted line: every member of the cap, in travelled order */
const clusterMemberList = (cluster: PlaceCluster) =>
  cluster.memberIndices
    .map((placeIndex) => withoutCountrySuffix(places[placeIndex].label))
    .join(' · ')

const clusterLabels = clusters.map(clusterLabel)
const clusterMembers = clusters.map(clusterMemberList)
/** `4 places` / `1 place` — the one half of the count line that is still prose */
const placesWord = (count: number) => `${count} ${count === 1 ? 'place' : 'places'}`
/**
 * The bracket half, split so the digit can be lifted into accent: everything
 * before the number, then the number, then everything after it. `[ 24 ]` and
 * never `[ 24 frames ]` — the stack captions set the register and a second
 * spelling of the same count is the site disagreeing with itself.
 */
const countsLead = (placeCount: number) => `${placesWord(placeCount)} · [ `
const COUNTS_TAIL = ' ]'
const clusterAccessibleName = (cluster: PlaceCluster, clusterIndex: number) => {
  const placeCount = cluster.memberIndices.length
  const frameCount = cluster.totalFrameCount
  /* the short title is a display move, not an information move: a screen
     reader still hears every place this chip covers */
  const members = clusterMembers[clusterIndex]
  const named =
    members === clusterLabels[clusterIndex] ? members : `${clusterLabels[clusterIndex]}: ${members}`
  return `enter ${named} — ${placesWord(placeCount)}, ${frameCount} ${
    frameCount === 1 ? 'frame' : 'frames'
  }`
}

/**
 * The landed meta line, as structure instead of punctuation.
 *
 * It says two things — which places are under this cap, and how many of each
 * there are — and the two used to be welded together with a dash. The house
 * rule has no dash in it, and the honest fix is not a different character but
 * the admission that these are two fields: a member list and a count readout,
 * set as siblings and held apart by the flex gap on .hero-title-sub-selection.
 *
 * Built once per host element and then written by nodeValue, because the
 * caller is the rAF loop: `textContent = …` on the wrapper every frame would
 * throw away and rebuild the accent span sixty times a second.
 */
interface MetaLineNodes {
  host: HTMLElement
  members: HTMLElement
  lead: Text
  num: HTMLElement
  tail: Text
}
const buildMetaLine = (host: HTMLElement): MetaLineNodes => {
  host.textContent = ''
  const members = document.createElement('span')
  members.className = 'hero-title-sub-members'
  const counts = document.createElement('span')
  counts.className = 'hero-title-sub-counts'
  const lead = document.createTextNode('')
  const num = document.createElement('span')
  num.className = 'globe-print-count-num'
  const tail = document.createTextNode('')
  counts.append(lead, num, tail)
  host.append(members, counts)
  return { host, members, lead, num, tail }
}

/* Group a cluster when its newest member is reached, then keep its members in
   travelled order beneath one counts line. Lone places retain the same order
   around those groups, and empty stops remain ordinary label-only rows. */
const staticPlaces: {
  place: Place
  index: number
  cluster?: PlaceCluster
  clusterIndex?: number
}[] = []
const emittedStaticClusters = new Uint8Array(clusters.length)
for (let index = places.length - 1; index >= 0; index--) {
  const clusterIndex = clusterForPlace[index]
  if (clusterIndex < 0) {
    staticPlaces.push({ place: places[index], index })
    continue
  }
  if (emittedStaticClusters[clusterIndex] === 1) continue
  emittedStaticClusters[clusterIndex] = 1
  const cluster = clusters[clusterIndex]
  const memberIndices = cluster.memberIndices.slice().sort((a, b) => b - a)
  memberIndices.forEach((memberIndex, memberOrder) => {
    staticPlaces.push({
      place: places[memberIndex],
      index: memberIndex,
      cluster: memberOrder === 0 ? cluster : undefined,
      clusterIndex: memberOrder === 0 ? clusterIndex : undefined,
    })
  })
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** '2023-10-16T…' → "oct '23" */
const stamp = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} '${iso.slice(2, 4)}`
const easeCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

/**
 * The line under the place name. A stop that has been travelled but not yet
 * imported has neither a date nor a frame count, so rather than print "0
 * frames" — which reads as a shoot that failed — it says what is true: the
 * photographs are not on the site yet.
 */
const meta = (place: Place) => {
  const count = place.frames.length
  if (count === 0) return 'frames to come'
  const from = firstAt(place)
  return from ? `${stamp(from)} · ${count} ${count === 1 ? 'frame' : 'frames'}` : `${count} frames`
}

interface WorldGlobeProps {
  /**
   * Shared with the projection panel: the index into `places` currently being
   * presented, written every frame by the canvas, read by whoever needs it
   * without a React render in between. Optional so the globe still works alone.
   */
  activeRef?: { current: number }
  /**
   * The other direction: the index the visitor TAPPED, written here by the
   * pickup buttons, consumed by the canvas (swing it front-on, hold it long)
   * and by the panel (lock onto its collection). Cleared canvas-side when the
   * tour moves on or the sphere is grabbed.
   */
  selectedRef?: { current: number }
  /** The existing hero subject nodes; the ticker crossfades their two layers. */
  titleRef?: RefObject<HTMLHeadingElement | null>
  subtitleRef?: RefObject<HTMLParagraphElement | null>
}

/**
 * Layer 2 half of the globe: a DOM frame that owns layout and every readable
 * word, with a drei <View> scissoring the shared canvas onto it.
 *
 * The 3D never renders text. Each place is a real DOM element carrying a real
 * place name and a real date, positioned each frame from the projection the
 * canvas reports back — so the labels are indexable and legible to a screen
 * reader whether or not WebGL ever starts. (Not selectable: the frame turns
 * off user-select, because a drag across it was selecting the page.)
 *
 * With no WebGL or reduced motion it renders a plain ordered list of the same
 * places instead, in the order travelled. Nothing on this site lives behind the
 * ability to run a 3D scene, and until the `!has3D` branch below existed that
 * was a claim rather than a fact.
 */
export function WorldGlobe({
  activeRef: sharedActiveRef,
  selectedRef: sharedSelectedRef,
  titleRef,
  subtitleRef,
}: WorldGlobeProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pinRefs = useRef<(HTMLLIElement | null)[]>([])
  const pinLabelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const projectionRef = useRef<PinProjection[]>([])
  const waypointRefs = useRef<(HTMLLIElement | null)[]>([])
  const waypointProjectionRef = useRef<PinProjection[]>([])
  const chipRefs = useRef<(HTMLLIElement | null)[]>([])
  const chipButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const chipProjectionRef = useRef<PinProjection[]>([])
  /* v4: a chip is the HOVER LABEL of its country, not a resting billboard.
     One damped presence per chip, driven by the canvas's hover answer (and by
     keyboard focus, which must always be able to see what it is standing on). */
  const chipFadeRef = useRef(new Float32Array(clusters.length))
  const tickPrevRef = useRef(-1)
  const internalActiveRef = useRef(-1)
  const internalSelectedRef = useRef(-1)
  const activeRef = sharedActiveRef ?? internalActiveRef
  const selectedRef = sharedSelectedRef ?? internalSelectedRef
  const spinRef = useRef(0)
  const tiltRef = useRef(0)
  const scaleRef = useRef<ScaleState>({
    phase: 'world',
    cluster: -1,
    morph: 0,
    presence: 0,
    scan: 0,
  })
  const enterRef = useRef(-1)
  const exitRef = useRef(false)
  /* the country pointer contract (v3 phase 2): the DOM writes where the
     pointer is, the canvas answers which visited country is under it */
  const globePointerRef = useRef<GlobePointer>({ x: 0, y: 0, active: false })
  const hoverCountryRef = useRef(-1)
  const frameRectRef = useRef<{ rect: DOMRect | null; at: number }>({ rect: null, at: 0 })
  const wasDragRef = useRef(false)
  const grabRef = useRef<HTMLDivElement>(null)
  const instrumentRef = useRef<HTMLSpanElement>(null)
  const worldButtonRef = useRef<HTMLButtonElement>(null)
  /* the two spans of the landed meta line, built once and then written in
     place — see buildMetaLine above */
  const metaLineRef = useRef<MetaLineNodes | null>(null)
  const instrumentPositionRef = useRef({ lat: 0, lng: 0 })
  const draggingRef = useRef(false)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const lastXRef = useRef(0)
  const lastYRef = useRef(0)
  const dragVelocityRef = useRef({ x: 0, y: 0, at: 0 })
  const originalDocumentTitleRef = useRef(
    typeof document === 'undefined' ? 'rouvens.work' : document.title
  )
  const [has3D] = useState(() => webglAvailable() && !prefersReducedMotion())

  /* the card currently popped out of its hand at viewer scale, or null. React
     state on purpose: it changes on taps, not per frame, and the fan below
     needs to re-render so the lifted card's slot goes visibly empty.
     `from` says which surface it left: a stack print lies at its scatter
     angle, a sheet frame lies flat, and the pop has to fly back into the one
     it actually came out of. */
  const [pop, setPop] = useState<{
    pin: number
    frame: number
    from: 'stack' | 'sheet'
  } | null>(null)
  /* the card buttons by `pin:frame`, so the pop can measure the exact card it
     flies out of — and, at close time, whatever that card's geometry is NOW */
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  /* the same contract for the open sheet's frames, kept in its own map so a
     stack print and its sheet frame can both exist for the same `pin:frame` */
  const sheetFrameRefs = useRef(new Map<string, HTMLButtonElement>())

  /* THE SHEET (CONCEPT-COUNTRY-ZOOM-V2 §6 figure layer 3). Which stack is
     spread lives in the UI store, not here, because Escape has to read it in
     the same breath as `popOpen` to know which depth it is closing. */
  const plateSheet = useUI((state) => state.plateSheet)
  const sheetRef = useRef<HTMLDivElement>(null)
  const marksRef = useRef<HTMLDivElement>(null)
  const tieRefs = useRef<(HTMLSpanElement | null)[]>([])
  const leaderRef = useRef<HTMLSpanElement>(null)
  /* the solver's output, applied by the rAF loop: per-place displacement in
     screen px, and the layout the marks were drawn from */
  const nudgeRef = useRef(new Float64Array(places.length * 2))
  const layoutRef = useRef<PlateLayout | null>(null)
  const solveDirtyRef = useRef(true)
  const solveAtRef = useRef(0)
  const solveAnchorsRef = useRef(new Float64Array(places.length * 2))
  const landedAtRef = useRef(-1)
  const autoOpenDoneRef = useRef(false)
  const sheetOwnerRef = useRef<number | null>(null)
  const sheetOpenedAtRef = useRef(0)
  /* false until the current layout's sheet rectangle has been written onto a
     real element — the element is a render behind the solve that placed it */
  const sheetPlacedRef = useRef(false)
  /* the element the geometry was last written to, so a freshly mounted sheet
     can arrive in place instead of gliding in from the frame's corner */
  const placedElementRef = useRef<HTMLDivElement | null>(null)
  /* set by keyboard activations only: a mouse click that yanked focus into the
     sheet would be stealing it from the pointer */
  const sheetFocusRef = useRef(false)

  /* The sheet's two verbs, and the only two writers of its state. Both read
     the store rather than the render's `plateSheet`, so a handler installed by
     an effect with no dependencies is never holding a stale answer. */
  const spreadSheet = (placeIndex: number, fromKeyboard: boolean) => {
    sheetFocusRef.current = fromKeyboard
    useUI.getState().openPlateSheet(placeIndex)
  }
  const foldSheet = (returnFocus: boolean) => {
    const open = useUI.getState().plateSheet
    if (open === null) return
    useUI.getState().closePlateSheet()
    /* the way back is the way in: the stack that spread the sheet takes the
       focus back, so a keyboard visitor is never dropped on <body> */
    if (returnFocus) cardRefs.current.get(`${open}:0`)?.focus()
  }
  const sheetHasFocus = () =>
    Boolean(document.activeElement && sheetRef.current?.contains(document.activeElement))

  /* focus follows the spread, but only when the spread was asked for by a key:
     `detail === 0` on a click event is the browser's own tell that this was
     Enter or Space on a button rather than a pointer */
  useEffect(() => {
    if (plateSheet === null || !sheetFocusRef.current) return
    sheetFocusRef.current = false
    sheetFrameRefs.current.get(`${plateSheet}:0`)?.focus()
  }, [plateSheet])

  /* One loop for every label, reading the positions the canvas wrote on its
     own frame. Writing transforms straight to the nodes keeps a turning globe
     at zero React renders — the alternative is setState sixty times a second
     for a dozen elements, which is how a 3D hero starts costing more than it
     is worth. Rides the GSAP ticker rather than its own rAF: the ticker
     already drives Lenis and every timeline (SmoothScroll), so the labels
     update in the same frame as scroll-driven layout instead of racing it
     on a second loop. */
  useEffect(() => {
    if (!has3D || places.length === 0) return

    /* A mark is a 1px line, drawn the only way a 1px line should be drawn: one
       element, rotated about its own left edge. Its opacity is NOT written
       here — it rides --plate-presence / --sheet-presence in CSS, so marks lag
       their ground on the way in and unplot with it on the way out. */
    const drawMark = (
      node: HTMLSpanElement | null,
      mark: { x1: number; y1: number; x2: number; y2: number } | null,
      rect: { top: number; left: number }
    ) => {
      if (!node) return
      if (!mark) {
        node.style.setProperty('--mark-on', '0')
        node.style.width = '0px'
        return
      }
      const dx = mark.x2 - mark.x1
      const dy = mark.y2 - mark.y1
      node.style.setProperty('--mark-on', '1')
      node.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`
      node.style.transform =
        `translate3d(${(mark.x1 - rect.left).toFixed(1)}px, ${(mark.y1 - rect.top).toFixed(1)}px, 0)` +
        ` rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`
    }

    /**
     * The sheet's rectangle, written onto the element.
     *
     * Split out of the layout pass because of an ordering fact: opening the
     * sheet is a store write, and the element it creates does not exist until
     * React has rendered — one tick later than the solve that placed it. So
     * the geometry is applied on whichever frame first finds the element, and
     * then left alone until the next solve.
     */
    const applySheetGeometry = (rect: { top: number; left: number }) => {
      const node = sheetRef.current
      const layout = layoutRef.current
      if (!node || !layout || sheetPlacedRef.current) return
      sheetPlacedRef.current = true
      const sheet = layout.sheet
      /* No rectangle was free enough, even at the smaller frame size: the
         sheet does not get to exist half-placed on top of someone's print or
         caption, so it stays out of the layout and out of the reading order
         until a re-solve (a pan, a resize) finds it room. The rectangle it
         WANTED is still recorded in the layout, flagged violated, because a
         sheet that cannot be placed is a fact worth being able to read. */
      node.hidden = !sheet || sheet.violated
      if (!sheet || sheet.violated) return
      /* A sheet that has just been spread arrives AT its place; a sheet that
         is already on the table glides to a new one when the table is panned
         or when the visitor spreads a different stack. So the transition is a
         class, added one frame after the first placement — without this the
         sheet would fly in from the frame's top-left corner on every open. */
      const firstPlacement = placedElementRef.current !== node
      placedElementRef.current = node
      if (firstPlacement) {
        node.classList.remove('globe-sheet-settled')
        requestAnimationFrame(() => node.classList.add('globe-sheet-settled'))
      }
      node.style.width = `${sheet.width.toFixed(1)}px`
      node.style.height = `${sheet.height.toFixed(1)}px`
      node.style.transform =
        `translate3d(${(sheet.left - rect.left).toFixed(1)}px, ${(sheet.top - rect.top).toFixed(1)}px, 0)`
      node.style.setProperty('--sheet-frame-h', `${sheet.frameH.toFixed(1)}px`)
      node.style.setProperty('--sheet-cols', String(sheet.cols))
      /* the prints glide in FROM their stack, so the sheet reads as a hand
         spreading a pile rather than as a panel fading up */
      const glideX = sheet.leader.x2 - (sheet.left + sheet.width / 2)
      const glideY = sheet.leader.y2 - (sheet.top + sheet.height / 2)
      const glide = Math.max(1, Math.hypot(glideX, glideY))
      node.style.setProperty('--glide-x', `${((glideX / glide) * 26).toFixed(1)}px`)
      node.style.setProperty('--glide-y', `${((glideY / glide) * 26).toFixed(1)}px`)
    }

    /**
     * THE LAYOUT PASS. Measures (anchors, real box sizes, the title band and
     * the hero's bottom rule), asks plateLayout.ts to decide, then writes the
     * answer: displacements the pin loop applies below, the sheet's rectangle,
     * its leader line and every tie.
     */
    const solveLayout = (
      bounds: PlateBounds,
      scaleState: ScaleState,
      rect: { top: number; left: number; width: number; height: number }
    ) => {
      const cluster = clusters[scaleState.cluster]
      nudgeRef.current.fill(0)
      if (!cluster) {
        layoutRef.current = null
        return
      }
      const stacks: StackInput[] = []
      for (const index of cluster.memberIndices) {
        const projection = projectionRef.current[index]
        const node = pinRefs.current[index]
        if (!projection || !node || pinWeights[index] === 0) continue
        const anchor = clampToTable(
          rect.left + projection.x * rect.width,
          rect.top + projection.y * rect.height,
          bounds
        )
        solveAnchorsRef.current[index * 2] = anchor.x
        solveAnchorsRef.current[index * 2 + 1] = anchor.y
        /* measured, not assumed: the caption's width is whatever its own text
           and the visitor's font stack make it, and the solver's whole job is
           to keep that box off other people's claims */
        const hand = node.querySelector('.globe-pickup-hand')?.getBoundingClientRect()
        const caption = node.querySelector('.globe-print-caption')?.getBoundingClientRect()
        stacks.push({
          index,
          x: anchor.x,
          y: anchor.y,
          printW: hand?.width || bounds.printWidth,
          printH: hand?.height || bounds.printHeight,
          captionW: caption?.width || PRINT_CAPTION_HALF_W * 2,
          captionH: caption?.height || 14,
          precision: places[index].precision,
        })
      }

      const titleBounds = titleRef?.current?.getBoundingClientRect()
      const subtitleBounds = subtitleRef?.current?.getBoundingClientRect()
      const controlBounds = worldButtonRef.current?.getBoundingClientRect()
      const bands = [titleBounds, subtitleBounds, controlBounds].filter(
        (box): box is DOMRect => Boolean(box && box.width > 0)
      )
      const titleBand = bands.length
        ? {
            left: Math.min(...bands.map((box) => box.left)) - 10,
            right: Math.max(...bands.map((box) => box.right)) + 10,
            top: Math.min(...bands.map((box) => box.top)) - 10,
            bottom: Math.max(...bands.map((box) => box.bottom)) + 14,
          }
        : null
      /* the hero's own bottom edge: the rule and the index row are page
         furniture, and a contact sheet printed over them is the "sheet as
         modal" failure wearing a different hat */
      const ruleTop = frameRef.current
        ?.closest('.hero')
        ?.querySelector('.hero-rule')
        ?.getBoundingClientRect().top
      const sheetOwner = useUI.getState().plateSheet

      const layout = solvePlateLayout({
        width: window.innerWidth,
        height: window.innerHeight,
        titleBand,
        safeTop: titleBand ? Math.max(0, titleBand.bottom) : window.innerHeight * 0.06,
        safeBottom: Math.min(
          window.innerHeight - 14,
          ruleTop && ruleTop > window.innerHeight * 0.5 ? ruleTop - 12 : window.innerHeight * 0.94
        ),
        clearanceX: bounds.horizontalClearance,
        clearanceY: bounds.verticalClearance,
        stacks,
        sheetOwner: sheetOwner !== null && pinWeights[sheetOwner] > 0 ? sheetOwner : null,
        sheetFrames: sheetOwner === null ? 0 : pinWeights[sheetOwner],
      })
      layoutRef.current = layout

      for (const [index, nudge] of layout.nudges) {
        nudgeRef.current[index * 2] = nudge.dx
        nudgeRef.current[index * 2 + 1] = nudge.dy
      }

      sheetPlacedRef.current = false
      applySheetGeometry(rect)
      drawMark(
        leaderRef.current,
        layout.sheet && !layout.sheet.violated ? layout.sheet.leader : null,
        rect
      )
      const tied = new Set(layout.ties.map((tie) => tie.index))
      for (let index = 0; index < places.length; index++) {
        if (tied.has(index)) continue
        drawMark(tieRefs.current[index], null, rect)
      }
      for (const tie of layout.ties) drawMark(tieRefs.current[tie.index], tie, rect)
    }

    const tick = () => {
      const frame = frameRef.current
      if (!frame) return
      /* the loop's own delta, for the few damped values the DOM half owns
         (chip fades). Clamped so a background-tab return cannot step a fade
         across its whole range in one frame. */
      const tickNow = gsap.ticker.time
      const tickDelta = tickPrevRef.current < 0
        ? 1 / 60
        : Math.min(0.1, Math.max(0, tickNow - tickPrevRef.current))
      tickPrevRef.current = tickNow
      const { top, left, width, height } = frame.getBoundingClientRect()
      const scaleState = scaleRef.current
      const worldScale = scaleState.phase === 'world'
      const platePresence = Math.max(0, Math.min(1, scaleState.presence))
      const annotation = 1 - easeCubic(Math.max(0, Math.min(1, scaleState.morph / 0.3)))
      frame.dataset.phase = scaleState.phase
      frame.dataset.morph = scaleState.morph.toFixed(3)
      frame.dataset.presence = platePresence.toFixed(3)
      frame.dataset.scan = scaleState.scan.toFixed(3)
      frame.dataset.cluster = String(scaleState.cluster)
      /* the country under the pointer, as affordance: the grab hand becomes a
         pointing one over an enterable country (canvas answers per frame) */
      if (grabRef.current) {
        grabRef.current.style.cursor =
          scaleState.phase === 'world' && hoverCountryRef.current >= 0 ? 'pointer' : ''
      }
      frame.closest<HTMLElement>('.hero')?.style.setProperty('--plate-presence', String(platePresence))
      document.documentElement.style.setProperty('--plate-presence', String(platePresence))
      const titleBounds = titleRef?.current?.getBoundingClientRect()
      const subtitleBounds = subtitleRef?.current?.getBoundingClientRect()
      const titleSafeArea = !worldScale && titleBounds && subtitleBounds
        ? {
            top: Math.min(titleBounds.top, subtitleBounds.top) - 10,
            right: Math.max(titleBounds.right, subtitleBounds.right) + 10,
            bottom: Math.max(titleBounds.bottom, subtitleBounds.bottom) + 14,
            left: Math.min(titleBounds.left, subtitleBounds.left) - 10,
          }
        : null
      /* the horizon: pickups sink out of view before they reach the byline
         band. Facing alone can't catch this any more — with the sphere cut
         at the bottom, a pin near the disc centre faces the camera almost
         perfectly while standing in the gradient under the page's text,
         half-buried but still clickable. */
      const horizonY = window.innerHeight * 0.78

      /* ---- the landed table's one layout pass ----
         Everything below decides where stacks and the open sheet STAND. It
         runs on landing, on a selection change and on a pan that actually
         moved something — never per frame, which is the difference between a
         composed table and a nervous one. */
      const bounds = worldScale ? null : plateBounds()
      const ui = useUI.getState()
      const landed = scaleState.phase === 'plate' && platePresence > 0.999
      const now = gsap.ticker.time
      if (landed && landedAtRef.current < 0) {
        landedAtRef.current = now
        autoOpenDoneRef.current = false
        solveDirtyRef.current = true
      }
      if (!landed && scaleState.phase !== 'plate' && landedAtRef.current >= 0) {
        /* the table is leaving. The sheet folds with it rather than surviving
           into the world, where it would be a grid of prints over a planet. */
        landedAtRef.current = -1
        autoOpenDoneRef.current = false
        if (ui.plateSheet !== null) ui.closePlateSheet()
        /* the displacements are NOT cleared here on purpose: they are applied
           through the same boundsMix the viewport clamp rides, so they unwind
           with the presence instead of snapping every stack back onto its
           anchor on the first frame of the return */
        layoutRef.current = null
        solveDirtyRef.current = true
      }
      /* R15, mechanical and never editorial: the heaviest member of the cap
         spreads itself on landing if its collection is congested enough to
         have earned the dive in the first place. */
      if (landed && !autoOpenDoneRef.current && now - landedAtRef.current >= AUTO_OPEN_DELAY_S) {
        autoOpenDoneRef.current = true
        const cluster = clusters[scaleState.cluster]
        if (cluster && ui.plateSheet === null) {
          const heaviest = cluster.memberIndices.reduce((a, b) =>
            pinWeights[b] > pinWeights[a] ? b : a
          )
          if (pinWeights[heaviest] >= AUTO_OPEN_MIN_FRAMES) ui.openPlateSheet(heaviest)
        }
      }
      if (ui.plateSheet !== sheetOwnerRef.current) {
        sheetOwnerRef.current = ui.plateSheet
        sheetOpenedAtRef.current = now
        solveDirtyRef.current = true
      }
      if (landed && !solveDirtyRef.current && now - solveAtRef.current > RESOLVE_INTERVAL_S) {
        /* a pan moves the anchors under a settled layout. Re-solve on real
           movement only: the threshold is what keeps a drag from re-deciding
           the composition sixty times a second. */
        const cluster = clusters[scaleState.cluster]
        if (cluster && bounds) {
          for (const index of cluster.memberIndices) {
            const projection = projectionRef.current[index]
            /* frameless stops hold no stack, so the solver never recorded an
               anchor for them and comparing against one would re-solve the
               whole table three times a second for nothing */
            if (!projection || pinWeights[index] === 0) continue
            const anchor = clampToTable(
              left + projection.x * width,
              top + projection.y * height,
              bounds
            )
            const drift = Math.hypot(
              anchor.x - solveAnchorsRef.current[index * 2],
              anchor.y - solveAnchorsRef.current[index * 2 + 1]
            )
            if (drift > RESOLVE_DRIFT_PX) {
              solveDirtyRef.current = true
              break
            }
          }
        }
      }
      if (landed && solveDirtyRef.current && bounds) {
        solveDirtyRef.current = false
        solveAtRef.current = now
        solveLayout(bounds, scaleState, { top, left, width, height })
      } else if (landed) {
        // the sheet element arriving a tick after the solve that placed it
        applySheetGeometry({ top, left })
      }
      /* the develop clock: one value, written every frame like the plate's own
         presence, so the sheet's frames arrive staggered without a CSS
         animation that would restart itself on every re-render */
      const sheetDevelop =
        platePresence *
        easeCubic(Math.max(0, Math.min(1, (now - sheetOpenedAtRef.current) / SHEET_DEVELOP_S)))
      const sheetPresence = ui.plateSheet === null ? '0' : sheetDevelop.toFixed(3)
      sheetRef.current?.style.setProperty('--sheet-presence', sheetPresence)
      marksRef.current?.style.setProperty('--sheet-presence', sheetPresence)
      for (let i = 0; i < places.length; i++) {
        const node = pinRefs.current[i]
        const projection = projectionRef.current[i]
        if (!node || !projection) continue
        // fade out as a pin rounds the limb rather than popping at the edge
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.02) / 0.28))
        const screenY = top + projection.y * height
        const sink = worldScale
          ? Math.max(0, Math.min(1, (horizonY - screenY) / 60))
          : 1
        /* the entrance holds this pickup back until the ground under IT has
           landed — per pin, not per globe. A single shared progress value
           meant every label in the world arrived on the same frame, which is
           most of what read as "and now the planet is here" (Globe.tsx, the
           seed pass). 1 on a formed mount, so nothing waits on a remount. */
        const clusterIndex = clusterForPlace[i]
        /* one face per country (v4.1): at world scale only the preview place
           shows — bare labels and sibling stacks wait for the landed table */
        const isCountryPreview =
          clusterIndex >= 0 && previewPlaceForCluster[clusterIndex] === i
        const belongsOnPlate = !worldScale && clusterIndex === scaleState.cluster
        const scaleVisible = worldScale
          ? (isCountryPreview ? 1 : 0)
          : belongsOnPlate || scaleState.phase === 'return'
            ? 1
            : 0
        const visible = limb * sink * projection.form * scaleVisible
        /* depth is drawn, not implied: a pickup near the limb shrinks as well
           as fades, and the stacking order follows facing so a front pickup
           always overlaps one further round the curve */
        const scale = 0.55 + 0.45 * Math.max(0, Math.min(1, projection.facing))
        let localX = projection.x * width
        let localY = projection.y * height
        if (belongsOnPlate) {
          /* At table scale the cap is intentionally larger than the frame.
             Keep operable anchors and their widest fans inside the viewport,
             blended by the same plate presence so no clamp switches on. */
          const boundsMix = easeCubic(Math.max(0, Math.min(1, (platePresence - 0.52) / 0.48)))
          const rawScreenX = left + localX
          const rawScreenY = top + localY
          /* What has to stay on the table is a print, not a fan: the stack no
             longer spreads at plate scale, so the clearance is a function of
             the print's own size and stopped being a function of how many
             frames the place holds. plateBounds() mirrors --print-plate-h /
             --print-plate-w in site.css (11vh tall, 3:2) plus the caption line
             beneath, and the layout solver reads the very same numbers — one
             definition, or the solver models a table that is not on screen. */
          const table = bounds ?? plateBounds()
          const bounded = clampToTable(rawScreenX, rawScreenY, table)
          localX += (bounded.x - rawScreenX) * boundsMix
          localY += (bounded.y - rawScreenY) * boundsMix
          /* THE DECLUTTER, applied. Two stacks whose prints and captions would
             print through each other stand apart instead, and the tie the
             solver emitted alongside this offset is what keeps the move
             honest (§9.3, "near, tied"). Blended on the same presence as the
             clamp, so nothing steps sideways at a phase flip. */
          localX += nudgeRef.current[i * 2] * boundsMix
          localY += nudgeRef.current[i * 2 + 1] * boundsMix
        }
        node.style.transform = `translate3d(${localX}px, ${localY}px, 0) scale(${scale.toFixed(3)})`
        node.style.opacity = String(visible)
        /* a fanned hand must ride over every neighbouring pickup, whatever
           its facing says — the visitor just asked for this one. The tour's
           presented hand gets the same treatment one tier down: the mock
           coordinates cluster hard, and without the boost a presented hand
           can open UNDER a neighbour's resting pile. */
        node.style.zIndex =
          i === selectedRef.current
            ? '400'
            : i === activeRef.current
              ? '300'
              : String(100 + Math.round(Math.max(0, projection.facing) * 100))
        node.style.pointerEvents = visible > 0.6 ? 'auto' : 'none'
        const pinInert = !worldScale && visible <= 0.6
        if (node.inert !== pinInert) node.inert = pinInert
        const label = pinLabelRefs.current[i]
        if (label) {
          let clearsTitle = true
          if (belongsOnPlate && scaleState.phase === 'plate' && titleSafeArea) {
            const labelBounds = label.getBoundingClientRect()
            clearsTitle = !(
              labelBounds.right > titleSafeArea.left &&
              labelBounds.left < titleSafeArea.right &&
              labelBounds.bottom > titleSafeArea.top &&
              labelBounds.top < titleSafeArea.bottom
            )
          }
          /* written on the PIN, not on the label: at plate scale the stack's
             caption stands where the label used to and needs the same guard,
             and a custom property on the shared ancestor covers both */
          node.style.setProperty('--label-safe-opacity', clearsTitle ? '1' : '0')
        }
        node.classList.toggle('globe-pin-active', i === activeRef.current)
        node.classList.toggle('globe-pin-selected', i === selectedRef.current)
        /* The stack's top print IS the sheet's disclosure control at plate
           scale: it spreads the collection and folds it again. Written here
           rather than in the render because the phase it depends on is a
           per-frame value the component never re-renders on. */
        const topPrint = cardRefs.current.get(`${i}:0`)
        if (topPrint) {
          if (belongsOnPlate && scaleState.phase === 'plate') {
            const expanded = ui.plateSheet === i ? 'true' : 'false'
            if (topPrint.getAttribute('aria-expanded') !== expanded) {
              topPrint.setAttribute('aria-expanded', expanded)
            }
            if (expanded === 'true') {
              if (topPrint.getAttribute('aria-controls') !== SHEET_DOM_ID) {
                topPrint.setAttribute('aria-controls', SHEET_DOM_ID)
              }
            } else if (topPrint.hasAttribute('aria-controls')) {
              topPrint.removeAttribute('aria-controls')
            }
          } else if (topPrint.hasAttribute('aria-expanded')) {
            topPrint.removeAttribute('aria-expanded')
            topPrint.removeAttribute('aria-controls')
          }
        }
      }
      /* the waypoint labels: same projection ride, quieter thresholds. They
         start fading later round the limb than pickups do (they are texture,
         not targets) and never take pointer events, so the loop only writes
         transform and opacity. One-leg cities cap dimmer than hubs — with
         eleven labels over Europe the rank is what keeps the layer readable. */
      for (let i = 0; i < waypoints.length; i++) {
        const node = waypointRefs.current[i]
        const projection = waypointProjectionRef.current[i]
        if (!node || !projection) continue
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.12) / 0.3))
        const screenY = top + projection.y * height
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        /* near-full even for minors: node opacity dims the knockout plate too,
           and a see-through plate defeats its purpose — rank is expressed in
           the text colours and size (see .globe-waypoint-minor), not here */
        const cap = waypoints[i].legCount > 1 ? 1 : 0.9
        const scale = 0.7 + 0.3 * Math.max(0, Math.min(1, projection.facing))
        node.style.transform = `translate3d(${projection.x * width}px, ${projection.y * height}px, 0) scale(${scale.toFixed(3)})`
        node.style.opacity = (limb * sink * cap * projection.form * annotation).toFixed(3)
      }

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]
        if (cluster.congestedSingleton) continue
        const button = chipButtonRefs.current[i]
        const expandedValue = scaleState.phase !== 'world' && scaleState.cluster === i
          ? 'true'
          : 'false'
        if (button?.getAttribute('aria-expanded') !== expandedValue) {
          button?.setAttribute('aria-expanded', expandedValue)
        }
        const node = chipRefs.current[i]
        const projection = chipProjectionRef.current[i]
        if (!node || !projection) continue
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.02) / 0.28))
        const screenY = top + projection.y * height
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        /* v4: the chip is the country's hover label. At rest it is absent —
           the resting statement of "where I've been" is the canvas's own
           (outline, lift, photographs) — and it develops in when the canvas
           answers that this country is under the pointer, or when the chip
           itself holds keyboard focus. The damp keeps a pointer crossing a
           border from strobing two labels. */
        const chipFade = chipFadeRef.current
        const wanted = worldScale &&
          (hoverCountryRef.current === i || node.contains(document.activeElement))
          ? 1
          : 0
        chipFade[i] += (wanted - chipFade[i]) * Math.min(1, 14 * tickDelta)
        if (chipFade[i] < 0.001 && wanted === 0) chipFade[i] = 0
        const visible = limb * sink * projection.form * chipFade[i]
        const depthScale = 0.72 + 0.28 * Math.max(0, Math.min(1, projection.facing))
        node.style.transform = `translate3d(${projection.x * width}px, ${projection.y * height}px, 0) scale(${depthScale.toFixed(3)})`
        node.style.opacity = visible.toFixed(3)
        node.style.zIndex = String(250 + Math.round(Math.max(0, projection.facing) * 80))
        node.style.pointerEvents = worldScale && visible > 0.6 ? 'auto' : 'none'
        const chipTabIndex = worldScale ? 0 : -1
        if (button && button.tabIndex !== chipTabIndex) button.tabIndex = chipTabIndex
      }

      const instrument = instrumentRef.current
      const worldButton = worldButtonRef.current
      if (instrument && worldButton) {
        const activeCluster = clusters[scaleState.cluster]
        const showing = !worldScale && Boolean(activeCluster)
        const interfaceMix = showing
          ? easeCubic(Math.max(0, Math.min(1, (platePresence - 0.08) / 0.42)))
          : 0
        const liveTransition = scaleState.phase === 'dive' || scaleState.phase === 'return'
        const landed = scaleState.phase === 'plate'
        instrument.style.opacity = liveTransition ? interfaceMix.toFixed(3) : '0'
        worldButton.style.opacity = landed ? interfaceMix.toFixed(3) : '0'
        worldButton.style.pointerEvents = landed && interfaceMix > 0.55 ? 'auto' : 'none'
        worldButton.tabIndex = landed && interfaceMix > 0.55 ? 0 : -1
        if (activeCluster) {
          /* The instrument mirrors the scan front itself now — the canvas
             publishes the wave's real progress in scaleState.scan, so the
             lat/lng sweep hands off to the percentage exactly when the front
             starts plotting, however late its assets arrived. */
          if (scaleState.phase === 'dive' && scaleState.scan <= 0) {
            const position = instrumentPositionRef.current
            const targetLat = activeCluster.centroidLatLng[0]
            const targetLng = activeCluster.centroidLatLng[1]
            const step = 1 - Math.exp(-0.08 * gsap.ticker.deltaRatio(60))
            position.lat += (targetLat - position.lat) * step
            position.lng += (targetLng - position.lng) * step
            instrument.textContent = `${position.lat.toFixed(3)}° / ${position.lng.toFixed(3)}°`
          } else if (scaleState.phase === 'dive' || scaleState.phase === 'return') {
            const scan = Math.round(Math.max(0, Math.min(1, scaleState.scan)) * 100)
            instrument.textContent = `scan … ${String(scan).padStart(2, '0')}%`
          }
        } else {
          instrumentPositionRef.current.lat = 0
          instrumentPositionRef.current.lng = 0
        }

        const title = titleRef?.current
        const subtitle = subtitleRef?.current
        const titleWorld = title?.querySelector<HTMLElement>('.hero-title-world')
        const titleSelection = title?.querySelector<HTMLElement>('.hero-title-selection')
        const subtitleWorld = subtitle?.querySelector<HTMLElement>('.hero-title-sub-world')
        const subtitleSelection = subtitle?.querySelector<HTMLElement>(
          '.hero-title-sub-selection'
        )
        const titleMix = activeCluster
          ? easeCubic(Math.max(0, Math.min(1, platePresence / 0.55)))
          : 0
        if (activeCluster && titleSelection && subtitleSelection) {
          const selection = activeCluster.congestedSingleton
            ? places[activeCluster.memberIndices[0]].label
            : clusterLabels[scaleState.cluster]
          const placeCount = activeCluster.memberIndices.length
          const frameCount = activeCluster.totalFrameCount
          /* the meta line carries what the title stopped saying: the members,
             then the counts in the bracket register (§11 Q5). A congested
             singleton has exactly one member and it is already the title, so
             its member span goes empty (CSS drops it out of the flex row) and
             the line prints the counts alone rather than saying its own name
             twice. */
          const built = metaLineRef.current
          const metaLine =
            built && built.host === subtitleSelection && built.members.parentNode === built.host
              ? built
              : buildMetaLine(subtitleSelection)
          metaLineRef.current = metaLine
          const members = activeCluster.congestedSingleton
            ? ''
            : clusterMembers[scaleState.cluster]
          const lead = countsLead(placeCount)
          const num = String(frameCount)
          if (metaLine.members.textContent !== members) metaLine.members.textContent = members
          if (metaLine.lead.nodeValue !== lead) metaLine.lead.nodeValue = lead
          if (metaLine.num.textContent !== num) metaLine.num.textContent = num
          if (metaLine.tail.nodeValue !== COUNTS_TAIL) metaLine.tail.nodeValue = COUNTS_TAIL
          if (titleSelection.textContent !== selection) titleSelection.textContent = selection
          titleSelection.style.fontSize = selection.length > 34
            ? '0.58em'
            : selection.length > 24
              ? '0.72em'
              : '1em'
          const landedTitle = scaleState.phase === 'plate'
            ? `${selection} — rouvens.work`
            : originalDocumentTitleRef.current
          if (document.title !== landedTitle) document.title = landedTitle
        } else if (document.title !== originalDocumentTitleRef.current) {
          document.title = originalDocumentTitleRef.current
        }
        if (titleWorld && titleSelection && subtitleWorld && subtitleSelection) {
          titleWorld.style.opacity = (1 - titleMix).toFixed(3)
          titleSelection.style.opacity = titleMix.toFixed(3)
          subtitleWorld.style.opacity = (1 - titleMix).toFixed(3)
          subtitleSelection.style.opacity = titleMix.toFixed(3)
          const selectionIsSubject = titleMix >= 0.5
          titleWorld.setAttribute('aria-hidden', selectionIsSubject ? 'true' : 'false')
          subtitleWorld.setAttribute('aria-hidden', selectionIsSubject ? 'true' : 'false')
          titleSelection.setAttribute('aria-hidden', selectionIsSubject ? 'false' : 'true')
          subtitleSelection.setAttribute('aria-hidden', selectionIsSubject ? 'false' : 'true')
        }
      }
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      frameRef.current?.closest<HTMLElement>('.hero')?.style.removeProperty('--plate-presence')
      document.documentElement.style.removeProperty('--plate-presence')
      if (document.title !== originalDocumentTitleRef.current) {
        document.title = originalDocumentTitleRef.current
      }
    }
  }, [has3D, activeRef, selectedRef, titleRef, subtitleRef])

  useEffect(() => {
    let lastScrollY = window.scrollY
    /**
     * ESCAPE HAS THREE DEPTHS at plate scale, and they are closed one at a
     * time (CONCEPT-COUNTRY-ZOOM-V2 §8, "esc now has three depths"):
     *
     *   pop open      → FramePop's own handler closes the pop. Nothing here.
     *   sheet open    → the sheet folds back into its stack. Still on the plate.
     *   nothing open  → the plate returns to the world.
     *
     * The shipped bug this replaces: the handler set `exitRef` whenever the
     * phase was not 'world', so an Escape aimed at a popped frame closed the
     * pop AND dived the whole table out from under it — two depths on one
     * keystroke, which is the one thing a depth order must never do.
     */
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || scaleRef.current.phase === 'world') return
      const ui = useUI.getState()
      if (ui.popOpen) return
      if (ui.plateSheet !== null) {
        foldSheet(sheetHasFocus())
        return
      }
      exitRef.current = true
    }
    /* the composition is decided in screen space, so a resized window is a
       different composition */
    const onResize = () => {
      solveDirtyRef.current = true
    }
    const onScroll = () => {
      const nextScrollY = window.scrollY
      const hero = frameRef.current?.closest('.hero')
      if (
        nextScrollY > lastScrollY &&
        scaleRef.current.phase !== 'world' &&
        hero &&
        hero.getBoundingClientRect().bottom <= window.innerHeight
      ) {
        exitRef.current = true
      }
      lastScrollY = nextScrollY
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const devWindow = window as typeof window & {
      __dive?: (clusterIndex: number) => void
      __exitDive?: () => void
      __plateLayout?: () => unknown
      __hoverCountry?: () => number
      __clusterIndexOf?: (slug: string) => number
    }
    /* what the layout pass decided, for the gates: which stacks were moved,
       which ties were drawn, where the sheet went and whether it had to come
       down a size. Measurement in the probes is still done off the DOM — this
       is the solver's own account of itself, so a failing still can be read
       without guessing. */
    devWindow.__plateLayout = () => {
      const layout = layoutRef.current
      if (!layout) return null
      return {
        nudges: [...layout.nudges].map(([index, nudge]) => ({
          slug: places[index].slug,
          dx: Number(nudge.dx.toFixed(1)),
          dy: Number(nudge.dy.toFixed(1)),
        })),
        ties: layout.ties.map((tie) => ({
          slug: places[tie.index].slug,
          length: Number(Math.hypot(tie.x2 - tie.x1, tie.y2 - tie.y1).toFixed(1)),
        })),
        sheet: layout.sheet,
        owner: useUI.getState().plateSheet === null
          ? null
          : places[useUI.getState().plateSheet as number].slug,
      }
    }
    /* Probe-only intent hooks. They deliberately do not mutate scaleRef, so
       Globe's useFrame remains the state machine's single writer. */
    devWindow.__dive = (clusterIndex) => {
      enterRef.current = clusterIndex
    }
    devWindow.__exitDive = () => {
      exitRef.current = true
    }
    /* read-only: which visited country's cluster is under the pointer (v3) */
    devWindow.__hoverCountry = () => hoverCountryRef.current
    /* probe door for chipless (one-place) countries: slug → cluster index */
    devWindow.__clusterIndexOf = (slug) => {
      const placeIndex = places.findIndex((place) => place.slug === slug)
      return placeIndex >= 0 ? clusterForPlace[placeIndex] : -1
    }
    return () => {
      delete devWindow.__dive
      delete devWindow.__exitDive
      delete devWindow.__hoverCountry
      delete devWindow.__plateLayout
    }
  }, [])

  /* A press is not yet a drag. The pickups are buttons INSIDE the drag
     surface, and capturing the pointer on pointerdown (as this used to)
     retargets the whole gesture to the frame — the browser then never
     composes a click for the button underneath, so every tap on a pickup
     would silently die. So the press is only recorded here; the drag begins
     in the move handler once travel crosses a threshold, and a clean tap
     never crosses it. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!has3D || e.button !== 0) return
    // mouse only: on touch the browser owns the gesture until touch-action says
    // otherwise, and preventing the default there would eat the page scroll
    if (e.pointerType === 'mouse') e.preventDefault()
    wasDragRef.current = false
    pressRef.current = { x: e.clientX, y: e.clientY }
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
    dragVelocityRef.current.x = 0
    dragVelocityRef.current.y = 0
    dragVelocityRef.current.at = performance.now()
  }
  /* Both axes. Horizontal alone could never show you the whole globe: spinning
     about Y sweeps a single band of latitudes past the camera and the poles are
     simply unreachable, so half the sphere existed but could not be looked at.

     Vertical is mouse-only in practice and deliberately so — .globe-frame sets
     touch-action: pan-y, so on a touchscreen a vertical drag is the browser's
     scroll and never reaches this handler. Taking it would mean trapping the
     page inside the hero. */
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    /* the hover half runs pressed or not: the canvas resolves this to a
       country every frame. The rect is cached — a getBoundingClientRect per
       move would thrash layout for a value that changes on resize only. */
    const rectCache = frameRectRef.current
    const at = performance.now()
    if (!rectCache.rect || at - rectCache.at > 300) {
      rectCache.rect = e.currentTarget.getBoundingClientRect()
      rectCache.at = at
    }
    const pointer = globePointerRef.current
    pointer.x = (e.clientX - rectCache.rect.left) / Math.max(1, rectCache.rect.width)
    pointer.y = (e.clientY - rectCache.rect.top) / Math.max(1, rectCache.rect.height)
    pointer.active = true

    const press = pressRef.current
    if (!press) return
    if (!draggingRef.current) {
      // 5px of slop: under it a press is a tap, over it the hand has the globe
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const dx = e.clientX - lastXRef.current
    const dy = e.clientY - lastYRef.current
    const now = performance.now()
    const elapsed = Math.max(1, now - dragVelocityRef.current.at)
    dragVelocityRef.current.x = dx / elapsed
    dragVelocityRef.current.y = dy / elapsed
    dragVelocityRef.current.at = now
    // fed into the group's rotation and damped there at world scale; on a
    // plate the canvas consumes the same deltas as cap-clamped re-aims
    spinRef.current += dx * 0.00035
    tiltRef.current += dy * 0.00035
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    pressRef.current = null
    if (!draggingRef.current) return
    draggingRef.current = false
    // the click that composes after this pointerup is the drag's echo, not an
    // intent — the grab's click handler reads and clears this
    wasDragRef.current = true
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (
      scaleRef.current.phase === 'plate' &&
      Math.hypot(dragVelocityRef.current.x, dragVelocityRef.current.y) >= 0.55
    ) {
      exitRef.current = true
    }
  }

  /* The static fallback. `has3D` is false under reduced motion as well as under
     no WebGL, and the rAF loop above is the ONLY thing that ever writes a pin's
     transform or opens its card — so without this branch the pins would render
     stacked at top:0 left:0 with their cards clipped to max-width:0. Same
     information as the sphere, in the order travelled, and a place that holds
     photographs shows them as a strip: the projection panel must never be the
     only surface the frames exist on. */
  if (!has3D) {
    return (
      <div className="gl-frame globe-frame globe-frame-static">
        <ol className="globe-log">
          {staticPlaces.map(({ place, cluster, clusterIndex }) => {
              const frames = framesAt(place)
              return (
                <li key={place.slug} className="globe-log-row">
                  {cluster && clusterIndex !== undefined && (
                    <div className="globe-log-cluster">
                      <span className="globe-log-cluster-members">
                        {clusterLabels[clusterIndex]} —
                      </span>
                      <span className="globe-log-cluster-count">
                        {cluster.memberIndices.length}{' '}
                        {cluster.memberIndices.length === 1 ? 'place' : 'places'} ·{' '}
                        {cluster.totalFrameCount}{' '}
                        {cluster.totalFrameCount === 1 ? 'frame' : 'frames'}
                      </span>
                    </div>
                  )}
                  <div className="globe-log-line">
                    <span className="globe-log-place">{place.label}</span>
                    <span className="globe-log-meta">{meta(place)}</span>
                  </div>
                  {frames.length > 0 && (
                    <ul className="globe-log-frames">
                      {frames.map((photo) => (
                        <li key={photo.src}>
                          <img src={photo.src} alt="" loading="lazy" decoding="async" />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
        </ol>
      </div>
    )
  }

  if (places.length === 0) {
    /* Nothing has been placed yet. The cameras carry no GPS, so coordinates are
       hand-recalled in places.ts, and until they are this refuses to invent a
       world to draw pins on. See the note at the top of that file. */
    return (
      <div className="globe-empty" role="status">
        <span className="globe-empty-mark" aria-hidden />
        <p>
          the map is waiting on its coordinates. add a place to{' '}
          <code>src/content/places.ts</code> and it appears here.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={frameRef}
      className={`gl-frame globe-frame${has3D ? ' globe-frame-live' : ''}`}
      data-cursor={has3D ? 'spin' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        globePointerRef.current.active = false
      }}
    >
      {/* The drag surface. The frame itself takes no pointer events any more —
          it spans most of the section and would swallow clicks on everything
          the sphere bleeds behind — so the grab circle IS the planet's hit
          area, and its events bubble up to the frame's handlers above.

          It is also the click-anywhere-in-the-country door (v3): a tap on the
          sphere over a visited country dives into it. Chips and pickup cards
          sit ABOVE this surface, so their taps never reach it — and it stays
          aria-hidden on purpose: the chips and stacks remain the accessible,
          named doors; this is the pointing hand's shortcut. */}
      <div
        ref={grabRef}
        className="globe-grab"
        data-cursor="spin"
        aria-hidden
        onClick={() => {
          if (wasDragRef.current) {
            wasDragRef.current = false
            return
          }
          if (scaleRef.current.phase !== 'world') return
          const hovered = hoverCountryRef.current
          if (hovered >= 0) enterRef.current = hovered
        }}
      />

      {/* mounted immediately, NOT gated on the reveal: the entrance's seed
          must already be idling under the loader's veil when it lifts —
          Globe.tsx waits for the reveal beat itself before growing */}
      {has3D && (
        <Suspense fallback={null}>
          <GlobeView
            pins={pinCoords}
            precisions={pinPrecisions}
            weights={pinWeights}
            legs={flightArcs}
            waypoints={waypointCoords}
            waypointProjectionRef={waypointProjectionRef}
            projectionRef={projectionRef}
            activeRef={activeRef}
            selectedRef={selectedRef}
            spinRef={spinRef}
            tiltRef={tiltRef}
            clusters={clusters}
            chipProjectionRef={chipProjectionRef}
            scaleRef={scaleRef}
            enterRef={enterRef}
            exitRef={exitRef}
            pointerRef={globePointerRef}
            hoverCountryRef={hoverCountryRef}
          />
        </Suspense>
      )}

      <div className="globe-scale-instrument">
        {/* Like Index's mono instrument marks, this animated readout is visual
            context, not a second announcement stream. The chip's maintained
            aria-expanded state carries the scale change for AT users. */}
        <span ref={instrumentRef} className="instrument-line globe-scale-readout" aria-hidden />
        <button
          ref={worldButtonRef}
          type="button"
          className="instrument-line globe-world-button"
          tabIndex={-1}
          onClick={() => {
            exitRef.current = true
          }}
        >
          ← world
        </button>
      </div>

      <ul className="globe-clusters">
        {clusters.map((cluster, i) =>
          cluster.congestedSingleton ? null : (
            <li
              key={cluster.memberSlugs.join(':')}
              ref={(node) => {
                chipRefs.current[i] = node
              }}
              className="globe-cluster"
              data-cluster-index={i}
              data-cluster-slugs={cluster.memberSlugs.join(' ')}
            >
              <button
                ref={(node) => {
                  chipButtonRefs.current[i] = node
                }}
                type="button"
                className="globe-cluster-chip instrument-line"
                aria-label={clusterAccessibleName(cluster, i)}
                aria-expanded={false}
                onClick={() => {
                  enterRef.current = i
                }}
              >
                {/* v4: the chip is a hover label now, so it must SAY what the
                    pointer is standing on — the country's name leads, and the
                    count grammar of the stack captions follows one scale up:
                    brackets muted, digit in accent, no shape around either
                    (CONCEPT-COUNTRY-ZOOM-V2 §6, P3). The chip's whole member
                    list stays in aria-label above. */}
                <span className="globe-cluster-name">{clusterLabels[i]}</span>
                {' · '}
                {countsLead(cluster.memberIndices.length)}
                <span className="globe-print-count-num">{cluster.totalFrameCount}</span>
                {COUNTS_TAIL}
              </button>
            </li>
          )
        )}
      </ul>

      {/* The waypoints: flown-through cities in the instrument register,
          positioned by the same rAF loop as the pickups. aria-hidden as a
          layer — the cities that matter to a reader are the places, and
          thirty decorative labels would drown them in a screen reader. */}
      <ul className="globe-waypoints" aria-hidden>
        {waypoints.map((airport, i) => (
          <li
            key={airport.code}
            ref={(node) => {
              waypointRefs.current[i] = node
            }}
            className={`globe-waypoint${airport.legCount > 1 ? '' : ' globe-waypoint-minor'}`}
          >
            <span className="globe-waypoint-city">{airport.city}</span>
            <span className="globe-waypoint-code">[ {airport.code.toLowerCase()} ]</span>
          </li>
        ))}
      </ul>

      {/* The pickups. Every place wears its photographs ON the globe as a
          small stack of cards over the dot — a game's pickup, not a map's
          tooltip. At world scale the stack is TEXTURE with one door behind it:
          tapping it dives into its country, exactly like tapping the sphere
          around it — the world scale has a single interaction (v4). The
          two-tap ladder (spread the sheet, pop a frame) lives on the landed
          table, where the stack is a print pile and the first tap is a
          disclosure. No hover required anywhere, which is the entire mobile
          story. A place with no frames yet stays a bare dot with its label:
          visibly a different kind of object. */}
      <ul className="globe-pins">
        {places.map((place, i) => {
          const frames = framesAt(place)
          const placeClusterIndex = clusterForPlace[i]
          const placeCluster = placeClusterIndex >= 0 ? clusters[placeClusterIndex] : undefined
          return (
            <li
              key={place.slug}
              ref={(node) => {
                pinRefs.current[i] = node
              }}
              className="globe-pin"
              data-place-slug={place.slug}
            >
              {frames.length > 0 ? (
                <span className="globe-pickup">
                  {/* the float wrapper owns the bob, so the animation never
                      fights the transform the rAF loop writes on the li */}
                  <span
                    className="globe-pickup-float"
                    style={{ animationDelay: `${(i * -0.83).toFixed(2)}s` }}
                  >
                    <span className="globe-pickup-hand">
                      {frames.map((frame, k) => (
                        <button
                          key={frame.src}
                          type="button"
                          ref={(el) => {
                            const key = `${i}:${k}`
                            if (el) cardRefs.current.set(key, el)
                            else cardRefs.current.delete(key)
                          }}
                          className={`globe-pickup-card${
                            pop && pop.from === 'stack' && pop.pin === i && pop.frame === k
                              ? ' globe-pickup-card-lifted'
                              : ''
                          }`}
                          style={
                            {
                              '--i': k,
                              '--n': frames.length,
                              // resting-stack jitter: top card straight, the
                              // rest peeking out alternately like a loose pile
                              '--jitter': cardJitter(k),
                            } as React.CSSProperties
                          }
                          aria-label={
                            k === 0
                              ? `${place.label} — ${meta(place)}`
                              : `${place.label}, frame ${k + 1} of ${frames.length}`
                          }
                          onClick={(event) => {
                            /* THE PLATE LADDER. A stack on the table is a
                               disclosure control before it is a photograph:
                               the first tap picks the place up and spreads its
                               contact sheet, a second tap on the TOP print
                               folds it again, and a tap on any print under the
                               top one opens that frame. One sheet at a time —
                               spreading this one folds whichever was open,
                               because the store holds a single slot. */
                            if (scaleRef.current.phase === 'plate') {
                              const keyboard = event.detail === 0
                              if (selectedRef.current !== i) {
                                selectedRef.current = i
                                spreadSheet(i, keyboard)
                              } else if (k === 0) {
                                if (useUI.getState().plateSheet === i) foldSheet(keyboard)
                                else spreadSheet(i, keyboard)
                              } else {
                                setPop({ pin: i, frame: k, from: 'stack' })
                              }
                              return
                            }
                            /* ONE DOOR (v4). At world scale a photograph is
                               part of the country it stands on: tapping a card
                               is the same gesture as tapping the sphere beside
                               it, and both dive into that country. The pick-up
                               fan and FramePop live on the landed table now —
                               the world scale has exactly one interaction. */
                            if (
                              scaleRef.current.phase === 'world' &&
                              placeClusterIndex >= 0
                            ) {
                              enterRef.current = placeClusterIndex
                            }
                          }}
                        >
                          <img
                            src={frame.src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                        </button>
                      ))}
                      {/* every country's preview wears the same count line —
                          the COUNTRY's total, since the stack is the door to
                          the whole cap, not to this one place (v4.1) */}
                      {placeCluster && previewPlaceForCluster[placeClusterIndex] === i && (
                        <span className="globe-dive-count" aria-hidden>
                          [ {placeCluster.totalFrameCount} frames ]
                        </span>
                      )}
                      {/* The stack's caption, plate scale only (CSS fades it in
                          with --plate-presence): what this pile is, how well
                          the site knows where it was made, and how many prints
                          are in it — the count in typography, never in a shape.
                          Decorative: every word of it is already in the top
                          card's accessible name and in the precision the
                          canvas draws, so it stays out of the reading order. */}
                      <span
                        className="instrument-line globe-print-caption"
                        style={
                          { '--caption-lag': ((i % 3) * 0.05).toFixed(2) } as React.CSSProperties
                        }
                        aria-hidden
                      >
                        {place.label}
                        {' · '}
                        {precisionWord(place.precision)}
                        {' · [ '}
                        <span className="globe-print-count-num">{frames.length}</span>
                        {' ]'}
                      </span>
                    </span>
                    <span
                      ref={(node) => {
                        pinLabelRefs.current[i] = node
                      }}
                      className="globe-pickup-label"
                      aria-hidden
                    >
                      <span className="globe-pickup-place">{place.label}</span>
                      <span className="globe-pickup-meta">{meta(place)}</span>
                    </span>
                  </span>
                  <span className="globe-pickup-stalk" aria-hidden />
                  <span className="globe-pin-dot" aria-hidden />
                </span>
              ) : (
                <>
                  <span className="globe-pin-dot globe-pin-dot-bare" aria-hidden />
                  <span
                    ref={(node) => {
                      pinLabelRefs.current[i] = node
                    }}
                    className="globe-pickup-label globe-pickup-label-bare"
                  >
                    <span className="globe-pickup-place">{place.label}</span>
                    <span className="globe-pickup-meta">{meta(place)}</span>
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {/* THE CONTACT SHEET (CONCEPT-COUNTRY-ZOOM-V2 §6 figure layer 3, R7).
          One sheet, one stack, flat: fifteen frames at survey-legible size in
          a 5×3 grid, edge-numbered like a negative strip, each one a button
          straight into FramePop. It is an object ON the table — the solver
          places it in clear space and never over another stack's print or
          caption — and never a full-viewport overlay, which would make the
          dive a lightbox with extra steps (§2.6, "the sheet as modal").

          Sits after the pins in DOM order, so a keyboard visitor reaches the
          stacks first and their spread sheet after; aria-controls on the stack
          that opened it carries the relationship the distance loses. */}
      {plateSheet !== null &&
        (() => {
          const place = places[plateSheet]
          const frames = framesAt(place)
          if (frames.length === 0) return null
          return (
            <div className="globe-sheet-layer">
              <div
                ref={sheetRef}
                id={SHEET_DOM_ID}
                className="globe-sheet"
                role="group"
                aria-label={`${place.label}, contact sheet of ${frames.length} frames`}
              >
                <ul className="globe-sheet-grid">
                  {frames.map((frame, k) => (
                    <li
                      key={frame.src}
                      className="globe-sheet-slot"
                      style={{ '--frame-lag': (k * SHEET_FRAME_LAG).toFixed(3) } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        ref={(el) => {
                          const key = `${plateSheet}:${k}`
                          if (el) sheetFrameRefs.current.set(key, el)
                          else sheetFrameRefs.current.delete(key)
                        }}
                        className={`globe-sheet-frame${
                          pop && pop.from === 'sheet' && pop.pin === plateSheet && pop.frame === k
                            ? ' globe-sheet-frame-lifted'
                            : ''
                        }`}
                        aria-label={`${place.label}, frame ${k + 1} of ${frames.length}`}
                        onClick={() => setPop({ pin: plateSheet, frame: k, from: 'sheet' })}
                      >
                        <img
                          src={frame.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </button>
                      {/* the edge number, film-strip register: mono, muted,
                          tiny, and never inside a shape (§6, P3) */}
                      <span className="globe-sheet-index" aria-hidden>
                        {String(k + 1).padStart(2, '0')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })()}

      {/* THE GREASE PENCIL. Every mark the layout pass draws: one tie per
          displaced or point-precision stack, one leader line from the sheet's
          nearest corner back to its stack's anchor. 1px, scarlet, and short —
          a mark, never a shape (§2.6, "leader-line spaghetti"). Geometry is
          written by the layout pass; presence is CSS, so they lag their ground
          on the way in and unplot with it on the way out. */}
      <div ref={marksRef} className="globe-plate-marks" aria-hidden>
        {places.map((place, i) => (
          <span
            key={place.slug}
            ref={(node) => {
              tieRefs.current[i] = node
            }}
            className="globe-tie"
          />
        ))}
        <span ref={leaderRef} className="globe-tie globe-sheet-leader" />
      </div>

      {/* the popped card, portaled to <body> (this frame is inside a
          transformed ancestor, which would capture position:fixed) */}
      {pop &&
        (() => {
          const place = places[pop.pin]
          const frames = framesAt(place)
          return (
            <FramePop
              label={place.label}
              photos={frames}
              index={pop.frame}
              sourceEl={() =>
                (pop.from === 'sheet'
                  ? sheetFrameRefs.current.get(`${pop.pin}:${pop.frame}`)
                  : cardRefs.current.get(`${pop.pin}:${pop.frame}`)) ?? null
              }
              sourceAngle={
                pop.from === 'sheet'
                  ? /* a sheet frame lies flat on the table: it has no scatter
                       angle to fly out of and none to slide back into */
                    0
                  : scaleRef.current.phase === 'world'
                    ? (pop.frame - (frames.length - 1) / 2) * FAN_STEP
                    : printAngle(pop.frame)
              }
              onStep={(dir) =>
                setPop((p) => p && { ...p, frame: (p.frame + dir + frames.length) % frames.length })
              }
              onClose={() => setPop(null)}
            />
          )
        })()}
    </div>
  )
}
