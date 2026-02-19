import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const videos = pgTable('videos', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  url: text('url').notNull(),
  title: text('title'),
  projectId: text('project').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  isPublished: boolean('isPublished').default(false).notNull(),
  order: integer('order').default(0).notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  projectOrderIdx: index().on(table.projectId, table.order),
}));

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;