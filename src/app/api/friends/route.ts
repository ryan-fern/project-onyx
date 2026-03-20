import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

async function computeSevenDayScore(userId: string): Promise<{
  score: number;
  goalsSet: number;
  goalsCompleted: number;
}> {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, i), "yyyy-MM-dd")
  );

  const activeGoalCount = await prisma.goal.count({
    where: { userId, active: true },
  });

  const completionsCount = await prisma.dailyCompletion.count({
    where: { userId, date: { in: dates } },
  });

  const goalsSet = activeGoalCount * 7;
  const goalsCompleted = completionsCount;
  const score =
    goalsSet > 0 ? Math.min(100, Math.round((goalsCompleted / goalsSet) * 100)) : 0;

  return { score, goalsSet, goalsCompleted };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get all users except the session user
  const allUsers = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: { id: true, name: true, email: true },
  });

  const users = await Promise.all(
    allUsers.map(async (user) => {
      const stats = await computeSevenDayScore(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        ...stats,
      };
    })
  );

  return NextResponse.json(users);
}
