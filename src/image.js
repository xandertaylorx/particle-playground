// same trick as text.js, but every spot also remembers the color of its pixel
let img = null
let imgStep = 3

function picture() {
  if (!img || !W || !H) return
  const scale = Math.min(W * .85 / img.width, H * .85 / img.height)
  const w = Math.max(1, img.width * scale | 0)
  const h = Math.max(1, img.height * scale | 0)
  const ox = (W - w) / 2 | 0
  const oy = (H - h) / 2 | 0

  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const o = off.getContext('2d')
  o.drawImage(img, 0, 0, w, h)
  const px = o.getImageData(0, 0, w, h).data

  // pick a grid spacing so there's roughly one spot per particle
  imgStep = Math.max(2, Math.round(Math.sqrt(w * h / particles.length)))
  const spots = []
  for (let y = 0; y < h; y += imgStep)
    for (let x = 0; x < w; x += imgStep) {
      const i = (y * w + x) * 4
      if (px[i + 3] > 128) spots.push([ox + x, oy + y, `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`])
    }

  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }

  particles.forEach((p, i) => {
    if (!spots.length) return (p.tx = p.ty = null)
    const [x, y, col] = spots[i % spots.length]
    p.tx = x
    p.ty = y
    p.col = col
  })
}

function loadImage(file) {
  const im = new Image()
  im.onload = () => {
    img = im
    setMode(modes.indexOf('image'))
    hud()
  }
  im.src = URL.createObjectURL(file)
}

$('pic').addEventListener('click', () => $('picFile').click())
$('picFile').addEventListener('change', e => e.target.files[0] && loadImage(e.target.files[0]))
addEventListener('drop', e => {
  const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image'))
  if (f) loadImage(f)
})
