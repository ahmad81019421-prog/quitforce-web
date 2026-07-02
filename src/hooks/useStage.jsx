import { createContext, useContext, useEffect, useState } from 'react'

const StageContext = createContext(null)

// Stage is derived from smoke-free streak length, but can be overridden
// (e.g. while previewing Craving Guard "Loss Preview").
export function deriveStage(streakDays) {
  if (streakDays >= 30) return 'freedom'
  if (streakDays >= 7) return 'progress'
  return 'early'
}

export const STAGE_TOKENS = {
  early:    { color: '#FF3B30', dim: '#7A1410', label: { en: 'Early Stage', ar: 'مرحلة البداية' } },
  progress: { color: '#BF5AF2', dim: '#4B1A66', label: { en: 'Progress Stage', ar: 'مرحلة التقدّم' } },
  freedom:  { color: '#FFD700', dim: '#6B5800', label: { en: 'Freedom Stage', ar: 'مرحلة الحرية' } }
}

export function StageProvider({ streakDays: initialStreakDays = 0, children }) {
  const [streakDays, setStreakDays] = useState(initialStreakDays)
  const stage = deriveStage(streakDays)

  useEffect(() => {
    document.documentElement.setAttribute('data-stage', stage)
  }, [stage])

  return (
    <StageContext.Provider value={{ stage, streakDays, setStreakDays, tokens: STAGE_TOKENS[stage] }}>
      {children}
    </StageContext.Provider>
  )
}

export function useStage() {
  const ctx = useContext(StageContext)
  if (!ctx) throw new Error('useStage must be used inside a StageProvider')
  return ctx
}
