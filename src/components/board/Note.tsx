import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLineDown, ArrowLineUp, CheckSquare, Lightbulb, Question, Trash, Warning, type Icon } from '@phosphor-icons/react'
import { SIDES, type Side } from '../../lib/geometry'
import { NOTE_STYLE } from '../../lib/note-style'
import { NOTE_COLORS, NOTE_TYPES, type NoteColor, type NoteType } from '../../schemas/notes-schema'

// Tailwind preflight strips list/heading styles, so restore the few Markdown ones notes need.
const MD_CLASS =
  '[&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-[1.3em] [&_h2]:text-[1.15em] [&_h3]:text-[1.05em] [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8em] [&_pre]:overflow-auto [&_blockquote]:border-l-2 [&_blockquote]:border-black/30 [&_blockquote]:pl-2 [&_input]:mr-1 [&_li]:list-item'

// Centre of each handle sits exactly on the side's midpoint, which is where arrows attach.
const ANCHOR_POS: Record<Side, string> = {
  top: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
  right: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
}

// The outline is a second cue for the type (the tape label is the first), readable when zoomed out.
const TYPE_UI: Record<NoteType, { icon: Icon; label: string; border: string }> = {
  idea: { icon: Lightbulb, label: 'Idea', border: 'none' },
  question: { icon: Question, label: 'Question', border: '2px dotted rgba(31,27,22,0.5)' },
  task: { icon: CheckSquare, label: 'Task', border: '2px solid rgba(31,27,22,0.55)' },
  risk: { icon: Warning, label: 'Risk', border: '2px dashed rgba(179,38,30,0.75)' },
}

export const NOTE_W = 180
export const NOTE_H = 150

export interface Can {
  editText: boolean
  addDelete: boolean
  move: boolean
  structure: boolean
}

export interface NoteData {
  recordId: string
  text: string
  color: NoteColor
  type: NoteType
  w: number
  h: number
  x: number
  y: number
}

interface Props {
  note: NoteData
  can: Can
  typers: string[]
  /** An arrow is being dragged: `active` shows all attach points, `hoverSide` is the one it would snap to here. */
  linkDrag: { active: boolean; hoverSide: Side | null }
  onLinkStart: (side: Side, e: React.PointerEvent) => void
  onTyping: (on: boolean) => void
  onMoveStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent) => void
  onFront: () => void
  onBack: () => void
  onType: (type: NoteType) => void
  onText: (text: string) => void
  onColor: (color: NoteColor) => void
  onDelete: () => void
}

