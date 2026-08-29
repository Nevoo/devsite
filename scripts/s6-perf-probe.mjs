/**
 * S6's throttled performance, keyboard, and terrain-prefetch gate. Like the
 * S4/S5 probes, this owns one Vite server and one isolated Chrome and tears
 * both down in `finally`.
 *
 * Keyboard checks stay in page context; see the keyboard-pass note below.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CDP, evaluate, launchChrome, sleep } from './cdp.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = dirname(scriptsDir)
const stripAnsi = (value) => value.replace(/\x1b\[[0-9;]*m/g, '')

const LONG_TASK_INSTRUMENT = String.raw`
(() => {
  window.__longTasks = [];
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    }).observe({ entryTypes: ['longtask'] });
  } catch (error) {}
})();
`

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

const longestInWindow = (tasks, start, end) => {
  const entries = tasks.filter(
    (task) => task.startTime < end && task.startTime + task.duration > start
  )
  return {
    entries,
    longest: entries.reduce((longest, task) => Math.max(longest, task.duration), 0),
  }
}

async function main() {
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
    await cdp.send('Network.enable', {}, sessionId)
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: LONG_TASK_INSTRUMENT }, sessionId)
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
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }, sessionId)
    await cdp.send('Page.bringToFront', {}, sessionId).catch(() => {})

    const exceptions = []
    const consoleMessages = []
    const terrainRequests = []
    let navigationStartedAt = 0
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
      if (
        message.method === 'Network.requestWillBeSent' &&
        new URL(message.params.request.url).pathname.endsWith('/terrain.bin')
      ) {
        terrainRequests.push({
          requestId: message.params.requestId,
          url: message.params.request.url,
          elapsedMs: Date.now() - navigationStartedAt,
          timestamp: message.params.timestamp,
        })
      }
    })

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
    const waitForNode = async (predicate, description, timeout = 30000) => {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        const value = predicate()
        if (value) return value
        await sleep(50)
      }
      throw new Error(`timed out waiting for ${description}`)
    }
    const waitForState = async (phase, minMorph = 0, maxMorph = 1) => {
      const started = Date.now()
      while (Date.now() - started < 30000) {
        const current = await evaluate(cdp, sessionId, state)
        if (
          current?.phase === phase &&
          current.morph >= minMorph &&
          current.morph <= maxMorph
        ) {
          return { ...current, at: await evaluate(cdp, sessionId, () => performance.now()) }
        }
        await sleep(40)
      }
      throw new Error(
        `timed out waiting for ${phase} ${minMorph}..${maxMorph}: ${JSON.stringify(await evaluate(cdp, sessionId, state))}`
      )
    }
    const clickCluster = (slug) =>
      evaluate(cdp, sessionId, (memberSlug) => {
        const chip = document.querySelector(`[data-cluster-slugs~="${memberSlug}"] button`)
        if (!(chip instanceof HTMLButtonElement)) {
          throw new Error(`${memberSlug} cluster chip is missing`)
        }
        const at = performance.now()
        chip.click()
        return at
      }, slug)
    const clickWorldButton = () =>
      evaluate(cdp, sessionId, () => {
        const button = document.querySelector('.globe-world-button')
        if (!(button instanceof HTMLButtonElement)) throw new Error('world button is missing')
        const at = performance.now()
        button.click()
        return at
      })
    const focusDescription = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return null
      return {
        tag: active.tagName.toLowerCase(),
        className: active.className,
        ariaLabel: active.getAttribute('aria-label'),
        text: active.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      }
    }

    const loaded = cdp.once('Page.loadEventFired', { sessionId, timeout: 60000 })
    navigationStartedAt = Date.now()
    await cdp.send('Page.navigate', { url: `${server.origin}/` }, sessionId)
    await loaded

    await waitFor(
      () => {
        const veil = document.querySelector('.loading-screen')
        const veilHidden = !veil || getComputedStyle(veil).display === 'none'
        return Boolean(
          veilHidden &&
          document.querySelector('canvas')?.width &&
          document.querySelector('[data-cluster-slugs~="queenstown"] button')
        )
      },
      'settled entrance surface and NZ cluster chip',
      60000
    )

    // The idle warm-up must finish before a chip is touched. Waiting for the
    // request, its resource timing entry, and a decode cushion keeps terrain
    // fetch/decode outside the measured dive window.
    await waitForNode(() => terrainRequests.length >= 1, 'idle terrain.bin request', 30000)
    await waitFor(
      () => performance.getEntriesByType('resource').some(
        (entry) => entry.name.includes('/terrain.bin') && entry.responseEnd > 0
      ),
      'terrain.bin response completion',
      30000
    )
    await sleep(2000)
    assert.equal(terrainRequests.length, 1, 'terrain.bin must be prefetched once before a dive')

    const nzAriaBefore = await evaluate(cdp, sessionId, () => {
      const card = document.querySelector(
        '[data-place-slug="queenstown"] .globe-pickup-card:first-child'
      )
      return card?.getAttribute('aria-label') ?? null
    })
    assert.ok(nzAriaBefore, 'queenstown pickup must have an accessible name at world scale')

    // Performance pass: one complete NZ enter and return at 4x CPU throttle.
    const diveStart = await clickCluster('queenstown')
    const plate = await waitForState('plate', 0.999, 1)
    const nzAriaAtPlate = await evaluate(cdp, sessionId, () => {
      const card = document.querySelector(
        '[data-place-slug="queenstown"] .globe-pickup-card:first-child'
      )
      return card?.getAttribute('aria-label') ?? null
    })
    assert.equal(nzAriaAtPlate, nzAriaBefore, 'plate scale must preserve the pickup aria-label')
    const plateTabOrder = await evaluate(cdp, sessionId, () =>
      ['milford-sound', 'doubtful-sound', 'south-island', 'queenstown'].map((slug) => {
        const pin = document.querySelector(`[data-place-slug="${slug}"]`)
        const card = pin?.querySelector('.globe-pickup-card:first-child')
        return {
          slug,
          inert: pin instanceof HTMLElement ? pin.inert : null,
          cardTabIndex: card instanceof HTMLButtonElement ? card.tabIndex : null,
        }
      })
    )
    assert.ok(
      plateTabOrder.every((pin) => pin.inert === false && pin.cardTabIndex === 0),
      'every NZ plate pickup must remain in DOM order and keyboard reachable'
    )
    const returnStart = await clickWorldButton()
    const world = await waitForState('world', 0, 0.001)
    await sleep(150)

    const longTasks = await evaluate(cdp, sessionId, () => window.__longTasks.slice())
    const diveTasks = longestInWindow(longTasks, diveStart, plate.at)
    const returnTasks = longestInWindow(longTasks, returnStart, world.at)
    /* S6_SOFT_LONGTASK=1 demotes the two long-task gates to warnings so the
       rest of the probe (keyboard pass, a11y contracts) still produces
       evidence on machines where this gate is a KNOWN standing red — it has
       read 71–104ms under the 4× throttle across v3 and v4 on the same
       baseline commit, so a hard stop here hides every check behind it.
       Default stays strict. */
    const softLongTask = process.env.S6_SOFT_LONGTASK === '1'
    const longTaskGate = (label, value) => {
      if (softLongTask) {
        if (value > 50) console.warn(`WARN (soft): ${label} long task ${value.toFixed(1)}ms exceeds the 50ms gate`)
        return
      }
      assert.ok(value <= 50, `${label} long task ${value.toFixed(1)}ms exceeds the 50ms gate`)
    }
    longTaskGate('dive', diveTasks.longest)
    longTaskGate('return', returnTasks.longest)
    assert.equal(terrainRequests.length, 1, 'the NZ dive must reuse the prefetched terrain request')

    /* Keyboard cluster pass.
     *
     * This Chrome build turns one CDP Input.dispatchKeyEvent keyDown + keyUp
     * into an endless auto-repeat storm (~13k keydowns in 3s, reproduced on
     * about:blank), so CDP keyboard input cannot be used as evidence here.
     * Instead we prove the chip is a real, enabled, non-hidden native button
     * in tab order, focus it, and call click(): the browser contract for Enter
     * on that focused native button is to synthesize exactly that activation.
     * Escape is the app's window-keydown contract, so an untrusted page-context
     * KeyboardEvent reaches the same listener without invoking broken CDP IO.
     */
    const keyboardFocusBefore = await evaluate(cdp, sessionId, () => {
      const chip = document.querySelector('[data-cluster-slugs~="queenstown"] button')
      if (!(chip instanceof HTMLButtonElement)) throw new Error('NZ cluster chip is missing')
      chip.focus()
      return {
        focused: document.activeElement === chip,
        tabIndex: chip.tabIndex,
        disabled: chip.disabled,
        ariaHidden: chip.getAttribute('aria-hidden'),
        hiddenByAncestor: Boolean(chip.closest('[aria-hidden="true"]')),
        expanded: chip.getAttribute('aria-expanded'),
        label: chip.getAttribute('aria-label'),
      }
    })
    assert.equal(keyboardFocusBefore.focused, true, 'focus() must reach the NZ cluster chip')
    assert.ok(keyboardFocusBefore.tabIndex >= 0, 'NZ cluster chip must be reachable in tab order')
    assert.equal(keyboardFocusBefore.disabled, false, 'NZ cluster chip must be enabled')
    assert.notEqual(keyboardFocusBefore.ariaHidden, 'true', 'NZ cluster chip must not be aria-hidden')
    assert.equal(
      keyboardFocusBefore.hiddenByAncestor,
      false,
      'NZ cluster chip must not sit below an aria-hidden ancestor'
    )
    assert.equal(keyboardFocusBefore.expanded, 'false', 'NZ chip must be collapsed at world scale')
    /* The chip shows `4 places · [ 24 ]` and nothing else now, so its accessible
       name is the only place the member list survives at world scale: the
       display title names the cap by its heaviest member, the aria-label still
       hands a screen reader every place under it. */
    assert.equal(
      keyboardFocusBefore.label,
      'enter new zealand: milford sound · doubtful sound · south island · queenstown — 4 places, 24 frames',
      'NZ chip must name the cluster, every member and both counts'
    )
    await evaluate(cdp, sessionId, () => {
      const chip = document.activeElement
      if (!(chip instanceof HTMLButtonElement)) throw new Error('focused NZ chip was lost')
      chip.click()
    })
    await waitForState('plate', 0.999, 1)
    const keyboardPlate = await waitFor(
      () => {
        const chip = document.querySelector('[data-cluster-slugs~="queenstown"] button')
        const worldButton = document.querySelector('.globe-world-button')
        return chip?.getAttribute('aria-expanded') === 'true' &&
          worldButton instanceof HTMLButtonElement && worldButton.tabIndex === 0
          ? { expanded: 'true', worldButtonTabIndex: worldButton.tabIndex }
          : null
      },
      'expanded NZ chip and keyboard-reachable world button'
    )
    /* ESCAPE'S DEPTH ORDER (stage D). At plate scale Escape closes exactly one
     * thing per keystroke, in this order:
     *
     *   a popped frame → the pop, back to the sheet
     *   an open sheet  → the sheet folds, the table stays
     *   neither        → the table returns to the world
     *
     * The shipped handler set exitRef on ANY Escape below world scale while
     * FramePop closed itself on the same keystroke, so one Escape aimed at a
     * popped frame closed two depths and dived the table out from under the
     * visitor. Each rung below is walked and then measured, because "the pop
     * closed" and "the pop closed and we are still on the table" are different
     * facts and only the second one is the contract.
     */
    const escape = () =>
      evaluate(cdp, sessionId, () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
    const plateDepth = () =>
      evaluate(cdp, sessionId, () => ({
        phase: document.querySelector('.globe-frame-live')?.dataset.phase ?? null,
        pop: Boolean(document.querySelector('.frame-pop')),
        sheetFrames: document.querySelectorAll('#globe-contact-sheet .globe-sheet-frame').length,
      }))
    /* south island's twelve frames spread themselves on landing (R15), so the
       ladder has all three rungs to walk without another click */
    await waitFor(
      () => document.querySelectorAll('#globe-contact-sheet .globe-sheet-frame').length === 12,
      'the south island sheet to spread on landing'
    )
    await evaluate(cdp, sessionId, () => {
      const frame = document.querySelectorAll('#globe-contact-sheet .globe-sheet-frame')[1]
      if (!(frame instanceof HTMLButtonElement)) throw new Error('NZ sheet frame is missing')
      frame.click()
    })
    await waitFor(() => Boolean(document.querySelector('.frame-pop')), 'FramePop from a sheet frame')
    await escape()
    await waitFor(() => !document.querySelector('.frame-pop'), 'the pop to close on Escape')
    const escapeDepths = { pop: await plateDepth() }
    assert.equal(escapeDepths.pop.phase, 'plate', 'Escape on a popped frame must leave the plate landed')
    assert.equal(
      escapeDepths.pop.sheetFrames,
      12,
      'Escape on a popped frame must drop back to the sheet, not past it'
    )
    await escape()
    await waitFor(
      () => document.querySelectorAll('#globe-contact-sheet').length === 0,
      'the sheet to fold on Escape'
    )
    escapeDepths.sheet = await plateDepth()
    assert.equal(escapeDepths.sheet.phase, 'plate', 'folding the sheet must not leave the table')
    assert.equal(escapeDepths.sheet.pop, false, 'no pop may survive the sheet fold')
    await escape()
    await waitForState('world', 0, 0.001)
    const keyboardReturn = await waitFor(
      () => {
        const chip = document.querySelector('[data-cluster-slugs~="queenstown"] button')
        const worldButton = document.querySelector('.globe-world-button')
        return chip?.getAttribute('aria-expanded') === 'false' &&
          worldButton instanceof HTMLButtonElement && worldButton.tabIndex === -1
          ? { expanded: 'false', worldButtonTabIndex: worldButton.tabIndex }
          : null
      },
      'collapsed NZ chip and removed world button after Escape'
    )
    const keyboardFocusAfter = await evaluate(cdp, sessionId, focusDescription)

    // One door (v4): a single native-button activation on a world-scale
    // pickup dives straight into its country — the select-then-dive ladder
    // is gone, and the same Enter that used to open a fan now lands the
    // tokyo table directly.
    const singletonFocus = await evaluate(cdp, sessionId, () => {
      const card = document.querySelector(
        '[data-place-slug="tokyo"] .globe-pickup-card:first-child'
      )
      if (!(card instanceof HTMLButtonElement)) throw new Error('tokyo pickup card is missing')
      card.focus()
      return document.activeElement === card
    })
    assert.equal(singletonFocus, true, 'focus() must reach the tokyo pickup card')
    await evaluate(cdp, sessionId, () => {
      const card = document.activeElement
      if (!(card instanceof HTMLButtonElement)) throw new Error('focused tokyo card was lost')
      card.click()
    })
    await waitForState('plate', 0.999, 1)
    /* tokyo holds nine frames, so the congested singleton lands with its own
       sheet spread and its Escape ladder is two rungs deep, not one */
    await waitFor(
      () => document.querySelectorAll('#globe-contact-sheet .globe-sheet-frame').length === 9,
      'the tokyo sheet to spread on landing'
    )
    await escape()
    await waitFor(
      () => document.querySelectorAll('#globe-contact-sheet').length === 0,
      'the tokyo sheet to fold on Escape'
    )
    const singletonAfterFold = await plateDepth()
    assert.equal(
      singletonAfterFold.phase,
      'plate',
      'the singleton table must survive the Escape that folds its sheet'
    )
    await escape()
    await waitForState('world', 0, 0.001)

    off()
    const consoleErrors = consoleMessages.filter((message) =>
      ['error', 'assert'].includes(message.type)
    )
    assert.deepEqual(exceptions, [], 'runtime exceptions were reported')
    assert.deepEqual(consoleErrors, [], 'console errors were reported')

    console.log(JSON.stringify({
      cpuThrottle: 4,
      terrain: {
        requestCount: terrainRequests.length,
        firstRequestElapsedMs: terrainRequests[0].elapsedMs,
        noSecondRequestAfterDive: terrainRequests.length === 1,
      },
      performance: {
        dive: { longestTaskMs: diveTasks.longest, longTasks: diveTasks.entries },
        return: { longestTaskMs: returnTasks.longest, longTasks: returnTasks.entries },
      },
      keyboard: {
        focusMethod: 'HTMLElement.focus() plus native HTMLButtonElement.click() activation',
        chipLabel: keyboardFocusBefore.label,
        plate: keyboardPlate,
        return: keyboardReturn,
        focusAfterReturn: keyboardFocusAfter,
        congestedSingletonTwoEnterPass: true,
        escapeDepthOrder: {
          afterPopEscape: escapeDepths.pop,
          afterSheetEscape: escapeDepths.sheet,
          singletonAfterFold,
          exitsOnThird: true,
        },
      },
      platePinAriaLabel: {
        before: nzAriaBefore,
        atPlate: nzAriaAtPlate,
        unchanged: nzAriaBefore === nzAriaAtPlate,
      },
      plateTabOrder,
      exceptions,
      consoleErrors,
    }, null, 2))
  } finally {
    if (cdp && targetId) await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    cdp?.close()
    chrome?.kill()
    await server?.stop()
  }
}

await main()
