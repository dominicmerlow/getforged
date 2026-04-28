'use client'

import { useActionState } from 'react'
import {
  adminToggleVerified,
  adminGrantRole,
  adminRevokeRole,
  adminSendMagicLink,
  type UserActionResult,
} from './actions'
import { ALL_ROLES, type UserRole } from '@/lib/admin'

interface Props {
  userId: string
  email: string | null
  sellerId: string | null
  sellerVerified: boolean
  currentRoles: UserRole[]
}

/**
 * Inline action cluster for one user row in the /admin/users table.
 * Each action has its own `useActionState` hook so they don't fight over a
 * shared state object — clearer per-button feedback.
 */
export default function UserRowActions({
  userId,
  email,
  sellerId,
  sellerVerified,
  currentRoles,
}: Props) {
  const [verifyState, verifyAction, verifyPending] = useActionState<UserActionResult, FormData>(
    adminToggleVerified,
    null
  )
  const [grantState, grantAction, grantPending] = useActionState<UserActionResult, FormData>(
    adminGrantRole,
    null
  )
  const [revokeState, revokeAction, revokePending] = useActionState<UserActionResult, FormData>(
    adminRevokeRole,
    null
  )
  const [linkState, linkAction, linkPending] = useActionState<UserActionResult, FormData>(
    adminSendMagicLink,
    null
  )

  const lastResult = verifyState ?? grantState ?? revokeState ?? linkState
  const message =
    (lastResult && 'ok' in lastResult ? lastResult.message : null) ??
    (lastResult && 'error' in lastResult ? `⚠ ${lastResult.error}` : null)

  const btnGhost: React.CSSProperties = {
    padding: '4px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    background: 'transparent',
    border: '1px solid rgba(42,39,32,0.3)',
    color: 'var(--ink, #2a2217)',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Verify toggle (only sellers have this) */}
        {sellerId && (
          <form action={verifyAction} style={{ display: 'inline' }}>
            <input type="hidden" name="seller_id" value={sellerId} />
            <input type="hidden" name="verified" value={(!sellerVerified).toString()} />
            <button type="submit" disabled={verifyPending} style={{
              ...btnGhost,
              borderColor: sellerVerified ? '#3fa85a' : 'rgba(42,39,32,0.3)',
              color: sellerVerified ? '#3fa85a' : 'inherit',
            }}>
              {verifyPending ? '…' : sellerVerified ? '✓ Verified' : 'Verify'}
            </button>
          </form>
        )}

        {/* Send magic link */}
        {email && (
          <form action={linkAction} style={{ display: 'inline' }}>
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={linkPending} style={btnGhost}>
              {linkPending ? '…' : 'Magic link'}
            </button>
          </form>
        )}
      </div>

      {/* Role grant/revoke — one button per role */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {ALL_ROLES.map(role => {
          const has = currentRoles.includes(role)
          const formAction = has ? revokeAction : grantAction
          const pending = has ? revokePending : grantPending
          return (
            <form key={role} action={formAction} style={{ display: 'inline' }}>
              <input type="hidden" name="user_id" value={userId} />
              <input type="hidden" name="role" value={role} />
              <button type="submit" disabled={pending} style={{
                padding: '3px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: has ? roleColour(role) : 'transparent',
                color: has ? '#fff' : 'var(--ink, #2a2217)',
                border: `1px solid ${has ? roleColour(role) : 'rgba(42,39,32,0.3)'}`,
                cursor: 'pointer',
              }}>
                {pending ? '…' : `${has ? '−' : '+'} ${role}`}
              </button>
            </form>
          )
        })}
      </div>

      {message && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: lastResult && 'ok' in lastResult ? '#3fa85a' : '#c87d1a',
        }}>
          {message}
        </span>
      )}
    </div>
  )
}

function roleColour(role: UserRole): string {
  switch (role) {
    case 'superadmin': return '#7e22ce'
    case 'admin': return '#1d4ed8'
    case 'moderator': return '#3fa85a'
    case 'support': return '#b97314'
  }
}
