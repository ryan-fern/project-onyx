import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDaysInMonth, format, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM

  const ref = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1; // 1-indexed
  const daysInMonth = getDaysInMonth(ref);

  // Build date strings for all days in the month
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const m = String(month).padStart(2, "0");
    return `${year}-${m}-${day}`;
  });

  // DailyGoalCount snapshots for all days in the month
  const snapshots = await prisma.dailyGoalCount.findMany({
    where: { userId, date: { in: dates } },
    select: { date: true, count: true },
  });
  const snapshotByDate: Record<string, number> = {};
  for (const s of snapshots) snapshotByDate[s.date] = s.count;

  // All completions in this month
  const completions = await prisma.dailyCompletion.findMany({
    where: { userId, date: { in: dates } },
    select: { date: true },
  });

  // Group completions by date
  const completionsByDate: Record<string, number> = {};
  for (const c of completions) {
    completionsByDate[c.date] = (completionsByDate[c.date] ?? 0) + 1;
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const days = dates.map((date) => {
    const completed = completionsByDate[date] ?? 0;
    const isFuture = date > today;
    const snapshotCount = snapshotByDate[date];

    let total: number;
    let score: number | null;

    if (isFuture) {
      total = 0;
      score = null;
    } else if (snapshotCount !== undefined && snapshotCount > 0) {
      total = snapshotCount;
      score = Math.min(100, Math.round((completed / total) * 100));
    } else if (completed > 0) {
      // Legacy: no snapshot but has completions - treat as 100%
      total = completed;
      score = 100;
    } else {
      // No snapshot, no completions - unknown
      total = 0;
      score = null;
    }

    return { date, completed, total, score, isFuture };
  });

  return NextResponse.json({ days });
}
