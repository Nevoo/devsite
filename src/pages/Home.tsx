import { useCallback, useRef } from 'react'
import { webglAvailable } from '@/lib/webgl'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { WebGLImage } from '@/components/WebGLImage'
import { TransitionLink } from '@/components/TransitionLink'
import { Star } from '@/components/Star'
import { Index } from '@/components/Index'
import type { Photo } from '@/content/categories'
import { outings, framesOf, type Outing } from '@/content/outings'
import { placeOf } from '@/content/places'
import { WorldGlobe } from '@/components/WorldGlobe'
import { heroPhoto, heroAlt, heroSlate } from '@/content/hero'

const YEAR = new Date().getFullYear()


export function Home() {
  return (
    <>
      <Hero />
      <Log />
      <Craft />
      <AboutTeaser />
    </>
  )
}

/**
 * The hero: the planet, and nothing competing with it.
 *
 * One subject at planet scale, standing at the bottom centre of the viewport
 * and cut by its lower edge — the page opens on a horizon, and the sphere
 * sets into the rest of the page through the .hero::after gradient rather
 * than ending at a clip line. It wears the archive as pickups: every placed
 * sitting is a small hand of photo-cards standing on its coordinate. Tap a
 * pickup and the hand fans out; tap a fanned card and THAT card flies out of
 * the hand to viewer scale in the air above the planet (FramePop); tap
 * anywhere else and it slides back into its slot, mac-minimize style. The
 * globe is the index AND the viewer — there is no side panel and no modal,
 * because the cards already are the collection.
 *
 * The composition is sky over horizon: the name at display scale in the air
 * the planet's crop opened, the index band as the one strip below the
 * horizon rule. The old bottom byline and the archive-stats line are gone —
 * the byline moved up and became the title, and the stats duplicated what
 * the log section says in words one scroll later.
 */
function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const revealed = useUI((s) => s.revealed)
  /* the index into `places` currently front-on, written by the canvas, read by
     the pins — shared here so the DOM half and the 3D half agree without a
     single React render */
  const activePinRef = useRef(-1)
  /* and the index the visitor TAPPED: written by a pickup on the globe, read
     by the canvas (swing it front-on, fan the hand, hold it), cleared by the
     canvas when the tour moves on */
  const selectedPinRef = useRef(-1)

  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return
      /* Same clock as before — the loader curtain lifts over 0.20 → 1.10s, so
         nothing performs its entrance behind an opaque panel. The globe fades
         rather than rises: it is already turning when it arrives, and a moving
         object that also translates on entry reads as two motions fighting. */
      const tl = gsap.timeline()
      tl.from('.hero-globe', { opacity: 0, duration: 1.1, ease: 'power2.out' }, 0.5)
        .from(
          '.hero-rail > *',
          { opacity: 0, y: -10, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
          0.75
        )
        .from('.hero-title-inner', { yPercent: 115, duration: 1.05, ease: 'power4.out' }, 0.85)
        .from('.hero-title-sub', { opacity: 0, y: 12, duration: 0.7, ease: 'power3.out' }, 1.1)
        .from('.hero-rule', { scaleX: 0, duration: 1, ease: 'power4.inOut' }, 1.12)
        .from(
          '.hero-index > *',
          { opacity: 0, y: 10, duration: 0.5, stagger: 0.05, ease: 'power3.out' },
          1.25
        )
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  return (
    <section ref={rootRef} className="hero">
      <div className="hero-inner">
        {/* The two crafts at the two ends of the top edge, with the wordmark
            pill centred between them — the merge stated by the composition
            before a single word of copy claims it. */}
        <div className="hero-rail">
          <span>
            photography <span className="hero-rail-sep">/</span> development
          </span>
          <span>
            vol. 02 <span className="hero-rail-sep">/</span> {YEAR}
          </span>
        </div>

        {/* The name, in the sky. The planet's cut opened half a viewport of
            air, and air with nothing in it reads as slack, not restraint —
            the h1 takes it at display scale, which a portfolio's first
            heading has earned. It replaces the old bottom byline outright:
            one name on the screen, once. (The archive-stats line that used
            to balance it is gone too — the log section one scroll down opens
            with the same numbers in words, and a data line whose whole job
            was symmetry read as duplicate the moment the byline moved.) */}
        <div className="hero-sky">
          <h1 className="hero-title">
            <span className="hero-title-inner">
              rouven lührs<span className="accent">.</span>
            </span>
          </h1>
          <p className="hero-title-sub">photographer &amp; creative developer</p>
        </div>

        <div className="hero-globe">
          <WorldGlobe activeRef={activePinRef} selectedRef={selectedPinRef} />
        </div>

        <span className="hero-rule" aria-hidden />

        {/* The band still exists to make the globe safe: the work has to be
            reachable without touching a 3D object. What it no longer does is
            list categories.

            `nature ✦ concerts ✦ travel ✦ weddings` was a second index arguing
            with the first one. The globe says the archive is a route; four
            subject words say it is a taxonomy; and `travel` as a subject next
            to a spinning globe is incoherent on its face. Now it points at
            what is actually below it and at the archive those categories still
            organise, which is a job they can do on their own page. */}
        <div className="hero-index">
          <nav className="hero-index-links" aria-label="sections">
            <span className="hero-index-link">
              <a href="#log">the log</a>
            </span>
            <span className="hero-index-link">
              <Star className="hero-index-star" size="0.55em" aria-hidden />
              <TransitionLink to="/work">the archive</TransitionLink>
            </span>
          </nav>
          <span className="hero-index-scroll">
            scroll
            <span className="hero-scroll-line" aria-hidden />
          </span>
        </div>
      </div>
    </section>
  )
}

