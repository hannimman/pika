# pika ⚡

개인 놀이터 사이트. **React + Vite + TypeScript**로 재작성했고, UI는 [astryx](https://astryx.atmeta.com) 디자인 시스템(Meta 오픈소스)으로 만듭니다.

메뉴: 따옴표(QuoteMaker) · Oracle 변수(oracle-var-resolver) · 벽돌(Tetris) · astryx 쇼케이스
(이전 Vue 버전의 DateWizard는 제거됨)

## 개발

```bash
npm install
npm run dev        # http://localhost:5173/pika/
npm run build      # dist/ 생성 (GitHub Pages base = /pika/)
```

## astryx 사용법

### 1. 설치 (이미 되어 있음)

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex
```

`src/main.tsx`에서 CSS를 불러오고(순서 중요), `index.html`의 `<html>`에 테마 속성을 답니다:

```tsx
import '@astryxdesign/core/reset.css'
import '@astryxdesign/theme-neutral/theme.css'
import '@astryxdesign/core/astryx.css'
```
```html
<html data-astryx-theme="neutral">
```
> astryx는 **미리 컴파일된 CSS**를 제공하므로 StyleX 번들러 플러그인이 필요 없습니다.

### 2. CLI로 컴포넌트 찾기 (`npm run xds -- <cmd>`)

```bash
npm run xds -- build "설정 페이지"       # 아이디어 → 페이지/블록/컴포넌트 키트
npm run xds -- component                # 컴포넌트 목록
npm run xds -- component Button --dense  # 특정 컴포넌트 props + 예시
npm run xds -- template --list          # 페이지 템플릿
```

### 3. Claude(나)와 함께 쓰기

- **agent 문서**: `.claude/CLAUDE.md`가 `npx astryx init --features agents --agent claude`로 생성됨.
  Claude가 astryx 규칙(예: "div 대신 컴포넌트로 레이아웃")을 자동으로 따릅니다.
- **MCP 서버**(선택): 아래를 프로젝트 루트 `.mcp.json`에 넣으면 Claude가 CLI 없이 astryx 문서를 직접 조회합니다.
  시작 시 원격 서버(atmeta.com)에 연결되므로 **직접 추가/승인**하세요:

  ```json
  {
    "mcpServers": {
      "xds": { "type": "http", "url": "https://astryx.atmeta.com/mcp" }
    }
  }
  ```

## 구조

```
index.html            data-astryx-theme="matcha" (라이트/다크 자동 적응)
src/main.tsx          CSS 로드 + HashRouter (GitHub Pages라 hash 라우팅)
src/App.tsx           AppShell + SideNav 셸, NAV 테이블이 메뉴+라우트 동시 구동, 농담 메뉴는 astryx Banner
src/pages/Home.tsx    디자인된 랜딩 (⚡ 히어로 + 도구 ClickableCard) — astryx가 실제로 빛나는 곳
src/pages/Embed.tsx   공용 iframe 페이지 (QuoteMaker, oracle-var-resolver)
src/pages/Tetris.tsx  캔버스 테트리스 (기존 Vue 로직 포팅)
```
