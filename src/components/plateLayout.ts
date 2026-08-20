import type { PlacePrecision } from '@/content/places'

/**
 * THE ONE LAYOUT PASS (CONCEPT-COUNTRY-ZOOM-V2 §6 figure layer 3, §9.2, §9.3).
 *
 * The landed plate has to place two kinds of object in the same screen space:
 * print stacks, which are anchored to geography and may only leave it under a
 * tie, and one contact sheet, which is anchored to nothing but wants to sit
 * beside its stack. Both are decided here, together, once — because deciding
 * them apart is how a sheet ends up on top of a caption, and how four NZ
 * stacks end up printing their captions through each other.
 *
 * Pure screen-space arithmetic on purpose: no DOM, no canvas, no React. The
 * caller measures (projections, box sizes, title band) and applies; this file
 * only decides, which is why it can be reasoned about and why it is
 * deterministic — same input, same layout, no per-frame drift.
 *
 * Two rules outrank everything else here:
 *
 *   1. The sheet never covers another stack's print or caption. If no clear
 *      rectangle exists, the frames get smaller BEFORE the sheet is allowed to
 *      sit on someone's claim (§9.2: print scale drops before honesty does).
 *   2. A stack that has been moved off its anchor says so, with a tie. The
 *      displacement is minimal and, where the geometry allows, radial — ties
 *      that run outward from one centre cannot cross each other, and crossing
 *      ties are the conspiracy board §2.6 names.
 */

/** R15: the congestion that earns an automatic spread. Mechanical, never editorial. */
export const AUTO_OPEN_MIN_FRAMES = 8

/** §6: "max ~5 per row". 15 → 5×3, 9 → 5+4, 2 → one row of 2. */
export const SHEET_MAX_COLS = 5

/**
 * Frame height as a fraction of viewport height, and the ONE step it may drop
 * to when the table is too crowded for the full size.
 *
 * §6 asks for ~8–9%. This ships at 9.5% and 8.5%, one notch up, because P2 is
 * arithmetic and the range was an estimate: on germany at 1600×1000 the three
 * top prints cover ~5.5% of the frame, so the fifteen sheet frames have to
 * carry ~9.5% on their own to clear "photos ≥ 15% of the frame". At 9% they
 * carry 11.4% of a 16:10 viewport and the whole landing measures 14.8% — a
 * concept test failed by three tenths of a point. The sheet's own furniture
 * came down to compensate (4px gutters, 4px padding), so the rectangle it
 * occupies is barely wider than the 9% one: more photograph, same footprint.
 */
export const SHEET_FRAME_VH = 0.095
export const SHEET_FRAME_VH_SHRUNK = 0.085

/** the sheet's own furniture, in px: gutter between frames, sheet padding, edge-number row */
const SHEET_GAP = 4
const SHEET_PAD = 4
const SHEET_INDEX_ROW = 13
/** the sheet keeps this much air around every stack box it is placed against */
const SHEET_CLEARANCE = 8

/** how far a stack may ever be moved off its anchor, as a fraction of the viewport's short side */
const MAX_NUDGE_FACTOR = 0.2
/** under this a displacement is not a displacement, it is rounding */
const TIE_MIN = 5
/** the print's rotated scatter overshoots its own box by a few px */
const PRINT_TOP_SLACK = 10
/** .globe-print-caption sits 1.1rem under the hand, which itself sits 3.5px under the anchor */
const CAPTION_DROP = 21
const RELAX_PASSES = 48
const PUSH_SLACK = 3

/** precision that renders as a point or a ring: there is a mark to tie to */
const TIED_PRECISION: PlacePrecision[] = ['venue', 'town']

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface StackInput {
  /** index into `places` — the identity the caller writes results back onto */
  index: number
  /** the projected anchor, screen px, already clamped to the table's own margins */
  x: number
  y: number
  printW: number
  printH: number
  captionW: number
  captionH: number
  precision: PlacePrecision
}

