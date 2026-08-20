/**
 * Safe serialisation for `<script type="application/ld+json">` blocks.
 *
 * `JSON.stringify` escapes quotes and backslashes but NOT `<`, so a value
 * containing `</script><script>...</script>` — a product title a seller types
 * and self-publishes — closes the JSON-LD element and opens a real executing
 * one. React's escaping does not apply inside `dangerouslySetInnerHTML`.
 *
 * Replacing those characters with their `\uXXXX` form is valid JSON, parses
 * back to the identical string in every JSON-LD consumer, and cannot terminate
 * the element. `&` and the two line-separator characters go the same way: all
 * four are legal in JSON and hostile in HTML.
 *
 * Two traps, both hit while writing this:
 *   - the replacement has to REACH THE OUTPUT as a backslash followed by
 *     `u003c`. Emitting the literal character instead makes this function a
 *     no-op that still reads as correct.
 *   - U+2028/U+2029 must appear here as escape sequences, not as themselves —
 *     they are line terminators in JavaScript source and end the regex.
 *
 * `npm run verify:jsonld` proves the escaping works and that the unescaped
 * form fails the same assertion.
 */
const HTML_UNSAFE = /[<>&\u2028\u2029]/g

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(
    HTML_UNSAFE,
    (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
  )
}
