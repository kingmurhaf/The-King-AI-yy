// ═══ Knowledge Base Engine ═══
import { norm, sim, isSocial, qtype } from './nlp.js'

const _sc = new Map()
function simC(a, b) {
  const k = a + '§' + b
  if (_sc.has(k)) return _sc.get(k)
  if (_sc.size >= 8000) _sc.delete(_sc.keys().next().value)
  const v = sim(a, b); _sc.set(k, v); return v
}

export function setKB(db, q, a, conf = 0.85, reason = 'manual') {
  if (!q || !a) return db
  const nk = norm(q)
  if (!nk) return db
  const knowledge = { ...db.knowledge }
  if (!knowledge[nk]) {
    knowledge[nk] = { display: q.trim(), answer: String(a).trim(), confidence: conf, usageCount: 0, history: [] }
  } else {
    const it = { ...knowledge[nk] }
    it.display = q.trim(); it.answer = String(a).trim(); it.confidence = conf
    it.history = [...(it.history || []), Date.now()].slice(-20)
    it.usageCount = (it.usageCount || 0) + 1
    knowledge[nk] = it
  }
  const learnLog = [...db.learnLog, { t: Date.now(), reason, key: nk, display: q.trim(), val: String(a).trim(), confidence: conf }].slice(-500)
  return { ...db, knowledge, learnLog }
}

export function bestAns(db, q, minC = 0) {
  const qn = norm(q)
  if (!qn) return null
  let best = null, bs = 0
  const t0 = performance.now()
  for (const [k, it] of Object.entries(db.knowledge)) {
    if (performance.now() - t0 > 600) break
    const c = it.confidence ?? 0.7
    if (c < minC) continue
    const s = simC(qn, k), sc = s * c
    if (s > 0.5 && sc > bs) { bs = sc; best = { ...it, key: k, similarity: s } }
  }
  return best
}

export function allAns(db, q, minC = 0, max = 8) {
  const qn = norm(q)
  if (!qn) return []
  const t0 = performance.now()
  return Object.entries(db.knowledge)
    .filter(([, it]) => { if (performance.now() - t0 > 400) return false; const c = it.confidence ?? 0.7; return c >= minC && simC(qn, it.display ? norm(it.display) : '') > 0.3 })
    .map(([k, it]) => ({ ...it, key: k, score: simC(qn, k) * (it.confidence ?? 0.7) }))
    .sort((a, b) => b.score - a.score).slice(0, max)
}

export function fuzzyRespond(db, qn) {
  let best = null, bs = 0
  const t0 = performance.now()
  for (const [k, it] of Object.entries(db.knowledge)) {
    if (performance.now() - t0 > 400) break
    const s = simC(qn, k)
    if (s > bs) { bs = s; best = { ...it, key: k, conf: s * (it.confidence || 0.7) } }
  }
  return best && bs > 0.35 ? { text: best.answer, conf: best.conf, display: best.display } : null
}

export function getSugs(db, answer) {
  return Object.values(db.knowledge).filter(it => simC(norm(it.answer), norm(answer)) > 0.4).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 3).map(it => it.display)
}

export function boostConf(db, key) {
  if (!db.knowledge[key]) return db
  const knowledge = { ...db.knowledge, [key]: { ...db.knowledge[key], confidence: Math.min(1, (db.knowledge[key].confidence || 0.7) + 0.01) } }
  return { ...db, knowledge }
}

export function upsertEnt(db, name, ans, attrs = {}) {
  const k = norm(name)
  if (!k) return db
  const entities = { ...db.entities }
  if (!entities[k]) entities[k] = { name, type: 'other', aliases: [], answer: ans, attributes: {}, relations: {} }
  else if (ans) entities[k] = { ...entities[k], answer: ans }
  entities[k] = { ...entities[k], attributes: { ...entities[k].attributes, ...attrs } }
  return { ...db, entities }
}

export function findEnt(db, q) {
  const qn = norm(q)
  let best = null, bs = 0
  for (const [k, e] of Object.entries(db.entities)) {
    const s = Math.max(simC(qn, k), simC(qn, norm(e.name)))
    if (s > bs) { bs = s; best = e }
    if (e.aliases) for (const al of e.aliases) { const sa = simC(qn, norm(al)); if (sa > bs) { bs = sa; best = e } }
  }
  return bs > 0.6 ? best : null
}

