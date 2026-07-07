// ponytail: one runnable check for the non-trivial string logic.
// Run: node src/pages/Quote/quote.test.ts   (Node 23+ strips TS types)
import assert from 'node:assert/strict'
import { makeOutput, makeCustom, countEmoji } from './quote.ts'

// newline-separated → quoted SQL IN list, continuation lines start with ", "
const a = makeOutput('foo\nbar\nbaz', { useNewline: true, quoteChar: "'", withComma: true })
assert.equal(a.count, 3)
assert.equal(a.text, "'foo'\n, 'bar'\n, 'baz'")

// comma-separated input, spaces stripped, double quotes
const b = makeOutput('a, b, c', { useNewline: false, quoteChar: '"', withComma: true })
assert.equal(b.text, '"a"\n, "b"\n, "c"')

// withComma off → no leading commas
const c = makeOutput('x\ny', { useNewline: true, quoteChar: "'", withComma: false })
assert.equal(c.text, "'x'\n'y'")

// empty input
assert.deepEqual(makeOutput('', { useNewline: true, quoteChar: "'", withComma: true }), { text: '', count: 0 })

// custom: just changes case of the already-formatted output
assert.equal(makeCustom("'foo'\n, 'bar'", { upper: true, withComma: true }), "'FOO'\n, 'BAR'")

// count emoji
assert.equal(countEmoji(3), '3️⃣')
assert.equal(countEmoji(10), '🔟')
assert.equal(countEmoji(12), '1️⃣2️⃣')

console.log('quote.ts: all checks passed ✅')
