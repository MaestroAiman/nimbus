import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth-schema.js';

export const activityEvents = pgTable('activity_events', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  // Denormalise a l'ecriture : reste lisible meme si l'utilisateur est renomme ou supprime plus tard.
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  // Pas de FK : la cible peut avoir ete definitivement supprimee.
  targetId: text('target_id').notNull(),
  targetName: text('target_name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  actor: one(users, { fields: [activityEvents.actorId], references: [users.id] }),
}));
