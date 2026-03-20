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
      // Count active goals for the user
      const activeGoalCount = await prisma.goal.count({
        where: { userId: user.id, active: true },
      });

      // Get completions in last 7 days
      const completions = await prisma.dailyCompletion.findMany({
        where: { userId: user.id, date: { in: last7Dates } },
      });

      const goalsSet = activeGoalCount * 7;
      const goalsCompleted = completions.length;
      const overallScore =
        goalsSet > 0 ? Math.min(100, Math.round((goalsCompleted / goalsSet) * 100)) : 0;

      // Daily breakdown: set = active goals count, completed = completions for that day
      const dailyBreakdown = last7Dates.map((date) => {
        const dayCompleted = completions.filter((c) => c.date === date).length;
        const set = activeGoalCount;
        const score = set > 0 ? Math.round((dayCompleted / set) * 100) : 0;
        return {
          date: format(new Date(date + "T00:00:00"), "EEE, MMM d"),
          set,
          completed: dayCompleted,
          score,
        };
      });

      // Compute leaderboard position among all users
      const allUserScores = await Promise.all(
        users.map(async (u) => {
          const count = await prisma.goal.count({
            where: { userId: u.id, active: true },
          });
          const completionCount = await prisma.dailyCompletion.count({
            where: { userId: u.id, date: { in: last7Dates } },
          });
          const totalSet = count * 7;
          return totalSet > 0
            ? Math.min(100, Math.round((completionCount / totalSet) * 100))
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
