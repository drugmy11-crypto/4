import { useEffect, useState } from 'react'
import { AppRouter } from './router'
import { useTradingStore } from '../store/tradingStore'
import { useUserStore } from '../store/userStore'
import { supabase, isSupabaseConfigured } from '../services/api/supabase'
import { getTelegramInitData, isTelegramWebView } from '../services/telegram/telegram'

export default function App() {
  const loadAssets = useTradingStore((state) => state.loadAssets)
  const [ready, setReady] = useState(false)
  const [authDebug, setAuthDebug] = useState('init')

  useEffect(() => {
    loadAssets().catch((e) => {
      console.error('[App] Failed to load assets:', e)
    })

    const init = async () => {
      if (!isSupabaseConfigured) {
        setAuthDebug('Supabase not configured')
        setReady(true)
        return
      }

      const initData = getTelegramInitData()
      setAuthDebug(`TG:${isTelegramWebView() ? 'yes' : 'no'} initData:${initData.length}`)

      if (!initData) {
        setAuthDebug('No Telegram initData')
        setReady(true)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setAuthDebug(`Session found: ${session.user.id.slice(0, 8)}... loading profile`)
          const { error } = await supabase.auth.getUser()
          if (!error) {
            await useUserStore.getState().loadUser()
            const u = useUserStore.getState().currentUser
            if (u) {
              setAuthDebug(`Loaded: ${u.name}`)
              setReady(true)
              return
            }
          }
          setAuthDebug('Existing session invalid, re-authenticating...')
          await supabase.auth.signOut()
        }

        setAuthDebug('Calling auth-telegram...')
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/auth-telegram`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ initData }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          setAuthDebug(`Auth FAIL: ${body.error || response.status}`)
          setReady(true)
          return
        }

        const data = await response.json()

        if (!data.access_token || !data.refresh_token) {
          setAuthDebug('No tokens in response')
          setReady(true)
          return
        }

        setAuthDebug('Setting session...')
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })

        if (sessionError) {
          setAuthDebug(`setSession FAIL: ${sessionError.message}`)
          setReady(true)
          return
        }

        setAuthDebug('Session set, loading profile...')
        await useUserStore.getState().loadUser()
        const u = useUserStore.getState().currentUser
        setAuthDebug(u ? `Loaded: ${u.name}` : 'Profile not found')
      } catch (e) {
        setAuthDebug(`Error: ${(e as Error).message}`)
        console.error('[App] Init error:', e)
      }

      setReady(true)
    }

    init()
  }, [loadAssets])

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f0f',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#FFCC00',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#999', fontSize: 14 }}>{authDebug}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return <AppRouter />
}
