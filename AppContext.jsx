import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { lsGet, lsSet, idbSet, idbGet } from './storage.js'
import { setKB, upsertEnt, autoMerge } from './knowledge.js'
import { norm } from './nlp.js'
import { SEEDS, SEED_V } from './seed.js'

const SK = 'KAI_v24_DB', RK = 'KAI_v24_REM', SET = 'KAI_v24_SET', AK = 'KAI_v24_API', GK = 'KAI_v24_GEMINI', BK = 'KAI_v24_BRAVE', SNAP = 'KAI_v24_SNAP'

const DEF_DB = {
  meta: { version: '24.2', created: Date.now(), seedVersion: 0, updated: 0 },
  memory: { name: null, age: null },
  knowledge: {}, entities: {},
  history: [], learnLog: [],
  stats: { totalAnswers: 0, positive: 0, negative: 0, corrections: 0 },
  flags: { autoLearn: true, confThreshold: 30 }
}

const DEF_SETTINGS = {
  smartSugQ: true, mergeSimilar: true, contextAware: true, hideLowConf: true,
  markdown: true, autoCorrect: false, deepSearch: false, webSearchEnabled: true,
  fontSize: 'md', timezone: 'auto', theme: 'default', darkMode: true,
  autoBackup: false, backupInterval: 60,
  lockEnabled: false, pin: '',
  speechRate: 1, animations: true, compact: false, maxMsgs: 200,
  ctxSize: 5, mergeThresh: 92, verbose: false,
  autoSpeak: false, showTs: false, showSugBar: true, autoFocus: true,
  enterSend: true, soundNotif: true, maxKnowledge: 0, replyDelay: 200,
  model: 'claude-sonnet-4-6', geminiModel: 'gemini-2.0-flash', aiEngine: 'auto'
}

function migrate(o) {
  if (!o.entities) o.entities = {}
  if (!o.flags) o.flags = { autoLearn: true, confThreshold: 30 }
  if (!o.meta) o.meta = { version: '24.0', created: Date.now(), seedVersion: 0, updated: 0 }
  if (!o.meta.seedVersion) o.meta.seedVersion = 0
  if (o.knowledge) {
    Object.keys(o.knowledge).forEach(k => {
      if (typeof o.knowledge[k] === 'string') o.knowledge[k] = { display: k, answer: o.knowledge[k], confidence: 0.7, usageCount: 0, history: [] }
      if (!o.knowledge[k].history) o.knowledge[k].history = []
    })
  }
  if (o.history?.length > 5000) o.history = o.history.slice(-5000)
  if (o.learnLog?.length > 500) o.learnLog = o.learnLog.slice(-500)
  return o
}

