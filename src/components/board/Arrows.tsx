import { useEffect, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { anchor, autoSides, curvePath, isSide, type Box } from '../../lib/geometry'

export interface ArrowData {
  recordId: string
  fromId: string
  toId: string
  label: string
  fromSide: string
  toSide: string
}

interface Props {
  arrows: ArrowData[]
  /** Current (including in-flight drag) box of every note, by id. */
  boxes: Record<string, Box>
  width: number
  height: number
  canEdit: boolean
  selectedId: string | null
  /** Path of the arrow being dragged out right now, if any. */
  draftPath: string | null
  onSelect: (id: string | null) => void
  onLabel: (id: string, label: string) => void
  onDelete: (id: string) => void
}

const INK = '#1f1b16' // marker
const KRAFT = '#c7a57a' // halo behind labels so they stay readable over the paper

export function Arrows({ arrows, boxes, width, height, canEdit, selectedId, draftPath, onSelect, onLabel, onDelete }: Props) {
  // Arrows whose notes are gone (deleted, or not loaded yet) are simply not drawn.
  const lines = arrows.flatMap((a) => {
    const f = boxes[a.fromId]
    const t = boxes[a.toId]
    if (!f || !t) return []
    // Older arrows have no saved sides: pick the two facing sides.
    const [s1, s2] = isSide(a.fromSide) && isSide(a.toSide) ? [a.fromSide, a.toSide] : autoSides(f, t)
    const { d, mid } = curvePath(anchor(f, s1), s1, anchor(t, s2), s2)
    return [{ a, d, mid }]
  })
  const sel = lines.find((l) => l.a.recordId === selectedId)

  return (
    <>
      <svg className="pointer-events-none absolute left-0 top-0" width={width} height={height} aria-hidden="true">
        <defs>
          <marker id="db-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={INK} />
          </marker>
        </defs>
        {draftPath && <path d={draftPath} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="7 6" strokeLinecap="round" markerEnd="url(#db-arrowhead)" opacity={0.7} />}
        {lines.map(({ a, d, mid }) => {
          const on = a.recordId === selectedId
          return (
            <g key={a.recordId}>
              <path d={d} fill="none" stroke={INK} strokeWidth={on ? 4.5 : 3} markerEnd="url(#db-arrowhead)" strokeLinecap="round" />
              {/* Wide invisible stroke = easy click target */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(on ? null : a.recordId)}
              />
              {a.label && !on && (
                <text x={mid.x} y={mid.y - 6} textAnchor="middle" fontSize="18" fill={INK} stroke={KRAFT} strokeWidth={5} paintOrder="stroke" strokeLinejoin="round" style={{ fontFamily: 'var(--font-hand)' }}>
                  {a.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {sel && (
        <ArrowEditor key={sel.a.recordId} arrow={sel.a} x={sel.mid.x} y={sel.mid.y} canEdit={canEdit} onLabel={onLabel} onDelete={onDelete} onClose={() => onSelect(null)} />
      )}
    </>
  )
}

function ArrowEditor({ arrow, x, y, canEdit, onLabel, onDelete, onClose }: { arrow: ArrowData; x: number; y: number; canEdit: boolean; onLabel: (id: string, l: string) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [label, setLabel] = useState(arrow.label)
  useEffect(() => setLabel(arrow.label), [arrow.label])
  const commit = () => label !== arrow.label && onLabel(arrow.recordId, label.trim())

  return (
    <div
      className="absolute z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-card p-1 shadow-[0_8px_18px_-8px_rgba(60,40,10,0.55)]"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={label}
        readOnly={!canEdit}
        maxLength={60}
        placeholder={canEdit ? 'Label (e.g. blocks)' : ''}
        aria-label="Arrow label"
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            onClose()
          }
          if (e.key === 'Escape') onClose()
        }}
        className="w-36 rounded bg-background px-2 py-1 text-sm outline-none"
      />
      {canEdit && (
        <button aria-label="Delete arrow" onClick={() => onDelete(arrow.recordId)} className="p-1 text-muted-foreground hover:text-destructive">
          <Trash weight="bold" className="size-4" />
        </button>
      )}
    </div>
  )
}
