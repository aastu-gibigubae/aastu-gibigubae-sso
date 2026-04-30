import { prisma } from "../config/db.js";
import { Role } from "../generated/enums.js";

interface AuditParams {
  actorId?: string;
  targetId?: string;

  actorRole?: Role;
  targetRole?: Role;

  action: string;

  actorEmail?: string;
  actorFirstName?: string;
  actorFatherName?: string;
  actorStudentId?: string;

  targetEmail?: string;
  targetFirstName?: string;
  targetFatherName?: string;
  targetStudentId?: string;

  deviceInfo?: string;
  ipAddress?: string;

  changes?: any;
}

export const createAuditLog = async (data: AuditParams) => {
  await prisma.auditLog.create({
    data: {
      action: data.action,

      // IDs
      actorId: data.actorId ?? null,
      targetId: data.targetId ?? null,

      // Roles
      actorRole: data.actorRole ?? null,
      targetRole: data.targetRole ?? null,

      // Actor info
      actorEmail: data.actorEmail ?? null,
      actorFirstName: data.actorFirstName ?? null,
      actorFatherName: data.actorFatherName ?? null,
      actorStudentId: data.actorStudentId ?? null,

      // Target info
      targetEmail: data.targetEmail ?? null,
      targetFirstName: data.targetFirstName ?? null,
      targetFatherName: data.targetFatherName ?? null,
      targetStudentId: data.targetStudentId ?? null,

      // Metadata
      ipAddress: data.ipAddress ?? null,
      deviceInfo: data.deviceInfo ?? null,

      // JSON / changes
      changes: data.changes ?? null,
    },
  });
};
