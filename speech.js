// ═══ Speech Engine ═══
let _arabicVoice = null, _voicesLoaded = false, _speaking = false, _stopCallback = null

export function loadVoices() {
  if (!window.speechSynthesis) return
  const v = window.speechSynthesis.getVoices()
  if (!v.length) return
  _voicesLoaded = true
  const prio = ['ar-SA','ar-EG','ar-AE','ar-KW']
  for (const l of prio) {
    const f = v.find(x => x.lang === l) || v.find(x => x.lang.startsWith(l.split('-')[0]))
    if (f) { _arabicVoice = f; break }
  }
  if (!_arabicVoice) _arabicVoice = v[0] || null
}

export function initSpeech(onStop) {
  _stopCallback = onStop
  if (!window.speechSynthesis) return
  loadVoices()
  if (typeof speechSynthesis.onvoiceschanged !== 'undefined') speechSynthesis.onvoiceschanged = loadVoices
  setTimeout(loadVoices, 400)
  setTimeout(loadVoices, 1200)
}

export function stopSpeak() {
  try { window.speechSynthesis.cancel() } catch {}
  _speaking = false
  _stopCallback?.()
}

export function isSpeaking() { return _speaking }

export function speak(t, rate = 1, onStart, onEnd) {
  if (!window.speechSynthesis) return
  if (_speaking) { stopSpeak(); return }
  if (!t?.trim()) return
  window.speechSynthesis.cancel()
  if (!_voicesLoaded) loadVoices()
  const clean = t.replace(/<[^>]+>/g, ' ').replace(/\*\*(.+?)\*\*/g, '$1').replace(/#+\s*/g, '').replace(/`+/g, '').replace(/\s+/g, ' ').trim()
  const maxC = 150
  const chunks = []
  let rem = clean
  while (rem.length > 0) {
    if (rem.length <= maxC) { chunks.push(rem); break }
    let cut = rem.lastIndexOf('.', maxC)
    if (cut < 30) cut = rem.lastIndexOf(' ', maxC)
    if (cut < 30) cut = maxC
    chunks.push(rem.slice(0, cut + 1).trim())
    rem = rem.slice(cut + 1).trim()
  }
  _speaking = true
  onStart?.()
  let idx = 0
  function next() {
    if (idx >= chunks.length || !_speaking) { _speaking = false; onEnd?.(); return }
    const u = new SpeechSynthesisUtterance(chunks[idx])
    u.lang = 'ar-SA'; u.rate = rate; u.pitch = 1; u.volume = 1
    if (_arabicVoice) u.voice = _arabicVoice
    let ka = null
    u.onstart = () => { ka = setInterval(() => { if (window.speechSynthesis.paused && _speaking) window.speechSynthesis.resume() }, 5000) }
    u.onend = () => { clearInterval(ka); idx++; next() }
    u.onerror = e => { clearInterval(ka); if (e.error !== 'interrupted' && e.error !== 'canceled') { idx++; next() } else { _speaking = false; onEnd?.() } }
    window.speechSynthesis.speak(u)
  }
  next()
}
