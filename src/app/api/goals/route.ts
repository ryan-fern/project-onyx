import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id, date },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, date } = body as { title?: string; date?: string };

    if (!title || !date) {
      return NextResponse.json(
        { error: "title and date are required." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        date,
      },
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
