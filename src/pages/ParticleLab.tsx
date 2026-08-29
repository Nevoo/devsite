import { useRef, useState } from 'react'
import { webglAvailable } from '@/lib/webgl'
import DustLabView from '@/components/DustLabView'
import {
  DUST_DEFAULTS,
  DUST_SIZES,
  type DustSettings,
} from '@/canvas/dustSettings'

type NumericKey = {
  [K in keyof DustSettings]: DustSettings[K] extends number ? K : never
}[keyof DustSettings]

const SLIDERS: { key: NumericKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'speed', label: 'speed', min: 0.05, max: 20, step: 0.05 },
  { key: 'curl', label: 'curl freq', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'focus', label: 'focus', min: 3, max: 7, step: 0.01 },
  { key: 'blur', label: 'blur', min: 0, max: 60, step: 0.5 },
  { key: 'size', label: 'base size', min: 0, max: 8, step: 0.1 },
  { key: 'density', label: 'density', min: 0.02, max: 1, step: 0.01 },
  { key: 'opacity', label: 'opacity', min: 0, max: 1, step: 0.01 },
  { key: 'condense', label: 'condense', min: 0, max: 1, step: 0.01 },
  { key: 'accent', label: 'accent frac', min: 0, max: 0.3, step: 0.005 },
  // ── rapier layer ──
  { key: 'bodies', label: 'bodies', min: 50, max: 800, step: 50 },
  { key: 'attract', label: 'attract', min: 0.02, max: 1, step: 0.02 },
  { key: 'damping', label: 'damping', min: 0.5, max: 12, step: 0.1 },
  { key: 'moteRadius', label: 'mote radius', min: 0.02, max: 0.3, step: 0.01 },
  { key: 'pointerRadius', label: 'pointer ball', min: 0.05, max: 0.8, step: 0.05 },
]

/**
 * /lab/particles — dev-only sandbox for the GPGPU curl-noise dust.
 * Sliders write into a ref the sim reads per frame (no React churn in the
 * render loop); "copy" puts the current values on the clipboard as JSON so a
 * tuned preset can be pasted straight into dustSettings.ts.
 */
export default function ParticleLab() {
  const [hasWebGL] = useState(webglAvailable)
  const settingsRef = useRef<DustSettings>({ ...DUST_DEFAULTS })
  const [settings, setSettings] = useState<DustSettings>({ ...DUST_DEFAULTS })
  const [size, setSize] = useState<number>(128)
  const [copied, setCopied] = useState(false)

  const update = (patch: Partial<DustSettings>) => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
  }

  const copyPreset = async () => {
    const preset = { ...settingsRef.current, textureSize: size }
    try {
      await navigator.clipboard.writeText(JSON.stringify(preset, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard needs a secure context; the readout stays on screen anyway */
    }
  }

  return (
    <section className="lab">
      <div className="lab-stage gl-frame">
        {hasWebGL && (
          <DustLabView
            settingsRef={settingsRef}
            size={size}
            bodies={settings.bodies}
          />
        )}
      </div>

      <aside className="lab-panel" aria-label="particle tuning">
        <p className="lab-panel-title">
          [ dust / {size * size} particles ]
        </p>

        <div className="lab-row">
          <span className="lab-label">texture</span>
          <div className="lab-sizes">
            {DUST_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={s === size ? 'lab-size is-active' : 'lab-size'}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

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
          <span className="lab-label">additive</span>
          <input
            type="checkbox"
            checked={settings.additive}
            onChange={(e) => update({ additive: e.target.checked })}
          />
        </label>

        <div className="lab-actions">
          <button type="button" className="lab-copy" onClick={copyPreset}>
            {copied ? 'copied' : 'copy preset'}
          </button>
          <button
            type="button"
            className="lab-copy"
            onClick={() => update({ ...DUST_DEFAULTS })}
          >
            reset
          </button>
        </div>
      </aside>
    </section>
  )
}
