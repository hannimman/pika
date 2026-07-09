import { useEffect, useMemo, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Slider } from '@astryxdesign/core/Slider'
import { Badge } from '@astryxdesign/core/Badge'
import './QR.css'

// qrfont-3L: byte-mode, printable ASCII, up to 53 chars (29×29 modules).
const MAX = 53

export default function QR() {
  const [text, setText] = useState('')
  const [size, setSize] = useState(160) // QR 크기 = 폰트 크기(px)
  // 플레이그라운드: 날것 텍스트를 그대로 폰트로 렌더 (대괄호만 QR 로 변신)
  const [play, setPlay] = useState('hello [hello]\npika [https://hannimman.github.io/pika/]')
  const [playSize, setPlaySize] = useState(40)
  // 4.3MB 폰트는 첫 렌더 후 늦게 도착 → 로드되면 결과 노드를 강제 재-셰이핑(검은 줄 방지)
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    let alive = true
    document.fonts.ready.then(() => alive && setFontReady(true))
    return () => {
      alive = false
    }
  }, [])
  const shapeKey = fontReady ? 'r' : 'l'
  // the font only speaks printable ASCII; anything else won't encode
  const ascii = useMemo(
    () => [...text].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126),
    [text],
  )
  const tooLong = text.length > MAX
  const ok = text.length > 0 && ascii && !tooLong

  const hint = tooLong
    ? '너무 길어요 — 53자 이하로.'
    : !ascii && text
      ? '한글·특수문자는 못 담아요 (ASCII 전용).'
      : '내용을 입력하면 QR이 나타납니다.'

  return (
    <div className="qr" data-astryx-theme="matcha">
      <header className="qr-bar">
        <div className="qr-title">
          QR 코드 <span className="qr-sub">폰트로 그리는 QR · ASCII 전용 · 최대 {MAX}자</span>
        </div>
      </header>

      <div className="qr-main">
        <section className="qr-panel">
          <TextInput
            label="내용 (URL·영문·숫자)"
            value={text}
            onChange={setText}
            placeholder="https://example.com"
          />
          <div className="qr-meta">
            <Badge variant={tooLong ? 'error' : 'neutral'} label={`${text.length}/${MAX}`} />
            {!ascii && text && <Badge variant="error" label="ASCII만 가능" />}
          </div>
          <Slider
            label="크기"
            min={24}
            max={240}
            step={4}
            value={size}
            onChange={(v) => typeof v === 'number' && setSize(v)}
            formatValue={(v) => `${v}px`}
            valueDisplay="text"
          />
        </section>

        <section className="qr-panel qr-out">
          {ok ? (
            <div key={shapeKey} className="qr-code" style={{ fontSize: `${size}px` }}>{`[${text}]`}</div>
          ) : (
            <div className="qr-empty">{hint}</div>
          )}
        </section>
      </div>

      <section className="qr-panel qr-play">
        <div className="qr-play-head">
          <span className="qr-play-title">플레이그라운드</span>
        </div>
        <div className="qr-play-grid">
          <textarea
            className="qr-play-in"
            value={play}
            onChange={(e) => setPlay(e.target.value)}
            spellCheck={false}
            placeholder="pika [hello] 처럼 아무거나…"
          />
          <textarea
            key={shapeKey}
            className="qr-play-out"
            style={{ fontSize: `${playSize}px` }}
            value={play}
            onChange={(e) => setPlay(e.target.value)}
            spellCheck={false}
          />
        </div>
        <Slider
          label="크기"
          min={16}
          max={160}
          step={2}
          value={playSize}
          onChange={(v) => typeof v === 'number' && setPlaySize(v)}
          formatValue={(v) => `${v}px`}
          valueDisplay="text"
        />
      </section>
    </div>
  )
}
