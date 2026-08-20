/**
 * Proves `lib/jsonld.ts` actually escapes, rather than merely looking like it.
 *
 * This script exists because the first two attempts at that helper were
 * no-ops that read as correct: once because the replacement string lost a
 * backslash on the way to disk and emitted the literal `<`, and once because
 * U+2028 was written as itself inside the regex - where it is a JavaScript
 * line terminator - and silently ended the pattern.
 *
 * It imports the real helper rather than a re-typed copy, because a test
 * against a copy would not have caught either bug.
 *
 * The control assertion is the point: if plain `JSON.stringify` did NOT leak
 * `</scr` + `ipt>`, this check could pass against a broken fix, so it fails
 * loudly in that case too.
 *
 * Usage: npm run verify:jsonld    (exit 0 = pass, 1 = fail)
 */
import { jsonLdScript } from '../lib/jsonld'

const BSU = '\\u'  // a backslash followed by 'u', as it must appear in the output

const EVIL = '</script><script>alert(1)</script>'
const U2028 = String.fromCharCode(0x2028)

const out = jsonLdScript({ '@type': 'Product', name: EVIL, price: 49 })

const checks: [string, boolean][] = [
  ['no closing script tag survives', !out.includes('</script')],
  ['no opening script tag survives', !out.includes('<script')],
  ['< is escaped', out.includes(BSU + '003c')],
  ['round-trips to the identical string', (JSON.parse(out) as { name: string }).name === EVIL],
  ['ampersands are escaped', jsonLdScript({ a: 'x & y' }).includes(BSU + '0026')],
  ['U+2028 is escaped', jsonLdScript({ a: 'x' + U2028 + 'y' }).includes(BSU + '2028')],
  // Without this, every assertion above could hold on a helper that does nothing.
  ['CONTROL: plain JSON.stringify leaks', JSON.stringify({ name: EVIL }).includes('</script')],
]

console.log('  serialised: ' + out)
console.log('')
let failed = 0
for (const [label, ok] of checks) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + label)
  if (!ok) failed++
}
console.log('')
if (failed > 0) {
  console.error('FAIL - ' + failed + ' of ' + checks.length + ' assertions failed; lib/jsonld.ts does not escape')
  process.exit(1)
}
console.log('PASS - all ' + checks.length + ' assertions hold')
