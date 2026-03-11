// ═══ Search Engine — Brave Search بدلاً من Wikipedia ═══

/* 🌤️ الطقس */
async function fetchWeather(q) {
  try {
    const cities = {
      'الرياض': [24.69, 46.72], 'جدة': [21.54, 39.17], 'مكة': [21.38, 39.86],
      'دبي': [25.2, 55.27], 'أبوظبي': [24.47, 54.37], 'القاهرة': [30.06, 31.25],
      'بيروت': [33.89, 35.5], 'عمّان': [31.95, 35.93], 'بغداد': [33.34, 44.4],
      'الكويت': [29.37, 47.98], 'الدوحة': [25.29, 51.53], 'المنامة': [26.21, 50.59],
      'مسقط': [23.61, 58.59], 'الخرطوم': [15.5, 32.56], 'تونس': [36.81, 10.18],
      'الجزائر': [36.74, 3.06], 'الرباط': [34.01, -6.83], 'طرابلس': [32.89, 13.18],
      'دمشق': [33.51, 36.29], 'صنعاء': [15.35, 44.21], 'لندن': [51.5, -0.12],
      'باريس': [48.86, 2.35], 'برلين': [52.52, 13.4], 'موسكو': [55.75, 37.62],
      'نيويورك': [40.71, -74.0], 'طوكيو': [35.68, 139.69], 'بكين': [39.9, 116.4],
    }
    let lat = null, lon = null, cityName = q
    for (const [c, [la, lo]] of Object.entries(cities)) {
      if (q.includes(c)) { lat = la; lon = lo; cityName = c; break }
    }
    if (!lat) {
      // جيوكودينج تلقائي
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=ar`,
        { signal: AbortSignal.timeout(5000) }
      )
      const gd = await geo.json()
      if (!gd.results?.length) return null
      lat = gd.results[0].latitude; lon = gd.results[0].longitude
      cityName = gd.results[0].name
    }
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto`,
      { signal: AbortSignal.timeout(7000) }
    )
    const d = await r.json()
    const cur = d.current
    const codes = { 0:'صافٍ ☀️',1:'صافٍ غالباً 🌤️',2:'غائم جزئياً ⛅',3:'غائم ☁️',45:'ضبابي 🌫️',48:'ضبابي 🌫️',51:'رذاذ خفيف 🌦️',61:'مطر خفيف 🌧️',63:'مطر معتدل 🌧️',65:'مطر غزير 🌧️',71:'ثلج خفيف ❄️',80:'زخات خفيفة 🌦️',95:'عاصفة رعدية ⛈️' }
    const desc = codes[cur.weather_code] || 'غير معروف'
    const summary = `**الطقس في ${cityName} الآن:**\n- الحالة: ${desc}\n- الحرارة: **${Math.round(cur.temperature_2m)}°C** (تشعر كـ ${Math.round(cur.apparent_temperature)}°C)\n- الرطوبة: ${cur.relative_humidity_2m}%\n- الرياح: ${Math.round(cur.wind_speed_10m)} كم/س${cur.precipitation > 0 ? `\n- هطول: ${cur.precipitation} مم` : ''}`
    return { title: 'طقس ' + cityName, raw: summary, preview: summary, source: 'Open-Meteo', url: 'https://open-meteo.com', _type: 'weather' }
  } catch { return null }
}

/* 💱 العملات */
async function fetchCurrency(q) {
  try {
    const currencies = { 'دولار':'USD','يورو':'EUR','جنيه إسترليني':'GBP','ريال سعودي':'SAR','ريال':'SAR','درهم':'AED','دينار كويتي':'KWD','دينار':'KWD','جنيه مصري':'EGP','ليرة':'TRY','يوان':'CNY','روبية':'INR','ريال قطري':'QAR','دينار أردني':'JOD' }
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(7000) })
    const d = await r.json()
    if (!d?.rates) return null
    const numMatch = q.match(/(\d+(?:\.\d+)?)/)
    const amount = numMatch ? parseFloat(numMatch[1]) : 1
    let fromCur = 'USD', toCur = null
    for (const [k, v] of Object.entries(currencies)) {
      if (q.includes(k)) { if (!toCur) toCur = v; else fromCur = v }
    }
    let summary = ''
    if (toCur && toCur !== fromCur) {
      const result = (amount / (d.rates[fromCur] || 1)) * (d.rates[toCur] || 1)
      summary = `**تحويل العملات:**\n${amount} ${fromCur} = **${result.toFixed(4)} ${toCur}**`
    } else {
      const main = [['SAR','الريال السعودي'],['AED','الدرهم الإماراتي'],['KWD','الدينار الكويتي'],['EGP','الجنيه المصري'],['EUR','اليورو'],['GBP','الجنيه الإسترليني'],['TRY','الليرة التركية']]
      summary = `**أسعار الصرف مقابل الدولار:**\n` + main.map(([c,n]) => `- ${n} (${c}): **${d.rates[c]?.toFixed(4) || 'غير متاح'}**`).join('\n')
    }
    return { title: 'أسعار العملات', raw: summary, preview: summary, source: 'ExchangeRate API', url: 'https://open.er-api.com', _type: 'currency' }
  } catch { return null }
}

