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

  const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
  if (!friendRequest) {
    return NextResponse.json({ error: "Friend request not found." }, { status: 404 });
  }

  // Only the recipient can accept/reject
  if (friendRequest.recipientId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body as { action?: "accept" | "reject" };

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'accept' or 'reject'." },
        { status: 400 }
      );
    }

    const updated = await prisma.friendRequest.update({
      where: { id },
      data: { status: action === "accept" ? "accepted" : "rejected" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update friend request error:", error);
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

  const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
  if (!friendRequest) {
    return NextResponse.json({ error: "Friend request not found." }, { status: 404 });
  }

  // Either party can delete the friendship
  if (
    friendRequest.requesterId !== userId &&
    friendRequest.recipientId !== userId
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.friendRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
