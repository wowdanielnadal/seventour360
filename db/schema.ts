import { sqliteTable,text,integer } from 'drizzle-orm/sqlite-core';
export const loginLimits=sqliteTable('login_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expires:integer('expires').notNull()});
