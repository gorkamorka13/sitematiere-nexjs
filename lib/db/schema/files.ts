import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { fileTypeEnum } from './enums';
import { createId } from '@paralleldrive/cuid2';

export const files = pgTable('files', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  blobUrl: text('blobUrl').notNull().unique(),
  blobPath: text('blobPath').notNull(),
  fileType: fileTypeEnum('fileType').notNull(),
  mimeType: text('mimeType').notNull(),
  size: integer('size').notNull(),
  projectId: text('projectId'),
  thumbnailUrl: text('thumbnailUrl'),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'),
  isDeleted: boolean('isDeleted').default(false).notNull(),
  deletedAt: timestamp('deletedAt'),
  deletedBy: text('deletedBy'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index().on(table.projectId),
  deletedIdx: index().on(table.isDeleted),
  fileTypeIdx: index().on(table.fileType),
}));

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;