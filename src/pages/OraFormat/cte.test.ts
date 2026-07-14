// Run: node src/pages/OraFormat/cte.test.ts
import assert from 'node:assert/strict'
import { breakCteBoundaries } from './cte.ts'

// two CTE boundaries: before b, before c. main SELECT commas must stay untouched.
const input = [
  'WITH a AS (',
  '    SELECT 1 FROM dual',
  "    WHERE x IN ('S', 'C', 'F')), b AS (",
  '    SELECT 2 FROM dual',
  '        ), c AS ( -- cmt',
  '    SELECT 3 FROM dual',
  ')',
  'SELECT col1, col2 FROM a, b, c',
].join('\n')

const out = breakCteBoundaries(input, 4)

assert.ok(out.includes("WHERE x IN ('S', 'C', 'F')\n        )\n        , b AS ("), 'boundary before b broken, paren + comma indented')
assert.ok(out.includes('SELECT 2 FROM dual\n        )\n        , c AS ( -- cmt'), 'boundary before c broken, trailing comment kept')
assert.ok(out.includes('SELECT 3 FROM dual\n        )\nSELECT col1, col2 FROM a, b, c'), 'final CTE close indented, main query on own line')
assert.ok(out.includes('SELECT col1, col2 FROM a, b, c'), 'main-query commas untouched')
assert.ok(!/\)\), /.test(out), 'no jammed "), " CTE separators remain')

// non-WITH input passes through unchanged
const plain = 'SELECT a, b FROM t'
assert.equal(breakCteBoundaries(plain, 4), plain, 'non-WITH untouched')

console.log('cte.ts: all checks passed ✅')
