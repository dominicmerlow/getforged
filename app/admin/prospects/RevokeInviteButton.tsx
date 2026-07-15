'use client'

import { useActionState } from 'react'
import { revokeInvite, type RevokeState } from './actions'

export default function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [state, action, pending] = useActionState<RevokeState, FormData>(revokeInvite, null)
  const revoked = state && 'ok' in state && state.ok

  if (revoked) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warm-muted, #8a7d69)' }}>Revoked</span>
  }

  return (
    <form action={action}>
      <input type="hidden" name="invite_id" value={inviteId} />
      <button
        type="submit"
        disabled={pending}
        className="btn-ghost"
        style={{ padding: '4px 10px', fontSize: 11, cursor: pending ? 'wait' : 'pointer' }}
      >
        {pending ? 'Revoking…' : 'Revoke'}
      </button>
    </form>
  )
}
