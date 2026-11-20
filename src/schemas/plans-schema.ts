import type { CollectionSchema } from 'deepspace/schema'

/** One plan per board (record id `plan_<boardId>`), overwritten on each run.
 *  Read-only over the socket: only the generatePlan action writes it, streaming
 *  `content` into the record so every open window sees the text arrive. */
export const plansSchema: CollectionSchema = {
  name: 'plans',
  columns: [
    { name: 'boardId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'content', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['generating', 'done', 'error'] }, default: 'done' },
    { name: 'error', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'startedAt', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'requestedBy', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
