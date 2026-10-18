const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const $ = id => document.getElementById(id)

let W, H
let particles = []
let count = 3000
const shocks = []
const mouse = { x: 0, y: 0, active: false }

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

function frame(t) {
  // don't clear fully, the leftover alpha is what makes the trails
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(5, 5, 10, .18)'
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'lighter'

  // when the mouse is gone the target drifts around on its own
  const cx = mouse.active ? mouse.x : W / 2 + Math.cos(t / 1500) * W * .2
  const cy = mouse.active ? mouse.y : H / 2 + Math.sin(t / 1100) * H * .2

  for (const p of particles) {
    const dx = cx - p.x, dy = cy - p.y
    const d = Math.hypot(dx, dy) + .01
    const nx = dx / d, ny = dy / d
    const pull = Math.min(600 / d, 1.2) * .35

    // weaker pull up close + sideways drift, otherwise they all collapse into one dot
    const k = pull * Math.min(1, d / (80 + p.seed * 160))
    p.vx += nx * k - ny * pull * .25 + (Math.random() - .5) * .4
    p.vy += ny * k + nx * pull * .25 + (Math.random() - .5) * .4

    p.vx *= .96
    p.vy *= .96
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) { p.x = 0; p.vx *= -1 } else if (p.x > W) { p.x = W; p.vx *= -1 }
    if (p.y < 0) { p.y = 0; p.vy *= -1 } else if (p.y > H) { p.y = H; p.vy *= -1 }

    const speed = Math.min(Math.hypot(p.vx, p.vy) / 8, 1)
    const hue = 190 + 130 * ((p.seed + speed * .5) % 1)
    const s = p.size * (1 + speed * 1.5)
    ctx.fillStyle = `hsla(${hue}, 100%, ${45 + speed * 30}%, ${.5 + speed * .5})`
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
  }

  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i]
    s.r += 14
    s.a *= .92
    ctx.strokeStyle = `hsla(320, 100%, 70%, ${s.a})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.stroke()
    if (s.a < .03) shocks.splice(i, 1)
  }

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
  g.addColorStop(0, 'hsla(190, 100%, 70%, .35)')
  g.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - 40, cy - 40, 80, 80)

  requestAnimationFrame(frame)
}

addEventListener('resize', resize)
resize()
fill()
requestAnimationFrame(frame)
