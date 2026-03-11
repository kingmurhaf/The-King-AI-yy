import { useState, useEffect, useCallback } from 'react'
import { useApp } from './AppContext.jsx'
import Header from './Header.jsx'
import MessageList from './MessageList.jsx'
import InputBar from './InputBar.jsx'
import BottomNav from './BottomNav.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import { MemoryScreen, ReviewScreen, RemindersScreen } from './Screens.jsx'
import Toast from './Toast.jsx'
import { initSpeech, speak, stopSpeak } from './speech.js'
import { setKB, upsertEnt } from './knowledge.js'

// ─── Reminder checker ───
function ReminderChecker() {
  const { state, saveReminders, showToast } = useApp()
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const hm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
      const updated = state.reminders.map(r => {
        if (!r.triggered && r.time === hm) {
          showToast(`<i class="fas fa-bell"></i> 🔔 ${r.text}`, 5000)
          if (state.settings.soundNotif && state.settings.autoSpeak) speak(r.text, state.settings.speechRate)
          return { ...r, triggered: true }
        }
        return r
      })
      if (JSON.stringify(updated) !== JSON.stringify(state.reminders)) saveReminders(updated)
    }
    const interval = setInterval(check, 30000)
    check()
    return () => clearInterval(interval)
  }, [state.reminders, state.settings, saveReminders, showToast])
  return null
}

// ─── Teach callback ───
function TeachBridge() {
  const { updateDB, state } = useApp()
  useEffect(() => {
    window._teachKB = (q, a) => {
      let db = setKB(state.db, q, a, 0.98, 'quick-teach')
      db = upsertEnt(db, a, a, {})
      updateDB(db)
    }
    return () => { delete window._teachKB }
  }, [state.db, updateDB])
  return null
}

export default function App() {
  const { state } = useApp()
  const { screen } = state

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installable, setInstallable] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setInstallable(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') { setInstallable(false); setDeferredPrompt(null) }
  }, [deferredPrompt])

  // Init speech + global bridge for settings screen
  useEffect(() => {
    initSpeech(() => {})
    window._testSpeak = (text, rate) => speak(text, rate)
    window._stopSpeak = () => stopSpeak()
    return () => { delete window._testSpeak; delete window._stopSpeak }
  }, [])

  // Apply autoFocus
  useEffect(() => {
    if (screen === 'chat' && state.settings.autoFocus) {
      setTimeout(() => document.getElementById('userInput')?.focus(), 100)
    }
  }, [screen, state.settings.autoFocus])

  return (
    <div className="app" id="appRoot">
      <Toast />
      <ReminderChecker />
      <TeachBridge />

      {/* CHAT SCREEN */}
      <div className={`screen${screen === 'chat' ? ' on' : ''}`} style={{ display: screen === 'chat' ? 'flex' : 'none' }}>
        <Header onInstall={handleInstall} installable={installable && screen === 'chat'} />
        <div className="chat-wrap">
          <MessageList />
        </div>
        <InputBar />
        <BottomNav />
      </div>

      {/* MEMORY SCREEN */}
      {screen === 'memory' && (
        <div className="screen on" style={{ display: 'flex' }}>
          <MemoryScreen />
          <BottomNav />
        </div>
      )}

      {/* REVIEW SCREEN */}
      {screen === 'review' && (
        <div className="screen on" style={{ display: 'flex' }}>
          <ReviewScreen />
          <BottomNav />
        </div>
      )}

      {/* REMINDERS SCREEN */}
      {screen === 'reminders' && (
        <div className="screen on" style={{ display: 'flex' }}>
          <RemindersScreen />
          <BottomNav />
        </div>
      )}

      {/* SETTINGS SCREEN */}
      {screen === 'settings' && (
        <div className="screen on" style={{ display: 'flex' }}>
          <SettingsScreen />
          <BottomNav />
        </div>
      )}
    </div>
  )
}
