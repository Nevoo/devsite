import { useEffect, useRef, useState } from 'react'
import { webglAvailable } from '@/lib/webgl'
import WorldLabView from '@/components/WorldLabView'
import type { GlobePointer } from '@/canvas/Globe'
import {
  WORLD_LAB_DEFAULTS,
  type WorldLabSettings,
  type WorldPlace,
} from '@/canvas/WorldLab'

const SLIDERS: {
  key: 'heightScale' | 'keyThreshold' | 'keySoft' | 'autoSpin' | 'thickness'
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'heightScale', label: 'height', min: 0.3, max: 2.5, step: 0.05 },
  { key: 'thickness', label: 'thickness', min: 0.2, max: 3, step: 0.05 },
  { key: 'keyThreshold', label: 'key threshold', min: 0, max: 0.6, step: 0.01 },
  { key: 'keySoft', label: 'key softness', min: 0.01, max: 0.4, step: 0.01 },
  { key: 'autoSpin', label: 'auto spin', min: 0, max: 0.3, step: 0.005 },
]

/**
 * /lab/world — dev-only sandbox for the "little world" idea: stylized
 * place-images standing on a horizon planet, Animal Crossing style. Drop
 * generated cutouts into public/world-lab/, list them in manifest.json,
 * hit reload. Style templates and the workflow live in WORLD-LAB.md.
 * Drag to spin the world.
 */
export default function WorldLab() {
  const [hasWebGL] = useState(webglAvailable)
  const settingsRef = useRef<WorldLabSettings>({ ...WORLD_LAB_DEFAULTS })
  const [settings, setSettings] = useState<WorldLabSettings>({ ...WORLD_LAB_DEFAULTS })
  const [places, setPlaces] = useState<WorldPlace[]>([])
  const [generation, setGeneration] = useState(1)
  const [manifestError, setManifestError] = useState<string | null>(null)

  const spinRef = useRef(0)
  const pointerRef = useRef<GlobePointer>({ x: 0, y: 0, active: false })
  const drag = useRef({ dragging: false, lastX: 0 })

  const update = (patch: Partial<WorldLabSettings>) => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
  }

  useEffect(() => {
    let alive = true
    fetch(`/world-lab/manifest.json?v=${generation}`)
      .then((res) => {
        if (!res.ok) throw new Error(`manifest ${res.status}`)
        return res.json()
      })
      .then((data: { places: WorldPlace[] }) => {
        if (!alive) return
        setPlaces(data.places ?? [])
        setManifestError(null)
      })
      .catch((error: Error) => {
        if (alive) setManifestError(error.message)
      })
    return () => {
      alive = false
    }
  }, [generation])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current.dragging = true
    drag.current.lastX = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = pointerRef.current
    p.x = (e.clientX - rect.left) / Math.max(1, rect.width)
    p.y = (e.clientY - rect.top) / Math.max(1, rect.height)
    p.active = true
    if (drag.current.dragging) {
      spinRef.current += (e.clientX - drag.current.lastX) * 0.005
      drag.current.lastX = e.clientX
    }
  }
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current.dragging = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  const onPointerLeave = () => {
    pointerRef.current.active = false
    drag.current.dragging = false
  }

  return (
    <section className="lab">
      <div
        className="lab-stage gl-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerLeave}
      >
        {hasWebGL && (
          <WorldLabView
            settingsRef={settingsRef}
            places={places}
            generation={generation}
            spinRef={spinRef}
            pointerRef={pointerRef}
          />
        )}
      </div>

      <aside className="lab-panel" aria-label="world tuning">
        <p className="lab-panel-title">
          [ world / {places.length} places ]
        </p>

        {SLIDERS.map(({ key, label, min, max, step }) => (
          <label key={key} className="lab-row">
            <span className="lab-label">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(e) => update({ [key]: Number(e.target.value) })}
            />
            <span className="lab-value">{settings[key]}</span>
          </label>
        ))}

        <label className="lab-row">
          <span className="lab-label">dust</span>
          <input
            type="checkbox"
            checked={settings.dust}
            onChange={(e) => update({ dust: e.target.checked })}
          />
        </label>

        <label className="lab-row">
          <span className="lab-label">standee (2.5d)</span>
          <input
            type="checkbox"
            checked={settings.standee}
            onChange={(e) => update({ standee: e.target.checked })}
          />
        </label>

        <label className="lab-row">
          <span className="lab-label">face camera</span>
          <input
            type="checkbox"
            checked={settings.faceCamera}
            onChange={(e) => update({ faceCamera: e.target.checked })}
          />
        </label>

        <div className="lab-actions">
          <button
            type="button"
            className="lab-copy"
            onClick={() => setGeneration((g) => g + 1)}
          >
            reload assets
          </button>
        </div>

        {manifestError && (
          <p className="lab-panel-title">manifest error: {manifestError}</p>
        )}
        <p className="lab-panel-title">
          drop cutouts in public/world-lab/, list them in manifest.json,
          reload. templates: WORLD-LAB.md
        </p>
      </aside>
    </section>
  )
}
