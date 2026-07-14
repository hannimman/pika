// INSERT INTO 테이블(col1, col2 ...) 의 컬럼 목록을 SELECT 절처럼 세로 정렬한다.
//   INSERT INTO T(A --c1
//   , B)            →   INSERT INTO T (
//                            A --c1
//                            , B
//                        )
// 포맷터 결과(텍스트) 후처리 — 공백/개행만 재배치하므로 토큰(내용)은 그대로.
// 콤마 스타일(선행/후행)을 따르고, 항목 뒤 줄 주석은 그 항목에 붙여 유지한다.
// ponytail: INSERT INTO (SELECT...) 인라인 뷰는 테이블명이 없어 매치 안 됨(그대로 통과).
export function alignInsertColumns(text: string, indentWidth = 4, commaStyle: 'leading' | 'trailing' = 'leading'): string {
  const indent = ' '.repeat(indentWidth)
  const re = /\bINSERT\s+INTO\s+((?:"[^"]+"|[A-Za-z_][\w$#]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$#]*))*)\s*\(/gi
  let out = text
  let m: RegExpExecArray | null
  // 뒤에서부터 바꾸면 인덱스가 안 밀린다
  const jobs: { start: number; open: number; close: number }[] = []
  while ((m = re.exec(out))) {
    const open = m.index + m[0].length - 1 // '(' 위치
    const close = findClose(out, open)
    if (close > 0) jobs.push({ start: m.index, open, close })
  }
  for (let k = jobs.length - 1; k >= 0; k--) {
    const { start, open, close } = jobs[k]
    const items = splitItems(out.slice(open + 1, close))
    if (items.length < 2) continue // 단일 항목은 그대로
    // 후행 콤마는 줄 주석 앞에 넣는다 — 뒤에 붙이면 콤마가 주석에 먹힌다
    const addComma = (it: string): string => {
      const cmt = it.indexOf('--')
      if (cmt >= 0) return it.slice(0, cmt).replace(/\s+$/, '') + ', ' + it.slice(cmt)
      return it + ','
    }
    const body =
      commaStyle === 'leading'
        ? items.map((it, i) => indent + (i === 0 ? '' : ', ') + it).join('\n')
        : items.map((it, i) => indent + (i === items.length - 1 ? it : addComma(it))).join('\n')
    // 머리(INSERT INTO 이름)는 원본 그대로 보존 — 키워드 대소문자 옵션을 해치지 않는다
    const head = out.slice(start, open).replace(/\s+$/, '')
    out = out.slice(0, start) + head + ` (\n${body}\n)` + out.slice(close + 1)
  }
  return out
}

// open 위치의 '(' 와 짝인 ')' 인덱스. 문자열/주석은 건너뜀. 못 찾으면 -1.
function findClose(text: string, open: number): number {
  let depth = 0
  let i = open
  const n = text.length
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
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

// 괄호 안 내용물을 깊이-0 콤마로 분할. 각 항목은 한 줄로 접되,
// 줄 주석(--) 뒤 개행은 접으면 뒷내용이 주석에 먹히므로 그대로 둔다.
function splitItems(inner: string): string[] {
  const items: string[] = []
  let depth = 0
  let last = 0
  let i = 0
  const n = inner.length
  while (i < n) {
    const c = inner[i]
    if (c === "'") {
      i++
      while (i < n) {
        if (inner[i] === "'") {
          if (inner[i + 1] === "'") { i += 2; continue }
          i++
          break
        }
        i++
      }
      continue
    }
    if (c === '-' && inner[i + 1] === '-') {
      while (i < n && inner[i] !== '\n') i++
      continue
    }
    if (c === '/' && inner[i + 1] === '*') {
      i += 2
      while (i < n && !(inner[i] === '*' && inner[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ',' && depth === 0) {
      items.push(collapse(inner.slice(last, i)))
      last = i + 1
    }
    i++
  }
  items.push(collapse(inner.slice(last)))
  return items.filter((s) => s.length > 0)
}

// 항목을 한 줄로: 앞뒤 공백 제거 + 내부 공백 접기. 단 '--' 주석 이후는 건드리지 않는다.
function collapse(item: string): string {
  const t = item.trim()
  const cmt = t.indexOf('--')
  if (cmt >= 0 && t.slice(cmt).includes('\n')) return t // 주석 뒤에 또 내용이 있는 희귀 케이스는 원형 유지
  return t.replace(/\s+/g, ' ')
}
