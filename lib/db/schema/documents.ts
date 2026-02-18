import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { documentTypeEnum } from './enums';
import { createId } from '@paralleldrive/cuid2';

export const documents = pgTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  url: text('url').notNull(),
  name: text('name').notNull(),
  type: documentTypeEnum('type').notNull(),
  projectId: text('projectId').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index().on(table.projectId),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;