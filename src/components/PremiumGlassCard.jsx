import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useStage } from '../hooks/useStage'

/**
 * PremiumGlassCard
 *
 * The base visual unit of QuitForce. A frosted glass panel whose
 * ambient glow color follows the user's current recovery stage
 * (early / progress / freedom) unless `glow` is explicitly overridden
 * — used by Craving Guard to force a danger/success glow regardless
 * of the user's actual stage.
 *
 * Props:
 *  - glow: 'stage' (default) | 'danger' | 'success' | 'none'
 *  - interactive: adds hover-tilt + cursor affordance
 *  - padding: tailwind padding class override
 */
export default function PremiumGlassCard({
  children,
  glow = 'stage',
  interactive = false,
  padding = 'p-6',
  className,
  as: Component = motion.div,
  ...rest
}) {
  const { tokens } = useStage()

  const glowColor =
    glow === 'danger' ? '#FF3B30' :
    glow === 'success' ? '#30D158' :
    glow === 'none' ? 'transparent' :
    tokens.color

  return (
    <Component
      className={clsx(
        'relative rounded-3xl border border-white/10',
        'bg-white/[0.04] backdrop-blur-2xl',
        padding,
        interactive && 'cursor-pointer transition-transform will-change-transform hover:-translate-y-0.5',
        className
      )}
      style={{
        boxShadow: glow === 'none'
          ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
          : `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px -22px ${glowColor}`
      }}
      whileHover={interactive ? { scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 180, damping: 12 }}
      {...rest}
    >
      {/* top hairline glow accent, tints with stage color */}
      {glow !== 'none' && (
        <span
          aria-hidden
          className="absolute inset-x-6 top-0 h-px opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
        />
      )}
      {children}
    </Component>
  )
}
