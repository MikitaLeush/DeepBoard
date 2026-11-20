import type { CollectionSchema } from 'deepspace/schema'
import { NOTE_COLORS } from './notes-schema'

export const GROUP_MIN = { w: 160, h: 120 }
export const GROUP_MAX = { w: 2000, h: 1500 }

/** A labelled box on the board. Notes whose centre lies inside it "belong" to it (derived from
 *  geometry, never stored). Read-only over the socket; writes go through src/actions. */
export const groupsSchema: CollectionSchema = {
  name: 'groups',
  columns: [
    { name: 'boardId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'title', storage: 'text', interpretation: 'plain', default: 'Group' },
    { name: 'color', storage: 'text', interpretation: { kind: 'select', options: [...NOTE_COLORS] }, default: 'blue' },
    { name: 'x', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'y', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'w', storage: 'number', interpretation: 'plain', default: 360 },
    { name: 'h', storage: 'number', interpretation: 'plain', default: 260 },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
