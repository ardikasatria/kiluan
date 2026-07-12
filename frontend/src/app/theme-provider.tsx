'use client'

import { createContext, useCallback, useEffect, useState } from 'react'

interface ThemeContextValue {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (gelap: boolean) => void
  themeDir: 'rtl' | 'ltr'
  setThemeDir: (value: 'rtl' | 'ltr') => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [themeDir, setThemeDir] = useState<'rtl' | 'ltr'>('ltr')

  // themeMode
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark-mode') {
      setIsDarkMode(true)
      const root = document.querySelector('html')
      if (root && !root.classList.contains('dark')) {
        root.classList.add('dark')
      }
    } else {
      setIsDarkMode(false)
      const root = document.querySelector('html')
      if (root) {
        root.classList.remove('dark')
      }
    }
  }, [])

  // themeDir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.getAttribute('dir') === 'rtl' ? setThemeDir('rtl') : setThemeDir('ltr')
    }
  }, [])

  // Update themeDir when it changes
  // This ensures that the document's direction is set correctly
  // when the themeDir state changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('dir', themeDir)
    }
  }, [themeDir])

  const terapkanTema = useCallback((gelap: boolean): void => {
    setIsDarkMode(gelap)
    const root = document.querySelector('html')
    if (gelap) {
      root?.classList.add('dark')
      localStorage.setItem('theme', 'dark-mode')
    } else {
      root?.classList.remove('dark')
      localStorage.setItem('theme', 'light-mode')
    }
  }, [])

  const toggleDarkMode = useCallback((): void => {
    terapkanTema(localStorage.getItem('theme') !== 'dark-mode')
  }, [terapkanTema])

  const setDarkMode = useCallback(
    (gelap: boolean): void => {
      terapkanTema(gelap)
    },
    [terapkanTema],
  )

  //
  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        setDarkMode,
        themeDir,
        setThemeDir,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