/**
 * The craft beat, after the work rather than before it: where I've been, then
 * what I shot, then how it's made.
 *
 * `shoot. grade. ship.` is gone. Three words at display scale is an identity
 * statement, and the page already opens with one subject making a claim about
 * who this is; a second full-width thesis one screen later was not a beat, it
 * was an argument with the globe. What it was actually protecting was the ink
 * coupling — `grade.` hollowing on the same 0..1 the shader is running — and
 * that survives here on a single word at heading scale, which costs a section
 * heading rather than a whole viewport.
 */
function Craft() {
  const rootRef = useRef<HTMLElement>(null)
  const revealed = useUI((s) => s.revealed)

  /* The hollowing of `grade.` is hung off the wipe, not off a parallel
     timeline: the plate's tween starts when its texture reaches the GPU, which
     is not the same instant the page decides it is revealed. Two clocks would
     drift on a slow upload and the word would go hollow before the picture had
     been graded — which inverts the one connection the hero is built on.

     --ink stays at its CSS default of 1 until then, so the no-WebGL fallback
     and reduced motion both keep the correct static composition. */
  const inkStarted = useRef(false)
  const inkTween = useRef<ReturnType<typeof gsap.to> | null>(null)
  const registerInk = useCallback(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return
    inkStarted.current = true
    root.style.setProperty('--ink', '0') // ungraded: three words in one ink
    const ink = { v: 0 }
    inkTween.current = gsap.to(ink, {
      v: 1,
      duration: 0.5,
      // the wipe runs 0 → 2.2s; this lands at 2.05, so the word finishes
      // changing state on the same beat the front leaves the right edge
      delay: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => root.style.setProperty('--ink', String(ink.v)),
    })
  }, [])

  /* Once the visitor has the wipe handle, --ink is theirs too. The hollow
     `grade.` was never decoration: it is the same 0..1 the shader is running,
     so pulling the frame back to log has to put the word back into one ink or
     the one connection the hero is built on quietly stops being true. Killing
     the entrance tween here as well as in the plane matters — otherwise it
     keeps writing --ink for another second and fights the hand. */
  const handleGrade = useCallback((value: number) => {
    inkTween.current?.kill()
    inkTween.current = null
    rootRef.current?.style.setProperty('--ink', String(value))
  }, [])

  /* The section is below the fold now, so its entrance hangs off a
     ScrollTrigger rather than the loader clock. `revealed` still gates it: a
     visitor who lands mid-page on a reload should not have the words rise
     while the curtain is still down. */
  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return
      const root = rootRef.current

      /* Pin the ungraded state BEFORE the type is ever on screen. The tween out
         of it still hangs off the wipe (registerInk), but the starting state
         cannot wait for a texture upload: --ink defaults to 1, so a slow upload
         let the block render hollow, pop to one ink, then hollow again.
         Only when a wipe is actually coming — without WebGL nothing would ever
         tween it back and `grade.` would sit solid forever. */
      if (!inkStarted.current && webglAvailable()) {
        root?.style.setProperty('--ink', '0')
      }

      const trigger = { trigger: root, start: 'top 72%' }
      gsap.from('.craft-title-inner', {
        yPercent: 115,
        duration: 1.05,
        ease: 'power4.out',
        scrollTrigger: trigger,
      })
      gsap.from('.hero-byline-line', {
        opacity: 0,
        y: 12,
        duration: 0.7,
        delay: 0.35,
        ease: 'power3.out',
        scrollTrigger: trigger,
      })
      gsap.from('.hero-slate > *', {
        opacity: 0,
        y: 10,
        duration: 0.55,
        stagger: 0.07,
        delay: 0.4,
        ease: 'power3.out',
        scrollTrigger: trigger,
      })

      return () => {
        root?.style.removeProperty('--ink')
      }
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  /* No scroll parallax on the container. Everything here is aligned to the
     plate's edges, so translating the block is exactly the thing that made the
     body feel scattered. Depth comes from the shader drifting the picture
     INSIDE a frame that stays where the grid put it. */

  return (
    <section ref={rootRef} className="process">
      {/* Two columns that never overlap: the words on 1–5, the frame on 6–12.
          The type is not on the photograph and never was going to be — a cream
          headline dropped over a landscape needs a scrim, a keyline and a
          shadow to survive, and all three of those are what made it read as
          pasted on. On solid charcoal it needs nothing.
          Row 2 closes both columns on one line: the plate's hard bottom edge
          and the hairline over the byline sit at the same y. */}
      <div className="process-inner">
        {/* One word instead of three, and it is the word the picture below is
            performing. It still hollows out as the wipe passes, on the same
            --ink the shader drives, so the connection the old lockup existed to
            make is intact at a fraction of the volume. */}
        <h2 className="craft-title">
          <span className="craft-title-inner">
            the <span className="craft-title-ink">grade</span>
            <span className="craft-title-dot">.</span>
          </span>
        </h2>

        {/* The frame, shown whole. This file is a still off an edit timeline,
            so it gets a 16:9 window and keeps its own composition instead of
            being cropped to whatever shape the viewport happens to be.

            It is also the one operable object on the site. The wipe still plays
            itself — nothing is behind the gesture, so a visitor who never
            touches it loses nothing, which is the whole difference between this
            and the 2021 camera you had to click. What the drag adds is for the
            half of the audience that reads it: the transform this site is
            about, handed over and run by hand.

            NOT eager any more. The plate used to be above the fold and the wipe
            fired on load; down here that would spend the entrance on an empty
            screen and the visitor would arrive to a finished picture with
            nothing left to watch. The IntersectionObserver in WebGLImage now
            starts it as the section scrolls up. */}
        <div className="hero-frame">
          <WebGLImage
            photo={heroPhoto}
            alt={heroAlt}
            className="hero-plate"
            develop
            onDevelopStart={registerInk}
            parallax={0.03}
            gradable
            onGrade={handleGrade}
          />
        </div>

        <p className="craft-lead hero-byline-line">
          everything comes off a camera flat. writing the look once and running it over every
          frame is the same job as writing a transform and running it over your data.
        </p>

        {/* The slate. A film slate and a data record are the same object:
            labelled fields attached to an image. It carries only what is true
            of the file, and the transform on the right is the one the wipe is
            running — the destination lights up as the grade lands. */}
        <div className="hero-slate">
          <span className="hero-slate-item">
            still <span className="hero-slate-val">{heroSlate.timecode}</span>
          </span>
          {heroSlate.location && <span className="hero-slate-item">{heroSlate.location}</span>}
          {/* the transform, and — on a mouse — the fact that you can run it
              yourself. The hint is the whole affordance: the shader's front
              deliberately overshoots both edges so no bright handle is ever
              parked on the photograph, which means the invitation has to be a
              word in the slate rather than a control on the frame. */}
          <span className="hero-slate-item hero-slate-grade">
            {heroSlate.from}
            <span className="hero-slate-arrow" aria-hidden>
              →
            </span>
            <span className="hero-slate-to">{heroSlate.to}</span>
            <span className="hero-slate-drag" aria-hidden>
              drag the frame
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}

