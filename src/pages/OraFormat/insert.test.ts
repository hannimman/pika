// Run: node src/pages/OraFormat/insert.test.ts
import assert from 'node:assert/strict'
import { alignInsertColumns } from './insert.ts'

// engine-style output: first column jammed after '(', commas at column 0, comments attached
const input = [
  'INSERT INTO SY_TB_M40F110G(PROC_YM --적재년월',
  ', BIZ_SECT_CD --사업구분코드',
  ', TCHER_ID',
  ', CRT_DT --생성일시',
  ')',
  'SELECT',
  '    A.PROC_YM',
  '    , A.BIZ_SECT_CD',
  'FROM T A;',
].join('\n')

const lead = alignInsertColumns(input, 4, 'leading')
assert.ok(lead.includes('INSERT INTO SY_TB_M40F110G (\n    PROC_YM --적재년월\n    , BIZ_SECT_CD --사업구분코드\n    , TCHER_ID\n    , CRT_DT --생성일시\n)'), 'leading: one column per line, comments kept')
assert.ok(lead.includes('SELECT\n    A.PROC_YM'), 'rest of statement untouched')

const trail = alignInsertColumns(input, 4, 'trailing')
assert.ok(trail.includes('    PROC_YM --적재년월,') === false, 'trailing: comma must not land inside the comment')
assert.ok(trail.includes('    TCHER_ID,'), 'trailing: comma at line end for plain items')

// keyword case preserved (lowercase input stays lowercase)
const lower = alignInsertColumns('insert into t(a, b, c) values (1, 2, 3);', 4, 'leading')
assert.ok(lower.includes('insert into t (\n    a\n    , b\n    , c\n)'), 'lowercase head preserved')
assert.ok(lower.includes('values (1, 2, 3)'), 'VALUES list untouched')

// schema-qualified + function args must not be split
const fn = alignInsertColumns('INSERT INTO S.T(A, NVL(B, 0), C) SELECT 1 FROM dual;', 4, 'leading')
assert.ok(fn.includes('INSERT INTO S.T (\n    A\n    , NVL(B, 0)\n    , C\n)'), 'nested parens stay inside one item')

// single-column list unchanged
const one = 'INSERT INTO T(ONLY_COL) SELECT 1 FROM dual;'
assert.equal(alignInsertColumns(one, 4, 'leading'), one, 'single item untouched')

// inline-view insert (no table name before paren) untouched
const iv = 'INSERT INTO (SELECT a, b FROM t) VALUES (1, 2);'
assert.equal(alignInsertColumns(iv, 4, 'leading'), iv, 'inline view untouched')

console.log('insert.ts: all checks passed ✅')
