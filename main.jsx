import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './AppContext.jsx'
import App from './App.jsx'
import './app.css'

// PWA service worker registration (handled by vite-plugin-pwa)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // vite-plugin-pwa will auto-register the service worker
    navigator.serviceWorker.getRegistrations().then(regs => {
      if (!regs.length) {
        navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
      }
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
