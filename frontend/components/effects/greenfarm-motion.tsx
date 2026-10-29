'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'

type SplitTextProps = {
  text: string
  effect?: 'rise'
  hoverEffect?: 'wave' | 'none'
  className?: string
}

export function SplitText({
  text,
  effect = 'rise',
  hoverEffect = 'none',
  className = '',
}: SplitTextProps) {
  const reduceMotion = useReducedMotion()

  return (
    <span
      aria-label={text}
      className={`split-text ${hoverEffect === 'wave' ? 'split-text--wave' : ''} ${className}`}
    >
      <span aria-hidden="true">
        {Array.from(text).map((character, index) => (
          <motion.span
            key={`${character}-${index}`}
            className="split-text__character"
            initial={reduceMotion ? false : { opacity: 0, y: effect === 'rise' ? 16 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: reduceMotion ? 0 : index * 0.018 }}
            style={{ ['--character-index' as string]: index }}
          >
            {character === ' ' ? '\u00a0' : character}
          </motion.span>
        ))}
      </span>
    </span>
  )
}

type CountUpProps = {
  to: number
  mode?: 'roll'
  suffix?: string
  decimals?: number
  className?: string
}

export function CountUp({
  to,
  mode = 'roll',
  suffix = '',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(reduceMotion ? to : 0)

  useEffect(() => {
    if (reduceMotion) {
      setValue(to)
      return
    }

    let frame = 0
    const started = performance.now()
    const duration = 850
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - (1 - progress) ** 4
      setValue(to * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduceMotion, to])

  return (
    <motion.span
      key={`${to}-${mode}`}
      className={`count-roll ${className}`}
      initial={reduceMotion ? false : { y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      aria-label={`${to.toLocaleString('vi-VN', { maximumFractionDigits: decimals })}${suffix}`}
    >
      {value.toLocaleString('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix && <span className="ml-1 text-sm font-medium">{suffix}</span>}
    </motion.span>
  )
}

type StarBorderProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
}

export function StarBorder({ children, className = '', ...props }: StarBorderProps) {
  return (
    <button className={`star-border ${className}`} {...props}>
      <span className="star-border__content">{children}</span>
    </button>
  )
}

type ThoughtLineProps = {
  working: boolean
  steps: string[]
  label?: string
}

export function ThoughtLine({
  working,
  steps,
  label = 'Đang phân tích dữ liệu canh tác',
}: ThoughtLineProps) {
  const reduceMotion = useReducedMotion()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!working) return
    const started = performance.now()
    setElapsed(0)
    const timer = window.setInterval(
      () => setElapsed((performance.now() - started) / 1000),
      100,
    )
    return () => window.clearInterval(timer)
  }, [working])

  return (
    <section
      className="thought-line"
      aria-live="polite"
      aria-label={working ? `${label}, ${elapsed.toFixed(1)} giây` : 'Đã hoàn tất phân tích'}
    >
      <div className="flex items-center gap-3">
        <span className={`thought-line__glyph ${working && !reduceMotion ? 'is-working' : ''}`}>
          ◌
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {working ? label : 'Đã hoàn tất'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {elapsed.toFixed(1)}s · Đối chiếu với dữ liệu trang trại
          </p>
        </div>
      </div>
      {steps.length > 0 && (
        <ol className="thought-line__steps mt-3 space-y-1.5">
          {steps.map((step, index) => (
            <li key={`${step}-${index}`} className="flex items-center gap-2 text-xs">
              <span className="thought-line__step-dot" aria-hidden="true" />
              {step}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

type SegmentItem = { value: string; label: string }

type RubberSegmentProps = {
  items: SegmentItem[]
  value: string
  onChange: (value: string) => void
  label: string
}

export function RubberSegment({ items, value, onChange, label }: RubberSegmentProps) {
  const index = Math.max(0, items.findIndex((item) => item.value === value))
  return (
    <div
      className="rubber-segment"
      role="tablist"
      aria-label={label}
      style={{ ['--segment-count' as string]: items.length }}
    >
      <motion.span
        className="rubber-segment__thumb pointer-events-none"
        aria-hidden="true"
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'spring', stiffness: 430, damping: 34 }}
      />
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className="rubber-segment__item"
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

type GlideSelectProps = {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}

export function GlideSelect({
  options,
  value,
  onChange,
  label,
  className = '',
}: GlideSelectProps) {
  return (
    <span className={`glide-select ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="glide-select__icon" aria-hidden="true" />
    </span>
  )
}

type MenuItem = { href: string; label: string; description: string }

export function StaggeredMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label={open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="staggered-menu"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Điều hướng GreenFarm"
          >
            <button
              type="button"
              className="staggered-menu__scrim"
              aria-label="Đóng menu"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              className="staggered-menu__panel"
              initial={reduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-7 text-lg font-bold text-white">GreenFarm AI</p>
              <div className="space-y-1">
                {items.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={reduceMotion ? false : { opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.24,
                      delay: reduceMotion ? 0 : index * 0.035,
                    }}
                  >
                    <Link
                      href={item.href}
                      prefetch={false}
                      onNavigate={() => setOpen(false)}
                      className="staggered-menu__link"
                    >
                      <span>
                        <span className="block font-semibold">{item.label}</span>
                        <span className="mt-1 block text-xs text-white/55">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
