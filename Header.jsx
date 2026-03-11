import { useApp } from './AppContext.jsx'
import { useCallback } from 'react'

export default function Header({ onInstall, installable }) {
  const { state, dispatch, saveSettings, showToast } = useApp()
  const { settings: S, claudeKey, geminiKey, isOnline, ctx } = state
  const hasKey = !!(claudeKey || geminiKey)

  const toggleTheme = () => saveSettings({ darkMode: !S.darkMode })
  const toggleSpeak = () => showToast(S.autoSpeak ? '🔇 القراءة معطّلة' : '🔊 القراءة مفعّلة')
  const aiLabel = S.aiEngine === 'claude' ? 'Claude' : S.aiEngine === 'gemini' ? '✦Gem' : '⚡Auto'

  return (
    <>
      <div className="header">
        <div className="header-brand">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,var(--gold),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', boxShadow: '0 2px 8px rgba(201,149,42,0.3)' }}>
              <i className="fas fa-crown" />
            </div>
            <div className="status-dot" style={{ background: !isOnline ? '#ef4444' : hasKey ? '#22c55e' : '#f59e0b' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div className="header-title">The <span>King</span> AI</div>
              <div className="header-badge">v24.2</div>
            </div>
            <div className="header-subtitle">
              {!isOnline ? '🔴 غير متصل' : ctx.subjectName ? `↗ ${ctx.subjectName}` : 'Claude · Gemini · Brave'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {installable && (
            <button className="icon-btn" onClick={onInstall} title="تثبيت على الجوال">
              <i className="fas fa-download" />
            </button>
          )}
          <button className="icon-btn" onClick={() => showToast('محرك: ' + aiLabel)} title="محرك AI"
            style={{ fontSize: 10, fontWeight: 800, padding: '0 6px', width: 'auto' }}>
            {aiLabel}
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="الثيم">
            <i className={S.darkMode ? 'fas fa-sun' : 'fas fa-moon'} />
          </button>
          <button className="icon-btn" onClick={() => saveSettings({ autoSpeak: !S.autoSpeak })} title="القراءة الصوتية"
            style={{ color: S.autoSpeak ? 'var(--gold)' : '' }}>
            <i className={S.autoSpeak ? 'fas fa-volume-up' : 'fas fa-volume-mute'} />
          </button>
          <button className="icon-btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'memory' })} title="الذاكرة">
            <i className="fas fa-brain" />
          </button>
        </div>
      </div>

      {/* PWA install bar */}
      {installable && (
        <div className="pwa-install-bar show">
          <span><i className="fas fa-mobile-alt" style={{ marginLeft: 5 }} /> ثبّت التطبيق على جهازك للعمل بدون إنترنت</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onInstall}><i className="fas fa-download" /> تثبيت</button>
          </div>
        </div>
      )}

      {/* Offline bar */}
      {!isOnline && (
        <div className="offline-bar show">
          <div className="offline-bar-msg"><i className="fas fa-wifi" style={{ textDecoration: 'line-through' }} /> لا يوجد اتصال — الردود من الذاكرة المحلية</div>
        </div>
      )}
    </>
  )
}