/**
 * The log: what actually came back, grouped the way it was actually made.
 *
 * This replaces four full-viewport category posters. For a 28 frame archive
 * those were a table of contents longer than the book — four index screens
 * pointing at galleries of six photographs each — and they were sorting the
 * work by a taxonomy applied after the fact. Read back in capture order the
 * archive is eight times somebody went out with a camera, and two frames three
 * minutes apart stop being `nature` and `travel` and go back to being one
 * morning.
 *
 * Every row here is real: dates and groupings come straight off the EXIF. The
 * globe above says where, this says when and what, and neither invents
 * anything the files do not contain.
 */
function Log() {
  const rootRef = useRef<HTMLElement>(null)
  // every outing holds frames now that the route stops live in places.ts
  const shot = outings

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('.log-title-inner', {
        yPercent: 115,
        duration: 1.05,
        ease: 'power4.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 78%' },
      })
      gsap.utils.toArray<HTMLElement>('.log-row').forEach((row) => {
        gsap.from(row, {
          opacity: 0,
          y: 22,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 88%' },
        })
      })
    },
    { scope: rootRef }
  )

  return (
    <section ref={rootRef} id="log" className="log">
      <div className="log-inner">
        <h2 className="log-title">
          <span className="log-title-inner">
            the log<span className="log-title-dot">.</span>
          </span>
        </h2>
        <p className="log-lead">
          eight times out with a camera. the galleries sort these by subject; the files sort
          them by the day they happened.
        </p>

        <ol className="log-list">
          {shot.map((outing, i) => (
            <LogRow key={outing.slug} outing={outing} n={i + 1} />
          ))}
        </ol>

        <div className="log-all">
          <TransitionLink to="/work" className="big-link">
            <span className="big-link-text display-lg">
              the archive<span className="accent">.</span>
            </span>
          </TransitionLink>
        </div>
      </div>
    </section>
  )
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * A date range, and only ever a DATE. Never a clock time: every frame carries
 * OffsetTimeOriginal +01:00, so the camera was on central european time no
 * matter where it was standing, and printing 22:36 for a Balinese sunrise
 * would be wrong by seven hours. See the note at the top of outings.ts.
 */
