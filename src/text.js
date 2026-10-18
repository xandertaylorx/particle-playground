// draw the word on a hidden canvas, collect the lit pixels,
// then hand each particle one of those pixels as its "home"
function spell() {
  if (!W || !H) return
  const word = ($('word').value || ' ').toUpperCase()
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const o = off.getContext('2d')

  const size = Math.min(H * .45, W * .9 / (word.length * .62))
  o.font = `900 ${size}px system-ui, sans-serif`
  o.textAlign = 'center'
  o.textBaseline = 'middle'
  o.fillStyle = '#fff'
  o.fillText(word, W / 2, H / 2)

  const px = o.getImageData(0, 0, W, H).data
  const spots = []
  for (let y = 0; y < H; y += 3)
    for (let x = 0; x < W; x += 3)
      if (px[(y * W + x) * 4 + 3] > 128) spots.push([x, y])

  // shuffle so they fly in from everywhere instead of filling left to right
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }

  particles.forEach((p, i) => {
    if (!spots.length) return (p.tx = p.ty = null)
    const [x, y] = spots[i % spots.length]
    p.tx = x + Math.random() * 2 - 1
    p.ty = y + Math.random() * 2 - 1
  })
}

$('spell').addEventListener('click', spell)
$('word').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    spell()
    e.target.blur()
  }
})