export interface PlateLayoutInput {
  width: number
  height: number
  /** the band the hero title and the ← world control own; nothing may be placed in it */
  titleBand: Box | null
  /** the table's usable rows, screen px (below the title band, above the hero's bottom rule) */
  safeTop: number
  safeBottom: number
  /** the same clamps the pin loop applies, so the solver models where stacks can actually be */
  clearanceX: number
  clearanceY: number
  stacks: StackInput[]
  /** the place index whose sheet is spread, or null */
  sheetOwner: number | null
  sheetFrames: number
}

export interface TieMark {
  index: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SheetPlacement {
  left: number
  top: number
  width: number
  height: number
  frameH: number
  cols: number
  rows: number
  /** true when the frames had to step down a size to keep off a claim */
  shrunk: boolean
  /** true when even the smaller sheet could not be placed clear — recorded, never hidden */
  violated: boolean
  leader: { x1: number; y1: number; x2: number; y2: number }
}

export interface PlateLayout {
  /** by place index: how far this stack was moved off its anchor */
  nudges: Map<number, { dx: number; dy: number }>
  ties: TieMark[]
  sheet: SheetPlacement | null
}

const boxAt = (stack: StackInput, x: number, y: number): Box => {
  const halfWidth = Math.max(stack.printW / 2, stack.captionW / 2)
  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - stack.printH - PRINT_TOP_SLACK,
    bottom: y + CAPTION_DROP + stack.captionH,
  }
}

const overlaps = (a: Box, b: Box, pad = 0) =>
  a.left < b.right + pad &&
  a.right > b.left - pad &&
  a.top < b.bottom + pad &&
  a.bottom > b.top - pad

const inflate = (box: Box, pad: number): Box => ({
  left: box.left - pad,
  top: box.top - pad,
  right: box.right + pad,
  bottom: box.bottom + pad,
})

const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

/** gap between two boxes, 0 when they touch or overlap */
const boxGap = (a: Box, b: Box) => {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0)
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0)
  return Math.hypot(dx, dy)
}

/**
 * The distance along `u` that separates box i from box j, taking the cheaper of
 * the two axes. This is the "minimal displacement" in minimal displacement: it
 * moves a stack exactly far enough to stop touching, never a round number of
 * pixels more.
 */
const separationAlong = (a: Box, b: Box, ux: number, uy: number) => {
  const halfWidths = (a.right - a.left) / 2 + (b.right - b.left) / 2
  const halfHeights = (a.bottom - a.top) / 2 + (b.bottom - b.top) / 2
  const dx = (a.left + a.right) / 2 - (b.left + b.right) / 2
  const dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2
  let best = Infinity
  if (Math.abs(ux) > 1e-4) {
    const target = ux > 0 ? halfWidths : -halfWidths
    const t = (target - dx) / ux
    if (t > 0) best = Math.min(best, t)
  }
  if (Math.abs(uy) > 1e-4) {
    const target = uy > 0 ? halfHeights : -halfHeights
    const t = (target - dy) / uy
    if (t > 0) best = Math.min(best, t)
  }
  return Number.isFinite(best) ? best + PUSH_SLACK : 0
}

/**
 * The cheapest way for one stack to get out from under the sheet, or null if
 * there isn't one. Shared by the placement search (which prices it) and the
 * application (which performs it), because a cost model that thinks a stack
 * can move somewhere it cannot is how a sheet ends up printed over a caption:
 * the pixel budget is only half the constraint, the table's own margins are
 * the other half.
 */
