import { Inject, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { activityEvents, users } from '../db/schema/index.js';
import type { ActivityAction, ActivityTargetType } from './activity.types.js';

const LIST_LIMIT = 100;

@Injectable()
export class ActivityService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(
    actorId: string,
    action: ActivityAction,
    targetType: ActivityTargetType,
    targetId: string,
    targetName: string,
  ): Promise<void> {
    const [actor] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, actorId));

    await this.db.insert(activityEvents).values({
      id: createId(),
      actorId,
      actorName: actor?.name ?? 'Utilisateur supprimé',
      action,
      targetType,
      targetId,
      targetName,
    });
  }

  async listAll() {
    return this.db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(LIST_LIMIT);
  }

  async listForUser(actorId: string) {
    return this.db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.actorId, actorId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(LIST_LIMIT);
  }
}
