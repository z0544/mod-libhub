import { prisma } from "./prisma.js";

interface AuditInput {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown>;
}

// Best-effort audit logging. Never throws to the caller.
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        details: (input.details ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
