import { useState } from 'react'
import { useApp } from './AppContext.jsx'

function Tab({ tabs, active, onChange }) {
  return (
    <div className="s-tabs">
      {tabs.map(t => <div key={t.id} className={`s-tab${active === t.id ? ' on' : ''}`} onClick={() => onChange(t.id)}>{t.label}</div>)}
    </div>
  )
}

function Chk({ label, value, onChange, meta }) {
  return (
    <label className="form-label">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span>{label}{meta && <span style={{ display: 'block', fontSize: '.72rem', color: 'var(--text3)' }}>{meta}</span>}</span>
    </label>
  )
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div>
      <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
        <span className="slider-val">{value}{unit}</span>
      </div>
    </div>
  )
}

export default function SettingsScreen() {
  const { state, dispatch, saveSettings, saveKey, showToast, updateDB } = useApp()
  const { settings: S, db, claudeKey, geminiKey, braveKey } = state
  const [panel, setPanel] = useState('general')
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showBraveKey, setShowBraveKey] = useState(false)
  const [claudeInput, setClaudeInput] = useState('')
  const [geminiInput, setGeminiInput] = useState('')
  const [braveInput, setBraveInput] = useState('')

  const PANELS = [
    { id: 'general', label: 'عام' },
    { id: 'api', label: '🔑 API' },
    { id: 'ai', label: 'ذكاء' },
    { id: 'look', label: 'مظهر' },
    { id: 'security', label: 'أمان' },
    { id: 'advanced', label: 'متقدم' },
  ]

  const THEMES = [
    { id: 'default', color: 'linear-gradient(135deg,#c9952a,#7c3aed)' },
    { id: 'blue', color: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { id: 'purple', color: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    { id: 'green', color: 'linear-gradient(135deg,#16a34a,#15803d)' },
    { id: 'rose', color: 'linear-gradient(135deg,#e11d48,#be123c)' },
    { id: 'ocean', color: 'linear-gradient(135deg,#0284c7,#0369a1)' },
  ]

  const keyStatus = (k, prefix) => k?.startsWith(prefix) ? { ok: true, label: '✓ نشط: ...' + k.slice(-6) } : k ? { ok: false, label: '⚠ مفتاح غير صحيح' } : { ok: false, label: '○ لم يُضف' }
  const claudeSt = keyStatus(claudeKey, 'sk-ant-')
  const geminiSt = keyStatus(geminiKey, 'AIza')
  const braveSt = braveKey ? { ok: true, label: '✓ نشط: ...' + braveKey.slice(-6) } : { ok: false, label: '○ لم يُضف (اختياري)' }

  const sysInfo = `الإصدار: v24.2 React\nذاكرة: ${Object.keys(db.knowledge).length} معلومة\nكيانات: ${Object.keys(db.entities).length}\nمحادثات: ${db.history.length}`

  return (
    <div className="screen on" style={{ display: 'flex' }}>
      <div className="screen-hdr">
        <h1><i className="fas fa-cog" /> الإعدادات</h1>
        <button className="icon-btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'chat' })}><i className="fas fa-arrow-right" /></button>
      </div>
      <div className="screen-body">
        <Tab tabs={PANELS} active={panel} onChange={setPanel} />

        {/* ── عام ── */}
        {panel === 'general' && (
          <>
            <div className="card">
              <div className="card-title"><i className="fas fa-tachometer-alt" /> مستوى الثقة</div>
              <Slider label="الإجابات أقل من هذا لن تُعرض" value={db.flags.confThreshold || 30} min={0} max={100} step={5} unit="%" onChange={v => updateDB({ ...db, flags: { ...db.flags, confThreshold: v } })} />
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-globe" /> المنطقة الزمنية</div>
              <select className="form-select" value={S.timezone} onChange={e => saveSettings({ timezone: e.target.value })}>
                <option value="auto">تلقائي</option>
                <option value="Asia/Riyadh">الرياض</option>
                <option value="Africa/Cairo">القاهرة</option>
                <option value="Asia/Dubai">دبي</option>
                <option value="Asia/Kuwait">الكويت</option>
                <option value="Asia/Qatar">الدوحة</option>
                <option value="Asia/Baghdad">بغداد</option>
                <option value="Africa/Casablanca">الدار البيضاء</option>
              </select>
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-volume-up" /> إعدادات الصوت</div>
              <Slider label="سرعة القراءة" value={S.speechRate || 1} min={0.5} max={2} step={0.1} unit="×" onChange={v => saveSettings({ speechRate: v })} />
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => { window._testSpeak?.('مرحباً أنا الملك!', S.speechRate) }}><i className="fas fa-play" /> اختبار</button>
                <button className="btn danger" onClick={() => { window._stopSpeak?.() }}><i className="fas fa-stop" /> إيقاف</button>
              </div>
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-sliders-h" /> الميزات</div>
              <div className="form-group">
                <Chk label="قراءة الردود تلقائياً" value={S.autoSpeak} onChange={v => saveSettings({ autoSpeak: v })} />
                <Chk label="إظهار وقت الرسائل" value={S.showTs} onChange={v => saveSettings({ showTs: v })} />
                <Chk label="شريط الاقتراحات" value={S.showSugBar} onChange={v => saveSettings({ showSugBar: v })} />
                <Chk label="إرسال بـ Enter" value={S.enterSend} onChange={v => saveSettings({ enterSend: v })} />
                <Chk label="تركيز تلقائي على الإدخال" value={S.autoFocus} onChange={v => saveSettings({ autoFocus: v })} />
              </div>
            </div>
          </>
        )}

        {/* ── API ── */}
        {panel === 'api' && (
          <>
            {/* Claude */}
            <div className="api-key-card">
              <div className="card-title"><i className="fas fa-key" /> Anthropic Claude API</div>
              <p style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 8 }}>
                من <strong style={{ color: 'var(--gold)' }}>console.anthropic.com</strong> — يبدأ بـ <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4 }}>sk-ant-</code>
              </p>
              <input type={showClaudeKey ? 'text' : 'password'} className="api-key-input" placeholder="sk-ant-api03-..." value={claudeInput} onChange={e => setClaudeInput(e.target.value)} autoComplete="off" />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn primary" onClick={() => {
                  if (!claudeInput) { showToast('⚠ أدخل المفتاح أولاً'); return }
                  if (!claudeInput.startsWith('sk-ant-')) { showToast('⚠ يجب أن يبدأ بـ sk-ant-'); return }
                  saveKey('claude', claudeInput); setClaudeInput(''); showToast('<i class="fas fa-key"></i> تم حفظ مفتاح Claude')
                }}><i className="fas fa-save" /> حفظ</button>
                <button className="btn" onClick={() => setShowClaudeKey(!showClaudeKey)}><i className={showClaudeKey ? 'fas fa-eye-slash' : 'fas fa-eye'} /></button>
                {claudeKey && <button className="btn danger" onClick={() => { saveKey('claude', ''); showToast('تم مسح مفتاح Claude') }}><i className="fas fa-trash-alt" /> مسح</button>}
              </div>
              <div className={`api-key-status ${claudeSt.ok ? 'ok' : 'err'}`}><i className={`fas fa-${claudeSt.ok ? 'check' : 'exclamation'}-circle`} /> {claudeSt.label}</div>
            </div>

            {/* Gemini */}
            <div className="gemini-card" style={{ marginTop: 12 }}>
              <div className="card-title"><i className="fas fa-key" style={{ color: '#4285f4' }} /> Google Gemini API</div>
              <p style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 8 }}>
                من <strong style={{ color: '#4285f4' }}>aistudio.google.com</strong> — يبدأ بـ <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4 }}>AIza</code>
              </p>
              <input type={showGeminiKey ? 'text' : 'password'} className="gemini-key-input" placeholder="AIzaSy..." value={geminiInput} onChange={e => setGeminiInput(e.target.value)} autoComplete="off" />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn primary" style={{ background: '#4285f4', borderColor: '#4285f4' }} onClick={() => {
                  if (!geminiInput.startsWith('AIza')) { showToast('⚠ يجب أن يبدأ بـ AIza'); return }
                  saveKey('gemini', geminiInput); setGeminiInput(''); showToast('✦ تم حفظ مفتاح Gemini')
                }}><i className="fas fa-save" /> حفظ</button>
                <button className="btn" onClick={() => setShowGeminiKey(!showGeminiKey)}><i className={showGeminiKey ? 'fas fa-eye-slash' : 'fas fa-eye'} /></button>
                {geminiKey && <button className="btn danger" onClick={() => { saveKey('gemini', ''); showToast('تم مسح مفتاح Gemini') }}><i className="fas fa-trash-alt" /> مسح</button>}
              </div>
              <div className={`gemini-status ${geminiSt.ok ? 'ok' : 'err'}`}><i className={`fas fa-${geminiSt.ok ? 'check' : 'exclamation'}-circle`} /> {geminiSt.label}</div>
            </div>

            {/* Brave Search */}
            <div className="card" style={{ marginTop: 12, borderColor: '#fb8232', borderWidth: 1 }}>
              <div className="card-title"><i className="fas fa-search" style={{ color: '#fb8232' }} /> Brave Search API 🔍</div>
              <p style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 8 }}>
                بديل Wikipedia — من <strong style={{ color: '#fb8232' }}>api.search.brave.com</strong> (2000 بحث/شهر مجاناً)<br />
                <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>اختياري — يعمل بدونه مع DuckDuckGo كاحتياط</span>
              </p>
              <input type={showBraveKey ? 'text' : 'password'} className="form-input" placeholder="BSA..." value={braveInput} onChange={e => setBraveInput(e.target.value)} autoComplete="off" style={{ marginTop: 0 }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn" style={{ background: '#fb8232', color: '#fff', borderColor: '#fb8232' }} onClick={() => {
                  if (!braveInput) { showToast('⚠ أدخل المفتاح أولاً'); return }
                  saveKey('brave', braveInput); setBraveInput(''); showToast('<i class="fas fa-search"></i> تم حفظ مفتاح Brave')
                }}><i className="fas fa-save" /> حفظ</button>
                <button className="btn" onClick={() => setShowBraveKey(!showBraveKey)}><i className={showBraveKey ? 'fas fa-eye-slash' : 'fas fa-eye'} /></button>
                {braveKey && <button className="btn danger" onClick={() => { saveKey('brave', ''); showToast('تم مسح مفتاح Brave') }}><i className="fas fa-trash-alt" /> مسح</button>}
              </div>
              <div className={`api-key-status ${braveSt.ok ? 'ok' : 'err'}`}><i className="fas fa-search" /> {braveSt.label}</div>
            </div>

            {/* AI Engine */}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title"><i className="fas fa-robot" /> محرك الذكاء الاصطناعي</div>
              <div className="ai-selector">
                {[['auto','⚡ تلقائي'],['claude','Claude'],['gemini','✦ Gemini']].map(([id, label]) => (
                  <button key={id} className={`ai-btn ai-${id}${S.aiEngine === id ? ' on' : ''}`} onClick={() => { saveSettings({ aiEngine: id }); showToast('المحرك: ' + label) }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Models */}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">نموذج Claude</div>
              <select className="form-select" value={S.model} onChange={e => saveSettings({ model: e.target.value })}>
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (موصى به)</option>
                <option value="claude-opus-4-6">Claude Opus 4.6 (أقوى)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (أسرع)</option>
              </select>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">نموذج Gemini</div>
              <select className="form-select" value={S.geminiModel} onChange={e => saveSettings({ geminiModel: e.target.value })}>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (موصى به)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>
          </>
        )}

        {/* ── ذكاء ── */}
        {panel === 'ai' && (
          <>
            <div className="card">
              <div className="card-title"><i className="fas fa-brain" /> إعدادات الذكاء</div>
              <div className="form-group">
                <Chk label="التعلم التلقائي" value={db.flags.autoLearn} onChange={v => updateDB({ ...db, flags: { ...db.flags, autoLearn: v } })} />
                <Chk label="الوعي بالسياق" value={S.contextAware} onChange={v => saveSettings({ contextAware: v })} />
                <Chk label="دمج المتشابهات" value={S.mergeSimilar} onChange={v => saveSettings({ mergeSimilar: v })} />
                <Chk label="إخفاء الإجابات الضعيفة" value={S.hideLowConf} onChange={v => saveSettings({ hideLowConf: v })} />
                <Chk label="تنسيق Markdown" value={S.markdown} onChange={v => saveSettings({ markdown: v })} />
                <Chk label="التصحيح الإملائي" value={S.autoCorrect} onChange={v => saveSettings({ autoCorrect: v })} />
                <Chk label="البحث العميق" value={S.deepSearch} onChange={v => saveSettings({ deepSearch: v })} />
                <Chk label="البحث في الإنترنت" value={S.webSearchEnabled} onChange={v => saveSettings({ webSearchEnabled: v })} />
              </div>
            </div>
            <div className="card">
              <div className="card-title">حجم نافذة السياق</div>
              <Slider label="عدد رسائل السياق المُرسلة للـ AI" value={S.ctxSize || 5} min={1} max={20} step={1} unit="" onChange={v => saveSettings({ ctxSize: v })} />
            </div>
          </>
        )}

        {/* ── مظهر ── */}
        {panel === 'look' && (
          <>
            <div className="card">
              <div className="card-title"><i className="fas fa-palette" /> اللون الرئيسي</div>
              <div className="theme-grid">
                {THEMES.map(t => (
                  <div key={t.id} className={`theme-dot${S.theme === t.id ? ' on' : ''}`}
                    style={{ background: t.color }}
                    onClick={() => saveSettings({ theme: t.id })} />
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-text-height" /> حجم الخط</div>
              <div className="fs-grid">
                {[['sm','ص'],['md','م'],['lg','ك'],['xl','ع']].map(([id, label]) => (
                  <button key={id} className={`fs-btn${S.fontSize === id ? ' on' : ''}`} onClick={() => saveSettings({ fontSize: id })}>{label}</button>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-magic" /> خيارات العرض</div>
              <div className="form-group">
                <Chk label="الوضع الداكن" value={S.darkMode} onChange={v => saveSettings({ darkMode: v })} />
                <Chk label="تأثيرات الحركة" value={S.animations} onChange={v => saveSettings({ animations: v })} />
                <Chk label="وضع مضغوط" value={S.compact} onChange={v => saveSettings({ compact: v })} />
              </div>
            </div>
          </>
        )}

        {/* ── أمان ── */}
        {panel === 'security' && (
          <div className="card">
            <div className="card-title"><i className="fas fa-lock" /> قفل التطبيق بـ PIN</div>
            <div className="form-group">
              <Chk label="تفعيل القفل" value={S.lockEnabled} onChange={v => saveSettings({ lockEnabled: v })} />
            </div>
            {S.lockEnabled && (
              <div style={{ marginTop: 10 }}>
                <input type="password" id="pinInput" placeholder="PIN (4-8 أرقام)" className="form-input" maxLength={8} inputMode="numeric" />
                <button className="btn primary" style={{ marginTop: 8 }} onClick={() => {
                  const p = document.getElementById('pinInput')?.value
                  if (!p || p.length < 4) { showToast('⚠ الرمز يجب أن يكون 4 أرقام على الأقل'); return }
                  saveSettings({ pin: p }); showToast('<i class="fas fa-lock"></i> تم حفظ PIN')
                }}><i className="fas fa-save" /> حفظ PIN</button>
              </div>
            )}
          </div>
        )}

        {/* ── متقدم ── */}
        {panel === 'advanced' && (
          <>
            <div className="card">
              <div className="card-title"><i className="fas fa-info-circle" /> معلومات النظام</div>
              <pre style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 2, whiteSpace: 'pre-wrap' }}>{sysInfo}</pre>
            </div>
            <div className="card">
              <div className="card-title">تأخير الرد (ms)</div>
              <Slider label="" value={S.replyDelay || 200} min={0} max={2000} step={50} unit="ms" onChange={v => saveSettings({ replyDelay: v })} />
            </div>
            <div className="card">
              <div className="card-title"><i className="fas fa-exclamation-triangle" style={{ color: 'var(--red)' }} /> منطقة الخطر</div>
              <div className="btn-row">
                <button className="btn danger" onClick={() => {
                  if (confirm('مسح كل البيانات نهائياً؟ لا رجعة!')) { try { localStorage.clear() } catch {} location.reload() }
                }}><i className="fas fa-exclamation-triangle" /> مسح كل البيانات</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
