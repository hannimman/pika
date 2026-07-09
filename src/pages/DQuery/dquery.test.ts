// ponytail: runnable check for the SQL→dynamic-SQL logic.
// Run: node src/pages/DQuery/dquery.test.ts   (Node 23+ strips TS types)
import assert from 'node:assert/strict'
import { buildLines, outputText, findLiterals } from './dquery.ts'

const sql = "A.X = 'foo'\nB.Y = 'bar'"

// literals detected with sequential ids
assert.deepEqual(findLiterals(sql), [
  { id: 0, value: 'foo' },
  { id: 1, value: 'bar' },
])

// Style A — one assignment per line, single quotes doubled
const a = outputText(buildLines(sql, { style: 'A', varName: 'V_SQL', subs: {} }))
assert.ok(a.includes("V_SQL := V_SQL || 'A.X = ''foo''';"))
assert.ok(a.includes("V_SQL := V_SQL || 'B.Y = ''bar''';"))

// Style A — variablize literal 0 only
const av = outputText(buildLines(sql, { style: 'A', varName: 'V_SQL', subs: { 0: 'P_FOO' } }))
assert.ok(av.includes("'''||P_FOO||'''"), 'variablized literal 0')
assert.ok(!av.includes("''foo''"), 'literal 0 no longer doubled')
assert.ok(av.includes("''bar''"), 'literal 1 still doubled')

// Style B — single string literal spanning newlines
const b = outputText(buildLines(sql, { style: 'B', varName: 'V_SQL', subs: {} }))
assert.ok(b.startsWith("V_SQL := '\n"))
assert.ok(b.endsWith("';"))
assert.ok(b.includes("A.X = ''foo''"))
assert.equal((b.match(/:=/g) || []).length, 1, 'single assignment')

// Style C — one statement, leading || continuation
const c = outputText(buildLines(sql, { style: 'C', varName: 'V_SQL', subs: {} }))
assert.ok(c.startsWith("V_SQL := V_SQL || 'A.X = ''foo'''"))
assert.ok(c.includes("|| 'B.Y = ''bar''';"))
assert.equal((c.match(/:=/g) || []).length, 1, 'single assignment')

// custom var name
const cv = outputText(buildLines("Z = 'q'", { style: 'A', varName: 'v_QUERY', subs: {} }))
assert.ok(cv.includes("v_QUERY := v_QUERY || 'Z = ''q''';"))

// comments stripped (-- line, /* block */) but preserved inside string literals
const cm = "SELECT 1 -- c1\n/* blk */, 2\nWHERE X = '--not a comment'"
assert.deepEqual(
  findLiterals(cm).map((l) => l.value),
  ['--not a comment'],
)
const cmOut = outputText(buildLines(cm, { style: 'A', varName: 'V_SQL', subs: {} }))
assert.ok(!cmOut.includes('c1'), 'line comment removed')
assert.ok(!cmOut.includes('blk'), 'block comment removed')
assert.ok(cmOut.includes("''--not a comment''"), 'literal with -- preserved + doubled')

// escaped '' inside a raw literal stays a single literal (don't split)
assert.deepEqual(
  findLiterals("X = 'don''t'").map((l) => l.value),
  ["don''t"],
)

// trailing spaces/tabs are stripped (indentation kept)
const tw = outputText(buildLines('SELECT A  \t\n     , B\t ', { style: 'A', varName: 'V_SQL', subs: {} }))
assert.ok(tw.includes("V_SQL := V_SQL || 'SELECT A';"), 'trailing ws removed')
assert.ok(tw.includes("V_SQL := V_SQL || '     , B';"), 'leading indent kept, trailing removed')

console.log('dquery.ts: all checks passed ✅')
