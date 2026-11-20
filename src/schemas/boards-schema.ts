import type { CollectionSchema } from 'deepspace/schema'

export const BOARD_PERMS = ['allowEditText', 'allowAddDelete', 'allowMove', 'allowPlan', 'allowStructure'] as const
export type BoardPerm = (typeof BOARD_PERMS)[number]
const BOARD_WRITABLE = ['title', 'locked', ...BOARD_PERMS]

/** Owner = record creator. `update/delete: 'own'` makes lock/rename/delete owner-only,
 *  and admin is deliberately NOT given an override so the guarantee is simple to state. */
export const boardsSchema: CollectionSchema = {
  name: 'boards',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'locked', storage: 'number', interpretation: 'boolean', default: 0 },
    // Per-action switches for non-owners (owner can always do everything). Missing/null = allowed.
    { name: 'allowEditText', storage: 'number', interpretation: 'boolean', default: 1 },
    { name: 'allowAddDelete', storage: 'number', interpretation: 'boolean', default: 1 },
    { name: 'allowMove', storage: 'number', interpretation: 'boolean', default: 1 },
    { name: 'allowPlan', storage: 'number', interpretation: 'boolean', default: 1 },
    { name: 'allowStructure', storage: 'number', interpretation: 'boolean', default: 1 },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own', writableFields: BOARD_WRITABLE },
    admin: { read: true, create: true, update: 'own', delete: 'own', writableFields: BOARD_WRITABLE },
  },
}
