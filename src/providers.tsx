import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/i18n'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <LanguageProvider><BrowserRouter>{children}</BrowserRouter></LanguageProvider>
}
