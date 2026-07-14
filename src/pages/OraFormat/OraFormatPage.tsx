import { useMemo, useState } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton'
import { Slider } from '@astryxdesign/core/Slider'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import formatter from './formatter.js'
import './OraFormat.css'

// vendored engine (oracle-formatter-web) — 전부 브라우저에서 실행, 외부 호출 0
type Diag = { severity?: string; code?: string; message?: string; line?: number; column?: number }
type FmtResult = {
  output: string
  diagnostics: Diag[]
  verification: { ok: boolean; afterCount?: number }
  stats: { tokenCount?: number; elapsedMs?: number; protectedLines?: number }
  options: { verifyTokens?: boolean }
}
const OF = formatter as { format(src: string, opts: unknown): FmtResult; VERSION: string }

const SAMPLE = `with recent as (
select /*+ materialize */ o.id,o.customer_id,o.status from orders o
where o.created_at between date '2026-01-01' and sysdate and o.memo <> q'[a ; / -- ok]')
select r.id,r.customer_id,case when r.status='N' then 'NEW' else 'DONE' end status_name
from recent r left outer join customers c on c.id=r.customer_id
where r.customer_id=:customer_id order by r.created_at desc;`

export default function OraFormat() {
  const [sql, setSql] = useState('')
  const [mode, setMode] = useState('canonical')
  const [keywordCase, setKeywordCase] = useState('upper')
  const [indentWidth, setIndentWidth] = useState('4')
  const [commaStyle, setCommaStyle] = useState('trailing')
  const [boolPos, setBoolPos] = useState('before')
  const [lineWidth, setLineWidth] = useState(100)
  const [verify, setVerify] = useState(true)
  const [copied, setCopied] = useState(false)

  // 입력·옵션 바뀔 때마다 즉시 재포맷 (엔진이 ms 단위라 라이브로 충분)
  const result = useMemo<FmtResult | null>(() => {
    if (!sql.trim()) return null
    try {
      return OF.format(sql, {
        mode,
        keywordCase,
        indentWidth: Number(indentWidth),
        commaStyle,
        booleanOperatorPosition: boolPos,
        lineWidth,
        verifyTokens: verify,
      })
    } catch (e) {
      return {
        output: sql,
        diagnostics: [{ severity: 'error', code: 'UNEXPECTED_ERROR', message: String(e) }],
        verification: { ok: false },
        stats: {},
        options: {},
      }
    }
  }, [sql, mode, keywordCase, indentWidth, commaStyle, boolPos, lineWidth, verify])

  const errors = result ? result.diagnostics.filter((d) => d.severity === 'error') : []
  const warns = result ? result.diagnostics.length - errors.length : 0
  const badge: { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string } = !result
    ? { variant: 'neutral', label: '대기' }
    : errors.length > 0 || !result.verification.ok
      ? { variant: 'error', label: '원문 반환 (검증 실패)' }
      : warns > 0
        ? { variant: 'warning', label: `${warns}개 구간 보존` }
        : !result.options.verifyTokens
          ? { variant: 'warning', label: '검증 꺼짐' }
          : { variant: 'success', label: '검증 완료' }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="of" data-astryx-theme="matcha">
      <header className="of-opts">
        <ToggleButtonGroup label="모드" type="single" size="sm" value={mode} onChange={(v) => typeof v === 'string' && setMode(v)}>
          <ToggleButton value="canonical" label="정규" />
          <ToggleButton value="conservative" label="보수" />
        </ToggleButtonGroup>
        <ToggleButtonGroup label="키워드" type="single" size="sm" value={keywordCase} onChange={(v) => typeof v === 'string' && setKeywordCase(v)}>
          <ToggleButton value="upper" label="UPPER" />
          <ToggleButton value="lower" label="lower" />
          <ToggleButton value="preserve" label="유지" />
        </ToggleButtonGroup>
        <ToggleButtonGroup label="들여쓰기" type="single" size="sm" value={indentWidth} onChange={(v) => typeof v === 'string' && setIndentWidth(v)}>
          <ToggleButton value="2" label="2" />
          <ToggleButton value="4" label="4" />
          <ToggleButton value="8" label="8" />
        </ToggleButtonGroup>
        <ToggleButtonGroup label="쉼표" type="single" size="sm" value={commaStyle} onChange={(v) => typeof v === 'string' && setCommaStyle(v)}>
          <ToggleButton value="trailing" label="후행 a," />
          <ToggleButton value="leading" label="선행 ,a" />
        </ToggleButtonGroup>
        <ToggleButtonGroup label="AND/OR" type="single" size="sm" value={boolPos} onChange={(v) => typeof v === 'string' && setBoolPos(v)}>
          <ToggleButton value="before" label="앞" />
          <ToggleButton value="after" label="뒤" />
        </ToggleButtonGroup>
        <div className="of-linewidth">
          <Slider label={`줄너비 ${lineWidth}`} min={60} max={200} step={10} value={lineWidth} onChange={(v) => typeof v === 'number' && setLineWidth(v)} valueDisplay="none" />
        </div>
        <CheckboxInput label="토큰 검증" size="sm" value={verify} onChange={setVerify} />
      </header>

      <div className="of-main">
        <section className="of-panel">
          <div className="of-head">
            <span className="of-title">SQL 입력</span>
            <span className="of-actions">
              <Button label="샘플" variant="secondary" size="sm" onClick={() => setSql(SAMPLE)} />
              <Button label="초기화" variant="ghost" size="sm" onClick={() => setSql('')} isDisabled={!sql} />
            </span>
          </div>
          <textarea
            className="of-io"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="Oracle SQL / PL-SQL 을 붙여넣으세요"
            spellCheck={false}
          />
        </section>

        <section className="of-panel">
          <div className="of-head">
            <span className="of-title">포맷 결과</span>
            <Badge variant={badge.variant} label={badge.label} />
            <span className="of-actions">
              <Button
                label={copied ? '복사됨 ✓' : '복사'}
                variant={copied ? 'secondary' : 'primary'}
                size="sm"
                onClick={copy}
                isDisabled={!result}
              />
            </span>
          </div>
          <textarea className="of-io" value={result ? result.output : ''} readOnly spellCheck={false} placeholder="여기에 포맷 결과가 나옵니다." />
        </section>
      </div>

      <footer className="of-foot">
        {result && (
          <span className="of-stats">
            토큰 {(result.stats.tokenCount ?? 0).toLocaleString('ko-KR')} · 보존줄 {(result.stats.protectedLines ?? 0).toLocaleString('ko-KR')} ·{' '}
            {(result.stats.elapsedMs ?? 0).toFixed((result.stats.elapsedMs ?? 0) < 10 ? 1 : 0)}ms · 엔진 v{OF.VERSION}
          </span>
        )}
        {result && result.diagnostics.length > 0 && (
          <ul className="of-diags">
            {result.diagnostics.map((d, i) => (
              <li key={i} className={'of-diag ' + (d.severity ?? 'warning')}>
                <span className="of-diag-code">{(d.severity ?? 'warning').toUpperCase()}</span>
                {d.message}
                {d.line ? ` (${d.line}:${d.column ?? 1})` : ''}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  )
}
