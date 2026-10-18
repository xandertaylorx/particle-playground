const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const $ = id => document.getElementById(id)

let W, H
let particles = []
let count = 3000
const shocks = []
const mouse = { x: 0, y: 0, active: false }

// [start hue, end hue] -- sunset goes past 360 on purpose so it wraps into orange
const palettes = {
  neon: [190, 320],
  fire: [0, 50],
  ocean: [170, 230],
  forest: [80, 150],
  sunset: [280, 400],
  rainbow: [0, 360],
}
const paletteNames = Object.keys(palettes)
let palette = 0

const modes = ['attract', 'repel', 'orbit', 'swirl']
let mode = 0

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2)
  W = innerWidth
  H = innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function spawn(x = Math.random() * W, y = Math.random() * H) {
  return {
    x, y,
    vx: (Math.random() - .5) * 2,
    vy: (Math.random() - .5) * 2,
    size: Math.random() * 1.8 + .6,
    seed: Math.random(),
  }
}

function fill() {
  while (particles.length < count) particles.push(spawn())
  particles.length = count
  $('count').textContent = count
}

function setMode(i) {
  mode = i
}

function hud() {
  $('mode').textContent = modes[mode]
  $('pal').textContent = paletteNames[palette]
}

function boom(x, y, power) {
  for (const p of particles) {
    const dx = p.x - x, dy = p.y - y
    const d = Math.hypot(dx, dy) + .01
    // 1/d falloff felt way better than 1/d^2 -- far particles still get a nudge
    const f = Math.min(power * 120 / (d + 40), 25) * (.6 + p.seed * .8)
    p.vx += dx / d * f
    p.vy += dy / d * f
  }
  shocks.push({ x, y, r: 0, a: 1 })
}

addEventListener('pointermove', e => {
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true
})
canvas.addEventListener('pointerleave', () => mouse.active = false)
canvas.addEventListener('pointerdown', e => boom(e.clientX, e.clientY, 18))

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return
  const k = e.key.toLowerCase()
  if (e.code === 'Space') {
    e.preventDefault()
    setMode((mode + 1) % modes.length)
  }
  else if (k === 'c') palette = (palette + 1) % paletteNames.length
  else if (k === '+' || k === '=') { count = Math.min(12000, count + 500); fill() }
  else if (k === '-') { count = Math.max(500, count - 500); fill() }
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
  else if (k === 'h') $('hud').style.opacity = $('hud').style.opacity === '0' ? '1' : '0'
  hud()
})

function frame(t) {
  // don't clear fully, the leftover alpha is what makes the trails
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(5, 5, 10, .18)'
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'lighter'

  const [h0, h1] = palettes[paletteNames[palette]]
  const m = modes[mode]

  // when the mouse is gone the target drifts around on its own
  const cx = mouse.active ? mouse.x : W / 2 + Math.cos(t / 1500) * W * .2
  const cy = mouse.active ? mouse.y : H / 2 + Math.sin(t / 1100) * H * .2

  for (const p of particles) {
    const dx = cx - p.x, dy = cy - p.y
    const d = Math.hypot(dx, dy) + .01
    const nx = dx / d, ny = dy / d
    const pull = Math.min(600 / d, 1.2) * .35

    if (m === 'attract') {
      // weaker pull up close + sideways drift, otherwise they all collapse into one dot
      const k = pull * Math.min(1, d / (80 + p.seed * 160))
      p.vx += nx * k - ny * pull * .25 + (Math.random() - .5) * .4
      p.vy += ny * k + nx * pull * .25 + (Math.random() - .5) * .4
    } else if (m === 'repel') {
      const r = Math.min(4000 / (d * d), 3)
      p.vx -= nx * r
      p.vy -= ny * r
    } else if (m === 'orbit') {
      p.vx += (nx * .6 - ny) * pull
      p.vy += (ny * .6 + nx) * pull
    } else if (m === 'swirl') {
      // cheap fake flow field, just two sines fighting each other
      const a = Math.sin(p.x * .004 + t * .0004) * 3 + Math.cos(p.y * .004 - t * .0003) * 3
      p.vx += Math.cos(a) * .15 + nx * pull * .08
      p.vy += Math.sin(a) * .15 + ny * pull * .08
    }

    p.vx *= .96
    p.vy *= .96
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) { p.x = 0; p.vx *= -1 } else if (p.x > W) { p.x = W; p.vx *= -1 }
    if (p.y < 0) { p.y = 0; p.vy *= -1 } else if (p.y > H) { p.y = H; p.vy *= -1 }

    const speed = Math.min(Math.hypot(p.vx, p.vy) / 8, 1)
    const hue = h0 + (h1 - h0) * ((p.seed + speed * .5) % 1)
    const s = p.size * (1 + speed * 1.5)
    ctx.fillStyle = `hsla(${hue}, 100%, ${45 + speed * 30}%, ${.5 + speed * .5})`
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
  }

  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i]
    s.r += 14
    s.a *= .92
    ctx.strokeStyle = `hsla(${h1}, 100%, 70%, ${s.a})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.stroke()
    if (s.a < .03) shocks.splice(i, 1)
  }

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
  g.addColorStop(0, `hsla(${h0}, 100%, 70%, .35)`)
  g.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - 40, cy - 40, 80, 80)

  requestAnimationFrame(frame)
}

addEventListener('resize', resize)
resize()
fill()
hud()
requestAnimationFrame(frame)
