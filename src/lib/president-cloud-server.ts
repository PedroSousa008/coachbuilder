import { prisma } from "@/lib/prisma";

/** Presidente pode ler/alterar o workspace deste `coachUserId` (ligado ao clube ou a própria conta). */
export async function presidentCanAccessCoachWorkspace(
  presidentId: string,
  coachUserId: string
): Promise<boolean> {
  if (coachUserId === presidentId) return true;
  const link = await prisma.user.findFirst({
    where: {
      id: coachUserId,
      clubPresidentUserId: presidentId,
      trainerSeatActive: true,
    },
    select: { id: true },
  });
  return Boolean(link);
}
