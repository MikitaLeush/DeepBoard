import { useEffect, useRef, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { NOTE_STYLE } from '../../lib/note-style'
import { NOTE_COLORS, type NoteColor } from '../../schemas/notes-schema'
import type { Can } from './Note'

export interface GroupData {
  recordId: string
  title: string
  color: NoteColor
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  group: GroupData
  can: Can
  onMoveStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent) => void
  onTitle: (title: string) => void
  onColor: (color: NoteColor) => void
  onDelete: () => void
}

/** Labelled box drawn behind the notes. The body ignores the pointer (so panning, double-click to add
 *  and note drags work through it); only the title bar and the resize corner take events. */
export function GroupBox({ group, can, onMoveStart, onResizeStart, onTitle, onColor, onDelete }: Props) {
  const [title, setTitle] = useState(group.title)
  const focused = useRef(false)
  const style = NOTE_STYLE[group.color] ?? NOTE_STYLE.blue
  const edit = can.structure

  useEffect(() => {
    if (!focused.current) setTitle(group.title)
  }, [group.title])

  const commit = () => {
    focused.current = false
    const t = title.trim()
    if (!t) return setTitle(group.title) // a group always has a title
    if (t !== group.title) onTitle(t)
  }

  return (
    <div
      className="pointer-events-none absolute rounded-lg"
      style={{ left: group.x, top: group.y, width: group.w, height: group.h, background: 'rgba(255, 254, 251, 0.22)', border: `2px dashed ${style.edge}` }}
    >
      {/* The title is a strip of masking tape across the top edge; dragging the tape moves the group and its notes. */}
      <div
        // Sits on the top edge like a label; for a group at the very top of the board it moves inside so it is never cut off.
        style={{ top: group.y >= 30 ? -28 : 6 }}
        className="group/bar pointer-events-auto absolute left-4 z-20 flex max-w-[calc(100%-2rem)] items-center gap-2"
        onPointerDown={(e) => {
          e.stopPropagation()
          if (edit && can.move && e.target === e.currentTarget.firstElementChild) onMoveStart(e)
        }}
      >
        <div
          className={`flex min-w-0 -rotate-1 items-center bg-tape/95 px-3.5 py-1 shadow-[0_2px_3px_-1px_rgba(60,40,10,0.35)] [clip-path:polygon(0_0,100%_0,98.5%_50%,100%_100%,0_100%,1.5%_50%)] ${edit && can.move ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          <input
            value={title}
            readOnly={!edit}
            maxLength={60}
            aria-label="Group title"
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={() => (focused.current = true)}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="field-sizing-content min-w-12 max-w-full bg-transparent font-[family-name:var(--font-hand)] text-xl leading-6 text-foreground outline-none"
          />
        </div>
        {edit && (
          <div className="flex items-center gap-1 rounded-full bg-card px-2 py-1 opacity-0 shadow-[0_2px_6px_-2px_rgba(60,40,10,0.45)] transition-opacity duration-150 focus-within:opacity-100 group-hover/bar:opacity-100">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Group color ${c}`}
                title={`Group color ${c}`}
                onClick={() => onColor(c)}
                className="size-3.5 rounded-full border border-foreground/30"
                style={{ background: NOTE_STYLE[c].bg }}
              />
            ))}
            <button aria-label="Delete group (notes stay)" title="Delete group (notes stay)" onClick={onDelete} className="ml-1 text-foreground/55 transition-colors duration-150 hover:text-destructive">
              <Trash weight="bold" className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      {edit && (
        <div
          aria-label="Resize group"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e)
          }}
          className="pointer-events-auto absolute bottom-0 right-0 size-4 cursor-nwse-resize"
          style={{ background: `linear-gradient(135deg, transparent 50%, ${style.edge} 50%)` }}
        />
      )}
    </div>
  )
}
