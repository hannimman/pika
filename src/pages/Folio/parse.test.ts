// Run: node src/pages/Folio/parse.test.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseManual, liftCodeFences } from './parse.ts'

const md = readFileSync(new URL('./manual.md', import.meta.url), 'utf8')
const { tagline, heroImage, sections } = parseManual(md)

// every numbered section survives, in order, and matches the manual's own 목차
const tocTitles = [...md.matchAll(/^\d+\. \[(.+)\]\(#/gm)].map((m) => m[1])
assert.equal(sections.length, 12)
assert.deepEqual(sections.map((s) => s.num), Array.from({ length: 12 }, (_, i) => i + 1))
assert.deepEqual(sections.map((s) => s.title), tocTitles)

// no content lost: every line of each section body is in the original (modulo lifted indentation)
for (const s of sections) {
  assert.ok(!s.body.endsWith('---'), `section ${s.num} keeps trailing separator`)
  for (const line of s.body.split('\n')) assert.ok(md.includes(line), `section ${s.num}: "${line}" not in manual`)
}

// terminal command fence is lifted to column 0 (→ CodeBlock with copy button), command text untouched
const install = sections[0].body
assert.match(install, /^```\npowershell -c "iex\(.+\)\)\)"\n```$/m)
assert.match(install, /^3\. 검은 창이/m)
assert.equal(liftCodeFences('1. a\n\n   ```\n   x\n     y\n   ```\n\n2. b'), '1. a\n\n```\nx\n  y\n```\n\n2. b')
assert.ok(sections[11].body.includes('**Q. 지우고 싶어요.**'))

assert.match(tagline, /^\*\*FolioMD\*\*는 Markdown/)
assert.deepEqual(heroImage, { alt: 'FolioMD 첫 화면', src: 'images/01-main.png' })

// CRLF input parses the same
assert.equal(parseManual(md.replace(/\n/g, '\r\n')).sections.length, 12)
console.log('parse.test ok')
