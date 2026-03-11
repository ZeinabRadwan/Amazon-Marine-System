import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import { initTheme } from './theme'
import './index.css'
import App from './App.jsx'

initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
