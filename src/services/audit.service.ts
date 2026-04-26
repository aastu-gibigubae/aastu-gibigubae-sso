import {prisma} from "../config/db.js";
import { Role } from "@prisma/client";

interface AuditParams {
  actorId?: string;
  targetId?: string;

  actorRole: Role;
  targetRole?: Role;

  action: string;

  actorEmail: string;
  actorFirstName: string;
  actorFatherName: string;
  actorStudentId: string;

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
      ...data,
      ipAddress: data.ipAddress ?? null,
      deviceInfo: data.deviceInfo ?? null,
      targetId: data.targetId ?? null,
      actorId: data.actorId ?? null,
      targetRole: data.targetRole ?? null,
    },
  });
};
