import { useNavigate } from 'react-router-dom'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import './Home.css'

const TOOLS = [
  { to: '/quote', emoji: '❝', title: '따옴표', desc: '따옴표 마법사', tag: 'TOOL' },
  { to: '/oracle', emoji: '🔮', title: '변수', desc: 'Oracle 바인드 변수 치환기', tag: 'IFRAME' },
  { to: '/tetris', emoji: '💫', title: '벽돌', desc: '벽돌공장', tag: 'GAME' },
]

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="home">
      <section className="home-hero">
        <p className="home-eyebrow">PERSONAL PLAYGROUND</p>
        <h1 className="home-wordmark">
          pika pika
          <svg className="home-bolt" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
        </h1>
        <p className="home-tagline">별거 없는 도구 몇 개랑 게임 하나.</p>
      </section>

      <section className="home-tools">
        {TOOLS.map((t) => (
          <ClickableCard key={t.to} label={t.title} onClick={() => navigate(t.to)} padding={5}>
            <div className="tool">
              <span className="tool-emoji" aria-hidden="true">{t.emoji}</span>
              <div className="tool-body">
                <span className="tool-tag">{t.tag}</span>
                <h2 className="tool-title">{t.title}</h2>
                <p className="tool-desc">{t.desc}</p>
              </div>
              <span className="tool-arrow" aria-hidden="true">→</span>
            </div>
          </ClickableCard>
        ))}
      </section>
    </div>
  )
}
