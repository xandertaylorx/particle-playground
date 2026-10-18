const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const $ = id => document.getElementById(id)

// paint layer sits under the main canvas and never fades
const paintCanvas = $('paint')
const pctx = paintCanvas.getContext('2d')
let painting = false

let W, H
let particles = []
let count = 3000
const shocks = []
const wells = []
const mouse = { x: 0, y: 0, active: false, down: false, downAt: 0 }
let flash = 0

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

const modes = ['attract', 'repel', 'orbit', 'swirl', 'text', 'image']
const homing = m => m === 'text' || m === 'image'
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

  // resizing a canvas wipes it, so keep a copy of the painting and put it back
  const old = document.createElement('canvas')
  old.width = paintCanvas.width
  old.height = paintCanvas.height
  if (old.width) old.getContext('2d').drawImage(paintCanvas, 0, 0)
  paintCanvas.width = W * dpr
  paintCanvas.height = H * dpr
  paintCanvas.style.width = W + 'px'
  paintCanvas.style.height = H + 'px'
  if (old.width) pctx.drawImage(old, 0, 0)
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  retarget()
}

// text/image modes need fresh target spots whenever the size or count changes
function retarget() {
  if (modes[mode] === 'text') spell()
  if (modes[mode] === 'image') picture()
}

function spawn(x = Math.random() * W, y = Math.random() * H) {
  return {
    x, y,
    vx: (Math.random() - .5) * 2,
    vy: (Math.random() - .5) * 2,
    size: Math.random() * 1.8 + .6,
    seed: Math.random(),
    tx: null, // home position in text/image mode
    ty: null,
    col: null, // pixel color in image mode
  }
}

function fill() {
  while (particles.length < count) particles.push(spawn())
  particles.length = count
  $('count').textContent = count
  retarget()
}

function setMode(i) {
  // image mode only makes sense once there's a picture loaded
  if (modes[i] === 'image' && !img) i = (i + 1) % modes.length
  mode = i
  $('wordRow').style.display = modes[i] === 'text' ? 'flex' : 'none'
  retarget()
}

function hud() {
  $('mode').textContent = modes[mode]
  $('pal').textContent = paletteNames[palette]
  $('painting').textContent = painting ? 'on' : 'off'
}

// background + paint + whatever's on screen right now, as a png
function save() {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const o = out.getContext('2d')
  o.fillStyle = '#05050a'
  o.fillRect(0, 0, out.width, out.height)
  o.drawImage(paintCanvas, 0, 0)
  o.drawImage(canvas, 0, 0)
  const a = document.createElement('a')
  a.href = out.toDataURL('image/png')
  a.download = `particles-${Date.now()}.png`
  a.click()
}

function boom(x, y, power, big = false) {
  for (const p of particles) {
    const dx = p.x - x, dy = p.y - y
    const d = Math.hypot(dx, dy) + .01
    // 1/d falloff felt way better than 1/d^2 -- far particles still get a nudge
    const f = Math.min(power * 120 / (d + 40), big ? 60 : 25) * (.6 + p.seed * .8)
    p.vx += dx / d * f
    p.vy += dy / d * f
  }
  shocks.push({ x, y, r: 0, a: 1, w: big ? 5 : 2, speed: big ? 22 : 14 })
  if (big) {
    shocks.push({ x, y, r: 0, a: .7, w: 2, speed: 12 })
    flash = .35
  }
}

addEventListener('pointermove', e => {
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true
})
canvas.addEventListener('pointerleave', () => {
  mouse.active = false
  mouse.down = false
})

// press = start charging, release = boom (bigger the longer you held)
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true
  mouse.down = true
  mouse.downAt = performance.now()
})
addEventListener('pointerup', () => {
  if (!mouse.down) return
  mouse.down = false
  const held = Math.min((performance.now() - mouse.downAt) / 1000, 3)
  boom(mouse.x, mouse.y, 18 + held * 40, held > .4)
})

canvas.addEventListener('contextmenu', e => {
  e.preventDefault()
  wells.push({ x: e.clientX, y: e.clientY, born: performance.now() })
  if (wells.length > 8) wells.shift()
})

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return
  const k = e.key.toLowerCase()
  if (e.code === 'Space') {
    e.preventDefault()
    setMode((mode + 1) % modes.length)
  }
  else if (k === 'c') palette = (palette + 1) % paletteNames.length
  // small steps down low, big steps up high so getting to 30k isn't 50 key presses
  else if (k === '+' || k === '=') { count = Math.min(30000, count + (count < 5000 ? 500 : 2500)); fill() }
  else if (k === '-') { count = Math.max(500, count - (count <= 5000 ? 500 : 2500)); fill() }
  else if (k === 'x') wells.length = 0
  else if (k === 'p') painting = !painting
  else if (k === 'e') pctx.clearRect(0, 0, W, H)
  else if (k === 's') save()
  else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
  else if (k === 'h') $('hud').style.opacity = $('hud').style.opacity === '0' ? '1' : '0'
  hud()
})

let hueDrift = 0

