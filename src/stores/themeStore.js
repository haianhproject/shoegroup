import { reactive, watch } from 'vue'

const STORAGE_KEY = 'shoegroup_theme'

export const themeState = reactive({
  mode: 'system',
  style: 'modern',
  density: 'comfortable',
})

const readStored = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    Object.assign(themeState, {
      mode: ['light', 'dark', 'system'].includes(parsed.mode) ? parsed.mode : 'system',
      style: ['modern', 'minimal', 'luxury'].includes(parsed.style) ? parsed.style : 'modern',
      density: ['compact', 'comfortable'].includes(parsed.density) ? parsed.density : 'comfortable',
    })
  } catch { /* localStorage may be unavailable */ }
}

const resolveMode = () => {
  if (themeState.mode !== 'system') return themeState.mode
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = () => {
  const root = document.documentElement
  root.dataset.themeMode = resolveMode()
  root.dataset.themeStyle = themeState.style
  root.dataset.themeDensity = themeState.density
  root.style.colorScheme = resolveMode()
}

export const setThemeSetting = (key, value) => {
  if (!(key in themeState)) return
  themeState[key] = value
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...themeState })) } catch { /* ignore */ }
  applyTheme()
}

export const initTheme = () => {
  readStored()
  applyTheme()
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  media?.addEventListener?.('change', applyTheme)
  watch(themeState, applyTheme)
}
