// WITH 절 CTE 경계를 보기 좋게 분리한다.
//   CTE 사이:  ...) , next AS (   →   ...\n<indent>)\n, next AS (
//   마지막 CTE: ...) SELECT ...     →   ...\n<indent>)\nSELECT ...
// 각 CTE 닫는 ')' 를 들여쓴 제 줄로 내리고, 다음 CTE 는 선행 콤마로 새 줄 시작.
// 포맷터 결과(텍스트)에만 작용하는 순수 후처리 — 공백/개행만 재배치하므로 토큰(내용)은 그대로.
// 경계 판단: 괄호 깊이가 0으로 떨어지는 ')' 뒤에 (공백만 건너뛰어) "," + IDENT AS (" 또는 최상위 쿼리 키워드가 오는 경우.
// ponytail: '...' 문자열/주석만 스킵. ')' 와 콤마/키워드 사이에 주석이 끼면 건너뜀(주석 유실 방지). q'[]'·컬럼목록 CTE는 미대응(드묾).
const MAIN_KW = /^(SELECT|INSERT|UPDATE|DELETE|MERGE|WITH)\b/i

export function breakCteBoundaries(text: string, indentWidth = 4): string {
  if (!/^\s*WITH\b/i.test(text)) return text
  // 첫 CTE 이름을 WITH 와 같은 줄로: "WITH\n    NAME" → "WITH NAME"
  text = text.replace(/^(\s*WITH)[ \t]*\r?\n[ \t]*/i, '$1 ')
  const indent = ' '.repeat(indentWidth * 2)
  const n = text.length
  const spans: { start: number; end: number; rep: string }[] = []
  let depth = 0
  let i = 0
  while (i < n) {
    const c = text[i]
    if (c === "'") {
      i++
      while (i < n) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { i += 2; continue }
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
    if (c === ')') {
      depth = Math.max(0, depth - 1)
      if (depth === 0) {
        let k = i + 1
        while (k < n && /[ \t\r\n]/.test(text[k])) k++ // 공백만 (주석 만나면 중단)
        const rest = text.slice(k)
        let ws = i
        while (ws > 0 && /\s/.test(text[ws - 1])) ws-- // ')' 앞 공백/개행 흡수
        const cte = /^,\s*[A-Za-z_][\w$#]*\s+AS\s*\(/i.exec(rest)
        if (cte) {
          const identStart = k + /^,\s*/.exec(rest)![0].length
          spans.push({ start: ws, end: identStart, rep: `\n${indent})\n, ` })
        } else if (MAIN_KW.test(rest)) {
          spans.push({ start: ws, end: k, rep: `\n${indent})\n` })
        }
      }
      i++
      continue
    }
    i++
  }
  if (!spans.length) return text
  spans.sort((a, b) => b.start - a.start)
  let out = text
  for (const s of spans) out = out.slice(0, s.start) + s.rep + out.slice(s.end)
  return out
}
