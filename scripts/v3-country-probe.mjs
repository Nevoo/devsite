/**
 * Phase-2 country-presence probe (v3): drives a real headless pointer over the
 * globe and asserts the three world-scale country behaviours end to end —
 * pointer→country resolution, the hover stroke, and click-anywhere-to-dive.
 * Captures stills along the way for the gate artifact.
 *
 *   node scripts/v3-country-probe.mjs
 *
 * Output: scripts/audit-out/v3-country/{rest,hover,landed}.png + probe.json
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CDP, evaluate, launchChrome, sleep } from './cdp.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = dirname(scriptsDir)
const outputDir = join(scriptsDir, 'audit-out', 'v3-country')
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

async function main() {
  await mkdir(outputDir, { recursive: true })
  let server
  let chrome
  let cdp

  try {
    server = await startVite()
    chrome = await launchChrome()
    cdp = await CDP.connect(chrome.wsUrl)
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })

    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false, screenWidth: 1600, screenHeight: 1000 },
      sessionId
    )
    const loaded = cdp.once('Page.loadEventFired', { sessionId, timeout: 60000 })
    await cdp.send('Page.navigate', { url: `${server.origin}/` }, sessionId)
    await loaded

    const still = async (name) => {
      const capture = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, captureBeyondViewport: false },
        sessionId
      )
      await writeFile(join(outputDir, name), Buffer.from(capture.data, 'base64'))
    }
    /* Synthetic in-page events, NOT Input.dispatchMouseEvent: headless CDP
       input dispatch has hung this Chrome before (see the keydown-storm note),
       and s4's interrupts already ship on synthetic PointerEvents. React's
       delegated listeners see bubbling events the same either way. */
    const mouseMove = (x, y) =>
      evaluate(cdp, sessionId, (px, py) => {
        document.querySelector('.globe-frame-live')?.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: px,
            clientY: py,
            pointerType: 'mouse',
            pointerId: 7,
          })
        )
      }, x, y)
    /* Atomic move→resolve→click: the pointer lands, two rAFs let the canvas
       resolve the country, and the click fires in the same page task — no CDP
       roundtrip for the sphere to drift through. Resolves with the hover value
       the click saw (or -1, meaning no click was sent). */
    const clickIfHovered = (x, y) =>
      evaluate(cdp, sessionId, (px, py) =>
        new Promise((resolve) => {
          const frame = document.querySelector('.globe-frame-live')
          const grab = document.querySelector('.globe-grab')
          if (!frame || !grab) throw new Error('frame/grab missing')
          const options = {
            bubbles: true,
            clientX: px,
            clientY: py,
            pointerType: 'mouse',
            pointerId: 7,
            button: 0,
          }
          frame.dispatchEvent(new PointerEvent('pointermove', options))
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const hover = window.__hoverCountry?.() ?? -1
              if (hover >= 0) {
                grab.dispatchEvent(new PointerEvent('pointerdown', options))
                grab.dispatchEvent(new PointerEvent('pointerup', options))
                grab.dispatchEvent(new MouseEvent('click', options))
              }
              resolve(hover)
            })
          )
        }),
        x,
        y,
        { __evalTimeout: 15000 }
      )
    const state = () => {
      const frame = document.querySelector('.globe-frame-live')
      return frame
        ? { phase: frame.dataset.phase, morph: Number(frame.dataset.morph ?? 0) }
        : null
    }
    const waitForState = async (phase, minMorph = 0, timeout = 45000) => {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        const current = await evaluate(cdp, sessionId, state)
        if (current?.phase === phase && current.morph >= minMorph) return current
        await sleep(50)
      }
      throw new Error(`timed out waiting for ${phase}: ${JSON.stringify(await evaluate(cdp, sessionId, state))}`)
    }

    await evaluate(cdp, sessionId, () =>
      Boolean(document.querySelector('.globe-frame-live'))
    )
    // entrance + idle prefetch of countries.bin both need to settle
    await sleep(9000)
    await still('rest.png')

    /* grid-scan the frame with real mouse moves; record what the canvas
       resolves at each point, and which DOM element owns the pixel */
    const rect = await evaluate(cdp, sessionId, () => {
      const r = document.querySelector('.globe-frame-live').getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height, viewH: window.innerHeight }
    })

    /* Pin projections are the deterministic land anchors: every pin sits
       inside its country by definition, and its element rect is positioned by
       the ticker even when the pin itself is faded or hidden under a chip. A
       candidate is a pin point that resolves to SOME visited country and
       whose pixel belongs to the bare grab surface (hidden pins take no
       pointer events, so elementFromPoint falls through to the grab). */
    const findCandidates = () =>
      evaluate(cdp, sessionId, () =>
        new Promise((resolve) => {
          const frame = document.querySelector('.globe-frame-live')
          const opts = (x, y) => ({
            bubbles: true, clientX: x, clientY: y, pointerType: 'mouse', pointerId: 7, button: 0,
          })
          /* elements once; rects LIVE per attempt — the tour keeps rotating
             under the scan, and a rect captured at scan start can be tens of
             degrees stale by the time its dispatch happens (the exact miss
             that made this gate flake) */
          const pinElements = [...document.querySelectorAll('.globe-pin')]
          const found = []
          const trace = []
          /* the pin point itself is often covered by its own pickup card, so
             a ring of nearby offsets looks for open ground in the same country */
          const offsets = [
            [0, 0], [36, 0], [-36, 0], [0, 36], [0, -36], [64, 20], [-64, 20], [0, 64],
          ]
          const tryNext = (i, oi) => {
            if (i >= pinElements.length) { resolve({ found, trace, anchorCount: pinElements.length }); return }
            if (oi >= offsets.length) { tryNext(i + 1, 0); return }
            const el = pinElements[i]
            const r = el.getBoundingClientRect()
            const a = {
              slug: el.dataset.placeSlug,
              x: Math.round(r.left + r.width / 2),
              y: Math.round(r.top + r.height / 2),
            }
            if (a.x <= 8 || a.x >= innerWidth - 8 || a.y <= 8 || a.y >= innerHeight - 8) {
              tryNext(i + 1, 0)
              return
            }
            const x = a.x + offsets[oi][0]
            const y = a.y + offsets[oi][1]
            frame.dispatchEvent(new PointerEvent('pointermove', opts(x, y)))
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const hover = window.__hoverCountry?.() ?? -1
              const under = document.elementFromPoint(x, y)
              const onGrab = under?.classList.contains('globe-grab') ?? false
              if (oi === 0) trace.push(`${a.slug}@${x},${y} hover=${hover} under=${under?.className || 'null'}`)
              if (hover >= 0 && onGrab) {
                found.push({ x, y, cluster: hover, slug: a.slug })
                tryNext(i + 1, 0)
              } else tryNext(i, oi + 1)
            }))
          }
          tryNext(0, 0)
        }),
        { __evalTimeout: 30000 }
      )

    await evaluate(cdp, sessionId, () => undefined) // settle eval channel
    /* The tour decides which countries face the camera at any instant; a scan
       that lands while the archive side is swung to the limb legitimately
       finds nothing. Retry across a few swing periods before calling it a
       failure — the assert is about resolution working, not about the phase
       of the tour. */
    let scan = await findCandidates()
    for (let attempt = 1; scan.found.length === 0 && attempt < 4; attempt++) {
      console.log(`scan attempt ${attempt}: ${scan.anchorCount} anchors, 0 candidates — waiting out the swing`)
      await sleep(2600)
      scan = await findCandidates()
    }
    console.log(`initial scan: ${scan.anchorCount} anchors, ${scan.found.length} candidates`)
    for (const line of scan.trace) console.log('  ' + line)
    let grabHits = scan.found
    assert.ok(grabHits.length > 0, 'no pin-anchored point resolves to a country on bare grab')
    const hits = grabHits

    /* ocean corner clears the hover */
    await mouseMove(Math.round(rect.left + 8), Math.round(rect.top + rect.height * 0.4))
    await sleep(200)
    const cleared = await evaluate(cdp, sessionId, () => window.__hoverCountry?.())
    assert.equal(cleared, -1, `hover did not clear over the frame edge (still ${cleared})`)

    /* Click-anywhere, against a live target. The tour keeps the sphere
       turning, so scan-time hits go stale within seconds — each candidate is
       re-hovered NOW, the stroke gets its beat, hover is re-read immediately
       before the click, and the landed cluster must equal that read. */
    const waitSoft = async (phase, minMorph, timeout) => {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        const current = await evaluate(cdp, sessionId, state)
        if (current?.phase === phase && current.morph >= minMorph) return true
        await sleep(50)
      }
      return false
    }
    /* a tiny drag grants GRACE (6s) of tour stillness — the sphere stops
       steering, so a hovered country stays put long enough to click */
    const nudgeDrag = async () => {
      const cx = Math.round(rect.left + rect.width * 0.5)
      const cy = Math.round(rect.top + rect.height * 0.45)
      await evaluate(cdp, sessionId, (px, py) => {
        const grab = document.querySelector('.globe-grab')
        const opts = (x, y) => ({
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerType: 'mouse',
          pointerId: 9,
          button: 0,
        })
        grab.dispatchEvent(new PointerEvent('pointerdown', opts(px, py)))
        grab.dispatchEvent(new PointerEvent('pointermove', opts(px + 4, py)))
        grab.dispatchEvent(new PointerEvent('pointermove', opts(px + 9, py)))
        grab.dispatchEvent(new PointerEvent('pointerup', opts(px + 9, py)))
      }, cx, cy)
      await sleep(300) // residual spin decays
    }

    let clicked = null
    let landed = null
    let hoverShot = false
    attempts: for (let round = 0; round < 3 && !clicked; round++) {
      await nudgeDrag()
      // candidates re-found inside the fresh grace window, so they stay live
      scan = await findCandidates()
      console.log(`round ${round}: ${scan.anchorCount} anchors, ${scan.found.length} candidates`)
      if (scan.found.length === 0) for (const line of scan.trace) console.log('  ' + line)
      grabHits = scan.found
      for (const candidate of grabHits) {
        await mouseMove(candidate.x, candidate.y)
        await sleep(150)
        const hoverNow = await evaluate(cdp, sessionId, () => window.__hoverCountry?.())
        if (hoverNow < 0) {
          console.log(`  candidate ${candidate.x},${candidate.y}: stale (was ${candidate.cluster})`)
          continue
        }
        if (!hoverShot) {
          await sleep(650) // stroke draw-in
          await still('hover.png')
          hoverShot = true
          await nudgeDrag() // the screenshot spent grace; buy it back
        }
        const atClick = await clickIfHovered(candidate.x, candidate.y)
        console.log(`  candidate ${candidate.x},${candidate.y}: clicked at hover ${atClick}`)
        if (atClick < 0) continue
        if (!(await waitSoft('dive', 0, 4000))) {
          console.log('  …click produced no dive')
          continue
        }
        assert.ok(await waitSoft('plate', 0.999, 45000), 'dive after country click never landed')
        landed = await evaluate(cdp, sessionId, () => ({
          cluster: Number(document.querySelector('.globe-frame-live')?.dataset.cluster ?? -1),
          title: document.querySelector('.hero-title-selection')?.textContent?.trim(),
        }))
        assert.equal(landed.cluster, atClick, 'landed in a different cluster than was hovered at click')
        clicked = { x: candidate.x, y: candidate.y, cluster: atClick }
        break attempts
      }
    }
    assert.ok(clicked, 'no candidate point survived to a click-anywhere dive')
    await sleep(1200)
    await still('landed.png')

    await evaluate(cdp, sessionId, () => window.__exitDive?.())
    await waitForState('world', 0)

    const report = {
      gridHits: hits.length,
      grabHits: grabHits.length,
      clicked,
      landedCluster: landed.cluster,
      landedTitle: landed.title,
    }
    await writeFile(join(outputDir, 'probe.json'), JSON.stringify(report, null, 2))
    console.log(
      `v3-country-probe PASS — ${hits.length} pin candidates, ` +
        `clicked cluster ${clicked.cluster} at ${clicked.x},${clicked.y}, landed "${landed.title}"`
    )
  } finally {
    cdp?.close()
    chrome?.kill()
    await server?.stop()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
