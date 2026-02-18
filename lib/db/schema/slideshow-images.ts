import { pgTable, text, timestamp, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const slideshowImages = pgTable('slideshow_images', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  projectId: text('projectId').notNull(),
  imageId: text('imageId').notNull(),
  order: integer('order').default(0).notNull(),
  isPublished: boolean('isPublished').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  projectOrderIdx: index().on(table.projectId, table.order),
  projectPublishedIdx: index().on(table.projectId, table.isPublished),
  projectImageUnique: unique().on(table.projectId, table.imageId),
}));

export type SlideshowImage = typeof slideshowImages.$inferSelect;
export type NewSlideshowImage = typeof slideshowImages.$inferInsert;