'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  /** `lg` is the hero variant — taller field, used once per page */
  size?: 'md' | 'lg'
  placeholder?: string
  defaultValue?: string
  /** Labels the field for screen readers; each instance on a page needs its own */
  id?: string
}

/**
 * The marketplace's primary call to action.
 *
 * On a directory the search field *is* the conversion event, so it submits as a
 * real form: Enter works, the button is a submit, and the result is a normal
 * navigation to /browse?q= rather than client-side state. That keeps the query
 * shareable, back-button-able, and indexable.
 */
export default function SearchBar({
  size = 'md',
  placeholder = 'What do you need built?',
  defaultValue = '',
  id = 'gf-search',
}: SearchBarProps) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  return (
    <form
      className={`gf-search${size === 'lg' ? ' gf-search-lg' : ''}`}
      onSubmit={submit}
      role="search"
    >
      <label htmlFor={id} className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        Search the marketplace
      </label>
      <input
        id={id}
        type="search"
        className="gf-search-input"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="gf-search-btn" aria-label="Search">
        <Search size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  )
}
