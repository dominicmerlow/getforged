'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { claimInvites } from '@/db/schema'
import { checkAdminAccess, logAdminAction, roleAtLeast, type UserRole } from '@/lib/admin'
import { createProspectDraft } from '@/lib/prospects'

const DEFAULT_CATEGORY = 'AI Automation'

async function gateOrRedirect(
  minimum: UserRole = 'admin'
): Promise<{ userId: string; email: string | null; role: UserRole }> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!roleAtLeast(role, minimum)) redirect('/admin')
  return { userId: session.user.id, email: session.user.email ?? null, role }
}

export interface ProspectRowResult {
  input: string
  ok: boolean
  message: string
  claimUrl?: string
}

export type ProspectBatchState =
  | { results: ProspectRowResult[] }
  | { error: string }
  | null

/**
 * Parses pasted CSV lines (app_url, name, email, source[, category]) and
 * runs each through the prospect-draft pipeline. One bad row doesn't abort
 * the batch — failures are collected and shown per row.
 */
export async function createProspectBatch(
  _prev: ProspectBatchState,
  formData: FormData
): Promise<ProspectBatchState> {
  const { userId } = await gateOrRedirect()

  const raw = String(formData.get('csv') ?? '').trim()
  if (!raw) return { error: 'Paste at least one row.' }

  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'))

  if (lines.length === 0) return { error: 'No rows found.' }
  if (lines.length > 50) return { error: 'Max 50 rows per batch. Split into smaller batches.' }

  const results: ProspectRowResult[] = []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim())
    const [productUrl, name, email, source, category] = cols

    if (!productUrl || !/^https?:\/\//i.test(productUrl)) {
      results.push({ input: line, ok: false, message: 'Missing or invalid URL (first column).' })
      continue
    }
    if (!name) {
      results.push({ input: line, ok: false, message: 'Missing product name (second column).' })
      continue
    }
    if (!source) {
      results.push({ input: line, ok: false, message: 'Missing source (fourth column, e.g. "producthunt").' })
      continue
    }

    try {
      const draft = await createProspectDraft({
        productUrl,
        name,
        category: category || DEFAULT_CATEGORY,
        source,
        prospectEmail: email || undefined,
        createdBy: userId,
      })
      results.push({
        input: line,
        ok: true,
        message: `Created "${name}" (${draft.slug})`,
        claimUrl: `${appUrl}/claim/${draft.claimToken}`,
      })
    } catch (err) {
      results.push({
        input: line,
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: null,
    action: 'prospect_batch_created',
    payload: { count: lines.length, succeeded: results.filter(r => r.ok).length } as object,
  })

  revalidatePath('/admin/prospects')
  return { results }
}

export type RevokeState = { ok: true } | { error: string } | null

export async function revokeInvite(
  _prev: RevokeState,
  formData: FormData
): Promise<RevokeState> {
  const { userId } = await gateOrRedirect()
  const inviteId = String(formData.get('invite_id') ?? '')
  if (!inviteId) return { error: 'Missing invite id.' }

  try {
    await db.update(claimInvites)
      .set({ status: 'revoked' })
      .where(and(eq(claimInvites.id, inviteId), inArray(claimInvites.status, ['sent', 'viewed'])))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not revoke invite.' }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: null,
    action: 'prospect_invite_revoked',
    target_type: 'claim_invite',
    target_id: inviteId,
  })

  revalidatePath('/admin/prospects')
  return { ok: true }
}
