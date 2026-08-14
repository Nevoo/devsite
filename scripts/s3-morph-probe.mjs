/**
 * S3's real-browser shader-morph gate. It owns both throwaway processes: a
 * Vite development server (required because the temporary key driver is DEV
 * only) and an isolated headless Chrome. Every exit path tears both down.
 */
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
    await cdp.send('Page.bringToFront', {}, sessionId).catch(() => {})

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

    const readyAt = Date.now()
    let ready = false
    while (Date.now() - readyAt < 30000) {
      ready = await evaluate(cdp, sessionId, () => {
        const canvas = document.querySelector('canvas')
        return Boolean(canvas && canvas.width > 0 && document.querySelector('h1'))
      })
      if (ready) break
      await sleep(100)
    }
    if (!ready) throw new Error('home route never mounted a drawable canvas and h1')

    // GATHER_TOTAL is 2.622s; the field hold and reveal still keep the full
    // opening below four seconds. Five leaves headroom for SwiftShader.
    await sleep(5000)

    const drive = async (key, name, settleMs) => {
      const common = {
        key,
        code: `Digit${key}`,
        windowsVirtualKeyCode: key.charCodeAt(0),
        nativeVirtualKeyCode: key.charCodeAt(0),
      }
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...common }, sessionId)
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common }, sessionId)
      await sleep(settleMs)
      const capture = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, captureBeyondViewport: false },
        sessionId
      )
      const path = join(outputDir, name)
      await writeFile(path, Buffer.from(capture.data, 'base64'))
      return path
    }

    const screenshots = [
      await drive('1', 's3-morph-0.png', 1000),
      await drive('2', 's3-morph-0.5.png', 1600),
      await drive('3', 's3-morph-1.png', 1600),
    ]
    off()

    console.log(JSON.stringify({ screenshots, exceptions, consoleMessages }, null, 2))
    if (exceptions.length > 0) process.exitCode = 1
  } finally {
    if (cdp && targetId) await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    cdp?.close()
    chrome?.kill()
    await server?.stop()
  }
}

await main()
