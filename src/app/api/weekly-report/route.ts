import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyReport, WeeklyReportData } from "@/lib/email";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

export async function POST(req: NextRequest) {
  // Verify cron secret
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

  let emailsSent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Get all goals in last 7 days
      const goals = await prisma.goal.findMany({
        where: { userId: user.id, date: { in: last7Dates } },
        orderBy: { date: "asc" },
      });

      const goalsSet = goals.length;
      const goalsCompleted = goals.filter((g) => g.completed).length;
      const overallScore =
        goalsSet > 0 ? Math.round((goalsCompleted / goalsSet) * 100) : 0;

      // Daily breakdown
      const dailyBreakdown = last7Dates.map((date) => {
        const dayGoals = goals.filter((g) => g.date === date);
        const set = dayGoals.length;
        const completed = dayGoals.filter((g) => g.completed).length;
        const score = set > 0 ? Math.round((completed / set) * 100) : 0;
        return {
          date: format(new Date(date + "T00:00:00"), "EEE, MMM d"),
          set,
          completed,
          score,
        };
      });

      // Get leaderboard position
      const acceptedRequests = await prisma.friendRequest.findMany({
        where: {
          status: "accepted",
          OR: [{ requesterId: user.id }, { recipientId: user.id }],
        },
        include: {
          requester: { select: { id: true } },
          recipient: { select: { id: true } },
        },
      });

      const friendIds = acceptedRequests.map((r) =>
        r.requesterId === user.id ? r.recipientId : r.requesterId
      );

      const participantIds = [user.id, ...friendIds];

      const participantGoals = await prisma.goal.findMany({
        where: {
          userId: { in: participantIds },
          date: { in: last7Dates },
        },
      });

      // Compute score for each participant
      const participantScores = participantIds.map((pid) => {
        const pGoals = participantGoals.filter((g) => g.userId === pid);
        const pSet = pGoals.length;
        const pCompleted = pGoals.filter((g) => g.completed).length;
        return pSet > 0 ? Math.round((pCompleted / pSet) * 100) : 0;
      });

      participantScores.sort((a, b) => b - a);
      const leaderboardPosition = participantScores.indexOf(overallScore) + 1;
      const totalParticipants = participantIds.length;

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
