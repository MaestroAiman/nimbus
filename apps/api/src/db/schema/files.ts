import { bigint, boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth-schema.js';
import { folders } from './folders.js';

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  mimeType: text('mime_type').notNull(),
  // Chemin relatif du fichier sur le volume disque dedie (pas le binaire, seulement la metadonnee)
  diskPath: text('disk_path').notNull(),
  isFavorite: boolean('is_favorite').notNull().default(false),
  // Non-null = dans la corbeille depuis cette date (purge automatique apres 7 jours, voir TrashService)
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const filesRelations = relations(files, ({ one }) => ({
  owner: one(users, { fields: [files.ownerId], references: [users.id] }),
  folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
}));
