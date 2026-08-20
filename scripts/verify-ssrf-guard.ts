/**
 * Exercises `lib/ssrf.ts` against the addresses it exists to refuse.
 *
 * `/submit` fetches a URL supplied by anyone with an account, and the only
 * validation before this was `/^https?:\/\//` — which accepts
 * `http://169.254.169.254/latest/meta-data/` quite happily. The control
 * assertion at the end re-runs that old test so this file records what was
 * actually wrong, and fails if the control ever stops demonstrating it.
 *
 * Needs DNS for the two public cases. Run: npm run verify:ssrf
 */
import { assertPublicUrl, BlockedUrlError } from '../lib/ssrf'

const MUST_BLOCK = [
  ['loopback by name', 'http://localhost/admin'],
  ['loopback by name with port', 'http://localhost:3000/api/health'],
  ['loopback v4', 'http://127.0.0.1/'],
  ['loopback v4, alternate form', 'http://127.1.2.3/'],
  ['loopback v6', 'http://[::1]/'],
  ['cloud metadata', 'http://169.254.169.254/latest/meta-data/'],
  ['private 10/8', 'http://10.0.0.5/'],
  ['private 172.16/12', 'http://172.20.1.1/'],
  ['private 192.168/16', 'http://192.168.1.1/'],
  ['CGNAT 100.64/10', 'http://100.100.0.1/'],
  ['IPv4-mapped loopback', 'http://[::ffff:127.0.0.1]/'],
  ['unique-local v6', 'http://[fd00::1]/'],
  ['link-local v6', 'http://[fe80::1]/'],
  ['.internal suffix', 'http://db.internal/'],
  ['.local suffix', 'http://printer.local/'],
  ['file scheme', 'file:///etc/passwd'],
  ['gopher scheme', 'gopher://127.0.0.1/'],
  ['not a URL at all', 'not-a-url'],
]

const MUST_ALLOW = [
  ['a real public host', 'https://example.com/'],
  ['our own public site', 'https://getforged.getbrian.xyz/'],
]

async function main() {
  const results: [string, boolean, string][] = []

  for (const [label, url] of MUST_BLOCK) {
    try {
      await assertPublicUrl(url)
      results.push([`blocks ${label}`, false, 'was ALLOWED'])
    } catch (err) {
      const ok = err instanceof BlockedUrlError
      results.push([`blocks ${label}`, ok, ok ? '' : `threw ${String(err)}`])
    }
  }

  for (const [label, url] of MUST_ALLOW) {
    try {
      await assertPublicUrl(url)
      results.push([`allows ${label}`, true, ''])
    } catch (err) {
      results.push([`allows ${label}`, false, `was BLOCKED: ${String(err)}`])
    }
  }

  // Control: the validation this replaced. If it ever stops accepting the
  // metadata endpoint, this file is no longer describing a real bug and the
  // assertions above deserve fresh scrutiny.
  const oldCheck = (u: string) => /^https?:\/\//i.test(u)
  results.push([
    'CONTROL: the old regex accepts the metadata endpoint',
    oldCheck('http://169.254.169.254/latest/meta-data/'),
    '',
  ])

  let failed = 0
  for (const [label, ok, detail] of results) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' - ' + detail : ''}`)
    if (!ok) failed++
  }
  console.log('')
  if (failed > 0) {
    console.error(`FAIL - ${failed} of ${results.length} assertions failed`)
    process.exit(1)
  }
  console.log(`PASS - all ${results.length} assertions hold`)
}

main().catch((err: unknown) => {
  console.error('verify-ssrf-guard crashed:', err)
  process.exit(1)
})
