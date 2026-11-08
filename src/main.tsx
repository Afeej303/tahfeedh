import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Tahfeedh offline support could not be enabled:', error)
    })
  })
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