function span(from: string | null, to: string | null) {
  if (!from) return null
  const d = (iso: string) => ({ day: Number(iso.slice(8, 10)), m: Number(iso.slice(5, 7)) - 1, y: iso.slice(2, 4) })
  const a = d(from)
  const b = to ? d(to) : a
  if (a.day === b.day && a.m === b.m) return `${a.day} ${MONTHS[a.m]} '${a.y}`
  if (a.m === b.m) return `${a.day}–${b.day} ${MONTHS[a.m]} '${a.y}`
  return `${a.day} ${MONTHS[a.m]} – ${b.day} ${MONTHS[b.m]} '${b.y}`
}

function LogRow({ outing, n }: { outing: Outing; n: number }) {
  const frames: Photo[] = framesOf(outing)
  const dates = span(outing.from, outing.to)
  /* where, read off the place layer rather than the outing: one outing can
     touch several places (the october trip does), so this is every place its
     frames were shot at, deduplicated, in capture order. Empty until the
     sitting is placed in places.ts, and the row simply doesn't say where. */
  const placeLabels = [
    ...new Set(
      outing.frames
        .map((frame) => placeOf.get(frame.src)?.label)
        .filter((label): label is string => Boolean(label))
    ),
  ]

  return (
    /* the id is the projection caption's landing spot: "see them →" up in the
       hero scrolls to the outing whose frames are on the screen */
    <li id={`log-${outing.slug}`} className="log-row">
      <div className="log-meta">
        <Index n={n} />
        <span className="log-date">{dates}</span>
        <span className="log-count">
          {frames.length} {frames.length === 1 ? 'frame' : 'frames'}
        </span>
        {placeLabels.length > 0 && <span className="log-place">{placeLabels.join(' · ')}</span>}
      </div>

      {/* Plain <img>, not WebGLImage. A strip like this is a contact sheet, and
          putting 28 shader planes on one screen would spend the whole GPU
          budget on thumbnails while the globe two screens up is the surface
          that actually needs it. */}
      <ul className="log-strip">
        {frames.map((frame) => (
          <li key={frame.src} className="log-frame">
            <img src={frame.src} alt="" loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>
    </li>
  )
}

function AboutTeaser() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const words = gsap.utils.toArray<HTMLElement>('.about-teaser-word')
      gsap.from(words, {
        opacity: 0.12,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top 75%',
          end: 'center 45%',
          scrub: true,
        },
      })
    },
    { scope: rootRef }
  )

  const text =
    "I'm Rouven. Building apps and web projects since 2018, carrying a camera nearly as long. This is where both sides meet."

  return (
    <section ref={rootRef} className="about-teaser container">
      <Star className="about-teaser-star" size="2.2rem" />
      <p className="about-teaser-text display-md">
        {text.split(' ').map((word, i) => (
          <span key={i} className="about-teaser-word">
            {word}{' '}
          </span>
        ))}
      </p>
      <TransitionLink to="/about" className="arrow-link">
        more about me
      </TransitionLink>
    </section>
  )
}
