import { useEffect, useRef, useState } from 'react'
import { renderMd } from './nlp.js'
import { useApp } from './AppContext.jsx'
import { speak } from './speech.js'

function ConfBar({ confidence }) {
  if (confidence == null) return null
  const pct = Math.round(confidence * 100)
  const color = pct >= 85 ? '#22c55e' : pct >= 60 ? '#e8b84b' : '#ef4444'
  return (
    <div className="conf-wrap">
      <div className="conf-bar"><div className="conf-fill" style={{ width: pct + '%', background: color }} /></div>
      <span className="conf-pct">{pct}%</span>
      <span className="conf-lbl">ثقة</span>
    </div>
  )
}

function MsgFooter({ text, ts, onSpeak, onCopy }) {
  const { state: { settings: S } } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <div className="msg-footer">
      {S.showTs && ts && <span className="msg-ts">{new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>}
      <div className="tools-wrap">
        <button className="tools-trig" onClick={() => setOpen(!open)}>
          <i className="fas fa-ellipsis-h" />
        </button>
        {open && (
          <div className="tools-pop on">
            <button onClick={() => { onSpeak(); setOpen(false) }}><i className="fas fa-volume-up" /></button>
            <button onClick={() => { onCopy(); setOpen(false) }}><i className="fas fa-copy" /></button>
          </div>
        )}
      </div>
    </div>
  )
}

function BotBadge({ msg }) {
  const cls = msg.claudeUsed ? 'claude' : msg.geminiUsed ? 'gemini' : msg.source?.includes('Brave') ? 'brave' : msg.type === 'calc' ? 'calc' : msg.type === 'learn' ? 'learn' : msg.type === 'approx' ? 'approx' : 'fact'
  const icon = msg.claudeUsed ? <i className="fas fa-robot" /> : msg.geminiUsed ? '✦' : msg.source?.includes('Brave') ? <i className="fas fa-search" /> : msg.type === 'calc' ? '=' : msg.type === 'learn' ? <i className="fas fa-star" /> : <i className="fas fa-globe" />
  const label = msg.source || (msg.type === 'calc' ? 'حساب' : msg.type === 'learn' ? 'تعلم' : msg.type === 'approx' ? 'تقريبي' : 'إجابة')
  return <div className={`ans-badge ${cls}`}>{icon} {label}</div>
}

function Message({ msg }) {
  const { state: { settings: S }, showToast } = useApp()

  const copyText = (t) => {
    const clean = t.replace(/<[^>]+>/g, ' ').trim()
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(clean).then(() => showToast('<i class="fas fa-copy"></i> تم النسخ')).catch(() => showToast('تعذّر النسخ'))
    else showToast(clean.substring(0, 50) + '...')
  }
  const speakText = (t) => speak(t.replace(/<[^>]+>/g, ' '), S.speechRate)

  if (msg.role === 'user') {
    return (
      <div className={`message user${S.compact ? ' compact' : ''}`}>
        {msg.isImage && msg.imageSrc && <img src={msg.imageSrc} alt="صورة" className="img-preview" />}
        {msg.text}
      </div>
    )
  }

  if (msg.type === 'thinking') {
    return (
      <div className="thinking-msg">
        <span /><span /><span />
      </div>
    )
  }

  if (msg.type === 'error') {
    return (
      <div className="message bot" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
        <div style={{ color: 'var(--red)', fontSize: '.875rem' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginLeft: 6 }} />
          {msg.error}
        </div>
      </div>
    )
  }

  const mainText = msg.text || msg.mainAns || ''
  const hasBlock = msg.mainAns && msg.type !== 'util'

  return (
    <div className={`message bot${S.compact ? ' compact' : ''}`}>
      {msg.type !== 'util' && msg.type !== 'calc' && <BotBadge msg={msg} />}

      {/* Image preview if from search */}
      {msg.webData?._type === 'weather' || msg.webData?._type === 'prayer' ? null : null}

      {hasBlock ? (
        <div className={`ans-block${msg.type === 'approx' ? ' approx' : ''} md`}
          dangerouslySetInnerHTML={{ __html: renderMd(msg.mainAns, S.markdown) }} />
      ) : (
        <div className="md" dangerouslySetInnerHTML={{ __html: renderMd(mainText, S.markdown) }} />
      )}

      <ConfBar confidence={msg.confidence} />

      {msg.url && (
        <a href={msg.url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.72rem', color: 'var(--gold)', textDecoration: 'none', opacity: .8, marginTop: 5 }}>
          <i className="fas fa-external-link-alt" /> {msg.webData?.title || 'المصدر'}
        </a>
      )}

      {msg.sugs?.length > 0 && (
        <div className="sug-row">
          {msg.sugs.map((s, i) => (
            <button key={i} className="sug-q" onClick={() => {
              const inp = document.getElementById('userInput')
              if (inp) { inp.value = s; inp.focus() }
            }}>{s}</button>
          ))}
        </div>
      )}

      {msg.meta && <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>{msg.meta}</div>}

      {msg._notFound && (
        <div className="unknown-card" style={{ marginTop: 8 }}>
          <i className="fas fa-search" /> لم أجد إجابة — علّمني إياها:
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input className="form-input" style={{ flex: 1, margin: 0 }} placeholder="الجواب..." id={`teach-${msg.id}`} />
            <button className="send-btn" style={{ width: 34, height: 34, flexShrink: 0 }} onClick={() => {
              const inp = document.getElementById(`teach-${msg.id}`)
              if (inp?.value?.trim()) {
                window._teachKB?.(msg.origQ, inp.value.trim())
                inp.parentElement.innerHTML = '<div class="learn-badge"><i class="fas fa-check-circle"></i> تعلمت: ' + inp.value.trim() + '</div>'
              }
            }}><i className="fas fa-check" /></button>
          </div>
        </div>
      )}

      <MsgFooter text={mainText} ts={msg.id} onSpeak={() => speakText(msg.fullAns || mainText)} onCopy={() => copyText(msg.fullAns || mainText)} />
    </div>
  )
}

export default function MessageList() {
  const { state: { messages, isTyping } } = useApp()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="chat-container" id="chatContainer">
      {messages.length === 0 && (
        <div className="welcome-hero" style={{ textAlign: 'center', padding: '30px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="welcome-crown" style={{ fontSize: 48, marginBottom: 12, filter: 'drop-shadow(0 4px 16px rgba(201,149,42,.4))' }}>♛</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>The King AI <span style={{ color: 'var(--gold)' }}>v24.2</span></div>
          <div style={{ color: 'var(--text2)', fontSize: '.85rem', marginBottom: 16 }}>مساعدك الذكي العربي — يتعلم ويتطور</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['من اخترع المصباح؟', 'عاصمة اليابان', 'طقس الرياض', 'إحصائيات'].map(q => (
              <button key={q} className="chip" onClick={() => {
                const inp = document.getElementById('userInput')
                if (inp) { inp.value = q; inp.focus() }
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}
      {messages.map(msg => <Message key={msg.id} msg={msg} />)}
      {isTyping && !messages.find(m => m.type === 'thinking') && (
        <div className="thinking-msg"><span /><span /><span /></div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
