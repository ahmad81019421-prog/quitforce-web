import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Eraser, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * SignaturePad
 *
 * A high-fidelity signature canvas used at Onboarding to seal the user's
 * commitment contract. Replaces the original naive canvas which had:
 *  - blurry rendering on Retina/HiDPI screens (no DPR scaling)
 *  - jagged lines (only lineTo, no smoothing)
 *  - no clear button, no "did they actually sign?" check
 *  - leaky touch handling on mobile (page scrolled under the finger)
 *
 * Improvements:
 *  - devicePixelRatio aware → crisp on every screen
 *  - Pointer Events (mouse + touch + stylus unified)
 *  - quadraticCurveTo between midpoints → smooth strokes
 *  - exposes a `hasSignature` flag so the parent can disable "confirm"
 *    until a real signature exists
 *  - onChange(dataUrl) hands back a PNG ready to save into Firestore
 *    as the signed commitment contract.
 */
export default function SignaturePad({ onChange, height = 180 }) {
  const { t } = useTranslation()
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const drawing = useRef(false)
  const points = useRef([])        // points in the current stroke
  const totalPoints = useRef(0)    // cumulative across all strokes
  const [hasSignature, setHasSignature] = useState(false)

  // ── DPR-aware canvas setup ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#FFD700'
    ctx.shadowColor = 'rgba(255, 215, 0, 0.45)'
    ctx.shadowBlur = 6
    ctxRef.current = ctx
  }, [height])

  const getPos = (e) => ({
    x: e.clientX - canvasRef.current.getBoundingClientRect().left,
    y: e.clientY - canvasRef.current.getBoundingClientRect().top,
    pressure: typeof e.pressure === 'number' ? e.pressure : 0.5
  })

  const handlePointerDown = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    drawing.current = true
    const pos = getPos(e)
    points.current = [pos]

    const ctx = ctxRef.current
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const handlePointerMove = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const pos = getPos(e)
    points.current.push(pos)

    const ctx = ctxRef.current
    const pts = points.current
    const last = pts[pts.length - 2]
    if (!last) return

    // Smoothing: draw a quadratic curve to the midpoint of the
    // last two points, using the previous point as the control.
    const mid = { x: (last.x + pos.x) / 2, y: (last.y + pos.y) / 2 }
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
    ctx.stroke()
  }

  const handlePointerUp = (e) => {
    if (!drawing.current) return
    drawing.current = false
    totalPoints.current += points.current.length
    points.current = []

    // Require at least 25 captured points before we consider the
    // signature valid — blocks single taps / accidental scribbles.
    if (totalPoints.current >= 25) {
      if (!hasSignature) setHasSignature(true)
      onChange?.(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    points.current = []
    totalPoints.current = 0
    setHasSignature(false)
    onChange?.(null)
  }, [onChange])

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] touch-none cursor-crosshair"
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!hasSignature && (
          <span className="absolute inset-0 flex items-center justify-center text-white/20 text-sm pointer-events-none select-none">
            {t('onboarding.signHerePlaceholder')}
          </span>
        )}
        {hasSignature && (
          <motion.span
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="absolute -right-1 -bottom-1 text-mint border-2 border-mint rounded-full px-2 py-0.5 text-[10px] font-bold"
          >
            {new Date().toLocaleDateString()}
          </motion.span>
        )}
      </div>

      <div className="flex justify-between items-center mt-2">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors"
        >
          <Eraser size={14} /> {t('onboarding.clearSignature')}
        </button>
        {hasSignature && (
          <span className="flex items-center gap-1 text-xs text-mint">
            <Check size={14} /> {t('onboarding.signatureCaptured')}
          </span>
        )}
      </div>
    </div>
  )
}
