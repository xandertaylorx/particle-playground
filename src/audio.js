// sound input -> two numbers the renderer cares about: overall loudness and bass
const audio = { level: 0, bass: 0 }

let actx, analyser, bins
let micStream
let lastBeat = 0

function ensureAudio() {
  if (!actx) {
    actx = new AudioContext()
    analyser = actx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = .6
    bins = new Uint8Array(analyser.frequencyBinCount)
  }
  actx.resume()
}

$('mic').addEventListener('click', async () => {
  if (micStream) return
  try {
    ensureAudio()
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    actx.createMediaStreamSource(micStream).connect(analyser)
    $('mic').textContent = '🎤 listening'
    $('mic').classList.add('on')
  } catch {
    $('mic').textContent = '🎤 no mic :('
  }
})

function readAudio(t) {
  if (!analyser) {
    audio.level *= .9
    audio.bass *= .9
    return
  }
  analyser.getByteFrequencyData(bins)

  let sum = 0, low = 0
  for (let i = 0; i < bins.length; i++) sum += bins[i]
  for (let i = 1; i < 8; i++) low += bins[i] // roughly 40-650hz at 44.1k
  const level = sum / bins.length / 255
  const bass = low / 7 / 255

  // a kick/clap shows up as bass jumping well above its recent average
  if (bass > .55 && bass > audio.bass * 1.25 && t - lastBeat > 220) {
    lastBeat = t
    boom(mouse.active ? mouse.x : W / 2, mouse.active ? mouse.y : H / 2, 6 + bass * 18)
  }

  audio.level = audio.level * .7 + level * .3
  audio.bass = audio.bass * .7 + bass * .3
}
