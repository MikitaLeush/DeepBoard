import type { CollectionSchema } from 'deepspace/schema'

export const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export const NOTE_TYPES = ['idea', 'question', 'task', 'risk'] as const
export type NoteType = (typeof NOTE_TYPES)[number]
export const Z_LIMIT = 100_000
export const NOTE_MIN = { w: 120, h: 90 }
export const NOTE_MAX = { w: 600, h: 500 }

/** Read-only over the socket. Every write goes through src/actions so the
 *  board's lock/owner can be checked server-side (RBAC can't see another record). */
export const notesSchema: CollectionSchema = {
  name: 'notes',
  columns: [
    { name: 'boardId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'text', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'color', storage: 'text', interpretation: { kind: 'select', options: [...NOTE_COLORS] }, default: 'yellow' },
    { name: 'type', storage: 'text', interpretation: { kind: 'select', options: [...NOTE_TYPES] }, default: 'idea' },
    { name: 'w', storage: 'number', interpretation: 'plain', default: 180 },
    { name: 'h', storage: 'number', interpretation: 'plain', default: 150 },
    // Stacking: higher = in front. Ties fall back to creation order, so unset (old) notes keep the order they were added in.
    { name: 'z', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'x', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'y', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
