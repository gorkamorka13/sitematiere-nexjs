import { pgTable, text, timestamp, real, integer, varchar, index } from 'drizzle-orm/pg-core';
import { projectTypeEnum, projectStatusEnum } from './enums';
import { createId } from '@paralleldrive/cuid2';

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 255 }).notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  description: text('description'),
  type: projectTypeEnum('type').notNull(),
  status: projectStatusEnum('status').default('PROSPECT').notNull(),
  prospection: integer('prospection').default(0).notNull(),
  studies: integer('studies').default(0).notNull(),
  fabrication: integer('fabrication').default(0).notNull(),
  transport: integer('transport').default(0).notNull(),
  construction: integer('construction').default(0).notNull(),
  projectCode: varchar('projectCode', { length: 255 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  ownerId: text('ownerId').notNull(),
}, (table) => ({
  countryIdx: index().on(table.country),
  typeIdx: index().on(table.type),
  statusIdx: index().on(table.status),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;