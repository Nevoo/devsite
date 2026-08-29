/**
 * S5's real-browser precision gate. It owns its Vite server and isolated
 * headless Chrome, walks three real cluster chips, and tears both down even
 * when a visual or interaction assertion fails.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CDP, evaluate, launchChrome, sleep } from './cdp.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = dirname(scriptsDir)
const outputDir = join(scriptsDir, 'audit-out')
const stripAnsi = (value) => value.replace(/\x1b\[[0-9;]*m/g, '')

async function startVite() {
  const vite = spawn(
    process.execPath,
    [join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  let output = ''
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`vite never reported an origin\n${stripAnsi(output)}`)),
      30000
    )
    const read = (chunk) => {
      output += chunk.toString()
      const match = stripAnsi(output).match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)\//)
      if (!match) return
      clearTimeout(timer)
      resolve(match[1])
    }
    vite.stdout.on('data', read)
    vite.stderr.on('data', read)
    vite.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`vite exited before the probe (${code})\n${stripAnsi(output)}`))
    })
  })

  return {
    origin,
    stop: async () => {
      if (vite.exitCode !== null || vite.signalCode !== null) return
      vite.kill('SIGTERM')
      await Promise.race([
        new Promise((resolve) => vite.once('exit', resolve)),
        sleep(3000).then(() => {
          if (vite.exitCode === null && vite.signalCode === null) vite.kill('SIGKILL')
        }),
      ])
    },
  }
}

const consoleArgument = (argument) => {
  if ('value' in argument) return argument.value
  return argument.description ?? argument.type
}

/**
 * P2 needs the area photographs actually cover, and prints overlap each other
 * (a stack is four cards deep) while sheet frames do not — so a sum of areas
 * would flatter the number. This is the honest one: a swept union over
 * compressed x coordinates, every rect already clipped to the viewport.
 */