const escapePush = (
  stack: StackInput,
  at: { x: number; y: number },
  rect: Box,
  input: PlateLayoutInput,
  maxNudge: number
) => {
  const box = boxAt(stack, at.x, at.y)
  const travelled = Math.hypot(at.x - stack.x, at.y - stack.y)
  const options = [
    { distance: rect.bottom - box.top + PUSH_SLACK, ux: 0, uy: 1 },
    { distance: box.bottom - rect.top + PUSH_SLACK, ux: 0, uy: -1 },
    { distance: rect.right - box.left + PUSH_SLACK, ux: 1, uy: 0 },
    { distance: box.right - rect.left + PUSH_SLACK, ux: -1, uy: 0 },
  ].sort((a, b) => a.distance - b.distance)
  for (const option of options) {
    if (option.distance <= 0) continue
    if (travelled + option.distance > maxNudge) continue
    const x = at.x + option.ux * option.distance
    const y = at.y + option.uy * option.distance
    if (x < input.clearanceX || x > input.width - input.clearanceX) continue
    if (y < input.clearanceY || y > input.height - input.clearanceY) continue
    return { dx: option.ux * option.distance, dy: option.uy * option.distance, distance: option.distance }
  }
  return null
}

/**
 * THE DECLUTTER. Stacks are pushed outward from the cluster's own centre where
 * that separates them, because segments drawn from one centre outward along
 * their own rays cannot cross each other (§2.6, leader-line spaghetti), and
 * along the pair's own axis where radial would cost far more for the same gap.
 * Either way the budget is hard: past MAX_NUDGE_FACTOR of the viewport's short
 * side a print has stopped being "near, tied" and started lying quietly, so the
 * pass gives up instead of spending more.
 */
function relax(
  stacks: StackInput[],
  position: Map<number, { x: number; y: number }>,
  obstacles: Box[],
  input: PlateLayoutInput,
  maxNudge: number
) {
  const centreX = stacks.reduce((sum, s) => sum + s.x, 0) / Math.max(1, stacks.length)
  const centreY = stacks.reduce((sum, s) => sum + s.y, 0) / Math.max(1, stacks.length)
  /* the same bounds the pin loop applies, and only those: a stack that landed
     inside the title band is the framing's problem, and clamping it here would
     invent a displacement nobody asked for */
  const clampX = (x: number) =>
    Math.max(input.clearanceX, Math.min(input.width - input.clearanceX, x))
  const clampY = (y: number) =>
    Math.max(input.clearanceY, Math.min(input.height - input.clearanceY, y))

  const radial = (stack: StackInput) => {
    const dx = stack.x - centreX
    const dy = stack.y - centreY
    const length = Math.hypot(dx, dy)
    if (length > 1) return { ux: dx / length, uy: dy / length }
    /* a stack sitting exactly on the centroid has no ray of its own; give it
       one off its index so the fan-out stays deterministic rather than random */
    const angle = (stack.index % 8) * (Math.PI / 4)
    return { ux: Math.cos(angle), uy: Math.sin(angle) }
  }

  const shift = (stack: StackInput, ux: number, uy: number, distance: number) => {
    const current = position.get(stack.index)!
    const travelled = Math.hypot(current.x - stack.x, current.y - stack.y)
    const room = Math.max(0, maxNudge - travelled)
    const step = Math.min(distance, room)
    if (step <= 0.5) return false
    current.x = clampX(current.x + ux * step)
    current.y = clampY(current.y + uy * step)
    return true
  }

  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < stacks.length; i++) {
      for (let j = i + 1; j < stacks.length; j++) {
        const a = stacks[i]
        const b = stacks[j]
        const pa = position.get(a.index)!
        const pb = position.get(b.index)!
        const boxA = boxAt(a, pa.x, pa.y)
        const boxB = boxAt(b, pb.x, pb.y)
        if (!overlaps(boxA, boxB)) continue
        /* the one already further out gives way first: the inner stack keeps
           the position closest to its own truth */
        const outer =
          Math.hypot(pa.x - centreX, pa.y - centreY) >= Math.hypot(pb.x - centreX, pb.y - centreY)
            ? a
            : b
        const inner = outer === a ? b : a
        const outerBox = outer === a ? boxA : boxB
        const innerBox = outer === a ? boxB : boxA
        const { ux, uy } = radial(outer)
        const radialDistance = separationAlong(outerBox, innerBox, ux, uy)
        /* Radial is the preference, not the rule. Two stacks on nearly the
           same ray out of the centroid barely separate along it — every pixel
           of budget buys almost no gap — and NZ's four anchors are exactly
           that case. So the pair's own axis is measured too, and when radial
           costs meaningfully more, the pair opens along the axis with both
           stacks giving half. Ties stay short either way, which is the
           property that actually matters (§2.6). */
        const axisX = (outerBox.left + outerBox.right) / 2 - (innerBox.left + innerBox.right) / 2
        const axisY = (outerBox.top + outerBox.bottom) / 2 - (innerBox.top + innerBox.bottom) / 2
        const axisLength = Math.hypot(axisX, axisY)
        const ax = axisLength > 1 ? axisX / axisLength : ux
        const ay = axisLength > 1 ? axisY / axisLength : uy
        const axisDistance = separationAlong(outerBox, innerBox, ax, ay)
        if (radialDistance > 0 && radialDistance <= axisDistance * 1.6) {
          if (shift(outer, ux, uy, radialDistance)) {
            moved = true
            continue
          }
        }
        const half = axisDistance / 2
        const movedOuter = shift(outer, ax, ay, half)
        const movedInner = shift(inner, -ax, -ay, half)
        if (movedOuter || movedInner) {
          moved = true
          continue
        }
        /* both are out of budget on the axis: spend whatever radial room is
           left rather than leaving two prints welded together */
        const back = radial(inner)
        if (
          shift(outer, ux, uy, radialDistance) ||
          shift(inner, back.ux, back.uy, separationAlong(innerBox, outerBox, back.ux, back.uy))
        ) {
          moved = true
        }
      }
    }
    /* fixed furniture: the title band, the ← world control, and (on the second
       pass) the placed sheet. A stack leaves these straight down or straight up,
       whichever is nearer — a radial push here would send captions into the
       title from below. */
    for (const stack of stacks) {
      const current = position.get(stack.index)!
      const box = boxAt(stack, current.x, current.y)
      for (const obstacle of obstacles) {
        if (!overlaps(box, obstacle)) continue
        const down = obstacle.bottom - box.top + PUSH_SLACK
        const up = box.bottom - obstacle.top + PUSH_SLACK
        const right = obstacle.right - box.left + PUSH_SLACK
        const leftward = box.right - obstacle.left + PUSH_SLACK
        const options: [number, number, number][] = [
          [down, 0, 1],
          [up, 0, -1],
          [right, 1, 0],
          [leftward, -1, 0],
        ]
        options.sort((a, b) => a[0] - b[0])
        for (const [distance, ux, uy] of options) {
          if (shift(stack, ux, uy, distance)) {
            moved = true
            break
          }
        }
      }
    }
    if (!moved) break
  }
}

