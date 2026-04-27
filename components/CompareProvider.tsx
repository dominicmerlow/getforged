'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { track } from '@/lib/analytics'

const STORAGE_KEY = 'getforged.compare.v1'
const MAX = 3

interface CompareItem {
  slug: string
  title: string
  priceMain: string
  category: string
}

interface CompareContextValue {
  items: CompareItem[]
  has: (slug: string) => boolean
  toggle: (item: CompareItem) => void
  remove: (slug: string) => void
  clear: () => void
  /** True once we've hydrated from localStorage; before this, render nothing client-side to avoid SSR/CSR mismatch */
  hydrated: boolean
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on first client mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as CompareItem[]
        if (Array.isArray(parsed)) setItems(parsed.slice(0, MAX))
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true)
  }, [])

  // Persist on change (after hydration to avoid wiping storage on first render)
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore quota errors */
    }
  }, [items, hydrated])

  const has = useCallback((slug: string) => items.some(i => i.slug === slug), [items])

  const toggle = useCallback((item: CompareItem) => {
    setItems(prev => {
      const exists = prev.some(i => i.slug === item.slug)
      if (exists) {
        track('compare_remove', { slug: item.slug })
        return prev.filter(i => i.slug !== item.slug)
      }
      if (prev.length >= MAX) {
        // At cap — silently keep the existing 3. The UI surfaces a hint.
        return prev
      }
      track('compare_add', { slug: item.slug, count: prev.length + 1 })
      return [...prev, item]
    })
  }, [])

  const remove = useCallback((slug: string) => {
    setItems(prev => {
      track('compare_remove', { slug })
      return prev.filter(i => i.slug !== slug)
    })
  }, [])

  const clear = useCallback(() => {
    track('compare_clear', { count: items.length })
    setItems([])
  }, [items.length])

  return (
    <CompareContext.Provider value={{ items, has, toggle, remove, clear, hydrated }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used inside <CompareProvider>')
  return ctx
}

export const COMPARE_MAX = MAX