const unionArea = (rects) => {
  const xs = [...new Set(rects.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i < xs.length - 1; i++) {
    const [x0, x1] = [xs[i], xs[i + 1]]
    if (x1 <= x0) continue
    const spans = rects
      .filter((rect) => rect.left <= x0 && rect.right >= x1)
      .map((rect) => [rect.top, rect.bottom])
      .sort((a, b) => a[0] - b[0])
    let covered = 0
    let cursor = -Infinity
    for (const [top, bottom] of spans) {
      const start = Math.max(top, cursor)
      if (bottom > start) {
        covered += bottom - start
        cursor = bottom
      }
    }
    area += covered * (x1 - x0)
  }
  return area
}

const intersects = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

async function main() {
  await mkdir(outputDir, { recursive: true })
  let server
  let chrome
  let cdp
  let targetId

  try {
    server = await startVite()
    chrome = await launchChrome()
    cdp = await CDP.connect(chrome.wsUrl)
    ;({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }))
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })

    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send(
      'Emulation.setEmulatedMedia',
      {
        features: [
          { name: 'prefers-reduced-motion', value: 'no-preference' },
          { name: 'prefers-color-scheme', value: 'dark' },
        ],
      },
      sessionId
    )
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: 1600,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: 1600,
        screenHeight: 1000,
      },
      sessionId
    )

    const exceptions = []
    const consoleMessages = []
    const off = cdp.on((message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails
        exceptions.push(details.exception?.description ?? details.text)
      }
      if (message.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push({
          type: message.params.type,
          text: message.params.args.map(consoleArgument).join(' '),
        })
      }
    })

    const loaded = cdp.once('Page.loadEventFired', { sessionId, timeout: 60000 })
    await cdp.send('Page.navigate', { url: `${server.origin}/` }, sessionId)
    await loaded

    const state = () => {
      const frame = document.querySelector('.globe-frame-live')
      return frame
        ? { phase: frame.dataset.phase, morph: Number(frame.dataset.morph ?? 0) }
        : null
    }
    const waitFor = async (predicate, description, timeout = 30000) => {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        const value = await evaluate(cdp, sessionId, predicate)
        if (value) return value
        await sleep(50)
      }
      throw new Error(
        `timed out waiting for ${description}: ${JSON.stringify(await evaluate(cdp, sessionId, state))}`
      )
    }
    const waitForState = async (phase, minMorph = 0, maxMorph = 1) => {
      const started = Date.now()
      while (Date.now() - started < 30000) {
        const current = await evaluate(cdp, sessionId, state)
        if (
          current?.phase === phase &&
          current.morph >= minMorph &&
          current.morph <= maxMorph
        ) return current
        await sleep(40)
      }
      throw new Error(
        `timed out waiting for ${phase} ${minMorph}..${maxMorph}: ${JSON.stringify(await evaluate(cdp, sessionId, state))}`
      )
    }
    const screenshot = async (name) => {
      const capture = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, captureBeyondViewport: false },
        sessionId
      )
      const path = join(outputDir, name)
      await writeFile(path, Buffer.from(capture.data, 'base64'))
      return path
    }
    /* One read of the landed table: every visible stack's prints and caption,
       the open sheet if there is one, and the solver's own account of what it
       decided. Everything stage D asserts is measured off this. */
    const readPlate = () =>
      evaluate(cdp, sessionId, () => {
        const boxOf = (element) => {
          const rect = element.getBoundingClientRect()
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          }
        }
        const sheet = document.querySelector('#globe-contact-sheet')
        const stacks = [...document.querySelectorAll('.globe-pin')]
          .filter(
            (pin) =>
              pin.querySelector('.globe-pickup-card') &&
              Number(getComputedStyle(pin).opacity) > 0.6
          )
          .map((pin) => {
            const top = pin.querySelector('.globe-pickup-card')
            const caption = pin.querySelector('.globe-print-caption')
            return {
              slug: pin.dataset.placeSlug,
              prints: [...pin.querySelectorAll('.globe-pickup-card')]
                .filter((card) => Number(getComputedStyle(card).opacity) > 0.05)
                .map(boxOf),
              caption: caption ? boxOf(caption) : null,
              expanded: top ? top.getAttribute('aria-expanded') : null,
            }
          })
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          stacks,
          sheetCount: document.querySelectorAll('.globe-sheet').length,
          sheet:
            sheet && !sheet.hidden
              ? {
                  label: sheet.getAttribute('aria-label'),
                  presence: Number(getComputedStyle(sheet).getPropertyValue('--sheet-presence')),
                  cols: Number(getComputedStyle(sheet).getPropertyValue('--sheet-cols')),
                  rect: boxOf(sheet),
                  frames: [...sheet.querySelectorAll('.globe-sheet-frame')].map(boxOf),
                  numbers: [...sheet.querySelectorAll('.globe-sheet-index')].map(
                    (node) => node.textContent
                  ),
                }
              : null,
          layout: window.__plateLayout?.() ?? null,
        }
      })

    /* The sheet spreads half a second after the table settles (R15's landing
       beat), and develops its frames in over another beat. A landed still is
       only the landed still once that has finished, so the wait is on the
       develop clock rather than on a fixed sleep. */
    const sheetSnapshot = () => {
      const sheet = document.querySelector('#globe-contact-sheet')
      if (!sheet) return { exists: false }
      return {
        exists: true,
        hidden: sheet.hidden,
        presence: Number(getComputedStyle(sheet).getPropertyValue('--sheet-presence')),
        count: sheet.querySelectorAll('.globe-sheet-frame').length,
        label: sheet.getAttribute('aria-label'),
        owner: window.__plateLayout?.()?.owner ?? null,
      }
    }
    const waitForSheet = async (frames, description) => {
      const started = Date.now()
      while (Date.now() - started < 20000) {
        const snap = await evaluate(cdp, sessionId, sheetSnapshot)
        if (snap.exists && !snap.hidden && snap.count === frames && snap.presence > 0.995) {
          return { frames: snap.count, presence: snap.presence, label: snap.label }
        }
        await sleep(100)
      }
      throw new Error(
        `timed out waiting for ${description}: ${JSON.stringify(await evaluate(cdp, sessionId, sheetSnapshot))}`
      )
    }

    /* Multi-place countries dive from their chip; one-place countries have no
       chip by design (v3 — the stack is the door), so the probe takes the same
       __dive intent the stack's second tap would set. */
    const clickCluster = (slug) =>
      evaluate(cdp, sessionId, (memberSlug) => {
        const chip = document.querySelector(`[data-cluster-slugs~="${memberSlug}"] button`)
        if (chip instanceof HTMLButtonElement) {
          chip.click()
          return
        }
        const clusterIndex = window.__clusterIndexOf?.(memberSlug) ?? -1
        if (clusterIndex < 0) throw new Error(`${memberSlug} has neither chip nor cluster`)
        window.__dive(clusterIndex)
      }, slug)
    const exitPlate = async () => {
      await evaluate(cdp, sessionId, () => document.querySelector('.globe-world-button')?.click())
      await waitForState('world', 0, 0.001)
    }

    await waitFor(
      () => Boolean(
        document.querySelector('canvas')?.width &&
        // germany is a one-place country now: a stack, not a chip (v3)
        document.querySelector('[data-place-slug="germany"]') &&
        document.querySelector('[data-cluster-slugs~="queenstown"] button') &&
        document.querySelector('[data-cluster-slugs~="da-nang"] button')
      ),
      'canvas and S5 doors'
    )
    await sleep(5000)

    const screenshots = []

    // Germany: broad country/region authority plus Vienna's town ring. The
    // screenshot is the honesty gate: Germany itself must not gain a point.
    await clickCluster('germany')
    await waitForState('plate', 0.999, 1)
    const germanySheetSettled = await waitForSheet(
      15,
      'the germany sheet to spread itself on landing (R15)'
    )
    await sleep(250)
    screenshots.push(await screenshot('s5-germany-landed.png'))

    /* ---- stage D: the survey (P7), photo-first (P2), and the solver's two
       hard constraints. All of it measured, none of it judged off the still. */
    const germanyTable = await readPlate()
    assert.ok(germanyTable.sheet, 'the germany cap must land with a contact sheet spread')
    assert.equal(
      germanyTable.sheet.label,
      'germany, de, contact sheet of 15 frames',
      'the sheet must name the collection it spreads'
    )
    assert.equal(germanyTable.sheetCount, 1, 'exactly one sheet may be open at a time')
    assert.equal(germanyTable.sheet.frames.length, 15, 'all 15 germany frames must be on the sheet')
    assert.equal(germanyTable.sheet.cols, 5, '15 frames must lay out as 5 × 3')
    assert.deepEqual(
      [germanyTable.sheet.numbers[0], germanyTable.sheet.numbers[14]],
      ['01', '15'],
      'the sheet must carry film-edge numbers 01 … 15'
    )
    const { width: viewportWidth, height: viewportHeight } = germanyTable.viewport
    assert.ok(
      germanyTable.sheet.frames.every(
        (frame) =>
          frame.left >= -1 &&
          frame.top >= -1 &&
          frame.right <= viewportWidth + 1 &&
          frame.bottom <= viewportHeight + 1
      ),
      'every sheet frame must be inside the viewport — a survey is all of it at once (P7)'
    )
    assert.ok(
      germanyTable.sheet.frames.every((frame) => frame.width >= 40),
      'a 40px thumbnail is an index, not a survey: every frame must be survey-legible (P7)'
    )
    const uniformity = germanyTable.sheet.frames.map((frame) =>
      Math.abs(frame.width / frame.height - 1.5)
    )
    assert.ok(
      Math.max(...uniformity) < 0.06,
      'sheet frames must be uniform and undistorted 3:2, never wedges'
    )
    const sheetRect = germanyTable.sheet.rect
    assert.ok(
      (sheetRect.width * sheetRect.height) / (viewportWidth * viewportHeight) < 0.4,
      'the sheet is an object on the table, never a full-frame overlay (§2.6)'
    )
    /* the solver's hard constraint, checked against the DOM rather than
       against the solver: no other stack's print or caption may be underneath
       the open sheet (§9.2) */
    const sheetOwner = 'germany'
    for (const stack of germanyTable.stacks) {
      if (stack.slug === sheetOwner) continue
      for (const print of stack.prints) {
        assert.ok(
          !intersects(sheetRect, print),
          `the sheet covers ${stack.slug}'s print — print scale drops before honesty does`
        )
      }
      if (stack.caption) {
        assert.ok(
          !intersects(sheetRect, stack.caption),
          `the sheet covers ${stack.slug}'s caption — the solver must never do this`
        )
      }
    }
    /* and the stacks against each other: the NZ overlap bug, gated on the cap
       that has three of them */
    for (let a = 0; a < germanyTable.stacks.length; a++) {
      for (let b = a + 1; b < germanyTable.stacks.length; b++) {
        assert.ok(
          !intersects(germanyTable.stacks[a].prints[0], germanyTable.stacks[b].prints[0]),
          `${germanyTable.stacks[a].slug} and ${germanyTable.stacks[b].slug} prints overlap`
        )
      }
    }
    // P2: photographs, by area, on the worst cap there is
    const clip = (box) => ({
      left: Math.max(0, box.left),
      top: Math.max(0, box.top),
      right: Math.min(viewportWidth, box.right),
      bottom: Math.min(viewportHeight, box.bottom),
    })
    const photoBoxes = [
      ...germanyTable.sheet.frames,
      ...germanyTable.stacks.flatMap((stack) => stack.prints),
    ]
      .map(clip)
      .filter((box) => box.right > box.left && box.bottom > box.top)
    const photoFraction = unionArea(photoBoxes) / (viewportWidth * viewportHeight)
    /* S5_SOFT_COVERAGE=1 demotes the P2 coverage gate to a warning. This is
       the STANDING RED from the v3 country split: germany reads 14.0% because
       vienna and dolomites prints left the DE cap, the layout must not be
       gamed to win the number back, and the ruling belongs to Rouven with the
       phase-3 inside view. Soft mode exists so the twenty asserts behind this
       one still produce evidence while that ruling is open. Default strict. */
    if (process.env.S5_SOFT_COVERAGE === '1' && photoFraction < 0.15) {
      console.warn(
        `WARN (soft): photographs cover ${(photoFraction * 100).toFixed(1)}% of the germany ` +
          'landing; P2 asks for 15% on the worst cap — standing red, ruling open'
      )
    } else {
      assert.ok(
        photoFraction >= 0.15,
        `photographs cover ${(photoFraction * 100).toFixed(1)}% of the germany landing; ` +
          'P2 asks for 15% on the worst cap (v1 shipped 2.1%)'
      )
    }
    assert.equal(
      germanyTable.stacks.find((stack) => stack.slug === 'germany')?.expanded,
      'true',
      'the stack that spread the sheet must report aria-expanded=true'
    )

    /* The plotted outline, counted off the shipped attribute buffer rather
       than judged off the still. P1 is a human call on the screenshot, but
       "there is no stroke at all" is a fact, and the first stills gate could
       not tell the two apart: a stroke seeded at the wrong density and a
       stroke that never seeded look identical in a starfield. germany is the
       landlocked cap the figure exists for, so it carries the assertion. */
    const germanyPlate = await waitFor(
      () => {
        const stats = window.__plateStats?.()
        return stats && stats.borderDots > 0 ? stats : null
      },
      'the germany outline stroke to seed',
      5000
    )
    assert.ok(
      germanyPlate.borderDots > 500,
      `germany landed with ${germanyPlate.borderDots} outline marks; ` +
      'a landlocked cap with under 500 has no figure'
    )
    /* Seeded is not the same as drawn. About a tenth of the stroke is seeded
       into the sampling margin OUTSIDE the visible window, where the plate's
       edge falloff dims it on purpose (measured: 2582 of 2878 lit on germany),
       so the floor sits at 80% rather than at parity. Under that, the marks
       exist and the visitor cannot see them, which is the failure this catches
       that a count alone would not. */
    assert.ok(
      germanyPlate.borderLit >= germanyPlate.borderDots * 0.8,
      `only ${germanyPlate.borderLit} of ${germanyPlate.borderDots} outline marks ` +
      'carry settled alpha on a landed plate'
    )

    // The first member click selects its existing pickup and opens the CSS
    // fan. A subsequent card click must lift that exact card into FramePop.
    await evaluate(cdp, sessionId, () => {
      const card = document.querySelector('[data-place-slug="germany"] .globe-pickup-card')
      if (!(card instanceof HTMLButtonElement)) throw new Error('germany pickup card is missing')
      card.click()
    })
    await waitFor(
      () => document.querySelector('[data-place-slug="germany"]')?.classList.contains('globe-pin-selected'),
      'germany card fan'
    )
    await sleep(500)
    screenshots.push(await screenshot('s5-germany-fan.png'))
    const germanyFanBounds = await evaluate(cdp, sessionId, () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      cards: [...document.querySelectorAll(
        '[data-place-slug="germany"] .globe-pickup-card img'
      )].map((card) => {
        const rect = card.getBoundingClientRect()
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      }),
    }))
    assert.ok(germanyFanBounds.cards.length > 1, 'germany must open a multi-card fan')
    assert.ok(
      germanyFanBounds.cards.every((card) =>
        card.left >= -1 &&
        card.right <= germanyFanBounds.width + 1 &&
        card.top >= -1 &&
        card.bottom <= germanyFanBounds.height + 1
      ),
      'the widest plate fan must open fully inside the viewport'
    )
    await evaluate(cdp, sessionId, () => {
      const cards = document.querySelectorAll(
        '[data-place-slug="germany"] .globe-pickup-card'
      )
      const card = cards[1] ?? cards[0]
      if (!(card instanceof HTMLButtonElement)) throw new Error('fanned germany card is missing')
      card.click()
    })
    await waitFor(() => Boolean(document.querySelector('.frame-pop')), 'FramePop mount')
    await sleep(650)
    screenshots.push(await screenshot('s5-germany-pop.png'))
    await evaluate(cdp, sessionId, () => {
      const backdrop = document.querySelector('.frame-pop-backdrop')
      if (!(backdrop instanceof HTMLElement)) throw new Error('FramePop backdrop is missing')
      backdrop.click()
    })
    await waitFor(() => !document.querySelector('.frame-pop'), 'FramePop return to fan')

    /* P7's second half: every frame on the sheet is ONE tap from the viewer.
       The fifth frame, chosen because it is neither the first nor the last —
       a sheet where only the corners work is not a survey. */
    await evaluate(cdp, sessionId, () => {
      const frame = document.querySelectorAll('#globe-contact-sheet .globe-sheet-frame')[4]
      if (!(frame instanceof HTMLButtonElement)) throw new Error('sheet frame 05 is missing')
      frame.click()
    })
    const sheetPopLabel = await waitFor(
      () => document.querySelector('.frame-pop')?.getAttribute('aria-label') ?? null,
      'FramePop from a sheet frame'
    )
    assert.equal(
      sheetPopLabel,
      'germany, de — frame 5 of 15',
      'a sheet frame must open its own frame in the viewer'
    )
    await evaluate(cdp, sessionId, () => {
      const backdrop = document.querySelector('.frame-pop-backdrop')
      if (!(backdrop instanceof HTMLElement)) throw new Error('FramePop backdrop is missing')
      backdrop.click()
    })
    await waitFor(() => !document.querySelector('.frame-pop'), 'FramePop return to the sheet')

    /* The moved-sheet contract used to be probed here by selecting the
       dolomites stack — but the v3 country split made germany a ONE-STACK cap
       (vienna and dolomites are their own countries' tables now), so there is
       no second stack on this table to move the sheet to. The "one sheet at a
       time, the grease pencil moves rather than multiplies" assert lives on
       the NZ table below, the multi-stack cap that can actually express it. */
    await exitPlate()

    // NZ: the local fiord tint must sit on terrain, while adaptive spread is
    // visible in the four separate pickup anchors.
    await clickCluster('queenstown')
    await waitForState('plate', 0.999, 1)
    /* south island holds twelve frames, so it is the heaviest member and its
       sheet spreads on landing exactly as germany's does — the rule is
       mechanical, and this is the cap that proves it is not special-cased */
    const nzSheetSettled = await waitForSheet(12, 'the south island sheet to spread on landing')
    assert.equal(
      nzSheetSettled.label,
      'south island, nz, contact sheet of 12 frames',
      'the NZ cap must open its heaviest member, not its nearest one'
    )
    await sleep(250)
    screenshots.push(await screenshot('s5-nz-landed.png'))
    /* The coastal cap: it got its edge free from the sea before the stroke
       existed, so its number is recorded rather than gated hard — but a NZ
       landing with no coastline stroke at all means the stage regressed. */
    const nzPlate = await evaluate(cdp, sessionId, () => window.__plateStats?.() ?? null)
    assert.ok(
      nzPlate && nzPlate.borderDots > 50,
      `NZ landed with ${nzPlate?.borderDots ?? 'no'} outline marks`
    )
    const nzPins = await evaluate(cdp, sessionId, () =>
      ['milford-sound', 'doubtful-sound', 'south-island', 'queenstown'].map((slug) => {
        const pin = document.querySelector(`[data-place-slug="${slug}"]`)
        if (!(pin instanceof HTMLElement)) throw new Error(`${slug} plate pin is missing`)
        const rect = pin.getBoundingClientRect()
        return { slug, x: rect.left, y: rect.top, opacity: Number(getComputedStyle(pin).opacity) }
      })
    )
    assert.equal(nzPins.length, 4, 'all four NZ pins must render')
    assert.ok(nzPins.every((pin) => pin.opacity > 0.6), 'all four NZ pins must be visible')
    assert.ok(
      nzPins.every((pin) => pin.y >= 60 && pin.y <= 940),
      'all NZ anchors must stay inside the landed 6–94% viewport-height contract'
    )
    let nzMinSeparation = Infinity
    for (let a = 0; a < nzPins.length; a++) {
      for (let b = a + 1; b < nzPins.length; b++) {
        nzMinSeparation = Math.min(
          nzMinSeparation,
          Math.hypot(nzPins[a].x - nzPins[b].x, nzPins[a].y - nzPins[b].y)
        )
      }
    }
    assert.ok(nzMinSeparation >= 30, 'NZ pin anchors must keep a visible screen-space gap')

    /* THE DECLUTTER, on the cap that needed it. Four stacks inside 250km
       landed with their prints on top of each other and their captions printed
       through each other (s5-nz-landed.png, stage B). Stacks that were moved
       carry a tie back to their anchor, which is what keeps the move honest. */
    const nzTable = await readPlate()
    for (let a = 0; a < nzTable.stacks.length; a++) {
      for (let b = a + 1; b < nzTable.stacks.length; b++) {
        const first = nzTable.stacks[a]
        const second = nzTable.stacks[b]
        assert.ok(
          !intersects(first.prints[0], second.prints[0]),
          `${first.slug} and ${second.slug} prints still overlap on the NZ table`
        )
        assert.ok(
          !first.caption ||
            !second.caption ||
            !intersects(first.caption, second.caption),
          `${first.slug} and ${second.slug} captions still print through each other`
        )
      }
    }
    assert.ok(nzTable.sheet, 'the NZ table must still carry its spread sheet')
    const nzSheetRect = nzTable.sheet.rect
    for (const stack of nzTable.stacks) {
      if (stack.slug === 'south-island') continue
      assert.ok(
        !intersects(nzSheetRect, stack.prints[0]) &&
          (!stack.caption || !intersects(nzSheetRect, stack.caption)),
        `the NZ sheet covers ${stack.slug}`
      )
    }
    const nzTies = nzTable.layout?.ties ?? []
    const nzNudged = (nzTable.layout?.nudges ?? []).filter(
      (nudge) => Math.hypot(nudge.dx, nudge.dy) >= 5
    )
    assert.ok(
      nzNudged.every((nudge) => nzTies.some((tie) => tie.slug === nudge.slug)),
      'every displaced NZ stack must carry a tie back to its own anchor (P4)'
    )

    /* ONE SHEET AT A TIME (§5), on the cap with stacks to move between:
       selecting milford sound folds south island's sheet back into its stack
       and spreads milford's six frames as 5 + 1 — the grease pencil moves
       rather than multiplies. */
    await evaluate(cdp, sessionId, () => {
      const card = document.querySelector('[data-place-slug="milford-sound"] .globe-pickup-card')
      if (!(card instanceof HTMLButtonElement)) throw new Error('milford print stack is missing')
      card.click()
    })
    const movedSheet = await waitForSheet(6, 'the milford sheet to replace the south island sheet')
    assert.equal(
      movedSheet.label,
      'milford sound, nz, contact sheet of 6 frames',
      'the moved sheet must be the milford collection, whole'
    )
    await sleep(300)
    screenshots.push(await screenshot('s5-sheet-moved.png'))
    const movedTable = await readPlate()
    assert.ok(movedTable.sheet, 'the milford sheet must be placed, not merely mounted')
    assert.equal(movedTable.sheetCount, 1, 'the south island sheet must fold as the milford one spreads')
    assert.equal(movedTable.sheet.cols, 5, '6 frames must lay out as 5 + 1')
    assert.equal(
      movedTable.stacks.find((stack) => stack.slug === 'south-island')?.expanded,
      'false',
      'the folded stack must report aria-expanded=false'
    )
    assert.equal(
      movedTable.stacks.find((stack) => stack.slug === 'milford-sound')?.expanded,
      'true',
      'the spread stack must report aria-expanded=true'
    )
    await exitPlate()

    // Da Nang is an honest empty stop: the pin and label exist, a card stack
    // does not. Hanoi beside it remains a normal pickup.
    await clickCluster('da-nang')
    await waitForState('plate', 0.999, 1)
    await sleep(250)
    screenshots.push(await screenshot('s5-da-nang-landed.png'))
    const emptyStop = await evaluate(cdp, sessionId, () => {
      const pin = document.querySelector('[data-place-slug="da-nang"]')
      if (!(pin instanceof HTMLElement)) return null
      return {
        opacity: Number(getComputedStyle(pin).opacity),
        hasPickup: Boolean(pin.querySelector('.globe-pickup')),
        hasCards: Boolean(pin.querySelector('.globe-pickup-card')),
        hasBareDot: Boolean(pin.querySelector('.globe-pin-dot-bare')),
        hasBareLabel: Boolean(pin.querySelector('.globe-pickup-label-bare')),
      }
    })
    /* R15 in its other direction: no member of this cap holds eight frames, so
       the table lands with its stacks closed and nothing spreads itself. */
    const quietCap = await readPlate()
    assert.equal(
      quietCap.sheetCount,
      0,
      'a cap with no congested member must land with its stacks closed'
    )
    assert.ok(emptyStop, 'da-nang plate pin must exist')
    assert.ok(emptyStop.opacity > 0.6, 'da-nang plate pin must be visible')
    assert.equal(emptyStop.hasPickup, false, 'da-nang must not render a pickup stack')
    assert.equal(emptyStop.hasCards, false, 'da-nang must not render cards')
    assert.equal(emptyStop.hasBareDot, true, 'da-nang must render its bare dot')
    assert.equal(emptyStop.hasBareLabel, true, 'da-nang must render its label')

    off()
    const consoleErrors = consoleMessages.filter((message) =>
      ['error', 'assert'].includes(message.type)
    )
    const shaderWarnings = consoleMessages.filter(
      (message) =>
        message.type === 'warning' &&
        /(shader|webglprogram|compile|link)/i.test(message.text)
    )
    assert.deepEqual(exceptions, [], 'runtime exceptions were reported')
    assert.deepEqual(consoleErrors, [], 'console errors were reported')
    assert.deepEqual(shaderWarnings, [], 'shader compile/link warnings were reported')
    console.log(JSON.stringify({
      screenshots,
      germanyPlate,
      nzPlate,
      sheet: {
        germany: {
          settled: germanySheetSettled,
          cols: germanyTable.sheet.cols,
          rect: germanyTable.sheet.rect,
          frameSize: germanyTable.sheet.frames[0],
          shrunk: germanyTable.layout?.sheet?.shrunk ?? null,
          violated: germanyTable.layout?.sheet?.violated ?? null,
          ties: germanyTable.layout?.ties ?? null,
          nudges: germanyTable.layout?.nudges ?? null,
          photoFraction: Number(photoFraction.toFixed(4)),
        },
        moved: { label: movedSheet.label, cols: movedTable.sheet.cols },
        nz: {
          settled: nzSheetSettled,
          shrunk: nzTable.layout?.sheet?.shrunk ?? null,
          ties: nzTies,
          nudges: nzTable.layout?.nudges ?? null,
        },
        quietCap: quietCap.sheetCount,
      },
      germanyFanBounds,
      nzPins,
      nzMinSeparation,
      emptyStop,
      exceptions,
      consoleErrors,
      shaderWarnings,
    }, null, 2))
  } finally {
    if (cdp && targetId) await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    cdp?.close()
    chrome?.kill()
    await server?.stop()
  }
}

await main()
