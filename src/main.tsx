import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
// theme LAST so its tokens win over astryx.css's built-in default theme
import '@astryxdesign/theme-matcha/theme.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
