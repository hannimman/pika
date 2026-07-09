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

// Style A — variablize by value: only 'foo' becomes a variable
const av = outputText(buildLines(sql, { style: 'A', varName: 'V_SQL', subs: { foo: 'P_FOO' } }))
assert.ok(av.includes("'''||P_FOO||'''"), 'variablized value foo')
assert.ok(!av.includes("''foo''"), 'foo no longer doubled')
assert.ok(av.includes("''bar''"), 'bar still doubled')

// regression: variable keyed by value survives a new literal inserted BEFORE it.
// grab 'B-B3-07' as a var, then quote BIZ_SECT_CD earlier → var must stay on 'B-B3-07'.
const before = "AND BIZ_SECT_CD = 200\nAND FEE_CD = 'B-B3-07'"
const after = "AND BIZ_SECT_CD = '200'\nAND FEE_CD = 'B-B3-07'" // 200 now quoted (new literal, earlier)
const sub = { 'B-B3-07': 'P_FEE' }
const o1 = outputText(buildLines(before, { style: 'A', varName: 'V_SQL', subs: sub }))
const o2 = outputText(buildLines(after, { style: 'A', varName: 'V_SQL', subs: sub }))
assert.ok(o1.includes("'''||P_FEE||'''"), 'FEE variablized before edit')
assert.ok(o2.includes("'''||P_FEE||'''"), 'FEE stays variablized after new literal inserted earlier')
assert.ok(o2.includes("''200''"), 'newly quoted 200 is NOT stolen by the variable')

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

// multi-line block comment keeps line numbers aligned (src = raw line index)
// raw lines: 0:A  1:/* c1  2: c2 */  3:B  → B stays at src 3
const blk = buildLines('A\n/* c1\n c2 */\nB', { style: 'A', varName: 'V_SQL', subs: {} })
const bLine = blk.find((l) => l.parts.some((p) => p.s.includes('B')))
assert.equal(bLine?.src, 3, 'line after multi-line block comment keeps its raw index')

console.log('dquery.ts: all checks passed ✅')
