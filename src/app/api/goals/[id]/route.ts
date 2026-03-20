import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (goal.userId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { date, completed, title } = body as {
      date?: string;
      completed?: boolean;
      title?: string;
    };

    // Title rename
    if (typeof title === "string") {
      const trimmed = title.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
      }
      const updated = await prisma.goal.update({ where: { id }, data: { title: trimmed } });
      return NextResponse.json(updated);
    }

    // Completion toggle
    if (typeof completed !== "boolean" || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Provide title for rename, or date + completed for completion toggle." },
        { status: 400 }
      );
    }

    if (completed) {
      await prisma.dailyCompletion.upsert({
        where: { goalId_date: { goalId: id, date } },
        create: { goalId: id, userId, date },
        update: {},
      });
    } else {
      await prisma.dailyCompletion.deleteMany({
        where: { goalId: id, date },
      });
    }

    return NextResponse.json({ id, completed, date });
  } catch (error) {
    console.error("Update goal error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (goal.userId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.goal.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ success: true });
}
