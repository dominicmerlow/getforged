'use client'

import { useMemo, useState } from 'react'

// A lightweight multi-select with a free-text "add your own" option.
// Stores values as comma-separated string in a hidden input, so it Just
// Works inside server-action <form> submissions — no React Hook Form needed.
export default function MultiSelect({
  name,
  label,
  options,
  initial = [],
  allowCustom = true,
  placeholder = 'Pick options…',
}: {
  name: string
  label: string
  options: readonly string[]
  initial?: string[]
  allowCustom?: boolean
  placeholder?: string
}) {
  const [selected, setSelected] = useState<string[]>(
    initial.map(s => s.trim()).filter(Boolean)
  )
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)

  const allOptions = useMemo(() => {
    const set = new Set<string>()
    for (const o of options) set.add(o)
    for (const s of selected) set.add(s)
    return Array.from(set).sort()
  }, [options, selected])

  const filtered = draft
    ? allOptions.filter(o => o.toLowerCase().includes(draft.toLowerCase()))
    : allOptions

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    )
  }

  const addCustom = () => {
    const v = draft.trim()
    if (v && !selected.includes(v)) {
      setSelected([...selected, v])
    }
    setDraft('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <input type="hidden" name={name} value={selected.join(',')} />
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        {label}
      </div>

      {/* Chips of selected values */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 10,
          minHeight: 44,
          border: '1px solid var(--ink, #2a2720)',
          background: 'var(--paper, #fafaf5)',
          cursor: 'text',
        }}
        onClick={() => setOpen(true)}
      >
        {selected.map(v => (
          <span
            key={v}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--amber, #c87d1a)',
              color: 'var(--paper, #fafaf5)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              borderRadius: 2,
            }}
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggle(v)
              }}
              aria-label={`Remove ${v}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          placeholder={selected.length === 0 ? placeholder : ''}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setDraft(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && allowCustom) {
              e.preventDefault()
              addCustom()
            }
            if (e.key === 'Backspace' && !draft && selected.length > 0) {
              setSelected(selected.slice(0, -1))
            }
          }}
          style={{
            flex: 1,
            minWidth: 120,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--ink, #2a2720)',
          }}
        />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid var(--ink, #2a2720)',
            background: 'var(--paper, #fafaf5)',
            zIndex: 20,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {filtered.length === 0 && !allowCustom && (
            <div style={{ padding: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b' }}>
              No options
            </div>
          )}
          {filtered.map(opt => {
            const isOn = selected.includes(opt)
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  background: isOn ? 'rgba(200,125,26,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(42,39,32,0.08)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--ink, #2a2720)',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '1px solid var(--ink, #2a2720)',
                    background: isOn ? 'var(--amber, #c87d1a)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                {opt}
              </button>
            )
          })}
          {allowCustom && draft.trim() && !filtered.some(o => o.toLowerCase() === draft.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={addCustom}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderTop: '1px dashed rgba(42,39,32,0.2)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--amber, #c87d1a)',
                textAlign: 'left',
              }}
            >
              + Add &quot;{draft.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
