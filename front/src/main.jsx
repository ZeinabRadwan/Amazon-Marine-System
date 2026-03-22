import { createRoot } from 'react-dom/client'
// import 'boxicons/css/boxicons.min.css'
import './i18n'
import { initTheme } from './theme'
import './index.css'
import App from './App.jsx'

initTheme()

// Note: StrictMode was removed so API calls in useEffect run once in development.
// In React 18 dev, StrictMode double-invokes effects, which caused every request to appear twice in the network tab.
// Production builds are unaffected (effects run once). To re-enable Strict Mode for debugging, wrap <App /> in <StrictMode>.
createRoot(document.getElementById('root')).render(<App />)
