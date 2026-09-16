import { type AnyPgColumn, boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth-schema.js';

export const folders = pgTable(
  'folders',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'cascade' }),
    isFavorite: boolean('is_favorite').notNull().default(false),
    // Non-null = dans la corbeille depuis cette date (purge automatique apres 7 jours, voir TrashService)
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Index partiel : ignore les dossiers en corbeille, pour qu'un nom redevienne disponible
    // des qu'un dossier homonyme est supprime (sans attendre sa purge definitive).
    uniqueIndex('folders_owner_parent_name_idx')
      .on(table.ownerId, table.parentId, table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, { fields: [folders.ownerId], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folder_children' }),
  children: many(folders, { relationName: 'folder_children' }),
}));
