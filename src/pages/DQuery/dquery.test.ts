// ponytail: runnable check for the SQL→dynamic-SQL logic.
// Run: node src/pages/DQuery/dquery.test.ts   (Node 23+ strips TS types)
import assert from 'node:assert/strict'
import { buildLines, outputText, findLiterals, type Subs } from './dquery.ts'

const sql = "A.X = 'foo'\nB.Y = 'bar'"

// literals detected with sequential ids
assert.deepEqual(findLiterals(sql), [
  { id: 0, value: 'foo' },
  { id: 1, value: 'bar' },
])

// Style A — one assignment per line, single quotes doubled
const a = outputText(buildLines(sql, { style: 'A', varName: 'V_SQL', subs: {}, grouping: true }))
assert.ok(a.includes("V_SQL := V_SQL || 'A.X = ''foo''';"))
assert.ok(a.includes("V_SQL := V_SQL || 'B.Y = ''bar''';"))

// Style A — variablize by value (grouping ON): only 'foo' becomes a variable
const av = outputText(
  buildLines(sql, { style: 'A', varName: 'V_SQL', subs: { foo: { name: 'P_FOO', value: 'foo' } }, grouping: true }),
)
assert.ok(av.includes("'''||P_FOO||'''"), 'variablized value foo')
assert.ok(!av.includes("''foo''"), 'foo no longer doubled')
assert.ok(av.includes("''bar''"), 'bar still doubled')

// regression: value-keyed var survives a new literal inserted BEFORE it (grouping ON).
const before = "AND BIZ_SECT_CD = 200\nAND FEE_CD = 'B-B3-07'"
const after = "AND BIZ_SECT_CD = '200'\nAND FEE_CD = 'B-B3-07'" // 200 now quoted (new literal, earlier)
const sub: Subs = { 'B-B3-07': { name: 'P_FEE', value: 'B-B3-07' } }
const o1 = outputText(buildLines(before, { style: 'A', varName: 'V_SQL', subs: sub, grouping: true }))
const o2 = outputText(buildLines(after, { style: 'A', varName: 'V_SQL', subs: sub, grouping: true }))
assert.ok(o1.includes("'''||P_FEE||'''"), 'FEE variablized before edit')
assert.ok(o2.includes("'''||P_FEE||'''"), 'FEE stays variablized after new literal inserted earlier')
assert.ok(o2.includes("''200''"), 'newly quoted 200 is NOT stolen by the variable')

// grouping ON vs OFF on duplicate values: A='x' (id 0), B='x' (id 1)
const dup = "A = 'x'\nB = 'x'"
// ON: keyed by value → both 'x' become the variable
const gOn = outputText(buildLines(dup, { style: 'A', varName: 'V_SQL', subs: { x: { name: 'P_X', value: 'x' } }, grouping: true }))
assert.equal((gOn.match(/P_X/g) || []).length, 2, 'grouping ON replaces both x')
// OFF: keyed by occurrence id → only id 1 (second) becomes the variable
const gOff = outputText(
  buildLines(dup, { style: 'A', varName: 'V_SQL', subs: { '1': { name: 'P_X', value: 'x' } }, grouping: false }),
)
assert.ok(gOff.includes("A = ''x''"), 'grouping OFF keeps first x literal')
assert.equal((gOff.match(/P_X/g) || []).length, 1, 'grouping OFF replaces only the clicked occurrence')

// Style B — single string literal spanning newlines
const b = outputText(buildLines(sql, { style: 'B', varName: 'V_SQL', subs: {}, grouping: true }))
assert.ok(b.startsWith("V_SQL := '\n"))
assert.ok(b.endsWith("';"))
assert.ok(b.includes("A.X = ''foo''"))
assert.equal((b.match(/:=/g) || []).length, 1, 'single assignment')

// Style C — one statement, leading || continuation
const c = outputText(buildLines(sql, { style: 'C', varName: 'V_SQL', subs: {}, grouping: true }))
assert.ok(c.startsWith("V_SQL := V_SQL || 'A.X = ''foo'''"))
assert.ok(c.includes("|| 'B.Y = ''bar''';"))
assert.equal((c.match(/:=/g) || []).length, 1, 'single assignment')

// custom var name
const cv = outputText(buildLines("Z = 'q'", { style: 'A', varName: 'v_QUERY', subs: {}, grouping: true }))
assert.ok(cv.includes("v_QUERY := v_QUERY || 'Z = ''q''';"))

// comments stripped (-- line, /* block */) but preserved inside string literals
const cm = "SELECT 1 -- c1\n/* blk */, 2\nWHERE X = '--not a comment'"
assert.deepEqual(
  findLiterals(cm).map((l) => l.value),
  ['--not a comment'],
)
const cmOut = outputText(buildLines(cm, { style: 'A', varName: 'V_SQL', subs: {}, grouping: true }))
assert.ok(!cmOut.includes('c1'), 'line comment removed')
assert.ok(!cmOut.includes('blk'), 'block comment removed')
assert.ok(cmOut.includes("''--not a comment''"), 'literal with -- preserved + doubled')

// escaped '' inside a raw literal stays a single literal (don't split)
assert.deepEqual(
  findLiterals("X = 'don''t'").map((l) => l.value),
  ["don''t"],
)

// trailing spaces/tabs are stripped (indentation kept)
const tw = outputText(buildLines('SELECT A  \t\n     , B\t ', { style: 'A', varName: 'V_SQL', subs: {}, grouping: true }))
assert.ok(tw.includes("V_SQL := V_SQL || 'SELECT A';"), 'trailing ws removed')
assert.ok(tw.includes("V_SQL := V_SQL || '     , B';"), 'leading indent kept, trailing removed')

// multi-line block comment keeps line numbers aligned (src = raw line index)
// raw lines: 0:A  1:/* c1  2: c2 */  3:B  → B stays at src 3
const blk = buildLines('A\n/* c1\n c2 */\nB', { style: 'A', varName: 'V_SQL', subs: {}, grouping: true })
const bLine = blk.find((l) => l.parts.some((p) => p.s.includes('B')))
assert.equal(bLine?.src, 3, 'line after multi-line block comment keeps its raw index')

console.log('dquery.ts: all checks passed ✅')
