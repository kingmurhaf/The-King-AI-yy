import { useState, useCallback } from 'react'
import { useApp } from './AppContext.jsx'
import { norm } from './nlp.js'
import { setKB, upsertEnt, autoMerge } from './knowledge.js'

// ════ MEMORY SCREEN ════
export function MemoryScreen() {
  const { state, dispatch, updateDB, showToast } = useApp()
  const { db } = state
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(20)

  const kbItems = Object.entries(db.knowledge)
    .filter(([k, it]) => !search || k.includes(norm(search)) || it.display?.includes(search) || it.answer?.includes(search))
    .sort((a, b) => (b[1].usageCount || 0) - (a[1].usageCount || 0))

  const exportJSON = () => {
    const data = JSON.stringify({ meta: db.meta, knowledge: db.knowledge, entities: db.entities }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'king_ai_memory.json'; a.click()
    showToast('<i class="fas fa-download"></i> تم التصدير')
  }

  const importFile = (file) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const nd = JSON.parse(e.target.result)
        if (confirm('الاستيراد سيدمج مع البيانات الحالية، متابعة؟')) {
          updateDB({ ...db, knowledge: { ...db.knowledge, ...nd.knowledge }, entities: { ...db.entities, ...(nd.entities || {}) } })
          showToast('✓ تم الاستيراد')
        }
      } catch { showToast('✕ ملف غير صالح') }
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <div className="screen on" style={{ display: 'flex' }}>
      <div className="screen-hdr">
        <h1><i className="fas fa-brain" /> الذاكرة</h1>
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'chat' })}><i className="fas fa-arrow-right" /></button>
      </div>
      <div className="screen-body">
        {/* Stats */}
        <div className="card">
          <div className="card-title"><i className="fas fa-chart-pie" /> إحصائيات</div>
          <div className="stat-grid">
            <div className="stat-b"><div className="sl"><i className="fas fa-book" /> معرفة</div><div className="sv">{Object.keys(db.knowledge).length}</div></div>
            <div className="stat-b"><div className="sl"><i className="fas fa-comments" /> محادثات</div><div className="sv">{db.history.filter(h => h?.bot).length}</div></div>
            <div className="stat-b"><div className="sl"><i className="fas fa-star" /> كيانات</div><div className="sv">{Object.keys(db.entities).length}</div></div>
            <div className="stat-b"><div className="sl"><i className="fas fa-graduation-cap" /> تعلّم</div><div className="sv">{db.learnLog.filter(l => l.reason !== 'unanswered').length}</div></div>
          </div>
          <div style={{ marginTop: 8, fontSize: '.75rem', color: 'var(--text2)' }}>
            آخر تعلم: <span style={{ color: 'var(--gold)' }}>
              {db.learnLog.slice(-1)[0]?.display || '-'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="card-title"><i className="fas fa-search" /> البحث في المعرفة</div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
            <input type="text" placeholder="ابحث..." className="form-input" style={{ marginTop: 0 }} value={search} onChange={e => { setSearch(e.target.value); setShown(20) }} />
          </div>
          <div className="kb-list">
            {kbItems.slice(0, shown).map(([k, it]) => (
              <div key={k} className="kb-item">
                <div className="kb-item-text">
                  <div className="kb-item-title">{it.display || k}</div>
                  <div className="kb-item-sub">{it.answer?.substring(0, 60)}</div>
                </div>
                <div className="kb-item-acts">
                  <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{Math.round((it.confidence || 0) * 100)}%</span>
                  <button className="icon-btn" style={{ width: 24, height: 24, fontSize: 10 }} onClick={() => {
                    if (confirm('حذف "' + (it.display || k) + '"؟')) {
                      const knowledge = { ...db.knowledge }; delete knowledge[k]
                      updateDB({ ...db, knowledge }); showToast('تم الحذف')
                    }
                  }}><i className="fas fa-trash-alt" /></button>
                </div>
              </div>
            ))}
          </div>
          {kbItems.length > shown && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button className="btn" onClick={() => setShown(s => s + 20)}>المزيد ({kbItems.length - shown}) ▾</button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="btn-row">
          <button className="btn" onClick={exportJSON}><i className="fas fa-download" /> تصدير JSON</button>
          <button className="btn" onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = e => importFile(e.target.files[0]); i.click() }}><i className="fas fa-upload" /> استيراد</button>
          <button className="btn" onClick={() => { const merged = autoMerge(db, (state.settings.mergeThresh || 92) / 100); updateDB(merged); showToast('<i class="fas fa-compress-alt"></i> تم الدمج') }}><i className="fas fa-compress-alt" /> دمج المتشابهات</button>
          <button className="btn danger" onClick={() => {
            if (confirm('إعادة ضبط الذاكرة كاملاً؟')) {
              updateDB({ ...db, knowledge: {}, entities: {}, history: [], learnLog: [], stats: { totalAnswers: 0, positive: 0, negative: 0, corrections: 0 } })
              dispatch({ type: 'SET_MESSAGES', messages: [] })
              showToast('تم إعادة الضبط')
            }
          }}><i className="fas fa-trash-alt" /> إعادة ضبط</button>
        </div>
      </div>
    </div>
  )
}

