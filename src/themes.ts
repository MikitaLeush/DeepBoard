/** Theme catalog — metadata only; colors live in themes.css. */
export const THEMES = [
  {
    id: 'deepboard',
    label: 'DeepBoard',
    description: 'Paper and marker ink around a kraft-paper wall.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  if (typeof document === 'undefined') return 'deepboard'
  const id = document.documentElement.getAttribute('data-theme') as ThemeId | null
  return id ?? 'deepboard'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