export function Note({ note, can, typers, linkDrag, onLinkStart, onTyping, onMoveStart, onResizeStart, onFront, onBack, onType, onText, onColor, onDelete }: Props) {
  const [text, setText] = useState(note.text)
  const focused = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const style = NOTE_STYLE[note.color] ?? NOTE_STYLE.yellow
  const TypeIcon = TYPE_UI[note.type].icon
  const [editing, setEditing] = useState(false)
  // Empty notes show the textarea straight away; others show rendered Markdown until clicked.
  const showRendered = !editing && text.trim() !== ''

  // Pull in remote edits unless the user is mid-typing here.
  useEffect(() => {
    if (!focused.current) setText(note.text)
  }, [note.text])

  return (
    <div
      className="group note-enter absolute flex flex-col rounded-[2px] shadow-[0_8px_14px_-8px_rgba(60,40,10,0.65)]"
      style={{
        left: note.x,
        top: note.y,
        width: note.w,
        height: note.h,
        background: style.bg,
        outline: TYPE_UI[note.type].border,
        outlineOffset: -4,
        borderBottom: `3px solid ${style.edge}`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`flex h-6 shrink-0 items-center justify-between px-1.5 ${can.move ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={can.move ? onMoveStart : undefined}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Type: ${TYPE_UI[note.type].label}${can.editText ? ' (click to change)' : ''}`}
            title={can.editText ? 'Click to change type' : TYPE_UI[note.type].label}
            disabled={!can.editText}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onType(NOTE_TYPES[(NOTE_TYPES.indexOf(note.type) + 1) % NOTE_TYPES.length])}
            className="flex items-center gap-1 rounded-[2px] bg-foreground px-1.5 py-1 text-[10px] font-medium leading-none text-background transition-colors duration-150 enabled:hover:bg-foreground/80"
          >
            <TypeIcon weight="bold" className="size-3" aria-hidden /> {TYPE_UI[note.type].label}
          </button>
          {can.move && (
            <div className="flex gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Color ${c}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onColor(c)}
                  className="size-3.5 rounded-full border border-foreground/30"
                  style={{ background: NOTE_STYLE[c].bg }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          {can.move && (
            <>
              <button aria-label="Bring to front" title="Bring to front" onPointerDown={(e) => e.stopPropagation()} onClick={onFront} className="text-foreground/55 transition-colors duration-150 hover:text-foreground">
                <ArrowLineUp weight="bold" className="size-3.5" />
              </button>
              <button aria-label="Send to back" title="Send to back" onPointerDown={(e) => e.stopPropagation()} onClick={onBack} className="text-foreground/55 transition-colors duration-150 hover:text-foreground">
                <ArrowLineDown weight="bold" className="size-3.5" />
              </button>
            </>
          )}
          {can.addDelete && (
            <button aria-label="Delete note" title="Delete note" onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} className="text-foreground/55 transition-colors duration-150 hover:text-destructive">
              <Trash weight="bold" className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {typers.length > 0 && (
        <span className="pointer-events-none absolute -top-6 left-0 z-30 whitespace-nowrap rounded-[2px] bg-foreground px-1.5 py-0.5 text-[11px] text-background">
          {typers.join(', ')} typing…
        </span>
      )}
      {showRendered ? (
        <div
          onClick={(e) => {
            // Let links open; any other click enters edit mode (if allowed).
            if (can.editText && !(e.target as HTMLElement).closest('a')) setEditing(true)
          }}
          title={can.editText ? 'Click to edit' : undefined}
          className={`min-h-0 flex-1 overflow-auto px-2.5 pb-2 font-[family-name:var(--font-hand)] text-xl leading-[1.15] text-foreground ${can.editText ? 'cursor-text' : ''} ${MD_CLASS}`}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer nofollow" /> }}
          >
            {text}
          </Markdown>
        </div>
      ) : (
      <textarea
        autoFocus={editing}
        value={text}
        readOnly={!can.editText}
        maxLength={500}
        placeholder={can.editText ? 'Write an idea…' : ''}
        onFocus={(e) => {
          focused.current = true
          // Entering edit from the rendered view: caret at the end, not the start.
          if (editing) e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)
        }}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          // Save while typing so peers see it live (one action per pause, not per key).
          clearTimeout(timer.current)
          timer.current = setTimeout(() => onText(v), 400)
          onTyping(true)
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => onTyping(false), 1500)
        }}
        onBlur={() => {
          focused.current = false
          setEditing(false)
          clearTimeout(timer.current)
          clearTimeout(typingTimer.current)
          onTyping(false)
          if (text !== note.text) onText(text)
        }}
        className="min-h-0 flex-1 resize-none bg-transparent px-2.5 pb-2 font-[family-name:var(--font-hand)] text-xl leading-[1.15] text-foreground outline-none placeholder:text-foreground/40"
      />
      )}
      {(can.structure || linkDrag.active) &&
        SIDES.map((s) => (
          <div
            key={s}
            role="button"
            aria-label={`Arrow attach point: ${s}. Drag to another note to link.`}
            title="Drag to another note to draw an arrow"
            onPointerDown={(e) => {
              e.stopPropagation()
              if (can.structure) onLinkStart(s, e)
            }}
            className={`absolute z-30 size-3.5 rounded-full border-[1.5px] border-foreground bg-card transition-[opacity,scale,background-color] duration-150 ease-out ${ANCHOR_POS[s]} ${
              linkDrag.active ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
            } ${linkDrag.hoverSide === s ? 'scale-150 bg-foreground' : ''} ${can.structure ? 'cursor-crosshair' : ''}`}
          />
        ))}
      {can.move && (
        <div
          aria-label="Resize note"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e)
          }}
          className="absolute bottom-0 right-0 size-4 cursor-nwse-resize opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{ background: `linear-gradient(135deg, transparent 50%, ${style.edge} 50%)` }}
        />
      )}
    </div>
  )
}
