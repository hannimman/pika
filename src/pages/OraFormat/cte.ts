// WITH 절 CTE 경계를 보기 좋게 분리한다.
//   ...) , next AS (   →   ...\n<indent>)\n, next AS (
// 포맷터 결과(텍스트)에만 작용하는 순수 후처리 — 공백/개행만 재배치하므로
// 토큰(내용)은 그대로다. 괄호 깊이 0에서 "IDENT AS (" 가 뒤따르는 콤마 = CTE 구분자.
// ponytail: '...' 문자열/주석만 스킵(깊이 오판 방지). q'[]' 나 컬럼목록 CTE(a(c) AS)는 미대응 — 드묾.
export function breakCteBoundaries(text: string, indentWidth = 4): string {
  if (!/^\s*WITH\b/i.test(text)) return text
  const indent = ' '.repeat(indentWidth * 2)
  const n = text.length
  let depth = 0
  let i = 0
  const boundaries: { close: number; identStart: number }[] = []
  while (i < n) {
    const c = text[i]
    if (c === "'") {
      i++
      while (i < n) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { i += 2; continue } // 이스케이프 ''
          i++
          break
        }
        i++
      }
      continue
    }
    if (c === '-' && text[i + 1] === '-') {
      while (i < n && text[i] !== '\n') i++
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === '(') { depth++; i++; continue }
    if (c === ')') { depth = Math.max(0, depth - 1); i++; continue }
    if (c === ',' && depth === 0) {
      const rest = text.slice(i)
      const lead = /^,\s*/.exec(rest)![0]
      if (/^,\s*[A-Za-z_][\w$#]*\s+AS\s*\(/i.test(rest)) {
        // 콤마 직전(공백 제외) 이 CTE 닫는 ')' 인지 확인
        let j = i - 1
        while (j >= 0 && /\s/.test(text[j])) j--
        if (text[j] === ')') boundaries.push({ close: j, identStart: i + lead.length })
      }
    }
    i++
  }
  if (!boundaries.length) return text
  let out = text
  for (let k = boundaries.length - 1; k >= 0; k--) {
    const { close, identStart } = boundaries[k]
    const head = out.slice(0, close).replace(/\s+$/, '')
    out = head + `\n${indent})\n, ` + out.slice(identStart)
  }
  return out
}
