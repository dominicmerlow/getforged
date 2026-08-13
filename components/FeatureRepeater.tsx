'use client'

import { useState } from 'react'

interface Row {
  title: string
  description: string
}

/**
 * Add/remove/reorder UI for the Features and Use Cases fields, replacing a
 * raw "Title | description" textarea. Serializes to a hidden input in that
 * exact same line format (one row per line, `title` or `title | description`)
 * so the server action's parseLineList() needed no changes — same trick
 * MultiSelect uses for its comma-separated hidden input.
 */
export default function FeatureRepeater({
  name,
  label,
  initial = [],
  titlePlaceholder = 'e.g. Auto invoice chasing',
  descriptionPlaceholder = 'e.g. Sends branded reminders on a schedule',
}: {
  name: string
  label: string
  initial?: Row[]
  titlePlaceholder?: string
  descriptionPlaceholder?: string
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0 ? initial : [{ title: '', description: '' }]
  )

  const serialized = rows
    .filter(r => r.title.trim())
    .map(r => (r.description.trim() ? `${r.title.trim()} | ${r.description.trim()}` : r.title.trim()))
    .join('\n')

  function update(i: number, field: keyof Row, value: string) {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }

  function remove(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function add() {
    setRows(prev => [...prev, { title: '', description: '' }])
  }

  function move(i: number, dir: -1 | 1) {
    setRows(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const fieldStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    border: '1px solid var(--ink, #2a2720)',
    background: 'var(--paper, #fafaf5)',
    color: 'var(--ink, #2a2720)',
    outline: 'none',
    width: '100%',
  }

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    border: '1px solid rgba(42,39,32,0.2)',
    background: 'transparent',
    color: 'var(--ink, #2a2720)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    lineHeight: 1,
  }

  return (
    <div>
      <input type="hidden" name={name} value={serialized} />
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{label}</div>

      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 8,
              alignItems: 'start',
              padding: 10,
              border: '1px solid rgba(42,39,32,0.1)',
            }}
          >
            <input
              type="text"
              value={row.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder={titlePlaceholder}
              aria-label={`Title for row ${i + 1}`}
              style={fieldStyle}
            />
            <input
              type="text"
              value={row.description}
              onChange={e => update(i, 'description', e.target.value)}
              placeholder={descriptionPlaceholder}
              aria-label={`Description for row ${i + 1}`}
              style={fieldStyle}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                title="Move up"
                style={{ ...iconButtonStyle, opacity: i === 0 ? 0.3 : 1, cursor: i === 0 ? 'default' : 'pointer' }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                aria-label="Move down"
                title="Move down"
                style={{ ...iconButtonStyle, opacity: i === rows.length - 1 ? 0.3 : 1, cursor: i === rows.length - 1 ? 'default' : 'pointer' }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove row ${i + 1}`}
                title="Remove"
                style={{ ...iconButtonStyle, color: '#c04a1b', borderColor: 'rgba(192,74,27,0.35)' }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        style={{
          marginTop: 10,
          padding: '8px 14px',
          border: '1px dashed rgba(42,39,32,0.3)',
          background: 'transparent',
          color: 'var(--amber, #c87d1a)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}
      >
        + Add row
      </button>
    </div>
  )
}
