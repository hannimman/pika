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
  const [commaStyle, setCommaStyle] = useState('leading')
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
        <div className="of-opt" title="완전정렬: 기존 줄바꿈 무시하고 표준 형태로 재정렬 / 최소변경: 기존 줄바꿈 최대한 유지">
          <span className="of-opt-label">정렬 방식</span>
          <ToggleButtonGroup label="정렬 방식" isLabelHidden type="single" size="sm" value={mode} onChange={(v) => typeof v === 'string' && setMode(v)}>
            <ToggleButton value="canonical" label="완전정렬" />
            <ToggleButton value="conservative" label="최소변경" />
          </ToggleButtonGroup>
        </div>
        <div className="of-opt" title="SELECT·FROM 같은 키워드를 대문자/소문자로 통일하거나 그대로 둡니다">
          <span className="of-opt-label">키워드</span>
          <ToggleButtonGroup label="키워드" isLabelHidden type="single" size="sm" value={keywordCase} onChange={(v) => typeof v === 'string' && setKeywordCase(v)}>
            <ToggleButton value="upper" label="대문자" />
            <ToggleButton value="lower" label="소문자" />
            <ToggleButton value="preserve" label="그대로" />
          </ToggleButtonGroup>
        </div>
        <div className="of-opt" title="들여쓰기 한 단계당 공백 칸 수">
          <span className="of-opt-label">들여쓰기</span>
          <ToggleButtonGroup label="들여쓰기" isLabelHidden type="single" size="sm" value={indentWidth} onChange={(v) => typeof v === 'string' && setIndentWidth(v)}>
            <ToggleButton value="2" label="2칸" />
            <ToggleButton value="4" label="4칸" />
            <ToggleButton value="8" label="8칸" />
          </ToggleButtonGroup>
        </div>
        <div className="of-opt" title="컬럼을 여러 줄로 나눌 때 쉼표를 줄 끝(a,)에 둘지 줄 앞(,a)에 둘지">
          <span className="of-opt-label">쉼표 위치</span>
          <ToggleButtonGroup label="쉼표 위치" isLabelHidden type="single" size="sm" value={commaStyle} onChange={(v) => typeof v === 'string' && setCommaStyle(v)}>
            <ToggleButton value="trailing" label="줄 끝 a," />
            <ToggleButton value="leading" label="줄 앞 ,a" />
          </ToggleButtonGroup>
        </div>
        <div className="of-opt" title="WHERE 조건을 여러 줄로 나눌 때 AND/OR 를 줄 앞에 둘지 줄 끝에 둘지">
          <span className="of-opt-label">AND/OR 위치</span>
          <ToggleButtonGroup label="AND/OR 위치" isLabelHidden type="single" size="sm" value={boolPos} onChange={(v) => typeof v === 'string' && setBoolPos(v)}>
            <ToggleButton value="before" label="줄 앞" />
            <ToggleButton value="after" label="줄 끝" />
          </ToggleButtonGroup>
        </div>
        <div className="of-opt of-linewidth" title="한 줄 최대 글자 수. 이 길이를 넘으면 줄바꿈 기준으로 삼습니다">
          <span className="of-opt-label">줄 너비 {lineWidth}</span>
          <Slider label="줄 너비" isLabelHidden min={60} max={200} step={10} value={lineWidth} onChange={(v) => typeof v === 'number' && setLineWidth(v)} valueDisplay="none" />
        </div>
        <div className="of-opt" title="포맷 전후 내용(문자열·식별자)이 같은지 검사해서 다르면 원문을 그대로 돌려주는 안전장치. 켜두는 걸 권장">
          <span className="of-opt-label">안전장치</span>
          <CheckboxInput label="내용 보존 검사" size="sm" value={verify} onChange={setVerify} />
        </div>
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
