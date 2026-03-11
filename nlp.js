// ═══ Arabic NLP Engine ═══

export const STOP = new Set(['هل','ما','ماذا','كيف','لماذا','أين','متى','من','هو','هي','هم','كان','كانت','في','على','إلى','عن','مع','هذا','هذه','ذلك','تلك','ان','أن','إن','قد','لقد','سوف','لن','لم','لا','لي','له','لها','لهم','عند','بين','تحت','فوق','ثم','أو','و','ف','بل','لكن','حتى','إذا','كي','بعد','قبل'])

const _nc = new Map()
export function norm(t) {
  if (!t) return ''
  const k = String(t)
  if (_nc.has(k)) return _nc.get(k)
  if (_nc.size > 5000) _nc.delete(_nc.keys().next().value)
  const r = k.toLowerCase()
    .replace(/[ًٌٍَُِّْ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي').replace(/[؟?!.،:؛\-_]/g, ' ').replace(/\s+/g, ' ')
    .trim().split(' ').filter(w => w.length > 1 && !STOP.has(w)).join(' ')
  _nc.set(k, r)
  return r
}

function lev(s1, s2) {
  const m = s1.length, n = s2.length
  if (!m) return n; if (!n) return m
  let p = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const c = [i]
    for (let j = 1; j <= n; j++) c[j] = s1[i-1] === s2[j-1] ? p[j-1] : 1 + Math.min(p[j], c[j-1], p[j-1])
    p = c
  }
  return p[n]
}

const _sc = new Map()
export function sim(a, b) {
  const na = norm(a), nb = norm(b)
  if (na === nb) return 1; if (!na || !nb) return 0
  const k = na + '|' + nb
  if (_sc.has(k)) return _sc.get(k)
  if (_sc.size >= 8000) _sc.delete(_sc.keys().next().value)
  const ml = Math.max(na.length, nb.length)
  const lv = ml ? 1 - lev(na, nb) / ml : 1
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '))
  const inter = [...wa].filter(x => wb.has(x))
  const jc = new Set([...wa, ...wb]).size ? inter.length / new Set([...wa, ...wb]).size : 1
  const v = 0.5 * lv + 0.5 * jc
  _sc.set(k, v)
  return v
}

export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderMd(text, useMarkdown = true) {
  if (!useMarkdown) return esc(text).replace(/\n/g, '<br>')
  let h = esc(text)
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  const codeBlocks = []
  h = h.replace(/```[\s\S]*?```/g, m => {
    const c = m.replace(/```\w*\n?/g, '').trim()
    codeBlocks.push('<pre><code>' + c + '</code></pre>')
    return '\x00CODE' + (codeBlocks.length - 1) + '\x00'
  })
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>')
  h = h.replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
  h = h.replace(/^-\s+(.+)$/gm, '<li>$1</li>')
  h = h.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  h = h.replace(/(<li>.*?<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>')
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
  h = h.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')
  h = h.replace(/^---$/gm, '<hr>')
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, (m, txt, url) => {
    const safe = /^https?:\/\//i.test(url) ? url : ''
    return safe ? `<a href="${safe}" target="_blank" rel="noopener">${txt}</a>` : txt
  })
  h = h.replace(/\n/g, '<br>')
  h = h.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[+i])
  return h
}

export const SOCIAL = new Set(['شكراً','شكرا','شكرًا','عفواً','عفوا','تمام','حسناً','حسنا','صح','صحيح','أيوه','آيوه','ممتاز','رائع','لا','نعم','آه','اه','مع السلامة','باي','أهلاً','أهلا','مرحباً','مرحبا','وش','ايش'])
export function isSocial(t) {
  const w = t.trim().split(/\s+/)
  return t.trim().length < 30 && (SOCIAL.has(t.trim()) || w.every(word => SOCIAL.has(word)))
}

export function safeMath(expr) {
  expr = expr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const s = expr.replace(/[^\d+\-*/^().\s]/g, '').replace(/\^/g, '**').replace(/\s+/g, '')
  if (!s || !/\d/.test(s)) return null
  let pos = 0
  const peek = () => s[pos] || '', eat = () => s[pos++]
  function parseAS() { let l = parseMD(); for (;;) { if (peek() === '+') { eat(); l += parseMD() } else if (peek() === '-') { eat(); l -= parseMD() } else break } return l }
  function parseMD() { let l = parsePow(); for (;;) { if (peek() === '*') { eat(); l *= parsePow() } else if (peek() === '/') { eat(); const r = parsePow(); if (r === 0) throw 0; l /= r } else break } return l }
  function parsePow() { let b = parseU(); if (pos <= s.length - 3 && s[pos] === '*' && s[pos+1] === '*') { pos += 2; b = Math.pow(b, parseU()) } return b }
  function parseU() { if (peek() === '-') { eat(); return -parseU() } if (peek() === '+') { eat(); return parseU() } return parseP() }
  function parseP() { if (peek() === '(') { eat(); const v = parseAS(); if (peek() === ')') eat(); return v } let n = ''; while (/[\d.]/.test(peek())) n += eat(); if (!n) throw 0; return parseFloat(n) }
  try { const r = parseAS(); if (isNaN(r) || !isFinite(r)) return null; return Math.abs(r) > 1e12 || Math.abs(r) < 1e-10 ? r : parseFloat(r.toPrecision(12)) } catch { return null }
}

export function qtype(t) {
  const l = t.toLowerCase()
  if (/^هل\s/.test(l)) return 'yn'
  if (/^من\s/.test(l)) return 'who'
  if (/^ما(?:\s+هو|\s+هي|\s+هم|ذا)?\s/.test(l)) return 'what'
  if (/^كيف\s/.test(l)) return 'how'
  if (/^أين|^وين/.test(l)) return 'where'
  if (/^متى|^إمتى/.test(l)) return 'when'
  if (/^كم\s/.test(l)) return 'count'
  if (/^لماذا|^ليش|^ليه/.test(l)) return 'why'
  return 'general'
}

export function autoCorrect(text, enabled) {
  if (!enabled) return text
  const TYPOS = { 'كيفيه': 'كيفية', 'لاكن': 'لكن', 'دائما': 'دائماً', 'هاذا': 'هذا', 'هاذه': 'هذه', 'انا': 'أنا', 'اين': 'أين', 'اكثر': 'أكثر', 'اقل': 'أقل', 'امريكا': 'أمريكا', 'اوروبا': 'أوروبا', 'الاسلام': 'الإسلام', 'الانسان': 'الإنسان' }
  let out = text
  for (const [w, r] of Object.entries(TYPOS)) out = out.replace(new RegExp(w, 'g'), r)
  return out
}
