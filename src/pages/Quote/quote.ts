// 따옴표/콤마 변환 순수 로직 — QuoteMaker(quote.js)에서 DOM 제거하고 추출.
// SQL WHERE ... IN ('a','b') 형태의 리스트를 만든다.

export type QuoteChar = "'" | '"' | ''

export interface OutputOptions {
  useNewline: boolean // 구분자: true=엔터, false=콤마
  quoteChar: QuoteChar
  withComma: boolean // 줄 앞 콤마 포함
}

export interface CustomOptions {
  upper: boolean
  withComma: boolean
}

// 입력 → OUTPUT(따옴표/콤마 적용) + 항목 수
export function makeOutput(input: string, opts: OutputOptions): { text: string; count: number } {
  if (!input) return { text: '', count: 0 }

  let str = input.replace(/ /g, '')
  if (!opts.useNewline) str = str.replace(/\r\n|\r|\n/g, '')

  const splitter = opts.useNewline ? '\n' : ','
  const items = str.split(splitter).filter(Boolean)

  const quoted = items.map((x) => `${opts.quoteChar}${x}${opts.quoteChar}\n`)
  let result = quoted.join(',').replace(/\s+$/, '')
  if (!opts.withComma) result = result.replace(/,/g, '')

  return { text: result, count: items.length }
}

// OUTPUT → CUSTOM(대/소문자 변환)
export function makeCustom(output: string, opts: CustomOptions): string {
  if (!output) return ''

  const cleaned = output.split('\n').map((line) => line.replace(',', '') + '\n')
  let result = cleaned.join(',').replace(/\s+$/, '')
  result = opts.upper ? result.toUpperCase() : result.toLowerCase()
  if (!opts.withComma) result = result.replace(/,/g, '')

  return result
}

const DIGIT_EMOJI = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

// 개수를 이모지 숫자로 (표시용)
export function countEmoji(n: number): string {
  if (n === 10) return '🔟'
  return String(n).replace(/\d/g, (d) => DIGIT_EMOJI[Number(d)])
}
