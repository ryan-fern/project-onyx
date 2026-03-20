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

  // Active goal count (current snapshot)
  const activeGoalCount = await prisma.goal.count({
    where: { userId, active: true },
  });

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
    const total = activeGoalCount;
    const isFuture = date > today;
    const score = total > 0 && !isFuture
      ? Math.min(100, Math.round((completed / total) * 100))
      : null; // null = no data / future

    return { date, completed, total, score, isFuture };
  });

  return NextResponse.json({ days, activeGoalCount });
}
