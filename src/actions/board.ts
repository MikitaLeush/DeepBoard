import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { centerIn, isSide, type Box } from '../lib/geometry'
import { MAX_ARROWS, MAX_LABEL } from '../schemas/arrows-schema'
import type { BoardPerm } from '../schemas/boards-schema'
import { GROUP_MAX, GROUP_MIN } from '../schemas/groups-schema'
import { NOTE_COLORS, NOTE_MAX, NOTE_MIN, NOTE_TYPES, Z_LIMIT } from '../schemas/notes-schema'

// Everything except generatePlan (AI) lives here, with type-only SDK imports, so it can be unit-tested.

export const MAX_TEXT = 500
export const MAX_X = 20000
export const MAX_Y = 14000
export const MAX_NOTES = 500
export const MAX_GROUPS = 50
export const NOTE_DEFAULT = { w: 180, h: 150 }

export type Fail = { success: false; error: string }
export type Rec = { recordId: string; createdBy: string; data: Record<string, unknown> }

export const fail = (error: string): Fail => ({ success: false, error })
const num = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : undefined
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)))

export async function getRec(tools: ActionTools, coll: string, id: unknown): Promise<Rec | Fail> {
  if (typeof id !== 'string' || !id) return fail(`${coll}: missing id`)
  const r = await tools.get(coll, id)
  if (!r.success) return fail(`${coll} not found`)
  return (r.data as unknown as { record: Rec }).record
}

/** Owner may always act. Others need the board unlocked AND the specific switch on (missing = on). */
export function canWriteBoard(board: Rec, userId: string, perm: BoardPerm): Fail | null {
  if (board.createdBy === userId) return null
  if (board.data.locked === true || Number(board.data.locked) === 1) return fail('Board is locked by its owner')
  const v = board.data[perm]
  return v === false || (v !== undefined && v !== null && Number(v) === 0) ? fail('The board owner has turned this off') : null
}

function checkAll(board: Rec, userId: string, perms: Iterable<BoardPerm>): Fail | null {
  for (const p of perms) {
    const denied = canWriteBoard(board, userId, p)
    if (denied) return denied
  }
  return null
}

/** Load a record and the board it belongs to. The board is always derived from the stored record, never from params. */
async function recAndBoard(tools: ActionTools, coll: string, id: unknown): Promise<{ rec: Rec; board: Rec } | Fail> {
  const rec = await getRec(tools, coll, id)
  if ('success' in rec) return rec
  const board = await getRec(tools, 'boards', rec.data.boardId)
  if ('success' in board) return board
  return { rec, board }
}

export const noteBox = (r: { data: Record<string, unknown> }): Box => ({
  x: Number(r.data.x) || 0,
  y: Number(r.data.y) || 0,
  w: Number(r.data.w) || NOTE_DEFAULT.w,
  h: Number(r.data.h) || NOTE_DEFAULT.h,
})

export function cleanPatch(p: Record<string, unknown>): { patch: Record<string, unknown> } | Fail {
  const out: Record<string, unknown> = {}
  if (p.text !== undefined) {
    if (typeof p.text !== 'string' || p.text.length > MAX_TEXT) return fail(`text must be ≤ ${MAX_TEXT} chars`)
    out.text = p.text
  }
  if (p.color !== undefined) {
    if (!(NOTE_COLORS as readonly unknown[]).includes(p.color)) return fail('invalid color')
    out.color = p.color
  }
  if (p.type !== undefined) {
    if (!(NOTE_TYPES as readonly unknown[]).includes(p.type)) return fail('invalid type')
    out.type = p.type
  }
  for (const k of ['w', 'h'] as const) {
    if (p[k] === undefined) continue
    if (!isNum(p[k])) return fail(`invalid ${k}`)
    out[k] = clampInt(p[k], NOTE_MIN[k], NOTE_MAX[k])
  }
  if (p.z !== undefined) {
    if (!isNum(p.z)) return fail('invalid z')
    out.z = clampInt(p.z, -Z_LIMIT, Z_LIMIT)
  }
  if (p.x !== undefined) {
    const x = num(p.x, MAX_X)
    if (x === undefined) return fail('invalid x')
    out.x = x
  }
  if (p.y !== undefined) {
    const y = num(p.y, MAX_Y)
    if (y === undefined) return fail('invalid y')
    out.y = y
  }
  return { patch: out }
}

export function cleanGroupPatch(p: Record<string, unknown>): { patch: Record<string, unknown> } | Fail {
  const out: Record<string, unknown> = {}
  if (p.title !== undefined) {
    if (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 60) return fail('title must be 1-60 chars')
    out.title = p.title.trim()
  }
  if (p.color !== undefined) {
    if (!(NOTE_COLORS as readonly unknown[]).includes(p.color)) return fail('invalid color')
    out.color = p.color
  }
  for (const k of ['w', 'h'] as const) {
    if (p[k] === undefined) continue
    if (!isNum(p[k])) return fail(`invalid ${k}`)
    out[k] = clampInt(p[k], GROUP_MIN[k], GROUP_MAX[k])
  }
  for (const [k, max] of [['x', MAX_X], ['y', MAX_Y]] as const) {
    if (p[k] === undefined) continue
    const v = num(p[k], max)
    if (v === undefined) return fail(`invalid ${k}`)
    out[k] = v
  }
  return { patch: out }
}

