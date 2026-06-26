import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { AppProviders } from './app/providers'
import { initTelegramApp } from './services/telegram/telegram'
import './styles/globals.scss'

initTelegramApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
