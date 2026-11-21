import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BoundingBox, MagnifyingGlassMinus, MagnifyingGlassPlus, Plus } from '@phosphor-icons/react'
import { useQuery } from 'deepspace'
import { Button, useToast } from '@/components/ui'
import { callAction } from '../../lib/actions'
import { anchor, centerIn, curvePath, nearestSide, stackOrder, type Box, type Side } from '../../lib/geometry'
import { GROUP_MAX, GROUP_MIN } from '../../schemas/groups-schema'
import { NOTE_MAX, NOTE_MIN, NOTE_TYPES, type NoteColor } from '../../schemas/notes-schema'
import { Arrows, type ArrowData } from './Arrows'
import { GroupBox, type GroupData } from './GroupBox'
import { Cursors, PeerChips, useBoardPresence } from './Presence'
import { Note, NOTE_H, NOTE_W, type Can, type NoteData } from './Note'

// Same as MAX_X/MAX_Y on the server. Big enough to feel endless; zoom-out stops before the edge shows.
export const BOARD_W = 20000
export const BOARD_H = 14000
const GROUP_DEFAULT = { w: 360, h: 260 }
const ZOOM_MIN = 0.1
const ZOOM_MAX = 2
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

type Row = Omit<NoteData, 'recordId'> & { z?: number }
type GRow = Omit<GroupData, 'recordId'>
type ARow = Omit<ArrowData, 'recordId'>
type Xy = { x: number; y: number }
type Wh = { w: number; h: number }
const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)))
const within = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function Canvas({ boardId, can }: { boardId: string; can: Can }) {
  const { records } = useQuery<Row>('notes', { where: { boardId } })
  const { records: groups } = useQuery<GRow>('groups', { where: { boardId } })
  const { records: arrows } = useQuery<ARow>('arrows', { where: { boardId } })
  const { error } = useToast()
  const presence = useBoardPresence(boardId)
  const scroller = useRef<HTMLDivElement>(null)
  // Local overrides (notes and groups share them: record ids are unique): while dragging/resizing, and
  // after drop until the server broadcast catches up.
  const [pos, setPos] = useState<Record<string, Xy>>({})
  const [size, setSize] = useState<Record<string, Wh>>({})
  const boardRef = useRef<HTMLDivElement>(null)
  // The arrow being dragged out from a note's attach point (null when not dragging).
  const [draft, setDraft] = useState<{ fromId: string; fromSide: Side; cursor: Xy; to: { id: string; side: Side } | null } | null>(null)
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null)
  const [focusNew, setFocusNew] = useState<string | null>(null)
  const [lasso, setLasso] = useState<Box | null>(null)
  // Board is drawn with transform: scale(zoom). Screen deltas divide by zoom; screen positions go through rect + zoom.
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  // Board point to keep under a screen point once the resized content has rendered.
  const keep = useRef<{ bx: number; by: number; mx: number; my: number } | null>(null)

  const zoomTo = useCallback((next: number, mx?: number, my?: number) => {
    const el = scroller.current
    if (!el) return
    // Never zoom out far enough for the viewport to be larger than the board (no empty margin).
    const floor = Math.max(ZOOM_MIN, el.clientWidth / BOARD_W, el.clientHeight / BOARD_H)
    const nz = Math.min(ZOOM_MAX, Math.max(floor, Math.round(next * 100) / 100))
    if (nz === zoomRef.current) return
    const px = mx ?? el.clientWidth / 2
    const py = my ?? el.clientHeight / 2
    keep.current = { bx: (el.scrollLeft + px) / zoomRef.current, by: (el.scrollTop + py) / zoomRef.current, mx: px, my: py }
    zoomRef.current = nz
    setZoom(nz)
  }, [])

  useLayoutEffect(() => {
    const el = scroller.current
    const k = keep.current
    if (!el || !k) return
    el.scrollLeft = k.bx * zoom - k.mx
    el.scrollTop = k.by * zoom - k.my
    keep.current = null
  }, [zoom])

  // Ctrl/Cmd + wheel (and trackpad pinch) zooms around the pointer. Needs a non-passive listener to stop browser page zoom.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomTo])

  const run = useCallback(
    (name: string, params: Record<string, unknown>) =>
      callAction<{ recordId?: string }>(name, { ...params }).catch((e: Error) => error('Could not save', e.message)),
    [error],
  )

  // Drop an override once the server copy matches it.
  useEffect(() => {
    const all = [...records, ...groups] as { recordId: string; data: Partial<Xy & Wh> }[]
    setPos((p) => {
      const next = { ...p }
      let changed = false
      for (const r of all) {
        const o = next[r.recordId]
        if (o && o.x === r.data.x && o.y === r.data.y) (delete next[r.recordId], (changed = true))
      }
      return changed ? next : p
    })
    setSize((p) => {
      const next = { ...p }
      let changed = false
      for (const r of all) {
        const o = next[r.recordId]
        if (o && o.w === r.data.w && o.h === r.data.h) (delete next[r.recordId], (changed = true))
      }
      return changed ? next : p
    })
  }, [records, groups])

  // Effective boxes: server value with any in-flight local override on top. Old notes have no w/h.
  const noteBoxOf = (n: { recordId: string; data: Row }): Box => ({
    x: pos[n.recordId]?.x ?? n.data.x,
    y: pos[n.recordId]?.y ?? n.data.y,
    w: size[n.recordId]?.w ?? n.data.w ?? NOTE_W,
    h: size[n.recordId]?.h ?? n.data.h ?? NOTE_H,
  })
  const groupBoxOf = (g: { recordId: string; data: GRow }): Box => ({
    x: pos[g.recordId]?.x ?? g.data.x,
    y: pos[g.recordId]?.y ?? g.data.y,
    w: size[g.recordId]?.w ?? g.data.w ?? GROUP_DEFAULT.w,
    h: size[g.recordId]?.h ?? g.data.h ?? GROUP_DEFAULT.h,
  })

  const view = () => {
    const el = scroller.current
    return el ? { x: (el.scrollLeft + el.clientWidth / 2) / zoom, y: (el.scrollTop + el.clientHeight / 2) / zoom } : { x: 200, y: 200 }
  }
  const addAt = (x: number, y: number) =>
    run('addNote', { boardId, x: clamp(x - NOTE_W / 2, BOARD_W - NOTE_W), y: clamp(y - NOTE_H / 2, BOARD_H - NOTE_H) })
  // Add a note and drop the caret into it.
  const addAndType = (x: number, y: number) => addAt(x, y).then((r) => r?.recordId && setFocusNew(r.recordId))
  const addInView = () => {
    const c = view()
    // Jitter so repeated clicks don't stack exactly.
    addAndType(c.x + (Math.random() - 0.5) * 120, c.y + (Math.random() - 0.5) * 120)
  }
  // A new group is centred on (x, y).
  const addGroupAt = (x: number, y: number) =>
    run('addGroup', {
      boardId,
      x: clamp(x - GROUP_DEFAULT.w / 2, BOARD_W - GROUP_DEFAULT.w),
      y: clamp(y - GROUP_DEFAULT.h / 2, BOARD_H - GROUP_DEFAULT.h),
    })
  const addGroupInView = () => {
    const c = view()
    addGroupAt(c.x, c.y)
  }

  /** Right-button drag on the empty board draws the new group's area. A plain right-click (no drag) drops a default-size one. */
  const startLasso = (e: React.PointerEvent) => {
    const board = boardRef.current
    if (!board) return
    const r = board.getBoundingClientRect()
    const at = (ev: { clientX: number; clientY: number }): Xy => ({
      x: within((ev.clientX - r.left) / zoom, 0, BOARD_W),
      y: within((ev.clientY - r.top) / zoom, 0, BOARD_H),
    })
    const o = at(e)
    let rect: Box = { x: o.x, y: o.y, w: 0, h: 0 }
    const move = (ev: PointerEvent) => {
      const p = at(ev)
      rect = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) }
      setLasso(rect)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', onKey)
      setLasso(null)
    }
    const up = () => {
      stop()
      if (rect.w < 8 && rect.h < 8) return addGroupAt(o.x, o.y)
      // The server raises a too-small area to the minimum group size and keeps it on the board.
      run('addGroup', { boardId, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) })
    }
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && stop() // removes the pointerup listener too, so nothing is created
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', onKey)
  }

  /** Drag from a note's attach point onto another note; the end snaps to that note's nearest attach point. */
  const startLink = (n: { recordId: string; data: Row }, side: Side, e: React.PointerEvent) => {
    e.preventDefault()
    const board = boardRef.current
    if (!board) return
    const hit: { to: { id: string; side: Side } | null; at: Xy } = { to: null, at: { x: 0, y: 0 } }
    const start = anchor(noteBoxOf(n), side)
    const update = (ev: { clientX: number; clientY: number }) => {
      const r = board.getBoundingClientRect()
      const c = { x: (ev.clientX - r.left) / zoom, y: (ev.clientY - r.top) / zoom }
      hit.at = c
      hit.to = null
      for (const m of records) {
        if (m.recordId === n.recordId) continue
        const b = noteBoxOf(m)
        // A small margin makes the note easy to hit; later notes are drawn on top, so they win.
        if (c.x >= b.x - 14 && c.x <= b.x + b.w + 14 && c.y >= b.y - 14 && c.y <= b.y + b.h + 14) hit.to = { id: m.recordId, side: nearestSide(b, c.x, c.y) }
      }
      setDraft({ fromId: n.recordId, fromSide: side, cursor: c, to: hit.to })
    }
    const stop = () => {
      window.removeEventListener('pointermove', update)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', onKey)
      setDraft(null)
    }
    const up = () => {
      const to = hit.to
      stop()
      if (!to) {
        // Released on empty board: new note there, linked to the source. A short drag (a plain click on the handle) does nothing.
        if (!can.addDelete || Math.hypot(hit.at.x - start.x, hit.at.y - start.y) < 40) return
        addAt(hit.at.x, hit.at.y).then((r) => {
          if (!r?.recordId) return
          run('addArrow', { boardId, fromId: n.recordId, toId: r.recordId, fromSide: side, toSide: OPPOSITE[side] }).then((a) => a?.recordId && setSelectedArrow(a.recordId))
        })
        return
      }
      run('addArrow', { boardId, fromId: n.recordId, toId: to.id, fromSide: side, toSide: to.side }).then((r) => r?.recordId && setSelectedArrow(r.recordId)) // open its label box
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      hit.to = null
      stop()
    }
    window.addEventListener('pointermove', update)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', onKey)
    update(e.nativeEvent)
  }

  const clearOverrides = (ids: string[]) => {
    setPos((p) => {
      const n = { ...p }
      ids.forEach((i) => delete n[i])
      return n
    })
    setSize((p) => {
      const n = { ...p }
      ids.forEach((i) => delete n[i])
      return n
    })
  }

  // Left-drag on empty board scrolls the view. Notes/group bars stop pointerdown, so this only fires on the background.
  const startPan = (e: React.PointerEvent) => {
    const el = scroller.current
    if (!el || e.button !== 0 || e.target !== e.currentTarget) return
    setSelectedArrow(null)
    const sx = e.clientX
    const sy = e.clientY
    const sl = el.scrollLeft
    const st = el.scrollTop
    el.style.cursor = 'grabbing'
    const move = (ev: PointerEvent) => {
      el.scrollLeft = sl - (ev.clientX - sx)
      el.scrollTop = st - (ev.clientY - sy)
    }
    const up = () => {
      el.style.cursor = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Corner-drag resize shared by notes and groups. `save` returns undefined when the server refused. */
  const startResize = (
    id: string,
    b: Box,
    lim: { min: Wh; max: Wh },
    save: (s: Wh) => Promise<unknown>,
    e: React.PointerEvent,
  ) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    let last: Wh = { w: b.w, h: b.h }
    const move = (ev: PointerEvent) => {
      last = {
        w: Math.round(within(b.w + (ev.clientX - sx) / zoom, lim.min.w, Math.min(lim.max.w, BOARD_W - b.x))),
        h: Math.round(within(b.h + (ev.clientY - sy) / zoom, lim.min.h, Math.min(lim.max.h, BOARD_H - b.y))),
      }
      setSize((p) => ({ ...p, [id]: last }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (last.w === b.w && last.h === b.h) return clearOverrides([id])
      save(last).then((r) => r === undefined && clearOverrides([id]))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startDrag = (n: { recordId: string; data: Row }, e: React.PointerEvent) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const b = noteBoxOf(n)
    let last: Xy = { x: b.x, y: b.y }
    const move = (ev: PointerEvent) => {
      last = { x: clamp(b.x + (ev.clientX - sx) / zoom, BOARD_W - b.w), y: clamp(b.y + (ev.clientY - sy) / zoom, BOARD_H - b.h) }
      setPos((p) => ({ ...p, [n.recordId]: last }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (last.x === b.x && last.y === b.y) return clearOverrides([n.recordId])
      // Refused (e.g. board locked): snap back.
      run('updateNote', { noteId: n.recordId, patch: last }).then((r) => r === undefined && clearOverrides([n.recordId]))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Dragging a group's title bar carries the notes inside it (the server moves them the same way). */
  const startGroupDrag = (g: { recordId: string; data: GRow }, e: React.PointerEvent) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const gb = groupBoxOf(g)
    const members = records.map((n) => ({ id: n.recordId, b: noteBoxOf(n) })).filter((m) => centerIn(m.b, gb))
    // Keep the group and every carried note inside the board.
    let dxMin = -gb.x
    let dxMax = BOARD_W - gb.w - gb.x
    let dyMin = -gb.y
    let dyMax = BOARD_H - gb.h - gb.y
    for (const m of members) {
      dxMin = Math.max(dxMin, -m.b.x)
      dxMax = Math.min(dxMax, BOARD_W - m.b.w - m.b.x)
      dyMin = Math.max(dyMin, -m.b.y)
      dyMax = Math.min(dyMax, BOARD_H - m.b.h - m.b.y)
    }
    const ids = [g.recordId, ...members.map((m) => m.id)]
    let d: Xy = { x: 0, y: 0 }
    const move = (ev: PointerEvent) => {
      d = { x: Math.round(within((ev.clientX - sx) / zoom, dxMin, dxMax)), y: Math.round(within((ev.clientY - sy) / zoom, dyMin, dyMax)) }
      setPos((p) => {
        const n = { ...p, [g.recordId]: { x: gb.x + d.x, y: gb.y + d.y } }
        for (const m of members) n[m.id] = { x: m.b.x + d.x, y: m.b.y + d.y }
        return n
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (d.x === 0 && d.y === 0) return clearOverrides(ids)
      run('updateGroup', { groupId: g.recordId, patch: { x: gb.x + d.x, y: gb.y + d.y } }).then((r) => {
        if (r === undefined) return clearOverrides(ids)
        // Safety net: if the server placed a note slightly differently, don't leave a stale override behind.
        setTimeout(() => clearOverrides(ids), 3000)
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Back-to-front by z, then creation time: editing a note never changes where it sits in the stack.
  const stacked = [...records].sort(stackOrder)
  const restack = (id: string, to: 'front' | 'back') => {
    const end = to === 'front' ? stacked[stacked.length - 1] : stacked[0]
    if (!end || end.recordId === id) return // already drawn at that end
    const z = Number(end.data.z) || 0
    run('updateNote', { noteId: id, patch: { z: to === 'front' ? z + 1 : z - 1 } })
  }

  const boxes: Record<string, Box> = {}
  for (const n of records) boxes[n.recordId] = noteBoxOf(n)

  // Preview of the arrow being dragged: from its attach point to the snapped note side, or to the pointer.
  let draftPath: string | null = null
  if (draft && boxes[draft.fromId]) {
    const target = draft.to && boxes[draft.to.id] ? draft.to : null
    draftPath = curvePath(
      anchor(boxes[draft.fromId], draft.fromSide),
      draft.fromSide,
      target ? anchor(boxes[target.id], target.side) : draft.cursor,
      target ? target.side : null,
    ).d
  }

  return (
    <div className="relative h-full">
      <div ref={scroller} className="h-full overflow-auto">
        {/* Sized to the scaled board so the scroll area matches what is drawn. */}
        <div style={{ width: BOARD_W * zoom, height: BOARD_H * zoom }}>
        <div
          ref={boardRef}
          className="relative"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            // Butcher paper with a faint dot grid to line things up by.
            backgroundColor: 'var(--color-kraft)',
            backgroundImage: 'radial-gradient(circle, rgba(60,40,10,0.2) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
          }}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.button === 2) return can.structure ? startLasso(e) : undefined
            startPan(e)
          }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            presence.onMove({ x: Math.round((e.clientX - r.left) / zoom), y: Math.round((e.clientY - r.top) / zoom) })
          }}
          onPointerLeave={presence.onLeave}
          onContextMenu={(e) => {
            // The right button draws groups on the empty board, so no browser menu there (notes, links and inputs keep theirs).
            if (e.target === e.currentTarget && can.structure) e.preventDefault()
          }}
          onDoubleClick={
            can.addDelete
              ? (e) => {
                  // Only the empty board: a double-click inside a note (selecting a word) must not add one.
                  if (e.target !== e.currentTarget) return
                  const r = e.currentTarget.getBoundingClientRect()
                  addAndType((e.clientX - r.left) / zoom, (e.clientY - r.top) / zoom)
                }
              : undefined
          }
        >
          {groups.map((g) => {
            const b = groupBoxOf(g)
            return (
              <GroupBox
                key={g.recordId}
                group={{ recordId: g.recordId, title: g.data.title ?? 'Group', color: (g.data.color ?? 'blue') as NoteColor, ...b }}
                can={can}
                onMoveStart={(e) => startGroupDrag(g, e)}
                onResizeStart={(e) =>
                  startResize(g.recordId, b, { min: GROUP_MIN, max: GROUP_MAX }, (patch) => run('updateGroup', { groupId: g.recordId, patch }), e)
                }
                onTitle={(title) => run('updateGroup', { groupId: g.recordId, patch: { title } })}
                onColor={(color) => run('updateGroup', { groupId: g.recordId, patch: { color } })}
                onDelete={() => run('deleteGroup', { groupId: g.recordId })}
              />
            )
          })}
          <Arrows
            arrows={arrows.map((a) => ({
              recordId: a.recordId,
              fromId: a.data.fromId,
              toId: a.data.toId,
              label: a.data.label ?? '',
              fromSide: a.data.fromSide ?? '',
              toSide: a.data.toSide ?? '',
            }))}
            draftPath={draftPath}
            boxes={boxes}
            width={BOARD_W}
            height={BOARD_H}
            canEdit={can.structure}
            selectedId={selectedArrow}
            onSelect={setSelectedArrow}
            onLabel={(id, label) => run('updateArrow', { arrowId: id, label })}
            onDelete={(id) => {
              setSelectedArrow(null)
              run('deleteArrow', { arrowId: id })
            }}
          />
          {stacked.map((n) => (
            <Note
              key={n.recordId}
              note={{
                recordId: n.recordId,
                text: n.data.text ?? '',
                color: (n.data.color ?? 'yellow') as NoteColor,
                type: (NOTE_TYPES as readonly string[]).includes(n.data.type) ? n.data.type : 'idea',
                ...noteBoxOf(n),
              }}
              can={can}
              focusNow={focusNew === n.recordId}
              linkDrag={{ active: !!draft && draft.fromId !== n.recordId, hoverSide: draft?.to?.id === n.recordId ? draft.to.side : null }}
              onLinkStart={(side, e) => startLink(n, side, e)}
              typers={presence.peers.filter((p) => p.state.typing === n.recordId).map((p) => p.userName)}
              onTyping={(on) => presence.setTyping(on ? n.recordId : null)}
              onMoveStart={(e) => startDrag(n, e)}
              onResizeStart={(e) =>
                startResize(n.recordId, noteBoxOf(n), { min: NOTE_MIN, max: NOTE_MAX }, (patch) => run('updateNote', { noteId: n.recordId, patch }), e)
              }
              onFront={() => restack(n.recordId, 'front')}
              onBack={() => restack(n.recordId, 'back')}
              onType={(type) => run('updateNote', { noteId: n.recordId, patch: { type } })}
              onText={(text) => run('updateNote', { noteId: n.recordId, patch: { text } })}
              onColor={(color) => run('updateNote', { noteId: n.recordId, patch: { color } })}
              onDelete={() => run('deleteNote', { noteId: n.recordId })}
            />
          ))}
          {lasso && (
            <div
              className="pointer-events-none absolute z-40 rounded-lg border-2 border-dashed border-foreground bg-foreground/5"
              style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }}
            />
          )}
          <Cursors peers={presence.peers} />
          {records.length === 0 && groups.length === 0 && (
            <p className="pointer-events-none absolute left-10 top-10 max-w-md font-[family-name:var(--font-hand)] text-3xl leading-tight text-foreground/70">
              {can.addDelete ? 'Double-click anywhere to add a note. Right-click and drag to box in a group.' : 'Nothing on the wall yet.'}
            </p>
          )}
        </div>
        </div>
      </div>
      <PeerChips peers={presence.peers} />
      {draft && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-foreground px-3.5 py-1.5 text-sm text-background shadow-[0_8px_18px_-8px_rgba(31,27,22,0.7)]">
          Drop on a note to link it{can.addDelete ? ', or on empty space for a new note' : ''}. Press Esc to cancel.
        </div>
      )}
      <div className="absolute bottom-5 right-5 flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-[0_10px_24px_-10px_rgba(60,40,10,0.7)]">
        <Button size="sm" variant="ghost" aria-label="Zoom out" title="Zoom out (Ctrl + scroll)" onClick={() => zoomTo(zoom / 1.25)}>
          <MagnifyingGlassMinus weight="bold" className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Reset zoom" title="Reset zoom" onClick={() => zoomTo(1)} className="w-14 tabular-nums">
          {Math.round(zoom * 100)}%
        </Button>
        <Button size="sm" variant="ghost" aria-label="Zoom in" title="Zoom in (Ctrl + scroll)" onClick={() => zoomTo(zoom * 1.25)}>
          <MagnifyingGlassPlus weight="bold" className="size-4" />
        </Button>
      </div>
      {(can.addDelete || can.structure) && (
        <div className="absolute bottom-5 left-5 flex gap-1 rounded-lg border border-border bg-card p-1 shadow-[0_10px_24px_-10px_rgba(60,40,10,0.7)]">
          {can.addDelete && (
            <Button size="sm" onClick={addInView}>
              <Plus weight="bold" className="size-4" /> Add note
            </Button>
          )}
          {can.structure && (
            <Button size="sm" variant="ghost" onClick={addGroupInView} title="Or right-click and drag on the board">
              <BoundingBox weight="bold" className="size-4" /> Group
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
