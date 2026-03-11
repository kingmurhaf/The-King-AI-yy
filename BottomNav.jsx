import { useApp } from './AppContext.jsx'

const TABS = [
  { id: 'chat', icon: 'fas fa-comment-dots', label: 'محادثة' },
  { id: 'memory', icon: 'fas fa-database', label: 'ذاكرة' },
  { id: 'review', icon: 'fas fa-graduation-cap', label: 'مراجعة' },
  { id: 'reminders', icon: 'fas fa-bell', label: 'تذكيرات' },
  { id: 'settings', icon: 'fas fa-sliders-h', label: 'إعدادات' },
]

export default function BottomNav() {
  const { state, dispatch } = useApp()
  return (
    <div className="bot-nav">
      {TABS.map(t => (
        <div key={t.id} className={`nav-i${state.screen === t.id ? ' on' : ''}`} onClick={() => dispatch({ type: 'SET_SCREEN', screen: t.id })}>
          <div className="nav-icon"><i className={t.icon} /></div>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  )
}
