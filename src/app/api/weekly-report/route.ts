import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyReport, WeeklyReportData } from "@/lib/email";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

// Vercel Cron calls this as GET with Authorization: Bearer CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  const weekStartStr = format(weekStart, "MMM d");
  const weekEndStr = format(weekEnd, "MMM d, yyyy");

  // Get dates for last 7 days
  const last7Dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, 6 - i), "yyyy-MM-dd")
  );

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  // Get all users count for leaderboard
  const totalParticipants = users.length;

  let emailsSent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Get DailyGoalCount snapshots for last 7 days
      const snapshots = await prisma.dailyGoalCount.findMany({
        where: { userId: user.id, date: { in: last7Dates } },
        select: { date: true, count: true },
      });
      const snapshotByDate: Record<string, number> = {};
      for (const s of snapshots) snapshotByDate[s.date] = s.count;

      // Get completions in last 7 days
      const completions = await prisma.dailyCompletion.findMany({
        where: { userId: user.id, date: { in: last7Dates } },
      });

      // Build daily breakdown using snapshots
      let goalsSet = 0;
      let goalsCompleted = 0;

      const dailyBreakdown = last7Dates.map((date) => {
        const dayCompleted = completions.filter((c) => c.date === date).length;
        const snapshotCount = snapshotByDate[date];

        let set: number;
        let dayScore: number;

        if (snapshotCount !== undefined && snapshotCount > 0) {
          set = snapshotCount;
          const clampedCompleted = Math.min(dayCompleted, set);
          dayScore = Math.round((clampedCompleted / set) * 100);
          goalsSet += set;
          goalsCompleted += clampedCompleted;
        } else if (dayCompleted > 0) {
          // Legacy: no snapshot but has completions - treat as 100%
          set = dayCompleted;
          dayScore = 100;
          goalsSet += set;
          goalsCompleted += dayCompleted;
        } else {
          // No snapshot, no completions - skip from totals
          set = 0;
          dayScore = 0;
        }

        return {
          date: format(new Date(date + "T00:00:00"), "EEE, MMM d"),
          set,
          completed: dayCompleted,
          score: dayScore,
        };
      });

      const overallScore =
        goalsSet > 0 ? Math.min(100, Math.round((goalsCompleted / goalsSet) * 100)) : 0;

      // Compute leaderboard position among all users using snapshots
      const allUserScores = await Promise.all(
        users.map(async (u) => {
          const uSnapshots = await prisma.dailyGoalCount.findMany({
            where: { userId: u.id, date: { in: last7Dates } },
            select: { date: true, count: true },
          });
          const uSnapshotByDate: Record<string, number> = {};
          for (const s of uSnapshots) uSnapshotByDate[s.date] = s.count;

          let uTotalSet = 0;
          let uTotalCompleted = 0;

          for (const date of last7Dates) {
            const snap = uSnapshotByDate[date];
            const dayCount = await prisma.dailyCompletion.count({
              where: { userId: u.id, date },
            });

            if (snap !== undefined && snap > 0) {
              uTotalSet += snap;
              uTotalCompleted += Math.min(dayCount, snap);
            } else if (dayCount > 0) {
              uTotalSet += dayCount;
              uTotalCompleted += dayCount;
            }
          }

          return uTotalSet > 0
            ? Math.min(100, Math.round((uTotalCompleted / uTotalSet) * 100))
            : 0;
        })
      );

      allUserScores.sort((a, b) => b - a);
      const leaderboardPosition = allUserScores.indexOf(overallScore) + 1;

      const data: WeeklyReportData = {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        overallScore,
        goalsSet,
        goalsCompleted,
        dailyBreakdown,
        leaderboardPosition: leaderboardPosition > 0 ? leaderboardPosition : 1,
        totalParticipants,
      };

      await sendWeeklyReport(user.email, user.name, data);
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send report to ${user.email}:`, err);
      errors.push(user.email);
    }
  }

  return NextResponse.json({
    success: true,
    emailsSent,
    totalUsers: users.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
