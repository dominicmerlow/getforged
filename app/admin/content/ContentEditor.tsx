'use client'

import { useActionState, useState } from 'react'
import { saveContent, resetContent, type ContentSaveState } from './actions'
import type { ContentKind } from '@/lib/content-defaults'

interface Props {
  contentKey: string
  description: string
  kind: ContentKind
  currentValue: unknown
  defaultValue: unknown
  isOverride: boolean
}

/**
 * Inline per-key editor. Renders the right input for each kind, shows save
 * state, and exposes a "reset to default" action that deletes the override.
 *
 * Why not one giant form for all keys?
 *   - Latency: editing one heading shouldn't bust 30 cache rows
 *   - Audit: each save is one logical action with its own audit row
 *   - Optimistic UI: we can update one field's status without disturbing others
 */
export default function ContentEditor({
  contentKey,
  description,
  kind,
  currentValue,
  defaultValue,
  isOverride,
}: Props) {
  const [saveState, saveAction, savePending] = useActionState<ContentSaveState, FormData>(
    saveContent,
    null
  )
  const [resetState, resetAction, resetPending] = useActionState<ContentSaveState, FormData>(
    resetContent,
    null
  )

  // Local "uncommitted" value so the textarea reflects user typing without
  // round-tripping through the server action.
  const [draft, setDraft] = useState(stringifyForInput(currentValue, kind))

  const justSaved = saveState && 'ok' in saveState && saveState.key === contentKey
  const justReset = resetState && 'ok' in resetState && resetState.key === contentKey && resetState.reset
  const error =
    (saveState && 'error' in saveState ? saveState.error : null) ??
    (resetState && 'error' in resetState ? resetState.error : null)

  const inputBase: React.CSSProperties = {
    padding: '12px 14px',
    fontFamily: kind === 'rich' || kind === 'multiline' ? 'var(--font-serif)' : 'var(--font-mono)',
    fontSize: 14,
    border: '1px solid var(--ink, #2a2217)',
    background: 'var(--paper, #fafaf5)',
    color: 'var(--ink, #2a2217)',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{
      padding: 20,
      border: '1px solid rgba(42,39,32,0.15)',
      display: 'grid',
      gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: '#6b6b6b',
          }}>
            {contentKey}
          </div>
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
      </div>

      {/* Save form — owns the editable input. Submit triggers saveContent. */}
      <form action={saveAction} id={`save-${contentKey}`}>
        <input type="hidden" name="key" value={contentKey} />
        {renderEditor(kind, draft, setDraft, inputBase)}
      </form>

      {/*
        Action row — two SIBLING forms share the same input via the form
        attribute on the save button, then the reset button posts its own
        tiny form. Sibling forms are valid HTML; nesting forms is not.
      */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="submit"
          form={`save-${contentKey}`}
          disabled={savePending || draft === stringifyForInput(currentValue, kind)}
          style={{
            padding: '8px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
            background: 'var(--soft-amber, #b97314)',
            color: '#fff',
            border: 'none',
            cursor: savePending ? 'wait' : 'pointer',
            opacity: savePending || draft === stringifyForInput(currentValue, kind) ? 0.5 : 1,
          }}
        >
          {savePending ? 'Saving…' : 'Save'}
        </button>

        {isOverride && (
          <form action={resetAction} style={{ display: 'inline' }}>
            <input type="hidden" name="key" value={contentKey} />
            <button
              type="submit"
              disabled={resetPending}
              style={{
                padding: '8px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'transparent',
                color: 'var(--warm-ink, #2a2217)',
                border: '1px solid rgba(42,39,32,0.3)',
                cursor: resetPending ? 'wait' : 'pointer',
                opacity: resetPending ? 0.5 : 1,
              }}
            >
              {resetPending ? 'Resetting…' : 'Reset to default'}
            </button>
          </form>
        )}

        {justSaved && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3fa85a' }}>
            ✓ Saved · live in seconds
          </span>
        )}
        {justReset && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3fa85a' }}>
            ✓ Reverted to default
          </span>
        )}
        {error && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#c87d1a' }}>
            {error}
          </span>
        )}
      </div>

      {!isOverride && kind !== 'boolean' && (
        <details>
          <summary style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#6b6b6b',
            cursor: 'pointer',
          }}>
            View hardcoded default
          </summary>
          <pre style={{
            marginTop: 8,
            padding: 10,
            background: 'rgba(42,39,32,0.05)',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'var(--font-mono)',
          }}>{stringifyForInput(defaultValue, kind)}</pre>
        </details>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function stringifyForInput(value: unknown, kind: ContentKind): string {
  if (value == null) return ''
  if (kind === 'array' && Array.isArray(value)) return value.join('\n')
  if (kind === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function renderEditor(
  kind: ContentKind,
  value: string,
  setValue: (v: string) => void,
  baseStyle: React.CSSProperties
) {
  switch (kind) {
    case 'text':
      return (
        <input
          type="text"
          name="value"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={baseStyle}
        />
      )
    case 'multiline':
    case 'rich':
      return (
        <textarea
          name="value"
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={kind === 'rich' ? 4 : 3}
          style={{ ...baseStyle, lineHeight: 1.5, resize: 'vertical' }}
        />
      )
    case 'array':
      return (
        <textarea
          name="value"
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={5}
          placeholder="One item per line"
          style={{ ...baseStyle, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.5 }}
        />
      )
    case 'boolean':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="value"
            value="true"
            checked={value === 'true'}
            onChange={e => setValue(e.target.checked ? 'true' : 'false')}
          />
          Enabled
        </label>
      )
    case 'number':
      return (
        <input
          type="number"
          name="value"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={baseStyle}
        />
      )
  }
}