const sheetMetrics = (frames: number, frameH: number, available: number) => {
  const frameW = frameH * 1.5
  /* Five is a maximum, not a quota. On a table wide enough (every desktop
     viewport) fifteen frames lay out 5 × 3 exactly as §6 draws them; on a
     phone, where five 3:2 frames cannot physically fit across, the same object
     wraps sooner rather than not existing. One formula, no per-count cases. */
  const fits = Math.floor((available - SHEET_PAD * 2 + SHEET_GAP) / (frameW + SHEET_GAP))
  const cols = Math.max(1, Math.min(SHEET_MAX_COLS, frames, Math.max(1, fits)))
  const rows = Math.max(1, Math.ceil(frames / cols))
  return {
    cols,
    rows,
    frameH,
    frameW,
    width: cols * frameW + (cols - 1) * SHEET_GAP + SHEET_PAD * 2,
    height: rows * (frameH + SHEET_INDEX_ROW) + (rows - 1) * SHEET_GAP + SHEET_PAD * 2,
  }
}

/**
 * The sheet's rectangle. A coarse scan, scored — small enough to run in a
 * ticker frame, dense enough that the answer does not depend on where the
 * stacks happen to have landed to the pixel.
 *
 * Preference order, encoded in the score rather than in branches: a placement
 * that needs nobody to move beats one that does; nearer its own stack beats
 * further; the free left third beats the middle of the table (§5's "the third
 * v1 left empty"); more air around it beats less.
 */