/* 🕌 الصلاة */
async function fetchPrayer(q) {
  try {
    const cityMatch = q.match(/(?:في|بـ|ب)\s+([^\?؟،,]+)/i)
    const city = cityMatch ? cityMatch[1].trim() : 'Riyadh'
    const today = new Date()
    const dateStr = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`
    const r = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=&method=4`, { signal: AbortSignal.timeout(7000) })
    const d = await r.json()
    const t = d?.data?.timings
    if (!t) return null
    const names = { Fajr:'الفجر', Sunrise:'الشروق', Dhuhr:'الظهر', Asr:'العصر', Maghrib:'المغرب', Isha:'العشاء' }
    const summary = `**🕌 مواقيت الصلاة في ${city} اليوم:**\n` + Object.entries(names).map(([k,v]) => `- ${v}: **${t[k]}**`).join('\n')
    return { title: 'مواقيت الصلاة', raw: summary, preview: summary, source: 'Aladhan', url: 'https://aladhan.com', _type: 'prayer' }
  } catch { return null }
}

/* 🦆 DuckDuckGo */
async function fetchDDG(q) {
  try {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&kl=ar-ar`, { signal: AbortSignal.timeout(6000) })
    const d = await r.json()
    let text = d.AbstractText || d.Answer || ''
    if (!text && d.RelatedTopics?.length > 0) {
      text = d.RelatedTopics.filter(t => t.Text && !t.Topics).slice(0, 3).map(t => '• ' + t.Text).join('\n')
    }
    if (!text || text.length < 20) return null
    return { title: d.Heading || q, raw: text.substring(0, 1500), preview: text.substring(0, 500), source: d.AbstractSource || 'DuckDuckGo', url: d.AbstractURL || '', _type: 'ddg' }
  } catch { return null }
}

/* 🔍 Brave Search — بديل Wikipedia الذكي */
export async function fetchBrave(q, apiKey) {
  if (!apiKey) return null
  try {
    // Brave Search API - يجلب نتائج ويب حقيقية
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&search_lang=ar&country=SA&text_decorations=false`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      },
      signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) return null
    const d = await r.json()
    const results = d.web?.results || []
    if (!results.length) return null
    // دمج أول 3 نتائج
    const summary = results.slice(0, 3).map((res, i) =>
      `**${i+1}. ${res.title}**\n${res.description || ''}`
    ).join('\n\n')
    return {
      title: results[0].title,
      raw: summary,
      preview: results[0].description || summary.substring(0, 300),
      source: 'Brave Search 🔍',
      url: results[0].url,
      _type: 'brave'
    }
  } catch { return null }
}

/* اكتشاف نوع الاستعلام */
function detectType(q) {
  const l = q.toLowerCase()
  if (/طقس|الجو|الحرارة|درجة الحرارة|حالة الجو/.test(l)) return 'weather'
  if (/سعر|عملة|دولار|يورو|ريال|درهم|دينار|جنيه|تحويل|صرف/.test(l)) return 'currency'
  if (/صلاة|فجر|ظهر|عصر|مغرب|عشاء|أذان/.test(l)) return 'prayer'
  if (/كم الساعة|الوقت|التاريخ|اليوم/.test(l)) return 'datetime'
  return 'general'
}

/* المحرك الرئيسي للبحث */
export async function smartSearch(q, braveKey = '') {
  const type = detectType(q)
  if (type === 'weather') { const r = await fetchWeather(q); if (r) return r }
  if (type === 'currency') { const r = await fetchCurrency(q); if (r) return r }
  if (type === 'prayer') { const r = await fetchPrayer(q); if (r) return r }
  if (type === 'datetime') {
    const now = new Date()
    const text = `الوقت الآن: **${now.toLocaleTimeString('ar-SA')}**\nالتاريخ: **${now.toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}**`
    return { title: 'الوقت والتاريخ', raw: text, preview: text, source: 'النظام', url: '', _type: 'datetime' }
  }

  // Brave Search أولاً (إذا كان المفتاح موجوداً) ثم DuckDuckGo كاحتياط
  if (braveKey) {
    const brave = await fetchBrave(q, braveKey)
    const ddg = await fetchDDG(q).catch(() => null)
    if (brave && ddg) {
      return {
        title: brave.title,
        raw: brave.raw + '\n\n---\n**DuckDuckGo:**\n' + ddg.raw,
        preview: brave.preview,
        source: 'Brave Search + DuckDuckGo',
        url: brave.url,
        _type: 'combined'
      }
    }
    if (brave) return brave
  }

  // DuckDuckGo فقط كاحتياط
  const ddg = await fetchDDG(q).catch(() => null)
  if (ddg) return ddg
  return null
}
