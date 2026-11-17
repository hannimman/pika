import { useEffect, useMemo, useState } from 'react'
import { Markdown } from '@astryxdesign/core/Markdown'
import raw from './manual.md?raw'
import { parseManual } from './parse'
import './Folio.css'

// images/xx.png → Vite-hashed URLs, so the manual's relative paths work after build
const IMAGES = import.meta.glob('./images/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const BAT_URL = `${import.meta.env.BASE_URL}FolioMD-install.bat`

const resolve = (md: string) =>
  md
    .replace(/\]\((images\/[^)]+)\)/g, (m, p) => (IMAGES[`./${p}`] ? `](${IMAGES[`./${p}`]})` : m))
    .replaceAll('__BAT__', BAT_URL)

// Replaces astryx's CodeBlock (faint icon-only copy button, side-scrolling) for
// paste-into-terminal commands: whole command visible + an obvious labeled copy button.
function CommandBlock({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), 1800)
    return () => clearTimeout(t)
  }, [state])
  const copy = () => navigator.clipboard.writeText(code).then(() => setState('ok'), () => setState('fail'))
  return (
    <div className="folio-cmd">
      <span className="folio-cmd-prompt" aria-hidden="true">&gt;_</span>
      <code>{code}</code>
      <button type="button" className={`folio-cmd-copy ${state === 'ok' ? 'is-ok' : ''}`} onClick={copy}>
        {state === 'ok' ? '✓ 복사됨' : state === 'fail' ? '직접 선택해 복사하세요' : '📋 복사'}
      </button>
    </div>
  )
}
const MD_COMPONENTS = { code: CommandBlock }

const sectionId = (n: number) => `folio-${n}`
const pad = (n: number) => String(n).padStart(2, '0')

export default function FolioPage() {
  const { tagline, heroImage, sections } = useMemo(() => parseManual(resolve(raw)), [])
  const [active, setActive] = useState(1)
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  // scroll-spy: last section whose top has passed the upper third of the viewport.
  // capture=true because AppShell's content pane scrolls, not the window.
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight / 3
      let cur = sections[0]?.num ?? 1
      for (const s of sections) {
        const el = document.getElementById(sectionId(s.num))
        if (el && el.getBoundingClientRect().top <= line) cur = s.num
      }
      // short final section can't reach the line — once it's fully visible, it wins
      const last = sections.at(-1)
      const lastEl = last && document.getElementById(sectionId(last.num))
      if (lastEl && lastEl.getBoundingClientRect().bottom <= window.innerHeight) cur = last.num
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [sections])

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const goTo = (n: number) => document.getElementById(sectionId(n))?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // in-manual anchors like (#10-업데이트) → section 10; HashRouter would otherwise treat them as routes
  const onLinkClick = (href: string) => {
    const m = href.match(/^#(\d+)-/)
    if (!m) return
    goTo(Number(m[1]))
    return false as const
  }

  const onContentClick = (e: React.MouseEvent) => {
    const t = e.target
    if (t instanceof HTMLImageElement) setZoom({ src: t.src, alt: t.alt })
  }

  return (
    <div className="folio">
      <header className="folio-hero">
        <div className="folio-hero-text">
          <p className="folio-eyebrow">USER MANUAL · WINDOWS</p>
          <h1 className="folio-title">
            Folio<span>MD</span>
          </h1>
          <Markdown className="folio-tagline">{tagline}</Markdown>
          <div className="folio-actions">
            <button type="button" className="folio-btn folio-btn-primary" onClick={() => goTo(1)}>
              설치하러 가기 →
            </button>
            <a className="folio-btn" href={BAT_URL} download>
              ⬇ 망분리 PC용 설치 파일(.bat)
            </a>
          </div>
        </div>
        {heroImage && (
          <button type="button" className="folio-hero-shot" onClick={() => setZoom(heroImage)} aria-label="첫 화면 크게 보기">
            <img src={heroImage.src} alt={heroImage.alt} />
          </button>
        )}
      </header>

      <div className="folio-body">
        <nav className="folio-toc" aria-label="목차">
          <p className="folio-toc-title">목차</p>
          <ol>
            {sections.map((s) => (
              <li key={s.num}>
                <button type="button" className={active === s.num ? 'is-active' : ''} onClick={() => goTo(s.num)}>
                  <span className="folio-toc-num">{pad(s.num)}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="folio-content" onClick={onContentClick}>
          {sections.map((s) => (
            <section key={s.num} id={sectionId(s.num)} className="folio-section">
              <h2 className="folio-h2">
                <span className="folio-h2-num">{pad(s.num)}</span>
                {s.title}
              </h2>
              <Markdown autolink="gfm" contentWidth="100%" onLinkClick={onLinkClick} components={MD_COMPONENTS}>
                {s.body}
              </Markdown>
            </section>
          ))}
        </main>
      </div>

      {zoom && (
        <div className="folio-zoom" role="dialog" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <img src={zoom.src} alt={zoom.alt} />
          {zoom.alt && <p>{zoom.alt}</p>}
        </div>
      )}
    </div>
  )
}
