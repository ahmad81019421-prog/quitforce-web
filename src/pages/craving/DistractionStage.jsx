import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useStage } from '../../hooks/useStage'

const SHAPES = ['●', '▲', '■', '◆']
const ROUND_SECONDS = 20

function randomGrid(target) {
  const grid = Array.from({ length: 9 }, () => SHAPES[Math.floor(Math.random() * SHAPES.length)])
  // guarantee at least one match exists
  grid[Math.floor(Math.random() * grid.length)] = target
  return grid
}

export default function DistractionStage({ onComplete }) {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const [target] = useState(SHAPES[Math.floor(Math.random() * SHAPES.length)])
  const [grid, setGrid] = useState(() => randomGrid(target))
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)

  // Keep latest onComplete in a ref so the countdown effect below doesn't
  // reset every time the parent re-renders a new `next` closure. Without
  // this, StrictMode + re-renders could fire onComplete multiple times.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    if (timeLeft <= 0) {
      onCompleteRef.current?.()
      return
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft])

  function handleTap(i) {
    if (grid[i] === target) {
      setScore((s) => s + 1)
      setGrid(randomGrid(target))
    } else {
      setGrid(randomGrid(target))
    }
  }

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6">
      <p className="text-white font-display text-lg text-center">{t('craving.distractTitle')}</p>
      <p className="text-white/40 text-sm mt-1 text-center max-w-xs mb-2">{t('craving.distractSub')}</p>

      <div className="flex items-center gap-6 mb-6 font-num text-sm text-white/60">
        <span>{t('craving.score')}: <span className="text-white">{score}</span></span>
        <span>{t('craving.timeLeft')}: <span className="text-white">{timeLeft}s</span></span>
      </div>

      <div
        className="text-3xl w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-6"
        style={{ color: tokens.color, borderColor: tokens.color }}
      >
        {target}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {grid.map((shape, i) => (
            <motion.button
              key={`${i}-${shape}-${score}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              onClick={() => handleTap(i)}
              className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 text-2xl text-white/80 hover:border-white/30"
            >
              {shape}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
