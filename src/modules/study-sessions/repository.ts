import type { StudySession } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { StudySessionInput } from "./schema";

export type OwnedMutationResult<T> = T | null;

export async function createSession(userId: string, input: StudySessionInput) {
  return prisma.studySession.create({
    data: {
      ...input,
      userId,
      studyDate: new Date(`${input.studyDate}T00:00:00.000Z`),
    },
  });
}

export async function getSession(userId: string, id: string) {
  return prisma.studySession.findFirst({ where: { id, userId } });
}

export async function listSessions(userId: string, page: number) {
  const [records, total] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId },
      take: 20,
      skip: (page - 1) * 20,
      orderBy: [
        { studyDate: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.studySession.count({ where: { userId } }),
  ]);

  return { records, totalPages: Math.ceil(total / 20) };
}

export async function updateSession(
  userId: string,
  id: string,
  input: StudySessionInput,
): Promise<OwnedMutationResult<StudySession>> {
  const result = await prisma.studySession.updateMany({
    where: { id, userId },
    data: {
      ...input,
      studyDate: new Date(`${input.studyDate}T00:00:00.000Z`),
    },
  });
  if (result.count === 0) return null;
  return prisma.studySession.findFirst({ where: { id, userId } });
}

export async function deleteSession(userId: string, id: string) {
  const result = await prisma.studySession.deleteMany({ where: { id, userId } });
  return result.count === 1;
}