export const TYPOS_DB = { 'كيفيه':'كيفية','لاكن':'لكن','دائما':'دائماً','هاذا':'هذا','هاذه':'هذه','انا':'أنا','اين':'أين' }

export function detectTeach(text) {
  const t = text.trim()
  let m = t.match(/^\$(.+?)#(.+)$/)
  if (m) return { q: m[1].trim(), a: m[2].trim() }
  m = t.match(/^احفظ\s+(?:أن|ان)?\s*(.+?)\s+(?:هو|هي|=|يساوي|تساوي)\s+(.+)$/)
  if (m) return { q: m[1].trim(), a: m[2].trim() }
  m = t.match(/^(?:تعلم|سجل|حفظ)\s+(?:أن|ان)?\s*(.+?)\s+(?:هو|هي|=)\s+(.+)$/)
  if (m) return { q: m[1].trim(), a: m[2].trim() }
  return null
}

export function detectCorrection(text, history) {
  const t = text.trim()
  const last = (history || []).slice(-5).reverse().find(h => h?.bot && h?.user)
  const patterns = [/^لا[،,]?\s+(.+?)\s+(هو|هي)\s+(.+)$/, /^خطأ[،,]?\s+(.+?)\s+(هو|هي)\s+(.+)$/, /^ليس\s+(.+?)\s+(بل|وإنما|إنما)\s+(.+)$/]
  for (const p of patterns) {
    const m = t.match(p)
    if (m) { const c = (m[3] || m[2] || m[1]).trim(); if (c && last) return { corrected: true, old: last.bot, new: c, q: last.user } }
  }
  const simple = /^لا[،,]?\s*(?:هو|هي|هم|بل)?\s+(.{3,})$/.exec(t)
  if (simple && last) return { corrected: true, old: last.bot, new: simple[1].trim(), q: last.user }
  return null
}

export function extractInfo(text) {
  const p1 = /^(.+?)\s+(هو|هي|هم|تعني|يعني|يساوي|تساوي|هي عبارة عن)\s+(.+)$/
  const p2 = /^(.+?)\s*[=:]\s*(.+)$/
  let m = text.match(p1)
  if (m) return { subject: m[1].trim(), relation: m[2], value: m[3].trim() }
  m = text.match(p2)
  if (m) return { subject: m[1].trim(), relation: '=', value: m[2].trim() }
  return null
}

export function greeting(s) {
  const l = s.toLowerCase().trim()
  if (l.includes('السلام عليكم')) return 'وعليكم السلام ورحمة الله وبركاته 🌟'
  if (l.includes('كيف حالك') || l.includes('كيفك') || l.includes('كيف الحال')) return 'بخير وعافية، شكراً! كيف أخدمك؟'
  if (l.includes('شكراً') || l.includes('شكرا') || l.includes('مشكور')) return 'العفو، دائماً في الخدمة 😊'
  if (l.includes('ما اسمك') || l.includes('من أنت') || l.includes('من انت')) return 'أنا The King AI v24.2 ♛ — مساعدك الذكي مع دعم Claude وGemini وBrave Search!'
  if (l.includes('مع السلامة') || l.includes('باي') || l.includes('وداعاً')) return 'مع السلامة، أتمنى لك يوماً رائعاً ♛'
  if (l.includes('صباح الخير')) return 'صباح النور والسعادة 🌅'
  if (l.includes('مساء الخير') || l.includes('مساء')) return 'مساء النور 🌙'
  if (l.includes('أهلاً') || l.includes('أهلا') || l.includes('مرحباً') || l.includes('مرحبا') || l.includes('هلا')) return 'أهلاً وسهلاً! 😊 كيف أقدر أساعدك؟'
  return null
}

export function autoMerge(db, thresh = 0.92) {
  const knowledge = { ...db.knowledge }
  const keys = Object.keys(knowledge)
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j]
      if (!knowledge[a] || !knowledge[b]) continue
      if (simC(a, b) > thresh && simC(norm(knowledge[a].answer), norm(knowledge[b].answer)) > 0.85) {
        const ca = knowledge[a].confidence || 0.7, cb = knowledge[b].confidence || 0.7
        if (ca >= cb) delete knowledge[b]; else delete knowledge[a]
      }
    }
  }
  return { ...db, knowledge }
}
