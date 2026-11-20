import type { CollectionSchema } from 'deepspace/schema'

export const MAX_ARROWS = 300
export const MAX_LABEL = 60

/** A directed link between two notes of the same board. Read-only over the socket; writes go
 *  through src/actions, which check both notes belong to the board named in the call. */
export const arrowsSchema: CollectionSchema = {
  name: 'arrows',
  columns: [
    { name: 'boardId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'fromId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'toId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'label', storage: 'text', interpretation: 'plain', default: '' },
    // Which side of each note the arrow attaches to ('top'|'right'|'bottom'|'left'); '' = pick automatically.
    { name: 'fromSide', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'toSide', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
