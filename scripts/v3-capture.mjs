/**
 * Phase-1 evidence capture for country-view v3.
 *
 * Records the dive ENTRY and EXIT as frame sequences (CDP screencast) with a
 * page-side per-rAF state log (phase / morph / presence), plus full-resolution
 * landed stills for annotation. Run once before the transition rework and once
 * after; the gate is the side-by-side.
 *
 *   node scripts/v3-capture.mjs [label]     # default label: "before"
 *
 * Output: scripts/audit-out/v3-<label>/{entry,exit}-NNN.png, landed-*.png,
 * manifest.json (state log + frame timestamps, aligned via an epoch offset).
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CDP, evaluate, launchChrome, sleep } from './cdp.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = dirname(scriptsDir)
const label = process.argv[2] ?? 'before'
const outputDir = join(scriptsDir, 'audit-out', `v3-${label}`)
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

    const loaded = cdp.once('Page.loadEventFired', { sessionId, timeout: 60000 })
    await cdp.send('Page.navigate', { url: `${server.origin}/` }, sessionId)
    await loaded

    const state = () => {
      const frame = document.querySelector('.globe-frame-live')
      return frame
        ? {
            phase: frame.dataset.phase,
            morph: Number(frame.dataset.morph ?? 0),
            presence: Number(frame.dataset.presence ?? 0),
          }
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
    const waitForState = async (phase, minMorph = 0, maxMorph = 1, timeout = 45000) => {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        const current = await evaluate(cdp, sessionId, state)
        if (current?.phase === phase && current.morph >= minMorph && current.morph <= maxMorph)
          return current
        await sleep(40)
      }
      throw new Error(
        `timed out waiting for ${phase} ${minMorph}..${maxMorph}: ${JSON.stringify(await evaluate(cdp, sessionId, state))}`
      )
    }
    const still = async (name) => {
      const capture = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, captureBeyondViewport: false },
        sessionId
      )
      await writeFile(join(outputDir, name), Buffer.from(capture.data, 'base64'))
      return name
    }

    /* Per-rAF state logger. The epoch offset lets the node side align
       screencast metadata timestamps (epoch seconds) with performance.now(). */
    await evaluate(cdp, sessionId, () => {
      window.__v3log = []
      window.__v3epoch = Date.now() - performance.now()
      const frame = document.querySelector('.globe-frame-live')
      const tick = () => {
        window.__v3log.push({
          t: performance.now(),
          phase: frame?.dataset.phase,
          morph: Number(frame?.dataset.morph ?? 0),
          presence: Number(frame?.dataset.presence ?? 0),
          scan: Number(frame?.dataset.scan ?? 0),
        })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    /* Screencast plumbing: frames buffer here; a slice() between two page
       timestamps becomes one named sequence. */
    const frames = []
    const offFrames = cdp.on((message) => {
      if (message.sessionId !== sessionId) return
      if (message.method !== 'Page.screencastFrame') return
      frames.push({ data: message.params.data, ts: message.params.metadata.timestamp * 1000 })
      cdp
        .send('Page.screencastFrameAck', { sessionId: message.params.sessionId }, sessionId)
        .catch(() => {})
    })
    const startCast = () =>
      cdp.send(
        'Page.startScreencast',
        { format: 'png', maxWidth: 800, maxHeight: 500, everyNthFrame: 1 },
        sessionId
      )
    const stopCast = () => cdp.send('Page.stopScreencast', {}, sessionId)
    const pageNow = () => evaluate(cdp, sessionId, () => performance.now())
    const epoch = async () => evaluate(cdp, sessionId, () => window.__v3epoch)

    const saveSequence = async (name, fromPageT, toPageT, epochOffset) => {
      const fromTs = fromPageT + epochOffset
      const toTs = toPageT + epochOffset
      const slice = frames.filter((f) => f.ts >= fromTs && f.ts <= toTs)
      const saved = []
      for (let i = 0; i < slice.length; i++) {
        const file = `${name}-${String(i).padStart(3, '0')}.png`
        await writeFile(join(outputDir, file), Buffer.from(slice[i].data, 'base64'))
        saved.push({ file, pageT: slice[i].ts - epochOffset })
      }
      return saved
    }

    await waitFor(
      () =>
        Boolean(
          document.querySelector('canvas')?.width &&
            document.querySelector('[data-cluster-slugs~="queenstown"] button')
        ),
      'canvas and NZ cluster chip'
    )
    await sleep(5000)

    const epochOffset = await epoch()
    const manifest = { label, capturedAt: new Date().toISOString(), sequences: {}, stills: [] }

    /* ---- entry ---- */
    await startCast()
    const entryStart = await pageNow()
    await evaluate(cdp, sessionId, () => {
      const chip = document.querySelector('[data-cluster-slugs~="queenstown"] button')
      if (!(chip instanceof HTMLButtonElement)) throw new Error('NZ cluster chip is missing')
      chip.click()
    })
    await waitForState('plate', 0.999, 1)
    await sleep(700)
    const entryEnd = await pageNow()
    await stopCast()
    manifest.sequences.entry = await saveSequence('entry', entryStart, entryEnd, epochOffset)

    /* landed still, after the sheet (if any) settles */
    await sleep(1500)
    manifest.stills.push(await still('landed-new-zealand.png'))

    /* ---- exit ---- */
    await startCast()
    const exitStart = await pageNow()
    await evaluate(cdp, sessionId, () =>
      document.querySelector('.globe-world-button')?.click()
    )
    await waitForState('world', 0, 0.001)
    await sleep(700)
    const exitEnd = await pageNow()
    await stopCast()
    manifest.sequences.exit = await saveSequence('exit', exitStart, exitEnd, epochOffset)

    /* ---- extra landed stills for annotation ---- */
    const slugs = await evaluate(cdp, sessionId, () =>
      [...document.querySelectorAll('[data-cluster-slugs]')].map(
        (el) => el.dataset.clusterSlugs.split(' ')[0]
      )
    )
    for (const slug of slugs.filter((s) => s !== 'queenstown').slice(0, 2)) {
      await sleep(1200)
      await evaluate(
        cdp,
        sessionId,
        (s) => {
          const chip = document.querySelector(`[data-cluster-slugs~="${s}"] button`)
          if (!(chip instanceof HTMLButtonElement)) throw new Error(`${s} chip is missing`)
          chip.click()
        },
        slug
      )
      await waitForState('plate', 0.999, 1)
      await sleep(2200)
      manifest.stills.push(await still(`landed-${slug}.png`))
      await evaluate(cdp, sessionId, () =>
        document.querySelector('.globe-world-button')?.click()
      )
      await waitForState('world', 0, 0.001)
    }

    manifest.stateLog = await evaluate(cdp, sessionId, () => window.__v3log)
    offFrames()
    await writeFile(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    const seq = manifest.sequences
    console.log(
      `v3-capture [${label}]: entry ${seq.entry.length} frames, exit ${seq.exit.length} frames, ` +
        `${manifest.stills.length} stills, ${manifest.stateLog.length} state samples → ${outputDir}`
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