function placeSheet(
  input: PlateLayoutInput,
  owner: StackInput,
  ownerPosition: { x: number; y: number },
  stacks: StackInput[],
  position: Map<number, { x: number; y: number }>,
  frameH: number,
  maxNudge: number
) {
  const margin = 14
  const metrics = sheetMetrics(input.sheetFrames, frameH, input.width - margin * 2)
  const minLeft = margin
  const maxLeft = input.width - margin - metrics.width
  const minTop = Math.max(margin, input.safeTop)
  const maxTop = input.safeBottom - metrics.height
  if (maxLeft < minLeft || maxTop < minTop) return null

  const fixed: Box[] = input.titleBand ? [inflate(input.titleBand, SHEET_CLEARANCE)] : []
  const stackBoxes = stacks.map((stack) => {
    const at = position.get(stack.index)!
    return { stack, box: inflate(boxAt(stack, at.x, at.y), SHEET_CLEARANCE) }
  })

  const stepX = Math.max(18, (maxLeft - minLeft) / 24)
  const stepY = Math.max(18, (maxTop - minTop) / 18)
  const leftThird = input.width * 0.38

  let best: {
    left: number
    top: number
    score: number
    pushes: Map<number, { dx: number; dy: number }>
  } | null = null
  let fallback: { left: number; top: number; score: number } | null = null

  for (let top = minTop; top <= maxTop + 0.5; top += stepY) {
    for (let left = minLeft; left <= maxLeft + 0.5; left += stepX) {
      const rect: Box = {
        left,
        top,
        right: left + metrics.width,
        bottom: top + metrics.height,
      }
      if (fixed.some((band) => overlaps(rect, band))) continue

      /* what this placement would cost the stacks standing in it. The owner is
         never moved: a sheet that shoves its own stack out of the way has lost
         the thread it is supposed to be tied to. */
      let pushTotal = 0
      let feasible = true
      const pushes = new Map<number, { dx: number; dy: number }>()
      let overlapTotal = 0
      for (const { stack, box } of stackBoxes) {
        if (!overlaps(rect, box)) continue
        overlapTotal += overlapArea(rect, box)
        if (stack.index === owner.index) {
          /* the sheet does not shove its own stack out of the way: the thread
             it is tied to would be the thing it displaced */
          feasible = false
          continue
        }
        const push = escapePush(stack, position.get(stack.index)!, rect, input, maxNudge)
        if (!push) {
          feasible = false
          continue
        }
        pushTotal += push.distance
        pushes.set(stack.index, { dx: push.dx, dy: push.dy })
      }

      const centreX = left + metrics.width / 2
      const centreY = top + metrics.height / 2
      const adjacency = Math.hypot(centreX - ownerPosition.x, centreY - ownerPosition.y)
      const clearance = stackBoxes.reduce(
        (least, { box }) => Math.min(least, boxGap(rect, box)),
        Number.POSITIVE_INFINITY
      )
      const air = Number.isFinite(clearance) ? Math.min(clearance, 140) : 140
      const inLeftThird = rect.right <= leftThird
      const score =
        adjacency + pushTotal * 2.2 - air * 0.5 - (inLeftThird ? input.width * 0.22 : 0)

      if (feasible) {
        if (!best || score < best.score) best = { left, top, score, pushes }
      } else {
        const violationScore = overlapTotal + adjacency * 0.2
        if (!fallback || violationScore < fallback.score) {
          fallback = { left, top, score: violationScore }
        }
      }
    }
  }

  if (best) {
    return { metrics, left: best.left, top: best.top, pushes: best.pushes, violated: false }
  }
  if (fallback) {
    return {
      metrics,
      left: fallback.left,
      top: fallback.top,
      pushes: new Map<number, { dx: number; dy: number }>(),
      violated: true,
    }
  }
  return null
}

/** the sheet corner nearest the anchor it belongs to — the leader line's start */
const nearestCorner = (rect: Box, x: number, y: number) => ({
  x: Math.abs(rect.left - x) <= Math.abs(rect.right - x) ? rect.left : rect.right,
  y: Math.abs(rect.top - y) <= Math.abs(rect.bottom - y) ? rect.top : rect.bottom,
})

