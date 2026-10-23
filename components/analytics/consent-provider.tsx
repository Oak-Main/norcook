'use client'

import { Analytics } from '@vercel/analytics/next'
import { track } from '@vercel/analytics'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ConsentBanner } from '@/components/analytics/consent-banner'

type ConsentChoice = 'unset' | 'essential' | 'analytics'
type EventProperties = Record<string, string | number | boolean | null>

type ConsentContextValue = {
  choice: ConsentChoice
  choose: (choice: Exclude<ConsentChoice, 'unset'>) => void
  openSettings: () => void
  trackEvent: (name: string, properties?: EventProperties) => void
}

const STORAGE_KEY = 'norcook-consent-v1'
const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice>('unset')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const analyticsConfigured =
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

  useEffect(() => {
    // Storage can be blocked outright (private browsing, sandboxed iframes,
    // disabled cookies). This provider wraps every page, so an unguarded read
    // here took the whole site down to the error boundary. Mirrors the guards
    // already used in `theme-provider.tsx` and the root layout theme script:
    // a blocked store means "no stored choice", never a crash.
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      return
    }
    if (stored === 'essential' || stored === 'analytics') {
      // Browser-only consent is hydrated after the server render to avoid
      // reading localStorage during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice(stored)
    }
  }, [])

  const choose = useCallback(
    (nextChoice: Exclude<ConsentChoice, 'unset'>) => {
      // The choice still applies for this visit even if it cannot be stored.
      try {
        window.localStorage.setItem(STORAGE_KEY, nextChoice)
      } catch {
        /* storage blocked; the in-memory choice stands */
      }
      setChoice(nextChoice)
      setSettingsOpen(false)
      if (nextChoice === 'analytics' && analyticsConfigured) {
        track('privacy_choice', { analytics: true })
      }
    },
    [analyticsConfigured],
  )

  const trackEvent = useCallback(
    (name: string, properties: EventProperties = {}) => {
      if (choice === 'analytics' && analyticsConfigured) {
        track(name, properties)
      }
    },
    [analyticsConfigured, choice],
  )

  const value = useMemo(
    () => ({
      choice,
      choose,
      openSettings: () => setSettingsOpen(true),
      trackEvent,
    }),
    [choice, choose, trackEvent],
  )

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <ConsentBanner
        open={choice === 'unset' || settingsOpen}
        analyticsConfigured={analyticsConfigured}
        onChoose={choose}
      />
      {choice === 'analytics' && analyticsConfigured && <Analytics />}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const context = useContext(ConsentContext)
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider')
  }
  return context
}
