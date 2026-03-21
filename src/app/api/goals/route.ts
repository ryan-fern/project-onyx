import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, parseISO } from "date-fns";

function getPeriodKey(date: string, frequency: string): string {
  if (frequency === "WEEKLY") {
    return format(parseISO(date), "RRRR-'W'II");
  }
  if (frequency === "MONTHLY") {
    return date.slice(0, 7);
  }
  return date;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date query param required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const dailyKey = date;
  const weeklyKey = format(parseISO(date), "RRRR-'W'II");
  const monthlyKey = date.slice(0, 7);

  const goals = await prisma.goal.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });

  const completions = await prisma.dailyCompletion.findMany({
    where: {
      userId,
      goalId: { in: goals.map((g) => g.id) },
      date: { in: [dailyKey, weeklyKey, monthlyKey] },
    },
  });

  // Map goalId -> completed (regardless of which period key matched)
  const completedGoalIds = new Set(completions.map((c) => c.goalId));

  const result = goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    active: goal.active,
    frequency: goal.frequency,
    createdAt: goal.createdAt,
    completed: completedGoalIds.has(goal.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, frequency } = body as { title?: string; frequency?: string };

    if (!title) {
      return NextResponse.json(
        { error: "title is required." },
        { status: 400 }
      );
    }

    const freq = ["DAILY", "WEEKLY", "MONTHLY"].includes(frequency ?? "")
      ? (frequency as "DAILY" | "WEEKLY" | "MONTHLY")
      : "DAILY";

    const userId = session.user.id;

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: title.trim(),
        frequency: freq,
      },
    });

    // Only update the daily snapshot for daily goals
    if (freq === "DAILY") {
      const today = format(new Date(), "yyyy-MM-dd");
      const activeCount = await prisma.goal.count({
        where: { userId, active: true, frequency: "DAILY" },
      });
      await prisma.dailyGoalCount.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today, count: activeCount },
        update: { count: activeCount },
      });
    }

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
