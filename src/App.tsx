import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AppShell } from '@astryxdesign/core/AppShell'
import { SideNav, SideNavHeading, SideNavSection, SideNavItem } from '@astryxdesign/core/SideNav'
import { Banner } from '@astryxdesign/core/Banner'
import Home from './pages/Home'
import Embed from './pages/Embed'
import Tetris from './pages/Tetris'
import Quote from './pages/Quote/QuotePage'
import { HomeIcon, QuoteIcon, BlocksIcon } from './icons'

// One nav table drives both the menu and the routes.
const NAV = [
  { path: '/', label: '홈', icon: HomeIcon, el: <Home /> },
  { path: '/quote', label: '따옴표', icon: QuoteIcon, el: <Quote /> },
  { path: '/oracle', label: '변수', icon: 'wrench', el: <Embed src="https://hannimman.github.io/oracle-var-resolver/" title="oracle-var-resolver" /> },
  { path: '/tetris', label: '벽돌', icon: BlocksIcon, el: <Tetris /> },
]

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [joke, setJoke] = useState<string | null>(null)

  // auto-dismiss the joke banner
  useEffect(() => {
    if (!joke) return
    const t = setTimeout(() => setJoke(null), 2600)
    return () => clearTimeout(t)
  }, [joke])

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      sideNav={
        <SideNav collapsible header={<SideNavHeading heading="pika pika ⚡" headingHref="#/" />}>
          <SideNavSection title="누르세요">
            {NAV.map((n) => (
              <SideNavItem
                key={n.path}
                label={n.label}
                icon={n.icon}
                isSelected={pathname === n.path}
                onClick={() => navigate(n.path)}
              />
            ))}
          </SideNavSection>

          <SideNavSection title="누르지마세요" subtitle="눌러도 없음">
            <SideNavItem label="없음1" icon="stop" onClick={() => setJoke('없음 🚫')} />
            <SideNavItem label="없음2" icon="stop" onClick={() => setJoke('없음 🚭')} />
          </SideNavSection>
        </SideNav>
      }
    >
      {joke && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'min(420px, 90vw)' }}>
          <Banner status="error" title={joke} isDismissable onDismiss={() => setJoke(null)} />
        </div>
      )}
      <Routes>
        {NAV.map((n) => (
          <Route key={n.path} path={n.path} element={n.el} />
        ))}
      </Routes>
    </AppShell>
  )
}
