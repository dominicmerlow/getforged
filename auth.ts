import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Resend from 'next-auth/providers/resend'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, dbConfigured } from '@/lib/db'
import * as schema from '@/db/schema'

/**
 * Auth.js v5 configuration — replaces Supabase Auth.
 *
 * Session strategy is JWT even though a database adapter is present. This is
 * deliberate: the Credentials provider (email + password) is incompatible
 * with Auth.js's "database sessions" strategy — Auth.js only persists a
 * session row for adapter-mediated sign-ins (OAuth, magic link), never for
 * Credentials, because it has no way to know a bare `authorize()` return
 * value is trustworthy enough to treat as a durable session. Mixing
 * strategies per-provider isn't supported, so every provider here — OAuth,
 * magic link, and password — issues a signed JWT. The `sessions` table in
 * db/schema.ts still exists (the adapter writes to it for OAuth/email
 * account-linking bookkeeping) but nothing reads it to authorize requests.
 *
 * `events.createUser` is the replacement for the old `handle_new_user`
 * Postgres trigger: every new user gets exactly one `sellers` row, seeded
 * from the register form's name (via `pendingDisplayNames`) or the OAuth
 * profile name, falling back to the email's local part.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  // Vercel sets this automatically; explicit here so local dev and other
  // hosts don't hit Auth.js's UntrustedHost guard when constructing
  // callback URLs. Every request is already gated by proxy.ts + the
  // per-route checks in this app, so trusting the Host header for URL
  // construction doesn't widen the actual attack surface.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null
        if (!dbConfigured()) return null

        const row = await db.query.users.findFirst({ where: eq(schema.users.email, email) })
        // No account, or an account created via OAuth/magic-link that never
        // set a password — reject either way rather than distinguishing
        // the two, which would leak which emails have accounts.
        if (!row || !row.passwordHash) return null

        const valid = await compare(password, row.passwordHash)
        if (!valid) return null

        return { id: row.id, email: row.email, name: row.name, image: row.image }
      },
    }),
  ],
  callbacks: {
    // Carry the user id onto the JWT (OAuth/email profiles don't include it
    // by default) so `session.user.id` is always populated downstream.
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return
      try {
        await db.update(schema.users).set({ lastSignInAt: new Date() }).where(eq(schema.users.id, user.id))
      } catch (err) {
        console.error('[auth] lastSignInAt stamp failed:', err instanceof Error ? err.message : err)
      }
    },
    async createUser({ user }) {
      if (!user.id || !user.email) return
      try {
        let displayName: string | null = null

        const pending = await db.query.pendingDisplayNames.findFirst({
          where: eq(schema.pendingDisplayNames.email, user.email),
        })
        if (pending) {
          displayName = pending.displayName
          await db.delete(schema.pendingDisplayNames).where(eq(schema.pendingDisplayNames.email, user.email))
        }

        if (!displayName) displayName = user.name || user.email.split('@')[0]

        await db.insert(schema.sellers).values({
          userId: user.id,
          displayName,
        })
      } catch (err) {
        // A failed seller-row insert must not block account creation — the
        // user would be locked out of a session entirely. lib/products.ts
        // and the dashboard already handle a missing seller row gracefully
        // (dashboard shows a "still being created" message).
        console.error('[auth] createUser seller provisioning failed:', err instanceof Error ? err.message : err)
      }
    },
  },
})
