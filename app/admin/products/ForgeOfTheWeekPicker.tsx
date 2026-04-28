'use client'

import { useActionState, useState } from 'react'
import { adminSetForgeOfTheWeek, type BulkResult } from './actions'

interface Props {
  products: Array<{ id: string; title: string; slug: string | null; forge_of_the_week: boolean }>
}

/**
 * Inline picker for the Forge of the Week — exclusive flag, at most one
 * product holds it. Shown at the top of /admin/products.
 *
 * Submitting "none" clears the current pick.
 */
export default function ForgeOfTheWeekPicker({ products }: Props) {
  const current = products.find(p => p.forge_of_the_week)
  const [selected, setSelected] = useState<string>(current?.id ?? 'none')
  const [state, action, pending] = useActionState<BulkResult | null, FormData>(
    adminSetForgeOfTheWeek,
    null
  )

  const message =
    state && 'ok' in state ? '✓ Updated' :
    state && 'error' in state ? `⚠ ${state.error}` : null

  return (
    <form action={action} style={{
      padding: 14,
      background: 'rgba(126,34,206,0.08)',
      border: '1px solid rgba(126,34,206,0.3)',
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
    }}>
      <span style={{
        padding: '2px 8px',
        background: '#7e22ce',
        color: '#fff',
        fontSize: 10,
        letterSpacing: '0.06em',
      }}>
        FoW
      </span>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        Forge of the Week:
        <select
          name="productId"
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            border: '1px solid var(--ink, #2a2217)',
            background: 'var(--paper, #fafaf5)',
            cursor: 'pointer',
          }}
        >
          <option value="none">— Cleared —</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending || selected === (current?.id ?? 'none')}
        style={{
          padding: '4px 12px',
          fontSize: 11,
          background: '#7e22ce',
          color: '#fff',
          border: 'none',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending || selected === (current?.id ?? 'none') ? 0.5 : 1,
        }}
      >
        {pending ? 'Saving…' : 'Set'}
      </button>
      {message && (
        <span style={{ color: state && 'ok' in state ? '#3fa85a' : '#c87d1a' }}>
          {message}
        </span>
      )}
    </form>
  )
}
