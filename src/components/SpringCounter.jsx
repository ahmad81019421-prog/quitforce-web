import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

/**
 * Animates a number from its previous value to `value` using spring physics
 * (stiffness 180 / damping 12, per the QuitForce motion spec), formatted
 * with `format` (defaults to fixed-point with `decimals`).
 */
export default function SpringCounter({ value, decimals = 0, prefix = '', suffix = '', className }) {
  const spring = useSpring(value, { stiffness: 180, damping: 12 })
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)

  useEffect(() => { spring.set(value) }, [value, spring])

  return (
    <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </motion.span>
  )
}
