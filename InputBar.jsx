import { useState, useRef, useCallback } from 'react'
import { useApp } from './AppContext.jsx'
import { useChat } from './useChat.js'

export default function InputBar() {
  const { state, dispatch, saveSettings, showToast } = useApp()
  const { settings: S, isOnline, isTyping, ctx } = state
  const { send, analyzeImage, clearCtx } = useChat()

  const [text, setText] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [webSearch, setWebSearch] = useState(S.webSearchEnabled)
  const imgRef = useRef(null)

  const handleSend = useCallback(() => {
    if (!text.trim() || isTyping) return
    send(text)
    setText('')
    setShowActions(false)
  }, [text, isTyping, send])

  const handleKey = (e) => {
    if (e.key === 'Enter' && S.enterSend && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const toggleWebSearch = () => {
    const next = !webSearch
    setWebSearch(next)
    saveSettings({ webSearchEnabled: next })
    showToast(next ? '<i class="fas fa-globe"></i> بحث الإنترنت مفعّل' : '<i class="fas fa-globe"></i> بحث الإنترنت معطّل')
  }

  // Suggestions
  const { db } = state
  const topSugs = Object.values(db.knowledge || {}).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 4).map(k => k.display)
  const defaults = ['من اخترع المصباح؟', 'عاصمة اليابان', 'طقس الرياض']

  return (
    <div className="input-area">
      {/* Context bar */}
      {ctx.subjectName && (
        <div className="ctx-bar on">
          <span><i className="fas fa-link" /></span>
          <span className="ctx-bar-text">السياق: {ctx.subjectName}</span>
          <span className="ctx-bar-close" onClick={clearCtx}><i className="fas fa-times" /></span>
        </div>
      )}

      {/* Suggestions bar */}
      {S.showSugBar && (
        <div className="sug-bar" style={{ display: 'flex' }}>
          {[...new Set([...topSugs, ...defaults])].slice(0, 6).map((s, i) => (
            <button key={i} className="chip" onClick={() => { setText(s); document.getElementById('userInput')?.focus() }}>{s}</button>
          ))}
        </div>
      )}

      {/* Actions popup */}
      {showActions && (
        <div className="acts-pop on" style={{ display: 'flex' }}>
          <button className="act-btn" onClick={() => { setShowActions(false); document.getElementById('userInput')?.focus() }}>
            <div className="act-icon deep"><i className="fas fa-brain" /></div>
            <span className="act-label">تفكير</span>
          </button>
          <button className="act-btn" onClick={() => {
            setShowActions(false)
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { showToast('⚠ التعرف على الصوت غير مدعوم'); return }
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition
            const rec = new SR(); rec.lang = 'ar-SA'; rec.interimResults = false
            rec.onresult = e => { setText(e.results[0][0].transcript); showToast('<i class="fas fa-microphone"></i> تم التعرف') }
            rec.onerror = () => showToast('⚠ خطأ في التعرف على الصوت')
            rec.start(); showToast('<i class="fas fa-microphone"></i> تحدث الآن...')
          }}>
            <div className="act-icon mic"><i className="fas fa-microphone" /></div>
            <span className="act-label">صوت</span>
          </button>
          <button className="act-btn" onClick={() => { imgRef.current?.click(); setShowActions(false) }}>
            <div className="act-icon file"><i className="fas fa-image" /></div>
            <span className="act-label">صورة</span>
          </button>
          <button className="act-btn" onClick={() => { clearCtx(); showToast('<i class="fas fa-sync-alt"></i> تم مسح السياق'); setShowActions(false) }}>
            <div className="act-icon clear"><i className="fas fa-rotate-right" /></div>
            <span className="act-label">مسح السياق</span>
          </button>
          <button className="act-btn" onClick={toggleWebSearch}>
            <div className={`act-icon web${webSearch && isOnline ? ' web-on' : ''}`}><i className="fas fa-globe" /></div>
            <span className="act-label">{webSearch && isOnline ? 'إنترنت ✓' : 'إنترنت'}</span>
          </button>
        </div>
      )}

      <div className="input-row">
        <div className="input-box">
          <input
            id="userInput"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="اكتب سؤالك هنا..."
            autoComplete="off"
            inputMode="text"
            disabled={isTyping}
          />
          <div className="input-btns">
            <button className={`plus-btn${showActions ? ' on' : ''}`} onClick={() => setShowActions(!showActions)} title="المزيد">
              <i className="fas fa-plus" style={{ fontSize: 9 }} />
            </button>
            <button className={`web-search-inline-btn${webSearch && isOnline ? ' active' : ''}`} onClick={toggleWebSearch} title="بحث في الإنترنت">
              <i className="fas fa-globe" />
            </button>
            <button className="icon-btn img-attach-btn" onClick={() => imgRef.current?.click()} title="تحليل صورة بـ Claude">
              <i className="fas fa-image" />
            </button>
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) analyzeImage(f, text || ''); e.target.value = '' }} />
            <button className="send-btn" onClick={handleSend} disabled={isTyping || !text.trim()}>
              <i className={isTyping ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
