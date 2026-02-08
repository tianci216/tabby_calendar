import { db } from '@/db';
import { auditLog } from '@/db/schema';

interface AuditInput {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export function logAudit(input: AuditInput) {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (input.action.startsWith('create')) {
    changes['_created'] = { old: null, new: input.newValues };
  } else if (input.action.startsWith('delete')) {
    changes['_deleted'] = { old: input.oldValues, new: null };
  } else if (input.oldValues && input.newValues) {
    for (const key of Object.keys(input.newValues)) {
      if (JSON.stringify(input.oldValues[key]) !== JSON.stringify(input.newValues[key])) {
        changes[key] = { old: input.oldValues[key], new: input.newValues[key] };
      }
    }
  }

  db.insert(auditLog).values({
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: JSON.stringify(changes),
    timestamp: new Date().toISOString(),
  }).run();
}
