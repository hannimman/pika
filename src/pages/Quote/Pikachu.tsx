import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// ponytail: faithful port of QuoteMaker/js/pikachu.js — the physics constants are
// hand-tuned, so the animation logic is kept verbatim; only the wiring (canvas ref,
// label callback, reset handle, cleanup) is adapted to React.

export interface PikachuHandle {
  reset: () => void
}

const Pikachu = forwardRef<PikachuHandle, { onLabel?: (s: string) => void }>(({ onLabel }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resetRef = useRef<() => void>(() => {})
  const onLabelRef = useRef(onLabel)
  onLabelRef.current = onLabel

  useImperativeHandle(ref, () => ({ reset: () => resetRef.current() }), [])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const setLabel = (s: string) => onLabelRef.current?.(s)

    const PIKA_FALLBACK_URL =
      'https://raw.githubusercontent.com/jeanguyomarch/pikalogy/master/images/pika_01.png'
    const GROUND_RATIO = 80 / 150
    const GROUND_STEP = 2
    const JUMP_STEP = 3
    const JUMP_FRAMES = 17
    const JUMP_PERIOD_MIN = 80

    let groundY = 80
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

    const bg = new Image()
    bg.src = `${import.meta.env.BASE_URL}back.jpg`

    const pikaImg = new Image()
    fetch(PIKA_FALLBACK_URL)
      .then((res) => res.blob())
      .then((blob) => {
        pikaImg.src = URL.createObjectURL(blob)
      })
      .catch(() => {
        pikaImg.src = PIKA_FALLBACK_URL
      })

    function resizeCanvas() {
      const parent = canvas.parentElement!
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      groundY = Math.round(canvas.height * GROUND_RATIO)
      pikas.forEach((p) => {
        if (!p.isJumping) p.y = groundY
      })
    }

    let bgX = 0
    const BG_SPEED = 1

    class Pikachu {
      x = 0
      y = groundY
      width = 30
      height = 30
      speed = 1
      dir = 1
      angle = 0
      lucky = false
      superLucky = false
      jumpPoint = JUMP_PERIOD_MIN
      jumpTimer = 0
      jumpSwitch = false
      isJumping = false
      hero = false
      order = 0
      name = '조상님'

      draw() {
        if (pikaImg.complete && pikaImg.naturalWidth) {
          if (this.dir === -1) {
            ctx.save()
            ctx.translate(this.x - this.width, this.y)
            ctx.scale(-1, 1)
            ctx.drawImage(pikaImg, -pikaImg.width, 0)
            ctx.restore()
          } else {
            ctx.drawImage(pikaImg, this.x - this.width, this.y)
          }
        }
        this.drawName(this.y - 3)
      }

      rotate() {
        this.angle += this.superLucky ? 1 : Math.PI / 18
        ctx.save()
        ctx.translate(this.x - this.width, this.y)
        ctx.rotate(this.angle)
        if (pikaImg.complete && pikaImg.naturalWidth) {
          ctx.drawImage(pikaImg, -pikaImg.width / 2, -pikaImg.height / 2)
        }
        ctx.restore()
        this.drawName(this.y - 20)
      }

      drawName(textY: number) {
        if (this.name.length === 0) return
        ctx.font = 'bold 13px 맑은고딕'
        const spriteW = pikaImg.complete && pikaImg.naturalWidth ? pikaImg.width : this.width
        const centerX = this.x - this.width + spriteW / 2
        ctx.textAlign = 'center'
        ctx.fillStyle = '#3E481D'
        ctx.fillText(this.name, centerX, textY)
        ctx.textAlign = 'left'
      }

      forward() {
        this.x += this.speed * this.dir
      }

      jumpingDecision() {
        if (this.isJumping) return
        this.jumpSwitch = true
        this.jumpPoint = rand(JUMP_PERIOD_MIN, 500)
        this.speed = rand(1, 4)
        this.lucky = rand(1, 10) % 2 === 0
        this.superLucky = rand(1, 10) <= 3
        setLabel('⚡')
      }

      update(timer: number) {
        if (this.dir === 1 && this.x > canvas.width) {
          this.x = -this.width
        } else if (this.dir === -1 && this.x < -this.width) {
          this.x = canvas.width + this.width
        }

        if (timer % this.jumpPoint === 0) this.jumpingDecision()

        if (this.jumpSwitch && this.y >= 10) {
          this.isJumping = true
          this.y -= JUMP_STEP
          this.jumpTimer++
        }

        if (this.isJumping && this.jumpTimer >= JUMP_FRAMES) {
          this.jumpSwitch = false
          if (this.y < groundY) {
            this.y += JUMP_STEP
          } else {
            this.isJumping = false
            this.jumpTimer = 0
            setLabel('')
          }
        }

        this.forward()

        if (!this.jumpSwitch && !this.isJumping && timer % 10 === 1) {
          this.y += this.y <= groundY ? GROUND_STEP : -GROUND_STEP
        }

        if (this.isJumping && this.lucky) this.rotate()
        else this.draw()
      }
    }

    class Burst {
      particles: { x: number; y: number; vx: number; vy: number; r: number }[] = []
      maxLife = 30
      life = 30
      constructor(x: number, y: number) {
        const count = 14
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + Math.random() * 0.4
          const sp = rand(2, 6)
          this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(2, 5) })
        }
      }
      update() {
        this.life--
        const alpha = Math.max(this.life / this.maxLife, 0)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#ffd83b'
        this.particles.forEach((pt) => {
          pt.x += pt.vx
          pt.y += pt.vy
          pt.vy += 0.15
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }
      get dead() {
        return this.life <= 0
      }
    }

    function spawnBurst(p: Pikachu) {
      const spriteW = pikaImg.complete && pikaImg.naturalWidth ? pikaImg.width : p.width
      const spriteH = pikaImg.complete && pikaImg.naturalHeight ? pikaImg.height : p.height
      bursts.push(new Burst(p.x - p.width + spriteW / 2, p.y + spriteH / 2))
    }

    let pikas: Pikachu[] = [new Pikachu()]
    const ancestor = pikas[0]
    let timer = 0
    let heroCount = 0
    const bursts: Burst[] = []

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    resetRef.current = () => {
      for (let i = pikas.length - 1; i >= 0; i--) {
        if (pikas[i] === ancestor) continue
        spawnBurst(pikas[i])
        pikas.splice(i, 1)
      }
      heroCount = 0
    }

    let rafId = 0
    function animate() {
      rafId = requestAnimationFrame(animate)
      timer++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      bgX -= BG_SPEED
      if (bgX <= -canvas.width) bgX = 0
      ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height)
      ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height)

      const last = pikas[pikas.length - 1]
      if (last.superLucky) {
        const hero = new Pikachu()
        hero.hero = true
        heroCount++
        hero.order = heroCount
        hero.name = '막둥이'
        if (last.hero) last.name = String(last.order)
        last.hero = false
        hero.dir = rand(0, 1) === 0 ? 1 : -1
        if (hero.dir === -1) hero.x = canvas.width + hero.width
        pikas.push(hero)
      }

      pikas.forEach((pika) => pika.update(timer))

      for (let i = bursts.length - 1; i >= 0; i--) {
        bursts[i].update()
        if (bursts[i].dead) bursts.splice(i, 1)
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="pika-canvas" />
})

Pikachu.displayName = 'Pikachu'
export default Pikachu