// ═══ Reducer ═══
function reducer(state, action) {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.db }
    case 'UPDATE_DB': return { ...state, db: { ...state.db, ...action.patch } }
    case 'SET_SETTINGS': return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'SET_MESSAGES': return { ...state, messages: action.messages }
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages, action.message] }
    case 'UPDATE_LAST_MSG': {
      const msgs = [...state.messages]
      if (msgs.length) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...action.patch }
      return { ...state, messages: msgs }
    }
    case 'REMOVE_LAST_MSG': return { ...state, messages: state.messages.slice(0, -1) }
    case 'SET_SCREEN': return { ...state, screen: action.screen }
    case 'SET_TOAST': return { ...state, toast: action.toast }
    case 'SET_REMINDERS': return { ...state, reminders: action.reminders }
    case 'SET_CONTEXT': return { ...state, ctx: action.ctx }
    case 'SET_KEYS': return { ...state, claudeKey: action.claudeKey ?? state.claudeKey, geminiKey: action.geminiKey ?? state.geminiKey, braveKey: action.braveKey ?? state.braveKey }
    case 'SET_ONLINE': return { ...state, isOnline: action.isOnline }
    case 'SET_SPEAKING': return { ...state, isSpeaking: action.isSpeaking }
    case 'SET_TYPING': return { ...state, isTyping: action.isTyping }
    default: return state
  }
}

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    db: (() => { try { const r = lsGet(SK); return r ? migrate({ ...DEF_DB, ...r }) : JSON.parse(JSON.stringify(DEF_DB)) } catch { return JSON.parse(JSON.stringify(DEF_DB)) } })(),
    settings: (() => { try { const r = lsGet(SET); return r ? { ...DEF_SETTINGS, ...r } : DEF_SETTINGS } catch { return DEF_SETTINGS } })(),
    messages: [],
    screen: 'chat',
    toast: null,
    reminders: (() => { try { return JSON.parse(localStorage.getItem(RK) || '[]') } catch { return [] } })(),
    ctx: { subject: null, subjectName: null, subjectAnswer: null, lastQ: null, lastA: null, updatedAt: null },
    claudeKey: (() => { try { return localStorage.getItem(AK) || '' } catch { return '' } })(),
    geminiKey: (() => { try { return localStorage.getItem(GK) || '' } catch { return '' } })(),
    braveKey: (() => { try { return localStorage.getItem(BK) || '' } catch { return '' } })(),
    isOnline: navigator.onLine !== false,
    isSpeaking: false,
    isTyping: false,
  })

  const saveTimer = useRef(null)
  const toastTimer = useRef(null)

  // Seed knowledge
  useEffect(() => {
    if ((state.db.meta.seedVersion || 0) >= SEED_V) return
    let db = state.db
    for (const [q, a, attrs] of SEEDS) {
      db = setKB(db, q, a, 0.95, 'seed')
      db = setKB(db, 'ما هو ' + q, a, 0.9, 'seed')
      if (attrs) db = upsertEnt(db, String(a).split(' ').slice(0, 3).join(' '), a, attrs)
    }
    db = { ...db, meta: { ...db.meta, seedVersion: SEED_V } }
    dispatch({ type: 'SET_DB', db })
  }, [])

  // Apply settings to body
  useEffect(() => {
    const { settings: S } = state
    document.body.classList.toggle('light', !S.darkMode)
    ;['fs-sm','fs-md','fs-lg','fs-xl'].forEach(c => document.body.classList.remove(c))
    document.body.classList.add('fs-' + (S.fontSize || 'md'))
    ;['t-blue','t-purple','t-green','t-rose','t-ocean'].forEach(c => document.body.classList.remove(c))
    if (S.theme && S.theme !== 'default') document.body.classList.add('t-' + S.theme)
    document.body.classList.toggle('no-anim', !S.animations)
    document.body.classList.toggle('compact-msgs', !!S.compact)
  }, [state.settings])

  // Online/offline
  useEffect(() => {
    const on = () => dispatch({ type: 'SET_ONLINE', isOnline: true })
    const off = () => dispatch({ type: 'SET_ONLINE', isOnline: false })
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Sync IDB
  useEffect(() => {
    idbGet(SK).then(raw => {
      if (!raw) return
      try {
        const p = JSON.parse(raw)
        const pTime = (p.meta?.updated) || 0
        const dbTime = (state.db.meta?.updated) || 0
        if (pTime > dbTime) dispatch({ type: 'SET_DB', db: migrate({ ...DEF_DB, ...p }) })
      } catch {}
    })
  }, [])

  // Save DB
  const saveDB = useCallback((db, immediate = false) => {
    const doSave = (d) => {
      const data = JSON.stringify({ ...d, meta: { ...d.meta, updated: Date.now() } })
      idbSet(SK, data).catch(() => {})
      try { localStorage.setItem(SK, data) } catch {}
    }
    if (immediate) { doSave(db); return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave(db), 900)
  }, [])

  // Save settings
  const saveSettings = useCallback((patch) => {
    dispatch({ type: 'SET_SETTINGS', patch })
    const merged = { ...state.settings, ...patch }
    lsSet(SET, merged)
  }, [state.settings])

  // Save reminders
  const saveReminders = useCallback((rems) => {
    dispatch({ type: 'SET_REMINDERS', reminders: rems })
    try { localStorage.setItem(RK, JSON.stringify(rems)) } catch {}
  }, [])

  // Keys
  const saveKey = useCallback((type, value) => {
    try {
      if (value) localStorage.setItem(type === 'claude' ? AK : type === 'gemini' ? GK : BK, value)
      else localStorage.removeItem(type === 'claude' ? AK : type === 'gemini' ? GK : BK)
    } catch {}
    dispatch({ type: 'SET_KEYS', [type + 'Key']: value || '' })
  }, [])

  // Toast
  const showToast = useCallback((msg, dur = 2500) => {
    dispatch({ type: 'SET_TOAST', toast: msg })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => dispatch({ type: 'SET_TOAST', toast: null }), dur)
  }, [])

  // DB mutation helpers
  const updateDB = useCallback((db) => {
    dispatch({ type: 'SET_DB', db })
    saveDB(db)
  }, [saveDB])

  const value = { state, dispatch, saveDB, saveSettings, saveReminders, saveKey, showToast, updateDB, SNAP }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
