import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  writer,
} from '@nozbe/watermelondb/decorators';

export type GoalType = 'books' | 'pages' | 'minutes' | 'streak';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export class ReadingGoal extends Model {
  static table = 'reading_goals';

  @field('server_id') serverId!: number | null;
  @text('type') type!: GoalType;
  @text('period') period!: GoalPeriod;
  @field('target') target!: number;
  @field('year') year!: number;
  @field('month') month!: number | null;
  @field('week') week!: number | null;
  @field('is_active') isActive!: boolean;
  @date('completed_at') completedAt!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @writer async updateTarget(newTarget: number) {
    await this.update((record) => {
      record.target = newTarget;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async markCompleted() {
    await this.update((record) => {
      record.completedAt = new Date();
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async deactivate() {
    await this.update((record) => {
      record.isActive = false;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async markSynced(serverId: number) {
    await this.update((record) => {
      record.serverId = serverId;
      record.isPendingSync = false;
    });
  }

  @writer async softDelete() {
    await this.update((record) => {
      record.isDeleted = true;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }
}