export function solvePlateLayout(input: PlateLayoutInput): PlateLayout {
  const stacks = input.stacks
  const nudges = new Map<number, { dx: number; dy: number }>()
  const ties: TieMark[] = []
  if (stacks.length === 0) return { nudges, ties, sheet: null }

  const maxNudge = MAX_NUDGE_FACTOR * Math.min(input.width, input.height)
  const position = new Map(stacks.map((stack) => [stack.index, { x: stack.x, y: stack.y }]))
  const fixedBoxes: Box[] = input.titleBand ? [input.titleBand] : []

  // pass 1: stacks against each other and against the title band
  relax(stacks, position, fixedBoxes, input, maxNudge)

  // pass 2: the sheet, placed against the decluttered table
  let sheet: SheetPlacement | null = null
  const owner = input.sheetOwner === null
    ? undefined
    : stacks.find((stack) => stack.index === input.sheetOwner)
  if (owner && input.sheetFrames > 0) {
    const ownerPosition = position.get(owner.index)!
    let placed = placeSheet(
      input,
      owner,
      ownerPosition,
      stacks,
      position,
      input.height * SHEET_FRAME_VH,
      maxNudge
    )
    let shrunk = false
    if (!placed || placed.violated) {
      /* §9.2, said as code: the frames come down a size before the sheet is
         allowed to sit on someone else's print or caption. */
      const smaller = placeSheet(
        input,
        owner,
        ownerPosition,
        stacks,
        position,
        input.height * SHEET_FRAME_VH_SHRUNK,
        maxNudge
      )
      if (smaller && (!placed || !smaller.violated)) {
        placed = smaller
        shrunk = true
      }
    }
    if (placed) {
      const rect: Box = {
        left: placed.left,
        top: placed.top,
        right: placed.left + placed.metrics.width,
        bottom: placed.top + placed.metrics.height,
      }
      /* the stacks the sheet displaces move first — by exactly the push the
         placement was priced on — then the whole table settles again with the
         sheet nailed down as furniture */
      for (const [index, push] of placed.pushes) {
        const at = position.get(index)!
        at.x += push.dx
        at.y += push.dy
      }
      relax(stacks, position, [...fixedBoxes, inflate(rect, SHEET_CLEARANCE)], input, maxNudge)

      const corner = nearestCorner(rect, ownerPosition.x, ownerPosition.y)
      const settledOwner = position.get(owner.index)!
      sheet = {
        left: rect.left,
        top: rect.top,
        width: placed.metrics.width,
        height: placed.metrics.height,
        frameH: placed.metrics.frameH,
        cols: placed.metrics.cols,
        rows: placed.metrics.rows,
        shrunk,
        violated: placed.violated,
        leader: { x1: corner.x, y1: corner.y, x2: settledOwner.x, y2: settledOwner.y },
      }
    }
  }

  // the marks: what moved, and what has a mark to be tied back to
  for (const stack of stacks) {
    const at = position.get(stack.index)!
    const dx = at.x - stack.x
    const dy = at.y - stack.y
    nudges.set(stack.index, { dx, dy })
    const displaced = Math.hypot(dx, dy) >= TIE_MIN
    const hasMark = TIED_PRECISION.includes(stack.precision)
    if (!displaced && !hasMark) continue
    /* The tie runs from the stack's FOOT — the bottom centre of the print,
       where the pin dot and stalk stand — back to the anchor it was moved off.
       Its length is the displacement itself, which is the whole claim: this
       pile is here, what it says is over there. Drawing from the nearest box
       edge instead would collapse to nothing whenever the anchor stayed inside
       the (much wider) caption box, which is exactly when a tie is needed. */
    if (Math.hypot(dx, dy) < 3) continue
    ties.push({ index: stack.index, x1: at.x, y1: at.y, x2: stack.x, y2: stack.y })
  }

  return { nudges, ties, sheet }
}
