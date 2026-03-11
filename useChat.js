import { useCallback, useRef } from 'react'
import { useApp } from './AppContext.jsx'
import { norm, isSocial, safeMath, autoCorrect, renderMd, qtype } from './nlp.js'
import { setKB, bestAns, allAns, fuzzyRespond, findEnt, upsertEnt, boostConf, getSugs, detectTeach, detectCorrection, extractInfo, greeting, autoMerge } from './knowledge.js'
import { smartSearch } from './search.js'
import { aiProcess } from './ai.js'
import { speak } from './speech.js'

const CTX_TTL = 5 * 60 * 1000

export function useChat() {
  const { state, dispatch, updateDB, showToast } = useApp()
  const { db, settings: S, claudeKey, geminiKey, braveKey, ctx, isOnline } = state
  const ctxTimer = useRef(null)
  const srchCache = useRef(new Map())
  const lastUnanswered = useRef(null)

  // ─── Context ───
  const updateCtx = useCallback((q, a, ent = null) => {
    const newCtx = { lastQ: q, lastA: a, updatedAt: Date.now(), subject: ent ? norm(ent) : ctx.subject, subjectName: ent || ctx.subjectName, subjectAnswer: ent ? a : ctx.subjectAnswer }
    dispatch({ type: 'SET_CONTEXT', ctx: newCtx })
    if (ctxTimer.current) clearTimeout(ctxTimer.current)
    ctxTimer.current = setTimeout(() => dispatch({ type: 'SET_CONTEXT', ctx: { subject: null, subjectName: null, subjectAnswer: null, lastQ: null, lastA: null, updatedAt: null } }), CTX_TTL)
  }, [ctx, dispatch])

  const clearCtx = useCallback(() => {
    if (ctxTimer.current) clearTimeout(ctxTimer.current)
    dispatch({ type: 'SET_CONTEXT', ctx: { subject: null, subjectName: null, subjectAnswer: null, lastQ: null, lastA: null, updatedAt: null } })
  }, [dispatch])

  // ─── Build message ───
  function buildMsg(res, orig) {
    return { id: Date.now() + Math.random(), role: 'bot', ...res, orig }
  }

  // ─── Local respond ───
  const respondLocal = useCallback((orig) => {
    const lc = orig.toLowerCase().trim()
    let curDB = db

    // Greeting
    const gr = greeting(orig)
    if (gr) return { type: 'util', text: gr }
    if (isSocial(orig)) return { type: 'util', text: '😊' }

    // Teach
    const teach = detectTeach(orig)
    if (teach) {
      curDB = setKB(curDB, teach.q, teach.a, 0.98, 'direct')
      curDB = setKB(curDB, 'ما هو ' + teach.q, teach.a, 0.9, 'auto')
      curDB = upsertEnt(curDB, teach.a, teach.a, {})
      updateDB(curDB)
      updateCtx(teach.q, teach.a, teach.a)
      return { type: 'learn', text: 'تعلمت ✓', mainAns: `"${teach.q}" ← "${teach.a}"`, ansClass: 'learn' }
    }

    // Correction
    const corr = detectCorrection(orig, db.history)
    if (corr) {
      curDB = setKB(curDB, corr.q, corr.new, 0.99, 'correction')
      curDB = { ...curDB, stats: { ...curDB.stats, corrections: (curDB.stats.corrections || 0) + 1 } }
      updateDB(curDB)
      return { type: 'learn', text: 'تم التصحيح', mainAns: `"${corr.old}" ← "${corr.new}"`, ansClass: 'learn' }
    }

    // Auto-learn from statement
    if (db.flags.autoLearn && !isSocial(orig)) {
      const info = extractInfo(orig)
      if (info?.subject && info?.value && !/[؟?]$/.test(orig.trim()) && orig.length > 7 && !/^(هل|ما|ماذا|كيف|لماذا|أين|متى|من|كم)\s/.test(orig.trim())) {
        curDB = setKB(curDB, info.subject, info.value, 0.9, 'infer')
        curDB = setKB(curDB, 'ما هو ' + info.subject, info.value, 0.9, 'infer')
        curDB = upsertEnt(curDB, info.subject, info.value, {})
        updateDB(curDB)
        return { type: 'learn', text: 'حفظت', mainAns: `"${info.subject}" = "${info.value}"`, ansClass: 'learn' }
      }
    }

    // Introspect
    if (/^(كم|عدد)\s+(معلومة|معلومات|حفظت|تعرف)/.test(lc) || lc.includes('إحصائيات')) {
      return { type: 'util', text: 'إحصائياتي ♛', mainAns: `أعرف **${Object.keys(db.knowledge).length}** معلومة\n**${Object.keys(db.entities).length}** كيان\n**${db.history.filter(h => h?.bot).length}** محادثة`, ansClass: 'learn' }
    }

    // Name
    const nameMatch = orig.match(/^(?:اسمي|أنا اسمي)\s+(.+)$/i)
    if (nameMatch) {
      curDB = { ...curDB, memory: { ...curDB.memory, name: nameMatch[1].trim() } }
      updateDB(curDB)
      return { type: 'util', text: 'سعيد بمعرفتك ' + nameMatch[1].trim() + ' ♛' }
    }
    if ((lc.includes('ما اسمي') || lc.includes('من أنا')) && db.memory.name) {
      return { type: 'util', text: 'اسمك ' + db.memory.name + ' ✓' }
    }

    // Time/Date
    const tz = S.timezone === 'auto' ? undefined : S.timezone
    const tzOpts = tz ? { timeZone: tz } : {}
    if (/^(كم الساعة|الوقت الآن|الساعة كم)/.test(lc)) return { type: 'util', text: 'الوقت الآن: ' + new Date().toLocaleTimeString('ar-SA', tzOpts) }
    if (/^(ما\s+اليوم|التاريخ اليوم|اليوم كم|ما\s+هو\s+اليوم)/.test(lc) || lc === 'اليوم') {
      return { type: 'util', text: 'اليوم: ' + new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...tzOpts }) }
    }

    // Math
    if (/[0-9+\-*/^().]/.test(orig) && /\d/.test(orig)) {
      const r = safeMath(orig)
      if (r !== null) return { type: 'calc', text: 'حساب', mainAns: orig.replace(/\s+/g, '') + ' = **' + r + '**', ansClass: 'calc' }
    }

    // Context-aware query
    let q = orig
    if (S.contextAware && ctx.subject) {
      const pronouns = ['هو','هي','هم','عنه','عنها','عنهم','له','لها','لهم','به','بها']
      if (pronouns.some(p => lc.includes(p)) || lc.length < 15) q = ctx.subjectName + ' ' + orig
    }

    // Deep search
    if (S.deepSearch) {
      const all = allAns(db, q, 0.15, 6)
      if (all.length) {
        updateCtx(orig, all[0].answer, all[0].answer)
        return { type: 'fact', text: 'تفكير عميق', mainAns: all.map((r, i) => `${i+1}. **${r.display}**: ${r.answer}`).join('\n'), ansClass: 'infer', confidence: all[0].confidence }
      }
    }

    // Entity
    const ent = findEnt(db, q)
    if (ent) {
      const qt = qtype(orig)
      let ans = ent.answer
      if (qt === 'where' && ent.attributes.nationality) ans = ent.name + ': ' + ent.attributes.nationality
      else if (qt === 'when' && (ent.attributes.born || ent.attributes.year)) ans = ent.name + ': ' + (ent.attributes.born || ent.attributes.year)
      else if (qt === 'how' && ent.attributes.known_for) ans = ent.name + ' معروف بـ: ' + ent.attributes.known_for
      const km = bestAns(db, q, 0)
      if (km) updateDB(boostConf(db, km.key))
      updateCtx(orig, ans, ent.name)
      lastUnanswered.current = null
      return { type: 'fact', text: ent.name, mainAns: ans.split(/[.،]\s+/).filter(s => s.trim().length > 5)[0] || ans.substring(0, 150), fullAns: ans, ansClass: 'fact', confidence: km?.confidence, sugs: getSugs(db, ans) }
    }

    // Best match
    const minC = S.hideLowConf ? (db.flags.confThreshold || 30) / 100 : 0
    const match = bestAns(db, q, minC)
    if (match) {
      updateDB(boostConf(db, match.key))
      updateCtx(orig, match.answer, match.answer)
      lastUnanswered.current = null
      const briefAns = match.answer.split(/[.،]\s+/).filter(s => s.trim().length > 5)[0] || match.answer.substring(0, 150)
      return { type: 'fact', text: match.display, mainAns: briefAns, fullAns: match.answer, ansClass: 'fact', confidence: match.confidence, sugs: getSugs(db, match.answer) }
    }

    // Fuzzy
    const fuzzy = fuzzyRespond(db, norm(q))
    if (fuzzy && fuzzy.conf > 0.45) {
      updateCtx(orig, fuzzy.text, fuzzy.text)
      lastUnanswered.current = orig
      return { type: 'approx', text: 'إجابة تقريبية', mainAns: fuzzy.text, ansClass: 'approx', confidence: fuzzy.conf, meta: 'صحح لي إن كنت مخطئاً' }
    }

    // Not found
    lastUnanswered.current = orig
    return { type: 'notfound', _notFound: true, text: 'لم أتعلم هذا بعد', origQ: orig }
  }, [db, S, ctx, updateDB, updateCtx, clearCtx])

  // ─── Web search + AI ───
  const respondWithSearch = useCallback(async (orig) => {
    dispatch({ type: 'SET_TYPING', isTyping: true })
    const cached = srchCache.current.get(orig)

    let webData = null
    if (isOnline && S.webSearchEnabled && orig.length > 4 && !cached) {
      webData = await Promise.race([
        smartSearch(orig, braveKey).catch(() => null),
        new Promise(r => setTimeout(() => r(null), 9000))
      ])
    }

    const aiResult = await aiProcess(orig, webData?.raw || null, {
      claudeKey, geminiKey, engine: S.aiEngine, model: S.model, geminiModel: S.geminiModel,
      history: db.history
    })

    dispatch({ type: 'SET_TYPING', isTyping: false })

    const engineLabel = aiResult.engine === 'gemini' ? 'Gemini AI' : aiResult.engine === 'claude' ? 'Claude AI' : null

    if (aiResult.ok && aiResult.text) {
      const result = {
        type: 'ai', text: aiResult.text,
        source: webData ? (engineLabel ? engineLabel + ' + ' + (webData.source || 'بحث ذكي') : webData.source || 'بحث ذكي') : (engineLabel || 'ذاكرة محلية'),
        url: webData?.url || '',
        webData, claudeUsed: aiResult.engine === 'claude', geminiUsed: aiResult.engine === 'gemini',
        _err: null
      }
      srchCache.current.set(orig, result)

      // Save to KB
      let curDB = setKB(db, orig, aiResult.text.substring(0, 300), 0.88, 'ai')
      curDB = upsertEnt(curDB, webData?.title || orig, aiResult.text.substring(0, 300), {})
      curDB = { ...curDB, history: [...curDB.history, { user: orig, bot: aiResult.text.substring(0, 300), t: Date.now() }].slice(-S.maxMsgs) }
      updateDB(curDB)
      updateCtx(orig, aiResult.text.substring(0, 300), webData?.title || orig)
      return result
    }

    if (webData) {
      return { type: 'web', text: webData.preview, source: webData.source, url: webData.url, _err: aiResult.err }
    }

    if (aiResult.err) return { type: 'error', error: aiResult.err }
    return null
  }, [db, S, claudeKey, geminiKey, braveKey, isOnline, updateDB, updateCtx])

  // ─── Main send ───
  const send = useCallback(async (rawText) => {
    const text = autoCorrect(rawText.trim(), S.autoCorrect)
    if (!text) return

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', text }
    dispatch({ type: 'ADD_MESSAGE', message: userMsg })

    // Record in history
    const curDB = { ...db, stats: { ...db.stats, totalAnswers: (db.stats.totalAnswers || 0) + 1 } }
    updateDB(curDB)

    dispatch({ type: 'SET_TYPING', isTyping: true })

    // Delay
    await new Promise(r => setTimeout(r, S.replyDelay || 200))

    // Local respond
    const local = respondLocal(text)
    const hasKey = !!(claudeKey || geminiKey)
    const isUtil = local?.type === 'learn' || local?.type === 'calc' || local?.type === 'util'

    if (isUtil) {
      dispatch({ type: 'SET_TYPING', isTyping: false })
      const botMsg = { id: Date.now() + 1, role: 'bot', ...local }
      dispatch({ type: 'ADD_MESSAGE', message: botMsg })
      let updDB = { ...db, history: [...db.history, { user: text, bot: local.mainAns || local.text || '', t: Date.now() }].slice(-S.maxMsgs) }
      updateDB(updDB)
      if (S.autoSpeak && (local.mainAns || local.text)) speak(local.mainAns || local.text, S.speechRate)
      return
    }

    // Need AI/Search
    if (hasKey || (!local._notFound && isOnline && S.webSearchEnabled)) {
      dispatch({ type: 'SET_TYPING', isTyping: false })
      // Show typing indicator as placeholder
      const placeholderMsg = { id: Date.now() + 1, role: 'bot', type: 'thinking', text: '' }
      dispatch({ type: 'ADD_MESSAGE', message: placeholderMsg })

      const result = await respondWithSearch(text).catch(err => ({ type: 'error', error: err.message }))

      // Replace placeholder
      dispatch({ type: 'REMOVE_LAST_MSG' })
      const botMsg = { id: Date.now() + 2, role: 'bot', ...(result || { type: 'error', error: 'تعذّر الحصول على إجابة' }) }
      dispatch({ type: 'ADD_MESSAGE', message: botMsg })

      if (result?.type !== 'error' && S.autoSpeak) speak(result?.text || '', S.speechRate)
      return
    }

    // Local only
    dispatch({ type: 'SET_TYPING', isTyping: false })
    const botMsg = { id: Date.now() + 1, role: 'bot', ...local }
    dispatch({ type: 'ADD_MESSAGE', message: botMsg })
    let updDB = { ...db, history: [...db.history, { user: text, bot: local.mainAns || local.text || '', t: Date.now() }].slice(-S.maxMsgs) }
    if (local._notFound) updDB = { ...updDB, learnLog: [...updDB.learnLog, { t: Date.now(), reason: 'unanswered', key: text }].slice(-500) }
    updateDB(updDB)
    if (S.autoSpeak && (local.mainAns || local.text)) speak(local.mainAns || local.text, S.speechRate)
  }, [db, S, claudeKey, geminiKey, isOnline, respondLocal, respondWithSearch, dispatch, updateDB])

  // ─── Image analysis ───
  const analyzeImage = useCallback(async (file, question = '') => {
    if (!claudeKey) { showToast('⚠ أضف مفتاح Claude API من الإعدادات أولاً'); return }
    const reader = new FileReader()
    reader.onload = async e => {
      const b64 = e.target.result.split(',')[1]
      const mime = file.type || 'image/jpeg'
      const userMsg = { id: Date.now(), role: 'user', text: question || '🖼️ تحليل صورة', isImage: true, imageSrc: e.target.result }
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })
      dispatch({ type: 'SET_TYPING', isTyping: true })
      try {
        const result = await claudeVision(b64, mime, question, claudeKey, S.model)
        dispatch({ type: 'SET_TYPING', isTyping: false })
        dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now() + 1, role: 'bot', type: 'ai', text: result, source: 'Claude Vision 👁️' } })
      } catch (err) {
        dispatch({ type: 'SET_TYPING', isTyping: false })
        dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now() + 1, role: 'bot', type: 'error', error: err.message } })
      }
    }
    reader.readAsDataURL(file)
  }, [claudeKey, S.model, dispatch, showToast])

  return { send, analyzeImage, updateCtx, clearCtx }
}
