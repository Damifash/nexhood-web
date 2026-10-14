import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'nexhood_theme'

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemDark() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

const Ctx = createContext<{ choice: ThemeChoice; dark: boolean; setChoice: (c: ThemeChoice) => void; toggle: () => void }>({
  choice: 'system',
  dark: false,
  setChoice: () => {},
  toggle: () => {},
})
export const useTheme = () => useContext(Ctx)

/** Night mode for the app (the public landing page keeps its own look). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice)
  const [sysDark, setSysDark] = useState(systemDark)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = () => setSysDark(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const dark = choice === 'dark' || (choice === 'system' && sysDark)

  // Match the phone's status bar and overscroll area to the app.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevMeta = meta?.getAttribute('content')
    const prevBg = document.body.style.backgroundColor
    meta?.setAttribute('content', dark ? '#070d24' : '#071456')
    document.body.style.backgroundColor = dark ? '#070d24' : ''
    return () => {
      if (meta && prevMeta) meta.setAttribute('content', prevMeta)
      document.body.style.backgroundColor = prevBg
    }
  }, [dark])

  function setChoice(c: ThemeChoice) {
    setChoiceState(c)
    try {
      localStorage.setItem(KEY, c)
    } catch {
      /* private mode: still works for this visit */
    }
  }

  return <Ctx.Provider value={{ choice, dark, setChoice, toggle: () => setChoice(dark ? 'light' : 'dark') }}>{children}</Ctx.Provider>
}
