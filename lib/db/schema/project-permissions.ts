import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { permissionLevelEnum } from './enums';
import { createId } from '@paralleldrive/cuid2';

export const projectPermissions = pgTable('project_permissions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  projectId: text('projectId').notNull(),
  userId: text('userId').notNull(),
  level: permissionLevelEnum('level').default('READ').notNull(),
  grantedBy: text('grantedBy').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  projectUserUnique: uniqueIndex().on(table.projectId, table.userId),
}));

export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type NewProjectPermission = typeof projectPermissions.$inferInsert;
