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

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (goal.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { completed, title } = body as {
      completed?: boolean;
      title?: string;
    };

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        ...(typeof completed === "boolean" ? { completed } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
      },
    });

    return NextResponse.json(updated);
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

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (goal.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.goal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
