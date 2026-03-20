import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  score: number;
  goalsSet: number;
  goalsCompleted: number;
  rank: number;
  isCurrentUser: boolean;
}

async function computeSevenDayScore(userId: string): Promise<{
  score: number;
  goalsSet: number;
  goalsCompleted: number;
}> {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, i), "yyyy-MM-dd")
  );

  // Count active goals for this user
  const activeGoalCount = await prisma.goal.count({
    where: { userId, active: true },
  });

  // Count completions in the last 7 days
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

  // Get ALL users
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  // Compute scores for all users
  const entries = await Promise.all(
    allUsers.map(async (user) => {
      const stats = await computeSevenDayScore(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        ...stats,
        isCurrentUser: user.id === userId,
      };
    })
  );

  // Sort descending by score
  entries.sort((a, b) => b.score - a.score);

  // Add rank
  const ranked: LeaderboardEntry[] = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return NextResponse.json(ranked);
}
