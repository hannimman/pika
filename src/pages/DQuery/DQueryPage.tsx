import { useEffect, useMemo, useRef, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { buildLines, outputText, findLiterals, type Style, type Subs } from './dquery'
import './DQuery.css'

export default function DQuery() {
  const [sql, setSql] = useState('')
  const [style, setStyle] = useState<Style>('A')
  const [varName, setVarName] = useState('V_SQL')
  const [subs, setSubs] = useState<Subs>({})
  const [copied, setCopied] = useState(false)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [hoverLine, setHoverLine] = useState<number | null>(null)
  const [burning, setBurning] = useState(false)

  const lines = useMemo(() => buildLines(sql, { style, varName, subs }), [sql, style, varName, subs])
  const literals = useMemo(() => findLiterals(sql), [sql])
  const valueOf = (id: number) => literals.find((l) => l.id === id)?.value ?? ''

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

  // click a literal in the output to toggle it into/out of a variable
  const toggleLit = (id: number) =>
    setSubs((s) => {
      if (id in s) {
        const n = { ...s }
        delete n[id]
        return n
      }
      return { ...s, [id]: 'P_VAR' + (Object.keys(s).length + 1) }
    })
  const setVar = (id: number, name: string) => setSubs((s) => ({ ...s, [id]: name }))
  const removeSub = (id: number) =>
    setSubs((s) => {
      const n = { ...s }
      delete n[id]
      return n
    })

  const copy = async () => {
    await navigator.clipboard.writeText(outputText(lines))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const subIds = Object.keys(subs).map(Number)

  // reset with a burn-away effect, then clear the input
  const reset = () => {
    if (burning || (!sql && subIds.length === 0)) return
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
              <Button label="초기화" variant="ghost" size="sm" onClick={reset} isDisabled={!sql && subIds.length === 0} />
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
                    const isVar = subs[p.id!] !== undefined
                    return (
                      <span
                        key={i}
                        className={'dq-lit' + (isVar ? ' on' : '') + (isVar && hoverId === p.id ? ' hi' : '')}
                        onClick={() => toggleLit(p.id!)}
                        onMouseEnter={() => isVar && setHoverId(p.id!)}
                        onMouseLeave={() => isVar && setHoverId(null)}
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

      {subIds.length > 0 && (
        <section className="dq-panel dq-subs">
          <div className="dq-panel-head">
            <span className="dq-panel-title">치환 목록</span>
            <Badge variant="info" label={String(subIds.length)} />
          </div>
          <div className="dq-sub-list">
            {subIds.map((id) => (
              <div
                className={'dq-sub' + (hoverId === id ? ' hi' : '')}
                key={id}
                onMouseEnter={() => setHoverId(id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <Badge variant="neutral" label={`''${valueOf(id)}''`} />
                <span className="dq-arrow">→</span>
                <div className="dq-sub-input">
                  <TextInput
                    label="변수명"
                    isLabelHidden
                    value={subs[id]}
                    onChange={(v) => setVar(id, v)}
                    size="sm"
                    placeholder="변수명"
                  />
                </div>
                <Button label="삭제" variant="ghost" size="sm" onClick={() => removeSub(id)} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
