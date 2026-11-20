import { centerIn } from '../lib/geometry'
import { NOTE_TYPES } from '../schemas/notes-schema'
import { noteBox } from './board'

// User text is placed between tags, so strip the characters that could close or forge a tag.
const oneLine = (s: unknown) => String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()

/** Turn the board (notes, groups, arrows) into the prompt body. Returns null when there is no note text. */
export function buildPlanPrompt(
  notes: { recordId: string; data: Record<string, unknown> }[],
  groups: { data: Record<string, unknown> }[],
  arrows: { data: Record<string, unknown> }[],
): string | null {
  const used = notes.filter((n) => oneLine(n.data.text))
  if (used.length === 0) return null
  const ref = new Map(used.map((n, i) => [n.recordId, `N${i + 1}`]))
  const noteLines = used.map((n) => {
    const t = (NOTE_TYPES as readonly unknown[]).includes(n.data.type) ? n.data.type : 'idea'
    return `${ref.get(n.recordId)} [${t}] ${oneLine(n.data.text)}`
  })
  const groupLines = groups.flatMap((g) => {
    const box = { x: Number(g.data.x) || 0, y: Number(g.data.y) || 0, w: Number(g.data.w) || 0, h: Number(g.data.h) || 0 }
    const inside = used.filter((n) => centerIn(noteBox(n), box)).map((n) => ref.get(n.recordId))
    return inside.length ? [`"${oneLine(g.data.title) || 'Group'}": ${inside.join(', ')}`] : []
  })
  const arrowLines = arrows.flatMap((a) => {
    const from = ref.get(String(a.data.fromId))
    const to = ref.get(String(a.data.toId))
    if (!from || !to) return [] // dangling or pointing at an empty note
    const label = oneLine(a.data.label)
    return [`${from} -> ${to}${label ? `: ${label}` : ''}`]
  })
  return [
    `<notes>\n${noteLines.join('\n')}\n</notes>`,
    groupLines.length ? `<groups>\n${groupLines.join('\n')}\n</groups>` : '',
    arrowLines.length ? `<arrows>\n${arrowLines.join('\n')}\n</arrows>` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
