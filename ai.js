// ═══ AI APIs Engine ═══

export async function callClaude(system, userMsg, apiKey, model = 'claude-sonnet-4-6') {
  if (!apiKey) return { ok: false, err: 'لم يتم إدخال مفتاح Claude API — أضفه من الإعدادات' }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: 'user', content: userMsg }] }),
      signal: AbortSignal.timeout(20000)
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const m = data?.error?.message || ('خطأ ' + resp.status)
      if (resp.status === 401) return { ok: false, err: 'مفتاح Claude غير صحيح — تحقق منه في الإعدادات' }
      if (resp.status === 429) return { ok: false, err: 'تجاوزت حد الطلبات — انتظر قليلاً ثم أعد المحاولة' }
      return { ok: false, err: m.replace(/sk-ant-[^\s"']*/g, '[KEY]') }
    }
    const text = data.content?.[0]?.text?.trim()
    if (!text) return { ok: false, err: 'Claude لم يُرجع رداً' }
    return { ok: true, text, engine: 'claude' }
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return { ok: false, err: 'انتهت مهلة الاتصال بـ Claude (20 ثانية)' }
    return { ok: false, err: 'خطأ في الشبكة: ' + e.message }
  }
}

export async function callGemini(prompt, apiKey, model = 'gemini-2.0-flash') {
  if (!apiKey) return { ok: false, err: 'لم يتم إدخال مفتاح Gemini API — أضفه من الإعدادات' }
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.65 } }),
      signal: AbortSignal.timeout(20000)
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const m = data?.error?.message || ('خطأ ' + resp.status)
      if (resp.status === 429) return { ok: false, err: 'تجاوزت حد طلبات Gemini — انتظر قليلاً' }
      return { ok: false, err: m }
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return { ok: false, err: 'Gemini لم يُرجع رداً' }
    return { ok: true, text, engine: 'gemini' }
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return { ok: false, err: 'انتهت مهلة الاتصال بـ Gemini (20 ثانية)' }
    return { ok: false, err: 'خطأ في الشبكة: ' + e.message }
  }
}

export async function claudeVision(base64, mime, question, apiKey, model = 'claude-sonnet-4-6') {
  if (!apiKey) throw new Error('لا يوجد مفتاح API — أضفه من الإعدادات')
  if (base64.length > 5_400_000) throw new Error('الصورة كبيرة جداً (الحد 4MB)')
  const safeMime = ['image/jpeg','image/png','image/gif','image/webp'].includes(mime) ? mime : 'image/jpeg'
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model, max_tokens: 800,
      system: 'أنت "الملك" مساعد ذكي متخصص في تحليل الصور. حلّل الصورة بدقة باللغة العربية وكن مفصّلاً ومفيداً.',
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: safeMime, data: base64 } }, { type: 'text', text: question || 'ماذا ترى في هذه الصورة؟ اشرح بالتفصيل.' }] }]
    })
  })
  const data = await resp.json().catch(() => { throw new Error('استجابة غير صالحة') })
  if (!resp.ok) throw new Error((data?.error?.message || 'خطأ ' + resp.status).replace(/sk-ant-[^\s"']*/g, '[KEY]'))
  return data.content?.[0]?.text?.trim() || ''
}

export function buildSystemPrompt(history, withSearch) {
  const ctx = history.filter(h => h?.bot).slice(-3).map(h => `س: ${h.user}\nج: ${h.bot}`).join('\n')
  return 'أنت "الملك" — مساعد ذكاء اصطناعي عربي دقيق ومفيد.\n' +
    'قواعد:\n' +
    '• أجب مباشرةً بدون مقدمات زائدة\n' +
    '• استخدم العربية دائماً\n' +
    '• كن دقيقاً في الأرقام والتواريخ\n' +
    (withSearch ? '• لديك معلومات من بحث الويب — استخدمها واستكملها بمعرفتك\n' : '• أجب من معرفتك مباشرةً\n') +
    '• نظّم الرد بنقاط عند وجود عدة معلومات\n' +
    '• إذا لم تعرف شيئاً بيقين، قل ذلك بصدق' +
    (ctx ? '\n\nسياق المحادثة الأخير:\n' + ctx : '')
}

export async function aiProcess(question, rawData, { claudeKey, geminiKey, engine, model, geminiModel, history }) {
  const sys = buildSystemPrompt(history || [], !!rawData)
  const userMsg = rawData
    ? `معلومات من بحث الويب:\n"""\n${rawData.substring(0, 1200)}\n"""\n\nالسؤال: ${question}\n\nأجب بناءً على المعلومات أعلاه مع إضافة أي معرفة مهمة.`
    : `السؤال: ${question}`
  const flatPrompt = sys + '\n\n' + userMsg

  if (engine === 'claude' && claudeKey) {
    const r = await callClaude(sys, userMsg, claudeKey, model)
    return r.ok ? r : { text: null, engine: 'claude', err: r.err }
  }
  if (engine === 'gemini' && geminiKey) {
    const r = await callGemini(flatPrompt, geminiKey, geminiModel)
    return r.ok ? r : { text: null, engine: 'gemini', err: r.err }
  }
  // Auto mode
  if (claudeKey) {
    const r = await callClaude(sys, userMsg, claudeKey, model)
    if (r.ok) return r
  }
  if (geminiKey) {
    const r = await callGemini(flatPrompt, geminiKey, geminiModel)
    if (r.ok) return r
  }
  return { text: null, engine: 'local', err: null }
}
