// SQL → PL/SQL 동적쿼리 변환 (순수 로직).
// 각 줄을 V_SQL 문자열로 감싸고 작은따옴표를 '' 로 이스케이프한다.
// 작은따옴표 리터럴은 변수로 바꿀 수 있다: ''val'' → '''||var||'''
// 리터럴은 /'(?:''|[^'])*'/ 로 인식 — SQL 이스케이프('')를 문자열 내부로 취급한다.
// 입력은 "생 SQL"을 가정한다(이미 변환된 V_SQL||... 코드를 넣으면 이중 변환됨).

export type Style = 'A' | 'B' | 'C'
export type Subs = Record<number, string>

export interface Part {
  t: 'text' | 'lit'
  s: string // 렌더된 문자열
  id?: number // 리터럴 id (t==='lit')
  value?: string // 리터럴 내부 값 (t==='lit')
}

// 출력 한 줄: src = 대응하는 입력(주석제거 후) 줄 인덱스, null이면 래핑용 줄
export interface OutLine {
  src: number | null
  parts: Part[]
}

export interface Literal {
  id: number
  value: string
}

type Seg = { text: string } | { litId: number; value: string }

// SQL 주석 제거 (-- 줄주석, /* */ 블록주석). 문자열 리터럴 안의 --,/* 는 보존.
export function stripComments(sql: string): string {
  let out = ''
  let i = 0
  const n = sql.length
  let inStr = false
  while (i < n) {
    const c = sql[i]
    const c2 = sql[i + 1]
    if (inStr) {
      out += c
      if (c === "'") {
        if (c2 === "'") {
          out += c2
          i += 2
          continue
        } // 이스케이프된 ''
        inStr = false
      }
      i++
      continue
    }
    if (c === "'") {
      inStr = true
      out += c
      i++
      continue
    }
    if (c === '-' && c2 === '-') {
      while (i < n && sql[i] !== '\n') i++ // 줄 끝까지 버림 (\n 은 유지)
      continue
    }
    if (c === '/' && c2 === '*') {
      i += 2
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2 // */ 건너뜀
      continue
    }
    out += c
    i++
  }
  return out
}

// 각 줄을 텍스트/리터럴 세그먼트로 분해 (리터럴 id는 전체에서 순번)
function tokenizeLines(sql: string): Seg[][] {
  let id = 0
  return stripComments(sql)
    .split('\n')
    .map((rawLine) => {
      const line = rawLine.replace(/[ \t\r]+$/, '') // drop trailing spaces/tabs (messy hand-written SQL)
      const segs: Seg[] = []
      const re = /'(?:''|[^'])*'/g
      let last = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(line))) {
        if (m.index > last) segs.push({ text: line.slice(last, m.index) })
        segs.push({ litId: id++, value: m[0].slice(1, -1) })
        last = m.index + m[0].length
      }
      if (last < line.length) segs.push({ text: line.slice(last) })
      return segs
    })
}

export function findLiterals(sql: string): Literal[] {
  const out: Literal[] = []
  for (const line of tokenizeLines(sql))
    for (const seg of line) if ('litId' in seg) out.push({ id: seg.litId, value: seg.value })
  return out
}

const renderLit = (value: string, varName?: string): string =>
  varName ? `'''||${varName}||'''` : `''${value}''`

const isBlank = (line: Seg[]): boolean => line.every((seg) => 'text' in seg && seg.text.trim() === '')

// 한 줄의 내부 파트(텍스트 + 클릭 가능한 리터럴), 래핑 없음
function lineParts(line: Seg[], subs: Subs): Part[] {
  return line.map((seg) =>
    'text' in seg
      ? { t: 'text', s: seg.text }
      : { t: 'lit', id: seg.litId, value: seg.value, s: renderLit(seg.value, subs[seg.litId]) },
  )
}

// 스타일별로 출력을 "줄" 배열로 조립 (각 줄에 대응 입력줄 src 를 붙여 호버 매핑에 사용)
export function buildLines(sql: string, opts: { style: Style; varName: string; subs: Subs }): OutLine[] {
  const { style, varName: v, subs } = opts
  const lines = tokenizeLines(sql)
  const text = (s: string): Part => ({ t: 'text', s })

  if (style === 'B') {
    // 단일 문자열: 개행 포함 통짜
    return [
      { src: null, parts: [text(`${v} := '`)] },
      ...lines.map((segs, i) => ({ src: i, parts: lineParts(segs, subs) })),
      { src: null, parts: [text(`';`)] },
    ]
  }

  const body = lines.map((segs, i) => ({ segs, i })).filter((x) => !isBlank(x.segs))

  if (style === 'A') {
    // 줄마다 대입
    return body.map(({ segs, i }) => ({
      src: i,
      parts: [text(`${v} := ${v} || '`), ...lineParts(segs, subs), text(`';`)],
    }))
  }

  // 스타일 C: 선두 || 연결 (한 문장), || 정렬
  const prefix = `${v} := ${v} `
  const indent = ' '.repeat(prefix.length)
  return body.map(({ segs, i }, k) => ({
    src: i,
    parts: [text(k === 0 ? `${prefix}|| '` : `${indent}|| '`), ...lineParts(segs, subs), text(k === body.length - 1 ? `';` : `'`)],
  }))
}

export const outputText = (lines: OutLine[]): string =>
  lines.map((l) => l.parts.map((p) => p.s).join('')).join('\n')
