import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";

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

  const goals = await prisma.goal.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
    include: {
      completions: {
        where: { date },
      },
    },
  });

  const result = goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    active: goal.active,
    createdAt: goal.createdAt,
    completed: goal.completions.length > 0,
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
    const { title } = body as { title?: string };

    if (!title) {
      return NextResponse.json(
        { error: "title is required." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: title.trim(),
      },
    });

    const today = format(new Date(), "yyyy-MM-dd");
    const activeCount = await prisma.goal.count({ where: { userId, active: true } });
    await prisma.dailyGoalCount.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, count: activeCount },
      update: { count: activeCount },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
