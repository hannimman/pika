import { useEffect, useMemo, useRef, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { buildLines, outputText, findLiterals, subKey, type Style, type Subs } from './dquery'
import './DQuery.css'

export default function DQuery() {
  const [sql, setSql] = useState('')
  const [style, setStyle] = useState<Style>('A')
  const [varName, setVarName] = useState('V_SQL')
  const [subs, setSubs] = useState<Subs>({})
  // 동일 문자열 그룹핑: ON(기본)=같은 값 전부 한 변수로 / OFF=클릭한 출현만 개별 치환
  const [grouping, setGrouping] = useState(true)
  const [copied, setCopied] = useState(false)
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [hoverLine, setHoverLine] = useState<number | null>(null)
  const [burning, setBurning] = useState(false)

  const lines = useMemo(() => buildLines(sql, { style, varName, subs, grouping }), [sql, style, varName, subs, grouping])
  const literals = useMemo(() => findLiterals(sql), [sql])
  const keyOf = (id: number, value: string) => subKey(grouping, id, value)

  const inRef = useRef<HTMLTextAreaElement>(null)
  const outRef = useRef<HTMLPreElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  useEffect(() => {
    const a = inRef.current
    const b = outRef.current
    if (!a || !b) return
    // sync scroll by ratio (heights differ); keep the mirror pinned to the textarea
    const sync = (from: HTMLElement, to: HTMLElement) => {
      if (lock.current) return
      lock.current = true
      const denom = from.scrollHeight - from.clientHeight
      to.scrollTop = (denom > 0 ? from.scrollTop / denom : 0) * (to.scrollHeight - to.clientHeight)
      requestAnimationFrame(() => (lock.current = false))
    }
    const onA = () => {
      if (mirrorRef.current) mirrorRef.current.scrollTop = a.scrollTop
      sync(a, b)
    }
    const onB = () => sync(b, a)
    // hit-test the mirror's logical-line divs → correct line even when wrapped
    const onMove = (e: MouseEvent) => {
      const m = mirrorRef.current
      if (!a.value || !m) {
        setHoverLine(null)
        return
      }
      const kids = m.children
      for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect()
        if (e.clientY >= r.top && e.clientY < r.bottom) {
          setHoverLine(i)
          return
        }
      }
      setHoverLine(null)
    }
    const onLeave = () => setHoverLine(null)
    a.addEventListener('scroll', onA)
    b.addEventListener('scroll', onB)
    a.addEventListener('mousemove', onMove)
    a.addEventListener('mouseleave', onLeave)
    return () => {
      a.removeEventListener('scroll', onA)
      b.removeEventListener('scroll', onB)
      a.removeEventListener('mousemove', onMove)
      a.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // click a literal in the output to toggle it into/out of a variable.
  // key = grouping ? value : occurrence-id (see subKey).
  const toggleLit = (id: number, value: string) =>
    setSubs((s) => {
      const k = keyOf(id, value)
      if (k in s) {
        const n = { ...s }
        delete n[k]
        return n
      }
      return { ...s, [k]: { name: 'P_VAR' + (Object.keys(s).length + 1), value } }
    })
  const setVar = (k: string, name: string) => setSubs((s) => ({ ...s, [k]: { ...s[k], name } }))
  const removeSub = (k: string) =>
    setSubs((s) => {
      const n = { ...s }
      delete n[k]
      return n
    })

  // toggling the grouping mode remaps existing subs so work isn't lost:
  //  group→individual: expand each value to all its current occurrences
  //  individual→group: collapse occurrences back by value
  const setGroupingMode = (on: boolean) => {
    setGrouping(on)
    setSubs((prev) => {
      const next: Subs = {}
      if (on) {
        for (const sub of Object.values(prev)) if (!next[sub.value]) next[sub.value] = { ...sub }
      } else {
        for (const sub of Object.values(prev))
          for (const lit of literals) if (lit.value === sub.value) next[String(lit.id)] = { ...sub }
      }
      return next
    })
  }

  const copy = async () => {
    await navigator.clipboard.writeText(outputText(lines))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const subEntries = Object.entries(subs)

  // wrap the selected word in the input with single quotes (trim whitespace the
  // double-click often grabs, and skip if it's already quoted)
  const addQuotes = () => {
    const a = inRef.current
    if (!a) return
    const s = a.selectionStart
    const e = a.selectionEnd
    if (s === e) return
    const raw = sql.slice(s, e)
    const core = raw.trim()
    if (!core || (core.startsWith("'") && core.endsWith("'"))) return
    const leadWs = raw.slice(0, raw.length - raw.trimStart().length)
    const trailWs = raw.slice(raw.trimEnd().length)
    const wrapped = `${leadWs}'${core}'${trailWs}`
    setSql(sql.slice(0, s) + wrapped + sql.slice(e))
    const selStart = s + leadWs.length
    const selEnd = selStart + core.length + 2
    requestAnimationFrame(() => {
      a.focus()
      a.setSelectionRange(selStart, selEnd)
    })
  }

  // reset with a burn-away effect, then clear the input
  const reset = () => {
    if (burning || (!sql && subEntries.length === 0)) return
    setBurning(true)
    setTimeout(() => {
      setSql('')
      setSubs({})
      setBurning(false)
    }, 900)
  }

  return (
    <div className="dq" data-astryx-theme="matcha">
      <header className="dq-bar">
        <ToggleButtonGroup
          label="출력 스타일"
          type="single"
          size="sm"
          value={style}
          onChange={(v) => typeof v === 'string' && setStyle(v as Style)}
        >
          <ToggleButton value="A" label="A 줄마다" />
          <ToggleButton value="B" label="B 단일" />
          <ToggleButton value="C" label="C 선두 ||" />
        </ToggleButtonGroup>
        <div className="dq-var">
          <TextInput label="변수명" isLabelHidden value={varName} onChange={setVarName} size="sm" placeholder="V_SQL" />
        </div>
      </header>

      <div className="dq-main">
        <section className={'dq-panel' + (burning ? ' dq-burning' : '')}>
          <div className="dq-panel-head">
            <span className="dq-panel-title">SQL 입력</span>
            <span className="dq-copy">
              <Button label="따옴표" variant="secondary" size="sm" onClick={addQuotes} tooltip="선택한 단어를 '..' 로 감쌉니다 (딸려온 공백은 제외)" />
              <Button label="초기화" variant="ghost" size="sm" onClick={reset} isDisabled={!sql && subEntries.length === 0} />
            </span>
          </div>
          <div className="dq-in-box">
            {/* mirror behind the textarea: same wrapping, holds the line highlight */}
            <div className="dq-in-mirror" ref={mirrorRef} aria-hidden="true">
              {sql.split('\n').map((ln, i) => (
                <div key={i} className={'dq-in-mline' + (i === hoverLine ? ' lhi' : '')}>
                  {ln === '' ? '​' : ln}
                </div>
              ))}
            </div>
            <textarea
              ref={inRef}
              className="dq-in"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT ... 쿼리를 붙여넣으세요"
              spellCheck={false}
            />
          </div>
        </section>

        <section className="dq-panel">
          <div className="dq-panel-head">
            <span className="dq-panel-title">변환 결과</span>
            <span className="dq-hint">따옴표 리터럴을 클릭하면 변수로 바뀝니다</span>
            <span className="dq-copy">
              <Button
                label={copied ? '복사됨 ✓' : '복사'}
                variant={copied ? 'secondary' : 'primary'}
                size="sm"
                onClick={copy}
                isDisabled={lines.length === 0}
              />
            </span>
          </div>
          <pre className="dq-out" ref={outRef}>
            {lines.length === 0 ? (
              <span className="dq-empty">왼쪽에 쿼리를 넣으면 여기에 변환됩니다.</span>
            ) : (
              lines.map((ln, li) => (
                <div key={li} className={'dq-oline' + (ln.src !== null && ln.src === hoverLine ? ' lhi' : '')}>
                  {ln.parts.map((p, i) => {
                    if (p.t !== 'lit') return <span key={i}>{p.s}</span>
                    const k = keyOf(p.id!, p.value!)
                    const isVar = subs[k] !== undefined
                    return (
                      <span
                        key={i}
                        className={'dq-lit' + (isVar ? ' on' : '') + (isVar && hoverKey === k ? ' hi' : '')}
                        onClick={() => toggleLit(p.id!, p.value!)}
                        onMouseEnter={() => isVar && setHoverKey(k)}
                        onMouseLeave={() => isVar && setHoverKey(null)}
                        title="클릭: 변수화 토글"
                      >
                        {p.s}
                      </span>
                    )
                  })}
                </div>
              ))
            )}
          </pre>
        </section>
      </div>

      <section className="dq-panel dq-subs">
        <div className="dq-panel-head">
          <span className="dq-panel-title">치환 목록</span>
          {subEntries.length > 0 && <Badge variant="info" label={String(subEntries.length)} />}
          <span className="dq-copy">
            <CheckboxInput
              label="동일 문자열 그룹핑"
              size="sm"
              value={grouping}
              onChange={(checked) => setGroupingMode(checked)}
            />
          </span>
        </div>
        {subEntries.length === 0 ? (
          <span className="dq-hint">오른쪽에서 따옴표 리터럴을 클릭하면 여기에 추가됩니다.</span>
        ) : (
          <div className="dq-sub-list">
            {subEntries.map(([k, sub]) => (
              <div
                className={'dq-sub' + (hoverKey === k ? ' hi' : '')}
                key={k}
                onMouseEnter={() => setHoverKey(k)}
                onMouseLeave={() => setHoverKey(null)}
              >
                <Badge variant="neutral" label={`''${sub.value}''`} />
                <span className="dq-arrow">→</span>
                <div className="dq-sub-input">
                  <TextInput
                    label="변수명"
                    isLabelHidden
                    value={sub.name}
                    onChange={(v) => setVar(k, v)}
                    size="sm"
                    placeholder="변수명"
                  />
                </div>
                <Button label="삭제" variant="ghost" size="sm" onClick={() => removeSub(k)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
