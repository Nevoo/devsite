/**
 * S4's real-browser dive gate. Like the S3 probe, this script owns a Vite
 * server and an isolated headless Chrome, and tears both down in `finally`.
 *
 * The implementation exposes window.__dive / window.__exitDive in DEV only,
 * but this probe intentionally clicks the real NZ chip for its primary path.
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
    // Keep phase/morph polling explicit and dependency-free.
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
    const clickNz = async () => {
      await evaluate(cdp, sessionId, () => {
        const chip = document.querySelector('[data-cluster-slugs~="queenstown"] button')
        if (!(chip instanceof HTMLButtonElement)) throw new Error('NZ cluster chip is missing')
        chip.click()
      })
    }
    const interrupt = () =>
      evaluate(cdp, sessionId, () => {
        window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 91 }))
      })

    /* Catch a morph window and interrupt INSIDE it, page-side on rAF. The
       area-scaled reseed made small caps fast enough that a node-side 40ms
       poll can shoot straight past an ~70ms window; watching from the page
       guarantees the interrupt lands within the same frame the window is
       entered. Resolves with the morph it fired at; rejects if the dive
       finishes without the window ever being seen. */
    const interruptInMorphWindow = (minMorph, maxMorph) =>
      evaluate(cdp, sessionId, (min, max) =>
        new Promise((resolve, reject) => {
          const frame = document.querySelector('.globe-frame-live')
          const started = performance.now()
          const check = () => {
            const phase = frame.dataset.phase
            const morph = Number(frame.dataset.morph ?? 0)
            if (phase === 'dive' && morph >= min && morph <= max) {
              window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 91 }))
              resolve(morph)
              return
            }
            if ((phase === 'dive' && morph > max) || phase === 'plate') {
              reject(new Error(`morph window ${min}..${max} skipped (now ${phase}@${morph})`))
              return
            }
            if (performance.now() - started > 15000) {
              reject(new Error(`morph window ${min}..${max} never reached (now ${phase}@${morph})`))
              return
            }
            requestAnimationFrame(check)
          }
          check()
        }),
        minMorph,
        maxMorph
      )

    /* The v3 peel is compressed into the first DEVELOP_AT of the master clock
       (the exit mirrored), so a node-side 40ms poll can hop straight over a
       morph window that used to be wide enough to catch. Watch from the page
       on rAF, same trick as interruptInMorphWindow, and screenshot on arrival. */
    const waitOnPage = (targetPhase, minMorph, maxMorph, donePhase) =>
      evaluate(cdp, sessionId, (target, min, max, done) =>
        new Promise((resolve, reject) => {
          const frame = document.querySelector('.globe-frame-live')
          const started = performance.now()
          const check = () => {
            const phase = frame.dataset.phase
            const morph = Number(frame.dataset.morph ?? 0)
            if (phase === target && morph >= min && morph <= max) {
              resolve(morph)
              return
            }
            if (phase === done) {
              reject(new Error(`${target} ${min}..${max} never rendered (now ${done})`))
              return
            }
            if (performance.now() - started > 15000) {
              reject(new Error(`${target} ${min}..${max} never reached (now ${phase}@${morph})`))
              return
            }
            requestAnimationFrame(check)
          }
          check()
        }),
        targetPhase,
        minMorph,
        maxMorph,
        donePhase
      )
    const waitForMorphOnPage = (minMorph) => waitOnPage('dive', minMorph, 1, 'plate')

    await waitFor(
      () => Boolean(
        document.querySelector('canvas')?.width &&
        document.querySelector('[data-cluster-slugs~="queenstown"] button')
      ),
      'canvas and NZ cluster chip'
    )
    await sleep(5000)

    // Cycle 1: the complete enter/exit choreography and the five visual gates.
    await clickNz()
    await waitForState('dive', 0, 0.08)
    const screenshots = [await screenshot('s4-steer.png')]
    await waitForMorphOnPage(0.42)
    screenshots.push(await screenshot('s4-peel-mid.png'))
    await waitForState('plate', 0.999, 1)
    screenshots.push(await screenshot('s4-plate-landed.png'))
    /* The meta line is two spans now, not one dashed string, so the probe reads
       both: the member list the short title stopped saying, and the counts in
       the bracket register. Read separately on purpose — concatenating them
       back into one textContent would let a stray separator through unnoticed,
       which is the exact class of bug the split was made to remove. */
    const landedSubject = await evaluate(cdp, sessionId, () => ({
      title: document.querySelector('.hero-title-selection')?.textContent?.trim(),
      subtitleMembers: document
        .querySelector('.hero-title-sub-selection .hero-title-sub-members')
        ?.textContent?.trim(),
      subtitleCounts: document
        .querySelector('.hero-title-sub-selection .hero-title-sub-counts')
        ?.textContent?.trim(),
      documentTitle: document.title,
      titleOpacity: Number(getComputedStyle(
        document.querySelector('.hero-title-selection')
      ).opacity),
    }))
    assert.deepEqual(
      landedSubject,
      {
        title: 'new zealand',
        subtitleMembers: 'milford sound · doubtful sound · south island · queenstown',
        subtitleCounts: '4 places · [ 24 ]',
        documentTitle: 'new zealand — rouvens.work',
        titleOpacity: 1,
      },
      'the landed selection must own the existing hero title and document title'
    )
    await evaluate(cdp, sessionId, () => document.querySelector('.globe-world-button')?.click())
    await waitOnPage('return', 0.05, 0.7, 'world')
    screenshots.push(await screenshot('s4-return-mid.png'))
    await waitForState('world', 0, 0.001)
    screenshots.push(await screenshot('s4-world-restored.png'))
    const restoredSubject = await evaluate(cdp, sessionId, () => ({
      worldTitle: document.querySelector('.hero-title-world')?.textContent?.trim(),
      worldOpacity: Number(getComputedStyle(document.querySelector('.hero-title-world')).opacity),
      selectionOpacity: Number(getComputedStyle(
        document.querySelector('.hero-title-selection')
      ).opacity),
      documentTitle: document.title,
    }))
    assert.deepEqual(
      restoredSubject,
      {
        worldTitle: 'rouven.',
        worldOpacity: 1,
        selectionOpacity: 0,
        documentTitle: 'rouvens.work',
      },
      'the final return frame must exactly restore the world subject'
    )

    // Cycle 2: interruption below the midpoint must resolve to world.
    await clickNz()
    await interruptInMorphWindow(0.05, 0.44)
    assert.equal((await waitForState('world', 0, 0.001)).phase, 'world')

    // Cycle 3: interruption above the midpoint must complete the plate, then
    // the explicit exit runs the normal return choreography once more.
    await clickNz()
    await interruptInMorphWindow(0.66, 0.98)
    assert.equal((await waitForState('plate', 0.999, 1)).phase, 'plate')
    await evaluate(cdp, sessionId, () => window.__exitDive?.())
    await waitForState('world', 0, 0.001)

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
      landedSubject,
      restoredSubject,
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