function frame(t) {
  readAudio(t)
  hueDrift += audio.bass * 2
  const boost = 1 + audio.level * 6

  // don't clear fully, just erase a bit of last frame -- that's what makes the trails
  // (louder = longer trails). erasing instead of painting black lets the paint layer show through
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = `rgba(0, 0, 0, ${.18 - audio.level * .08})`
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
  pctx.globalAlpha = .06
  if (flash > .01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`
    ctx.fillRect(0, 0, W, H)
    flash *= .8
  }
  const [h0, h1] = palettes[paletteNames[palette]]
  const m = modes[mode]
  ctx.globalCompositeOperation = m === 'image' ? 'source-over' : 'lighter'

  // when the mouse is gone the target drifts around on its own
  const cx = mouse.active ? mouse.x : W / 2 + Math.cos(t / 1500) * W * .2
  const cy = mouse.active ? mouse.y : H / 2 + Math.sin(t / 1100) * H * .2
  const charge = mouse.down ? Math.min((t - mouse.downAt) / 1000, 3) : 0

  for (const p of particles) {
    const dx = cx - p.x, dy = cy - p.y
    const d = Math.hypot(dx, dy) + .01
    const nx = dx / d, ny = dy / d
    const pull = Math.min(600 / d, 1.2) * .35 * boost

    if (mouse.down) {
      // black hole. overrides whatever mode you're in
      const k = (.6 + charge) * Math.min(1, d / 30)
      p.vx += nx * k - ny * k * .6
      p.vy += ny * k + nx * k * .6
    } else if (m === 'attract') {
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
      p.vx += Math.cos(a) * .15 * boost + nx * pull * .08
      p.vy += Math.sin(a) * .15 * boost + ny * pull * .08
    } else if (homing(m) && p.tx !== null) {
      // spring back home, cursor shoves them out of the way
      p.vx += (p.tx - p.x) * .012
      p.vy += (p.ty - p.y) * .012
      if (mouse.active && d < 90) {
        p.vx -= nx * (90 - d) * .06
        p.vy -= ny * (90 - d) * .06
      }
      p.vx += (Math.random() - .5) * audio.level * 3
      p.vy += (Math.random() - .5) * audio.level * 3
    }

    for (const w of wells) {
      const wx = w.x - p.x, wy = w.y - p.y
      const wd = Math.hypot(wx, wy) + .01
      if (wd > 260) continue
      const k = (1 - wd / 260) * .5 * Math.min(1, wd / 20)
      p.vx += wx / wd * k - wy / wd * k * .9
      p.vy += wy / wd * k + wx / wd * k * .9
    }

    // letters need more friction or they wobble forever
    const damp = homing(m) && !mouse.down ? .9 : .96
    p.vx *= damp
    p.vy *= damp
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) { p.x = 0; p.vx *= -1 } else if (p.x > W) { p.x = W; p.vx *= -1 }
    if (p.y < 0) { p.y = 0; p.vy *= -1 } else if (p.y > H) { p.y = H; p.vy *= -1 }

    const speed = Math.min(Math.hypot(p.vx, p.vy) / 8, 1)
    let col, s
    if (m === 'image' && p.col) {
      // bigger squares so the picture fills in, and no additive glow or it all turns white
      col = p.col
      s = Math.max(p.size, imgStep * .95) * (1 + audio.level * 1.5)
    } else {
      const hue = h0 + (h1 - h0) * ((p.seed + speed * .5 + hueDrift * .002) % 1)
      col = `hsla(${hue}, 100%, ${45 + speed * 30}%, ${.5 + speed * .5})`
      s = p.size * (1 + speed * 1.5 + audio.level * 2.5)
    }
    ctx.fillStyle = col
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
    // paint is drawn super faint, it only shows up where particles keep passing over
    if (painting) {
      pctx.fillStyle = col
      pctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
    }
  }
  ctx.globalCompositeOperation = 'lighter'

  for (const w of wells) {
    const age = (t - w.born) / 1000
    const r = 14 + Math.sin(age * 3) * 2 + audio.bass * 12
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(w.x, w.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `hsla(${h1}, 100%, 65%, .8)`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(w.x, w.y, r + 3, age * 2, age * 2 + Math.PI * 1.4)
    ctx.stroke()
  }

  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i]
    s.r += s.speed
    s.a *= .92
    ctx.strokeStyle = `hsla(${h1}, 100%, 70%, ${s.a})`
    ctx.lineWidth = s.w
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.stroke()
    if (s.a < .03) shocks.splice(i, 1)
  }

  const gr = 40 + audio.level * 120 + charge * 60
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr)
  g.addColorStop(0, `hsla(${mouse.down ? h1 : h0}, 100%, 70%, ${.35 + charge * .15})`)
  g.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2)

  // little ring that fills up while charging (full at 3s)
  if (mouse.down) {
    ctx.strokeStyle = `hsla(${h1}, 100%, 75%, .9)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + charge / 3 * Math.PI * 2)
    ctx.stroke()
  }

  requestAnimationFrame(frame)
}

addEventListener('resize', resize)
resize()
fill()
hud()
requestAnimationFrame(frame)
