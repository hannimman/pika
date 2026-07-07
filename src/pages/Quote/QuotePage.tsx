import { useMemo, useRef, useState } from 'react'
import { TextArea } from '@astryxdesign/core/TextArea'
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Button } from '@astryxdesign/core/Button'
import { makeOutput, makeCustom, countEmoji, type QuoteChar } from './quote'
import Pikachu, { type PikachuHandle } from './Pikachu'
import './Quote.css'

const QUOTE_CHAR: Record<string, QuoteChar> = { single: "'", double: '"', none: '' }

export default function Quote() {
  const [input, setInput] = useState('')
  const [useNewline, setUseNewline] = useState(true)
  const [quoteKey, setQuoteKey] = useState<'single' | 'double' | 'none'>('single')
  const [upper, setUpper] = useState(true)
  const [withComma, setWithComma] = useState(true)
  const [bolt, setBolt] = useState('')

  const pika = useRef<PikachuHandle>(null)

  const output = useMemo(
    () => makeOutput(input, { useNewline, quoteChar: QUOTE_CHAR[quoteKey], withComma }),
    [input, useNewline, quoteKey, withComma],
  )
  const custom = useMemo(
    () => makeCustom(output.text, { upper, withComma }),
    [output.text, upper, withComma],
  )

  const placeholder = useNewline
    ? '엔터(New line)로 값을 분리합니다\n\nvalue1\nvalue2\nvalue3\n...'
    : '콤마로 값을 분리합니다\n\n👉 value1, value2, value3...'

  const reset = () => {
    setInput('')
    pika.current?.reset()
  }

  return (
    <div className="quote" data-astryx-theme="matcha">
      <div className="quote-pika">
        <Pikachu ref={pika} onLabel={setBolt} />
      </div>

      <div className="quote-grid">
        {/* INPUT */}
        <section className="quote-col">
          <header className="quote-head">
            <div className="quote-head-top">
              <h2 className="quote-title">INPUT</h2>
              <div className="quote-head-actions">
                <span className="quote-bolt">{bolt}</span>
                <Button label="리셋" variant="destructive" size="sm" onClick={reset} />
              </div>
            </div>
            <div className="quote-head-controls">
              <ToggleButtonGroup
                label="구분자"
                type="single"
                size="sm"
                value={useNewline ? 'newline' : 'comma'}
                onChange={(v) => typeof v === 'string' && setUseNewline(v === 'newline')}
              >
                <ToggleButton value="newline" label="엔터" />
                <ToggleButton value="comma" label="콤마" />
              </ToggleButtonGroup>
            </div>
          </header>
          <TextArea
            label="INPUT"
            isLabelHidden
            value={input}
            onChange={setInput}
            placeholder={placeholder}
            hasSpellCheck={false}
          />
        </section>

        {/* OUTPUT */}
        <section className="quote-col">
          <header className="quote-head">
            <div className="quote-head-top">
              <h2 className="quote-title">
                OUTPUT <span className="quote-count">{output.count ? '💁‍♀️' + countEmoji(output.count) : ''}</span>
              </h2>
              <CopyButton text={output.text} />
            </div>
            <div className="quote-head-controls">
              <CheckboxInput label="Comma" size="sm" value={withComma} onChange={setWithComma} />
              <ToggleButtonGroup
                label="따옴표"
                type="single"
                size="sm"
                value={quoteKey}
                onChange={(v) => typeof v === 'string' && setQuoteKey(v as 'single' | 'double' | 'none')}
              >
                <ToggleButton value="single" label="Single" />
                <ToggleButton value="double" label="Double" />
                <ToggleButton value="none" label="None" />
              </ToggleButtonGroup>
            </div>
          </header>
          <TextArea label="OUTPUT" isLabelHidden value={output.text} onChange={() => {}} hasSpellCheck={false} />
        </section>

        {/* CUSTOM */}
        <section className="quote-col">
          <header className="quote-head">
            <div className="quote-head-top">
              <h2 className="quote-title">CUSTOM</h2>
              <CopyButton text={custom} />
            </div>
            <div className="quote-head-controls">
              <ToggleButtonGroup
                label="대소문자"
                type="single"
                size="sm"
                value={upper ? 'upper' : 'lower'}
                onChange={(v) => typeof v === 'string' && setUpper(v === 'upper')}
              >
                <ToggleButton value="upper" label="Upper" />
                <ToggleButton value="lower" label="Lower" />
              </ToggleButtonGroup>
            </div>
          </header>
          <TextArea label="CUSTOM" isLabelHidden value={custom} onChange={() => {}} hasSpellCheck={false} />
        </section>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState('Copy')
  const copy = async () => {
    if (!text) {
      setLabel('Empty!')
      setTimeout(() => setLabel('Copy'), 1000)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setLabel('Copied!')
    } catch {
      setLabel('Failed!')
    }
    setTimeout(() => setLabel('Copy'), 1000)
  }
  return <Button label={label} variant="secondary" size="sm" onClick={copy} />
}