async function countWhere(tools: ActionTools, coll: string, boardId: string, cap: number) {
  const q = await tools.query(coll, { where: { boardId }, limit: cap })
  return q.success ? q.data.records.length : fail(`${coll}: query failed`)
}

async function deleteAllWhere(tools: ActionTools, coll: string, where: Record<string, unknown>): Promise<number | Fail> {
  let total = 0
  for (;;) {
    const r = await tools.deleteWhere(coll, where, 500)
    if (!r.success) return r
    const n = (r.data as { deleted: number }).deleted
    total += n
    if (n < 500) return total
  }
}

export const boardActions: Record<string, ActionHandler<Env>> = {
  addNote: async ({ userId, params, tools }) => {
    const board = await getRec(tools, 'boards', params.boardId)
    if ('success' in board) return board
    const denied = canWriteBoard(board, userId, 'allowAddDelete')
    if (denied) return denied
    const patch = cleanPatch({ x: params.x ?? 0, y: params.y ?? 0, color: params.color ?? 'yellow', text: params.text ?? '', type: params.type ?? 'idea' })
    if ('success' in patch) return patch
    // The plan and group moves read at most MAX_NOTES notes, so cap the board there.
    const q = await tools.query('notes', { where: { boardId: board.recordId }, limit: MAX_NOTES })
    if (!q.success) return q
    if (q.data.records.length >= MAX_NOTES) return fail(`A board holds at most ${MAX_NOTES} notes`)
    // A new note goes on top of everything already there.
    const z = Math.min(Z_LIMIT, 1 + q.data.records.reduce((m, r) => Math.max(m, Number(r.data.z) || 0), 0))
    return tools.create('notes', { boardId: board.recordId, ...patch.patch, z })
  },

  updateNote: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'notes', params.noteId)
    if ('success' in r) return r
    const patch = cleanPatch((params.patch ?? {}) as Record<string, unknown>)
    if ('success' in patch) return patch
    const keys = Object.keys(patch.patch)
    if (keys.length === 0) return fail('Nothing to update')
    // Text/type edits and layout/colour edits are separate switches; every touched field must be allowed.
    const denied = checkAll(r.board, userId, new Set<BoardPerm>(keys.map((k) => (k === 'text' || k === 'type' ? 'allowEditText' : 'allowMove'))))
    if (denied) return denied
    return tools.update('notes', r.rec.recordId, patch.patch)
  },

  deleteNote: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'notes', params.noteId)
    if ('success' in r) return r
    const denied = canWriteBoard(r.board, userId, 'allowAddDelete')
    if (denied) return denied
    const removed = await tools.remove('notes', r.rec.recordId)
    if (!removed.success) return removed
    // Arrows that touched the note go with it (readers also skip dangling arrows, as a backstop).
    for (const where of [{ fromId: r.rec.recordId }, { toId: r.rec.recordId }]) {
      const d = await deleteAllWhere(tools, 'arrows', where)
      if (typeof d !== 'number') console.error('deleteNote: arrow cleanup failed', d.error)
    }
    return removed
  },

  addGroup: async ({ userId, params, tools }) => {
    const board = await getRec(tools, 'boards', params.boardId)
    if ('success' in board) return board
    const denied = canWriteBoard(board, userId, 'allowStructure')
    if (denied) return denied
    const patch = cleanGroupPatch({ x: params.x ?? 0, y: params.y ?? 0, w: params.w ?? 360, h: params.h ?? 260, title: params.title ?? 'Group', color: params.color ?? 'blue' })
    if ('success' in patch) return patch
    const n = await countWhere(tools, 'groups', board.recordId, MAX_GROUPS)
    if (typeof n !== 'number') return n
    if (n >= MAX_GROUPS) return fail(`A board holds at most ${MAX_GROUPS} groups`)
    const d = patch.patch as { x: number; y: number; w: number; h: number }
    return tools.create('groups', { boardId: board.recordId, ...patch.patch, x: Math.min(d.x, MAX_X - d.w), y: Math.min(d.y, MAX_Y - d.h) })
  },

  updateGroup: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'groups', params.groupId)
    if ('success' in r) return r
    const patch = cleanGroupPatch((params.patch ?? {}) as Record<string, unknown>)
    if ('success' in patch) return patch
    const keys = Object.keys(patch.patch)
    if (keys.length === 0) return fail('Nothing to update')
    const moving = keys.includes('x') || keys.includes('y')
    // Moving a group also moves the notes inside it, so it needs the move switch as well.
    const need: BoardPerm[] = moving ? ['allowStructure', 'allowMove'] : ['allowStructure']
    const denied = checkAll(r.board, userId, need)
    if (denied) return denied

    const g: Box = {
      x: Number(r.rec.data.x) || 0,
      y: Number(r.rec.data.y) || 0,
      w: Number(r.rec.data.w) || GROUP_MIN.w,
      h: Number(r.rec.data.h) || GROUP_MIN.h,
    }
    const next = patch.patch as Partial<Box>
    const out: Record<string, unknown> = { ...patch.patch }
    if (moving) {
      const w = next.w ?? g.w
      const h = next.h ?? g.h
      const nx = Math.min(next.x ?? g.x, MAX_X - w)
      const ny = Math.min(next.y ?? g.y, MAX_Y - h)
      out.x = nx
      out.y = ny
      const dx = nx - g.x
      const dy = ny - g.y
      if (dx !== 0 || dy !== 0) {
        const q = await tools.query('notes', { where: { boardId: r.board.recordId }, limit: MAX_NOTES })
        if (!q.success) return q
        for (const n of q.data.records) {
          const b = noteBox(n)
          if (!centerIn(b, g)) continue
          const res = await tools.update('notes', n.recordId, {
            x: clampInt(b.x + dx, 0, MAX_X - b.w),
            y: clampInt(b.y + dy, 0, MAX_Y - b.h),
          })
          if (!res.success) return res
        }
      }
    }
    return tools.update('groups', r.rec.recordId, out)
  },

  deleteGroup: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'groups', params.groupId)
    if ('success' in r) return r
    const denied = canWriteBoard(r.board, userId, 'allowStructure')
    if (denied) return denied
    return tools.remove('groups', r.rec.recordId) // notes inside stay where they are
  },

  addArrow: async ({ userId, params, tools }) => {
    const board = await getRec(tools, 'boards', params.boardId)
    if ('success' in board) return board
    const denied = canWriteBoard(board, userId, 'allowStructure')
    if (denied) return denied
    const { fromId, toId } = params
    if (typeof fromId !== 'string' || typeof toId !== 'string' || fromId === toId) return fail('An arrow needs two different notes')
    // Both endpoints must be notes of THIS board (checked from the stored notes, not trusted from the caller).
    for (const id of [fromId, toId]) {
      const note = await getRec(tools, 'notes', id)
      if ('success' in note || note.data.boardId !== board.recordId) return fail('Notes must be on this board')
    }
    const dup = await tools.query('arrows', { where: { boardId: board.recordId, fromId, toId }, limit: 1 })
    if (!dup.success) return dup
    if (dup.data.records.length > 0) return fail('These notes are already linked that way')
    const n = await countWhere(tools, 'arrows', board.recordId, MAX_ARROWS)
    if (typeof n !== 'number') return n
    if (n >= MAX_ARROWS) return fail(`A board holds at most ${MAX_ARROWS} arrows`)
    const label = params.label ?? ''
    if (typeof label !== 'string' || label.length > MAX_LABEL) return fail(`label must be ≤ ${MAX_LABEL} chars`)
    // Sides: both or neither ('' = drawn automatically), and only the four real ones.
    const fromSide = params.fromSide ?? ''
    const toSide = params.toSide ?? ''
    const valid = (s: unknown) => s === '' || isSide(s)
    if (!valid(fromSide) || !valid(toSide) || (fromSide === '') !== (toSide === '')) return fail('Give both attach sides, or neither')
    return tools.create('arrows', { boardId: board.recordId, fromId, toId, label, fromSide, toSide })
  },

  updateArrow: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'arrows', params.arrowId)
    if ('success' in r) return r
    const denied = canWriteBoard(r.board, userId, 'allowStructure')
    if (denied) return denied
    const label = params.label
    if (typeof label !== 'string' || label.length > MAX_LABEL) return fail(`label must be ≤ ${MAX_LABEL} chars`)
    return tools.update('arrows', r.rec.recordId, { label })
  },

  deleteArrow: async ({ userId, params, tools }) => {
    const r = await recAndBoard(tools, 'arrows', params.arrowId)
    if ('success' in r) return r
    const denied = canWriteBoard(r.board, userId, 'allowStructure')
    if (denied) return denied
    return tools.remove('arrows', r.rec.recordId)
  },

  clearBoard: async ({ userId, params, tools }) => {
    const board = await getRec(tools, 'boards', params.boardId)
    if ('success' in board) return board
    if (board.createdBy !== userId) return fail('Only the board owner can clear it')
    let notes = 0
    for (const coll of ['notes', 'arrows', 'groups']) {
      const n = await deleteAllWhere(tools, coll, { boardId: board.recordId })
      if (typeof n !== 'number') return n
      if (coll === 'notes') notes = n
    }
    return { success: true, data: { deleted: notes } }
  },
}
