import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme } from './theme.ts'
import { ThemeProvider } from './ThemeProvider.tsx'
import App from './App.tsx'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
