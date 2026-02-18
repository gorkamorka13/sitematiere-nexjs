import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique(),
  name: text('name'),
  passwordHash: text('passwordHash').notNull(),
  role: userRoleEnum('role').default('USER').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  username: text('username').unique(),
  color: text('color').default('#6366f1'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;