// ════ REVIEW SCREEN ════
export function ReviewScreen() {
  const { state, dispatch, updateDB, showToast } = useApp()
  const { db } = state
  const [question, setQuestion] = useState(null)
  const [choices, setChoices] = useState([])
  const [answered, setAnswered] = useState(null)
  const [log, setLog] = useState([])

  const startReview = useCallback(() => {
    const items = Object.values(db.knowledge).filter(it => it.confidence > 0.3)
    if (items.length < 2) { showToast('⚠ لا يوجد محتوى كافٍ للمراجعة'); return }
    const q = items[Math.floor(Math.random() * items.length)]
    const wrong = items.filter(it => it.display !== q.display).sort(() => Math.random() - 0.5).slice(0, 3).map(it => ({ text: it.answer, correct: false }))
    const all = [...wrong, { text: q.answer, correct: true }].sort(() => Math.random() - 0.5)
    setQuestion(q); setChoices(all); setAnswered(null)
  }, [db, showToast])

  const handleAnswer = (c) => {
    setAnswered(c)
    const correct = c.correct
    setLog(prev => [{ q: question.display, correct }, ...prev].slice(0, 20))
    if (correct) {
      const knowledge = { ...db.knowledge }
      const nk = norm(question.display)
      if (knowledge[nk]) knowledge[nk] = { ...knowledge[nk], confidence: Math.min(1, (knowledge[nk].confidence || 0.7) + 0.05) }
      updateDB({ ...db, knowledge, stats: { ...db.stats, positive: (db.stats.positive || 0) + 1 } })
    }
  }

  return (
    <div className="screen on" style={{ display: 'flex' }}>
      <div className="screen-hdr">
        <h1><i className="fas fa-graduation-cap" /> مراجعة</h1>
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'chat' })}><i className="fas fa-arrow-right" /></button>
      </div>
      <div className="screen-body">
        <div className="card">
          <div className="card-title"><i className="fas fa-question-circle" /> اختبر معرفتك</div>
          {!question ? (
            <button className="btn primary" style={{ width: '100%', padding: 12, fontSize: '1rem' }} onClick={startReview}>
              <i className="fas fa-play" /> ابدأ المراجعة
            </button>
          ) : (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, lineHeight: 1.7 }}>
                {question.display}
              </div>
              <div className="btn-row" style={{ flexDirection: 'column', gap: 8 }}>
                {choices.map((c, i) => (
                  <button key={i} className={`btn${answered ? (c.correct ? ' primary' : answered === c && !c.correct ? ' danger' : '') : ''}`}
                    style={{ justifyContent: 'flex-start', textAlign: 'right', padding: '10px 14px' }}
                    onClick={() => !answered && handleAnswer(c)}>
                    {c.text}
                    {answered && c.correct && <i className="fas fa-check" style={{ marginRight: 'auto', color: '#22c55e' }} />}
                    {answered === c && !c.correct && <i className="fas fa-times" style={{ marginRight: 'auto', color: '#ef4444' }} />}
                  </button>
                ))}
              </div>
              {answered && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, color: answered.correct ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {answered.correct ? '✓ إجابة صحيحة! 🎉' : '✗ إجابة خاطئة — الصحيحة: ' + question.answer}
                  </div>
                  <button className="btn primary" onClick={startReview}><i className="fas fa-forward" /> التالي</button>
                </div>
              )}
            </>
          )}
        </div>

        {log.length > 0 && (
          <div className="card">
            <div className="card-title"><i className="fas fa-history" /> سجل المراجعة</div>
            <div className="kb-list" style={{ maxHeight: 200 }}>
              {log.map((l, i) => (
                <div key={i} className="kb-item">
                  <div className="kb-item-text"><div className="kb-item-title">{l.q}</div></div>
                  <div style={{ color: l.correct ? 'var(--green)' : 'var(--red)', fontSize: '.875rem' }}>
                    <i className={`fas fa-${l.correct ? 'check' : 'times'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════ REMINDERS SCREEN ════
export function RemindersScreen() {
  const { state, dispatch, saveReminders, showToast } = useApp()
  const { reminders } = state
  const [remText, setRemText] = useState('')
  const [remTime, setRemTime] = useState('')

  const addReminder = () => {
    if (!remText.trim() || !remTime) { showToast('⚠ أدخل النص والوقت'); return }
    const updated = [...reminders, { text: remText.trim(), time: remTime, triggered: false }]
    saveReminders(updated); setRemText(''); setRemTime('')
    showToast('<i class="fas fa-bell"></i> تذكير: ' + remText + ' — ' + remTime)
  }

  return (
    <div className="screen on" style={{ display: 'flex' }}>
      <div className="screen-hdr">
        <h1><i className="fas fa-bell" /> التذكيرات</h1>
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'chat' })}><i className="fas fa-arrow-right" /></button>
      </div>
      <div className="screen-body">
        <div className="card">
          <div className="card-title"><i className="fas fa-plus-circle" /> تذكير جديد</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <input type="text" placeholder="نص التذكير" className="form-input" style={{ flex: 2, minWidth: 130, marginTop: 0 }} value={remText} onChange={e => setRemText(e.target.value)} />
            <input type="time" className="form-input" style={{ width: 'auto', marginTop: 0 }} value={remTime} onChange={e => setRemTime(e.target.value)} />
            <button className="btn primary" onClick={addReminder}><i className="fas fa-check" /> أضف</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><i className="fas fa-bell" /> التذكيرات النشطة ({reminders.length})</div>
          {reminders.length === 0 ? (
            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>لا توجد تذكيرات بعد</div>
          ) : (
            <div className="kb-list">
              {reminders.map((r, i) => (
                <div key={i} className="kb-item">
                  <div className="kb-item-text">
                    <div className="kb-item-title">{r.text}</div>
                    <div className="kb-item-sub"><i className="fas fa-clock" style={{ marginLeft: 4 }} />{r.time}</div>
                  </div>
                  <button className="icon-btn" style={{ width: 24, height: 24, fontSize: 10 }} onClick={() => {
                    saveReminders(reminders.filter((_, j) => j !== i))
                    showToast('تم حذف التذكير')
                  }}><i className="fas fa-trash-alt" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
