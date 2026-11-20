import type { NoteColor } from '../schemas/notes-schema'

/** Sticky-note paper colours (and the matching darker edge). Shared by notes, groups and the landing page. */
export const NOTE_STYLE: Record<NoteColor, { bg: string; edge: string }> = {
  yellow: { bg: '#ffe45c', edge: '#e0bf2e' },
  pink: { bg: '#ff9fc2', edge: '#e97aa3' },
  blue: { bg: '#8bd3ff', edge: '#5db4ea' },
  green: { bg: '#a8e88c', edge: '#7ac95b' },
  orange: { bg: '#ffb067', edge: '#ee8f38' },
  purple: { bg: '#cba9ff', edge: '#a77deb' },
}
