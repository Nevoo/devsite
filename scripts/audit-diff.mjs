#!/usr/bin/env node
/**
 * Markdown diff of two audit runs.
 *
 *   node scripts/audit-diff.mjs scripts/audit-baseline.json scripts/audit-out/<run>.json
 *   node scripts/audit-diff.mjs a.json b.json --only regressions
 *   node scripts/audit-diff.mjs a.json b.json --tolerance 5   # the Gate-0 check
 *
 * Reads the `flat` map each run writes, so any metric added to audit.mjs shows
 * up here without touching this file. Exit code 1 if a regression is flagged,
 * so it can be used as a gate in a script.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const files = []
const flags = new Map()
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) {
    files.push(args[i])
    continue
  }
  const next = args[i + 1]
  if (next && !next.startsWith('--')) {
    flags.set(args[i].slice(2), next)
    i++
  } else flags.set(args[i].slice(2), true)
}
const flag = (name, fallback = null) => (flags.has(name) ? flags.get(name) : fallback)

if (files.length !== 2) {
  console.error('usage: node scripts/audit-diff.mjs <a.json> <b.json> [--only regressions] [--tolerance 5]')
  process.exit(2)
}

const A = JSON.parse(readFileSync(files[0], 'utf8'))
const B = JSON.parse(readFileSync(files[1], 'utf8'))

/**
 * Direction per metric. "lower" means a smaller number in B is an improvement.
 * Page height counts as lower-is-better because every height target in the
 * plan is a reduction; anything genuinely two-sided is listed as 'flat', where
 * ANY movement beyond tolerance is a regression (that is how the frozen
 * transition storyboard is policed — it must not drift in either direction).
 */
function direction(key) {
  if (/minFontSizePx|minTargetPx|withFocusRing|tabReachable|clearsOn|coarseNoCustomCursor|hoverProducesMode/.test(key))
    return 'higher'
  if (/transition\.(median|min|max)/.test(key)) return 'flat'
  if (/interactiveCount|docScrollWidth|memory\.startKb|viewportsTall|reducedMotion\.navToSettledMs/.test(key))
    return 'lower'
  return 'lower'
}

/**
 * Metrics where a bare percentage is meaningless, with the absolute movement
 * that counts as real. Counts and booleans move by 1 or not at all. CLS gets a
 * 0.01 floor: both runs sit three orders of magnitude under the 0.1 target, so
 * 0.0009 → 0.0026 is a 189% "regression" and means nothing.
 */
const ABSOLUTE = [
  [/\.cls$/, 0.01],
  [/clearsOn|coarseNoCustomCursor|hoverProducesMode|wipeOccurred|pageErrors|below14|belowMinTarget44|overflowUnintentional|wipedCount/, 0],
]

/**
 * Known-unstable metrics, measured over two consecutive runs of the unchanged
 * baseline. They are still flagged — hiding them
 * would be tuning the instrument — but they are marked, and `--ignore-noisy`
 * drops them from the exit code so a real regression isn't lost in them.
 *
 * The home-route entry is deliberately narrow. `/` runs a live globe overlay
 * during the sweep, so which pins are on screen moves these three counters by
 * ±1–3 between identical runs. Everything else on home — its height, its
 * minimum font size, its header targets — is bit-stable across runs and MUST
 * gate. An earlier revision suppressed every `sweep./|…` key, which quietly
 * exempted the home page from the whole instrument.
 */
const NOISY =
  /longestTaskMs|\.cls$|reducedMotion\.navToSettledMs|^sweep\.\/\|[^.]*\.(textNodesBelow14|interactiveCount|belowMinTarget44)$/

const tolerance = Number(flag('tolerance', 5))
const onlyRegressions = flag('only') === 'regressions'
const ignoreNoisy = !!flag('ignore-noisy')

const keys = [...new Set([...Object.keys(A.flat ?? {}), ...Object.keys(B.flat ?? {})])].sort()
const rows = []
let regressions = 0
let improvements = 0
let added = 0
let removed = 0

for (const key of keys) {
  const a = A.flat?.[key]
  const b = B.flat?.[key]
  if (a == null && b == null) continue
  // A metric present on only one side is informational and never gates. The
  // frozen baseline predates any metric added later, and a harness improvement
  // must not read as a site regression.
  if (a == null || b == null) {
    const flag = a == null ? 'new metric' : 'removed metric'
    if (a == null) added++
    else removed++
    rows.push({ key, a: a ?? '—', b: b ?? '—', delta: '—', pct: '—', flag })
    continue
  }
  const delta = b - a
  const pct = a === 0 ? (delta === 0 ? 0 : null) : (delta / Math.abs(a)) * 100
  const dir = direction(key)
  const absRule = ABSOLUTE.find(([re]) => re.test(key))
  const beyond = absRule
    ? Math.abs(delta) > absRule[1]
    : pct != null && Math.abs(pct) > tolerance
  const noisy = NOISY.test(key)
  let mark = ''
  if (beyond) {
    if (dir === 'flat') mark = 'DRIFT'
    else if ((dir === 'lower' && delta > 0) || (dir === 'higher' && delta < 0)) mark = 'REGRESSION'
    else mark = 'improved'
  }
  const counts = (mark === 'REGRESSION' || mark === 'DRIFT') && !(noisy && ignoreNoisy)
  if (counts) regressions++
  if (mark === 'improved') improvements++
  if (mark && noisy) mark += ' (noisy)'
  rows.push({
    key,
    a: fmt(a),
    b: fmt(b),
    delta: (delta > 0 ? '+' : '') + fmt(delta),
    pct: pct == null ? '—' : (pct > 0 ? '+' : '') + pct.toFixed(1) + '%',
    flag: mark,
  })
}

function fmt(n) {
  if (typeof n !== 'number') return String(n)
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 1000) / 1000)
}

const shown = onlyRegressions ? rows.filter((r) => /REGRESSION|DRIFT/.test(r.flag)) : rows
const noisyFlagged = rows.filter((r) => /REGRESSION|DRIFT/.test(r.flag) && r.flag.includes('noisy')).length

const out = []
out.push(`# audit diff — ${A.label} → ${B.label}`)
out.push('')
out.push(`- A: \`${files[0]}\` — ${A.startedAt} — ${A.chrome} — git ${String(A.git).slice(0, 8)}${A.gitDirty ? ' (dirty)' : ''}`)
out.push(`- B: \`${files[1]}\` — ${B.startedAt} — ${B.chrome} — git ${String(B.git).slice(0, 8)}${B.gitDirty ? ' (dirty)' : ''}`)
out.push(
  `- tolerance: ${tolerance}% · metrics: ${rows.length} · flagged: ${regressions} · improved: ${improvements} · on known-noisy metrics: ${noisyFlagged}${ignoreNoisy ? ' (excluded from the exit code)' : ''}`
)
if (added || removed) {
  out.push(
    `- ${added} metric(s) only in B, ${removed} only in A — informational, never gated (the frozen baseline predates later harness additions)`
  )
}
out.push('')
out.push('| metric | A | B | Δ | % | |')
out.push('|---|---:|---:|---:|---:|---|')
for (const r of shown) out.push(`| \`${r.key}\` | ${r.a} | ${r.b} | ${r.delta} | ${r.pct} | ${r.flag} |`)
out.push('')
out.push(
  regressions
    ? `**${regressions} metric(s) outside ${tolerance}% in the wrong direction.**`
    : `**No metric moved beyond ${tolerance}% in the wrong direction.**`
)

console.log(out.join('\n'))
process.exit(regressions ? 1 : 0)
