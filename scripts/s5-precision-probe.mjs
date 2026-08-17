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
    const clickCluster = (slug) =>
      evaluate(cdp, sessionId, (memberSlug) => {
        const chip = document.querySelector(`[data-cluster-slugs~="${memberSlug}"] button`)
        if (!(chip instanceof HTMLButtonElement)) {
          throw new Error(`${memberSlug} cluster chip is missing`)
        }
        chip.click()
      }, slug)
    const exitPlate = async () => {
      await evaluate(cdp, sessionId, () => document.querySelector('.globe-world-button')?.click())
      await waitForState('world', 0, 0.001)
    }

    await waitFor(
      () => Boolean(
        document.querySelector('canvas')?.width &&
        document.querySelector('[data-cluster-slugs~="germany"] button') &&
        document.querySelector('[data-cluster-slugs~="queenstown"] button') &&
        document.querySelector('[data-cluster-slugs~="da-nang"] button')
      ),
      'canvas and S5 cluster chips'
    )
    await sleep(5000)

    const screenshots = []

    // Germany: broad country/region authority plus Vienna's town ring. The
    // screenshot is the honesty gate: Germany itself must not gain a point.
    await clickCluster('germany')
    await waitForState('plate', 0.999, 1)
    await sleep(250)
    screenshots.push(await screenshot('s5-germany-landed.png'))

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
    await exitPlate()

    // NZ: the local fiord tint must sit on terrain, while adaptive spread is
    // visible in the four separate pickup anchors.
    await clickCluster('queenstown')
    await waitForState('plate', 0.999, 1)
    await sleep(250)
    screenshots.push(await screenshot('s5-nz-landed.png'))
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
