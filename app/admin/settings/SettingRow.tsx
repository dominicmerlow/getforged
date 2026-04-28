'use client'

import { useActionState, useState } from 'react'
import { updateSetting, type SettingResult } from './actions'

interface Props {
  settingKey: string
  description: string
  kind: 'boolean' | 'number'
  currentValue: unknown
  isOverride: boolean
}

export default function SettingRow({ settingKey, description, kind, currentValue, isOverride }: Props) {
  const [state, action, pending] = useActionState<SettingResult, FormData>(updateSetting, null)
  const [draft, setDraft] = useState(
    kind === 'boolean'
      ? (currentValue ? 'true' : 'false')
      : String(currentValue ?? '')
  )

  const justSaved = state && 'ok' in state && state.key === settingKey
  const error = state && 'error' in state ? state.error : null

  return (
    <div style={{
      padding: 18,
      border: '1px solid rgba(42,39,32,0.15)',
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: '1 1 280px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.06em',
          color: '#6b6b6b',
        }}>{settingKey}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, marginTop: 2 }}>
          {description}
        </div>
      </div>

      {isOverride && (
        <span style={{
          padding: '2px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'var(--soft-amber, #b97314)',
          color: '#fff',
        }}>
          Custom
        </span>
      )}

      <form action={action} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="hidden" name="key" value={settingKey} />
        {kind === 'boolean' ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="value"
              value="true"
              checked={draft === 'true'}
              onChange={e => setDraft(e.target.checked ? 'true' : 'false')}
            />
            {draft === 'true' ? 'On' : 'Off'}
          </label>
        ) : (
          <input
            type="number"
            name="value"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              border: '1px solid var(--ink, #2a2217)',
              background: 'var(--paper, #fafaf5)',
              color: 'var(--ink, #2a2217)',
              outline: 'none',
              width: 100,
            }}
          />
        )}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '8px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
            background: 'var(--soft-amber, #b97314)',
            color: '#fff',
            border: 'none',
            cursor: pending ? 'wait' : 'pointer',
            opacity: pending ? 0.5 : 1,
          }}
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {justSaved && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#3fa85a' }}>✓</span>
        )}
        {error && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c87d1a' }}>{error}</span>
        )}
      </form>
    </div>
  )
}
