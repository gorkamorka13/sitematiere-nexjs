import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const images = pgTable('images', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnailUrl'),
  alt: text('alt'),
  order: integer('order').default(0).notNull(),
  projectId: text('projectId').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index().on(table.projectId),
}));

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
