/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { boardsSchema } from './schemas/boards-schema'
import { notesSchema } from './schemas/notes-schema'
import { plansSchema } from './schemas/plans-schema'
import { groupsSchema } from './schemas/groups-schema'
import { arrowsSchema } from './schemas/arrows-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  boardsSchema,
  notesSchema,
  plansSchema,
  groupsSchema,
  arrowsSchema,
]
