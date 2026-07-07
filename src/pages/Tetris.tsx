import { useEffect, useRef, useState } from 'react'
import './Tetris.css'

const BLOCK_SIZE = 30
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 1000
const MIN_SPEED = 100
const SPEED_FACTOR = 0.9
const PLACED_BLOCK_COLOR = '#006666'

type Shape = number[][]
const SHAPES: Record<string, { shape: Shape; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  T: { shape: [[1, 1, 1], [0, 1, 0]], color: '#a000f0' },
  L: { shape: [[1, 1, 1], [1, 0, 0]], color: '#f0a000' },
  J: { shape: [[1, 1, 1], [0, 0, 1]], color: '#0000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
}

const emptyBoard = (): (string | 0)[][] =>
  Array.from({ length: BOARD_HEIGHT }, () => Array<string | 0>(BOARD_WIDTH).fill(0))

type Game = {
  board: (string | 0)[][]
  currentPiece: Shape | null
  currentPieceX: number
  currentPieceY: number
  currentColor: string
  nextPiece: Shape | null
  nextColor: string
  status: 'ready' | 'playing' | 'gameover'
}

export default function Tetris() {
  const boardRef = useRef<HTMLCanvasElement>(null)
  const nextRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoreRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const game = useRef<Game>({
    board: emptyBoard(),
    currentPiece: null,
    currentPieceX: 0,
    currentPieceY: 0,
    currentColor: '',
    nextPiece: null,
    nextColor: '',
    status: 'ready',
  })

  const [status, setStatusState] = useState<Game['status']>('ready')
  const [score, setScore] = useState(0)
  const setStatus = (s: Game['status']) => {
    game.current.status = s
    setStatusState(s)
  }

  const randomPiece = () => {
    const keys = Object.keys(SHAPES)
    return SHAPES[keys[Math.floor(Math.random() * keys.length)]]
  }

  const drawNextPiece = () => {
    const canvas = nextRef.current
    const piece = game.current.nextPiece
    if (!canvas || !piece) return
    const ctx = canvas.getContext('2d')!
    const size = 25
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const offsetX = (canvas.width - piece[0].length * size) / 2
    const offsetY = (canvas.height - piece.length * size) / 2
    ctx.fillStyle = game.current.nextColor
    for (let y = 0; y < piece.length; y++)
      for (let x = 0; x < piece[y].length; x++)
        if (piece[y][x]) {
          ctx.fillRect(offsetX + x * size, offsetY + y * size, size - 1, size - 1)
          ctx.shadowColor = game.current.nextColor
          ctx.shadowBlur = 10
          ctx.fillRect(offsetX + x * size, offsetY + y * size, size - 1, size - 1)
          ctx.shadowBlur = 0
        }
  }

  const createPiece = () => {
    const g = game.current
    if (g.nextPiece === null) {
      const p = randomPiece()
      g.nextPiece = p.shape
      g.nextColor = p.color
    }
    g.currentPiece = g.nextPiece
    g.currentColor = g.nextColor
    g.currentPieceX = Math.floor(BOARD_WIDTH / 2) - Math.floor(g.currentPiece![0].length / 2)
    g.currentPieceY = 0
    const p = randomPiece()
    g.nextPiece = p.shape
    g.nextColor = p.color
    drawNextPiece()
  }

  const collision = (
    x = game.current.currentPieceX,
    y = game.current.currentPieceY,
    piece = game.current.currentPiece,
  ): boolean => {
    if (!piece) return false
    for (let r = 0; r < piece.length; r++)
      for (let c = 0; c < piece[r].length; c++)
        if (piece[r][c]) {
          const newX = x + c
          const newY = y + r
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true
          if (newY >= 0 && game.current.board[newY][newX]) {
            if (newY === 0) gameOver()
            return true
          }
        }
    return false
  }

  const getGhostPosition = () => {
    let ghostY = game.current.currentPieceY
    while (!collision(game.current.currentPieceX, ghostY + 1, game.current.currentPiece)) ghostY++
    return ghostY
  }

  const drawBoard = () => {
    const ctx = ctxRef.current
    const canvas = boardRef.current
    if (!ctx || !canvas) return
    const g = game.current
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < BOARD_HEIGHT; y++)
      for (let x = 0; x < BOARD_WIDTH; x++)
        if (g.board[y][x]) {
          ctx.fillStyle = PLACED_BLOCK_COLOR
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
          ctx.fillStyle = '#008080'
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, 2)
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 2, BLOCK_SIZE - 1)
          ctx.fillStyle = '#004d4d'
          ctx.fillRect(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE - 2, BLOCK_SIZE - 1, 2)
          ctx.fillRect((x + 1) * BLOCK_SIZE - 2, y * BLOCK_SIZE, 2, BLOCK_SIZE - 1)
        }

    if (g.currentPiece) {
      if (scoreRef.current < 1000) {
        const ghostY = getGhostPosition()
        ctx.fillStyle = `${g.currentColor}40`
        for (let y = 0; y < g.currentPiece.length; y++)
          for (let x = 0; x < g.currentPiece[y].length; x++)
            if (g.currentPiece[y][x])
              ctx.fillRect((g.currentPieceX + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
      }
      ctx.fillStyle = g.currentColor
      for (let y = 0; y < g.currentPiece.length; y++)
        for (let x = 0; x < g.currentPiece[y].length; x++)
          if (g.currentPiece[y][x]) {
            ctx.fillRect((g.currentPieceX + x) * BLOCK_SIZE, (g.currentPieceY + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
            ctx.shadowColor = g.currentColor
            ctx.shadowBlur = 5
            ctx.fillRect((g.currentPieceX + x) * BLOCK_SIZE, (g.currentPieceY + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
            ctx.shadowBlur = 0
          }
    }
  }

  const mergePiece = () => {
    const g = game.current
    for (let y = 0; y < g.currentPiece!.length; y++)
      for (let x = 0; x < g.currentPiece![y].length; x++)
        if (g.currentPiece![y][x])
          g.board[g.currentPieceY + y][g.currentPieceX + x] = PLACED_BLOCK_COLOR
  }

  const updateScore = (clearedLines: number) => {
    const prevThousand = Math.floor(scoreRef.current / 1000)
    scoreRef.current += clearedLines * 100
    setScore(scoreRef.current)
    const curThousand = Math.floor(scoreRef.current / 1000)
    if (curThousand > prevThousand && intervalRef.current) {
      const newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED * Math.pow(SPEED_FACTOR, curThousand))
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(gameLoop, newSpeed)
      speedRef.current = newSpeed
    }
  }

  const checkLines = () => {
    const g = game.current
    const linesToRemove: number[] = []
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--)
      if (g.board[y].every((cell) => cell)) linesToRemove.push(y)
    if (linesToRemove.length === 0) return
    let flash = 0
    const flashInterval = setInterval(() => {
      flash++
      const ctx = ctxRef.current!
      for (const y of linesToRemove) {
        ctx.fillStyle = flash % 2 === 0 ? '#FFFFFF' : '#FFFF00'
        for (let x = 0; x < BOARD_WIDTH; x++)
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
      }
      if (flash >= 4) {
        clearInterval(flashInterval)
        linesToRemove.forEach((y) => {
          g.board.splice(y, 1)
          g.board.unshift(Array<string | 0>(BOARD_WIDTH).fill(0))
        })
        updateScore(linesToRemove.length)
        drawBoard()
      }
    }, 100)
  }

  const hardDrop = () => {
    if (game.current.status !== 'playing') return
    while (!collision()) game.current.currentPieceY++
    game.current.currentPieceY--
    mergePiece()
    checkLines()
    createPiece()
    if (collision()) return gameOver()
    drawBoard()
  }

  const gameOver = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setStatus('gameover')
    drawBoard()
  }

  const gameLoop = () => {
    if (game.current.status !== 'playing') return
    game.current.currentPieceY++
    if (collision()) {
      game.current.currentPieceY--
      mergePiece()
      checkLines()
      createPiece()
      if (collision()) return gameOver()
    }
    drawBoard()
  }

  const startGame = () => {
    game.current.board = emptyBoard()
    game.current.currentPiece = null
    game.current.currentPieceX = 0
    game.current.currentPieceY = 0
    game.current.nextPiece = null
    scoreRef.current = 0
    setScore(0)
    speedRef.current = INITIAL_SPEED
    setStatus('playing')
    createPiece()
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(gameLoop, speedRef.current)
    drawBoard()
  }

  useEffect(() => {
    ctxRef.current = boardRef.current!.getContext('2d')
    drawBoard()
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === ' ') e.preventDefault()
      if (game.current.status !== 'playing') return
      e.preventDefault()
      const g = game.current
      switch (e.key) {
        case 'ArrowLeft':
          g.currentPieceX--
          if (collision()) g.currentPieceX++
          break
        case 'ArrowRight':
          g.currentPieceX++
          if (collision()) g.currentPieceX--
          break
        case 'ArrowDown':
          g.currentPieceY++
          if (collision()) g.currentPieceY--
          break
        case 'ArrowUp': {
          const rotated = g.currentPiece![0].map((_, i) =>
            g.currentPiece!.map((row) => row[i]).reverse(),
          )
          const prev = g.currentPiece
          g.currentPiece = rotated
          if (collision()) g.currentPiece = prev
          break
        }
        case ' ':
          hardDrop()
          break
      }
      drawBoard()
    }
    window.addEventListener('keydown', handleKeydown, { passive: false })
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="tetris-game">
      {status === 'ready' && (
        <div className="game-overlay start-overlay">
          <div className="message-box">
            <h2>TETRIS</h2>
            <p>PRESS START</p>
            <button onClick={startGame}>START</button>
          </div>
        </div>
      )}
      {status === 'gameover' && (
        <div className="game-overlay end-overlay">
          <div className="message-box">
            <h2>GAME OVER</h2>
            <p>SCORE: {score}</p>
            <button onClick={startGame}>RESTART</button>
          </div>
        </div>
      )}

      <div className="tetris">
        <div className="stars-effect" />
        <div className="background">
          <div className="text-container" aria-hidden="true">
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n}>Hannim</span>
            ))}
          </div>
        </div>

        <div className="game-layout">
          <div className="canvas-container">
            <canvas ref={boardRef} width={300} height={600} />
            <div className="neon-border" />
          </div>

          <div className="info-panel">
            <div className="score-board">
              <div className="digital-display">
                <div className="display-label">SCORE</div>
                <div className="display-value">{String(score).padStart(6, '0')}</div>
              </div>
            </div>
            <div className="next-piece">
              <div className="preview-label">NEXT</div>
              <canvas ref={nextRef} width={120} height={120} />
              <div className="neon-border" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
