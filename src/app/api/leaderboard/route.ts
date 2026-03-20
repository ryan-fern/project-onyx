import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, subDays, differenceInDays } from "date-fns";

async function computeStreak(userId: string): Promise<number> {
  const activeGoalCount = await prisma.goal.count({
    where: { userId, active: true },
  });
  if (activeGoalCount === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const dateStr = format(subDays(today, i), "yyyy-MM-dd");
    const count = await prisma.dailyCompletion.count({
      where: { userId, date: dateStr },
    });

    if (count >= activeGoalCount) {
      streak++;
    } else if (i === 0) {
      // Today not yet complete — don't break streak, check from yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}

async function computePercentage(userId: string, createdAt: Date): Promise<{
  score: number;
  locked: boolean;
  daysUntilUnlock: number;
  goalsSet: number;
  goalsCompleted: number;
}> {
  const daysSinceCreation = differenceInDays(new Date(), createdAt);

  if (daysSinceCreation < 7) {
    return {
      score: 0,
      locked: true,
      daysUntilUnlock: 7 - daysSinceCreation,
      goalsSet: 0,
      goalsCompleted: 0,
    };
  }

  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), i), "yyyy-MM-dd")
  );

  const activeGoalCount = await prisma.goal.count({
    where: { userId, active: true },
  });

  const completionsCount = await prisma.dailyCompletion.count({
    where: { userId, date: { in: dates } },
  });

  const goalsSet = activeGoalCount * 7;
  const score =
    goalsSet > 0
      ? Math.min(100, Math.round((completionsCount / goalsSet) * 100))
      : 0;

  return { score, locked: false, daysUntilUnlock: 0, goalsSet, goalsCompleted: completionsCount };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const type = req.nextUrl.searchParams.get("type") ?? "streak";

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (type === "streak") {
    const entries = await Promise.all(
      allUsers.map(async (user) => {
        const streak = await computeStreak(user.id);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          streak,
          isCurrentUser: user.id === userId,
        };
      })
    );

    entries.sort((a, b) => b.streak - a.streak);
    return NextResponse.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
  } else {
    const entries = await Promise.all(
      allUsers.map(async (user) => {
        const pct = await computePercentage(user.id, user.createdAt);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          ...pct,
          isCurrentUser: user.id === userId,
        };
      })
    );

    // Unlocked users sorted by score desc, locked users at bottom
    entries.sort((a, b) => {
      if (a.locked && !b.locked) return 1;
      if (!a.locked && b.locked) return -1;
      return b.score - a.score;
    });

    return NextResponse.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
  }
}
