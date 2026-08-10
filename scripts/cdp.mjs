/**
 * Minimal Chrome DevTools Protocol client + throwaway Chrome launcher + a
 * static server with SPA fallback. Zero npm dependencies: Node 25 ships a
 * global WebSocket, and everything else is node: builtins.
 *
 * Used by scripts/audit.mjs. Nothing here touches the user's own Chrome —
 * every run spawns its own binary against a fresh --user-data-dir under
 * the OS temp dir and kills it on exit.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

export const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/* ------------------------------------------------------------------ server */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt'])

/**
 * Serves `root` with an index.html fallback for extension-less paths, so a
 * cold load of /work/nature is a real cold load of that route rather than a
 * 404. Paths that look like assets 404 properly instead — handing index.html
 * to a <script src> (Vercel's /_vercel/insights/script.js is the one that
 * bites here) throws "Unexpected token '<'" and poisons the error counts.
 * Text assets are gzipped because a network throttle is meaningless against
 * uncompressed bundles — production is served compressed.
 */
export async function startStaticServer(root) {
  const cache = new Map()
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
    let file = join(root, path)
    if (!existsSync(file) || statSync(file).isDirectory()) {
      const asIndex = join(file, 'index.html')
      if (existsSync(asIndex) && statSync(asIndex).isFile()) file = asIndex
      else if (extname(path)) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('not found')
        return
      } else file = join(root, 'index.html')
    }
    const ext = extname(file).toLowerCase()
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store')
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      let body = cache.get(file)
      if (!body) {
        body = gzipSync(await readFile(file))
        cache.set(file, body)
      }
      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Length', body.length)
      res.end(body)
      return
    }
    res.setHeader('Content-Length', statSync(file).size)
    createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.()
        server.close(resolve)
      }),
  }
}

/* ------------------------------------------------------------------ chrome */

/**
 * --disable-gpu is deliberately absent: it leaves every WebGL surface empty,
 * which silently zeroes out the parts of this site that matter. SwiftShader
 * via ANGLE renders for real, just slowly.
 */
export async function launchChrome({ headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'devsite-audit-'))
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-features=Translate,MediaRouter,OptimizationHints',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--enable-precise-memory-info',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    '--window-size=1600,1000',
    'about:blank',
  ]
  if (headless) args.unshift('--headless=new')

  const proc = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => reject(new Error('chrome never printed a DevTools url')), 30000)
    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString()
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(timer)
        resolve(m[1])
      }
    })
    proc.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`chrome exited early (${code})\n${buf}`))
    })
  })

  const kill = () => {
    try {
      proc.kill('SIGKILL')
    } catch {}
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {}
  }
  process.on('exit', kill)
  return { proc, wsUrl, profile, kill }
}

/* --------------------------------------------------------------- cdp client */

/** One websocket, flat sessions. `send(method, params, sessionId)`. */
export class CDP {
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', (e) => reject(new Error('cdp socket error: ' + e.message)), {
        once: true,
      })
    })
    return new CDP(ws)
  }

  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.handlers = new Set()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`))
        else p.resolve(msg.result)
      } else {
        for (const h of this.handlers) h(msg)
      }
    })
  }

  send(method, params = {}, sessionId, timeout = 120000) {
    const id = ++this.id
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.ws.send(JSON.stringify(payload))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method })
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out after ${timeout}ms`))
      }, timeout)
    })
  }

  on(fn) {
    this.handlers.add(fn)
    return () => this.handlers.delete(fn)
  }

  /** resolves with the first matching event (optionally scoped to a session) */
  once(method, { sessionId, timeout = 60000, filter } = {}) {
    return new Promise((resolve, reject) => {
      const off = this.on((msg) => {
        if (msg.method !== method) return
        if (sessionId && msg.sessionId !== sessionId) return
        if (filter && !filter(msg.params)) return
        off()
        clearTimeout(timer)
        resolve(msg.params)
      })
      const timer = setTimeout(() => {
        off()
        reject(new Error(`waiting for ${method} timed out`))
      }, timeout)
    })
  }

  close() {
    try {
      this.ws.close()
    } catch {}
  }
}

/* ------------------------------------------------------------------ helpers */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Runs `fn` in the page and returns JSON. `timeout` matters: anything awaiting
 * an in-page promise driven by requestAnimationFrame will hang forever if the
 * page's rAF stalls, and the default 120s stall costs more than the phase.
 */
export async function evaluate(cdp, sessionId, fn, ...args) {
  let timeout = 30000
  if (args.length && args[args.length - 1] && args[args.length - 1].__evalTimeout) {
    timeout = args.pop().__evalTimeout
  }
  const expression = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true, allowUnsafeEvalBlockedByCSP: true },
    sessionId,
    timeout
  )
  if (res.exceptionDetails) {
    throw new Error(
      'page eval failed: ' +
        (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
    )
  }
  return res.result.value
}
