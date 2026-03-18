import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

async function computeSevenDayScore(userId: string): Promise<{
  score: number;
  goalsSet: number;
  goalsCompleted: number;
}> {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, i), "yyyy-MM-dd")
  );

  const goals = await prisma.goal.findMany({
    where: { userId, date: { in: dates } },
  });

  const goalsSet = goals.length;
  const goalsCompleted = goals.filter((g) => g.completed).length;
  const score = goalsSet > 0 ? Math.round((goalsCompleted / goalsSet) * 100) : 0;

  return { score, goalsSet, goalsCompleted };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get all friend requests involving this user
  const allRequests = await prisma.friendRequest.findMany({
    where: {
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = allRequests.filter((r) => r.status === "accepted");
  const pendingReceived = allRequests.filter(
    (r) => r.status === "pending" && r.recipientId === userId
  );
  const pendingSent = allRequests.filter(
    (r) => r.status === "pending" && r.requesterId === userId
  );

  // For each accepted friendship, get the friend's info + score
  const friends = await Promise.all(
    accepted.map(async (req) => {
      const friend =
        req.requesterId === userId ? req.recipient : req.requester;
      const stats = await computeSevenDayScore(friend.id);
      return {
        requestId: req.id,
        id: friend.id,
        name: friend.name,
        email: friend.email,
        ...stats,
      };
    })
  );

  return NextResponse.json({
    friends,
    pendingReceived,
    pendingSent,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "No user found with that email address." },
        { status: 404 }
      );
    }

    if (targetUser.id === userId) {
      return NextResponse.json(
        { error: "You can't add yourself as a friend." },
        { status: 400 }
      );
    }

    // Check for existing relationship
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { requesterId: userId, recipientId: targetUser.id },
          { requesterId: targetUser.id, recipientId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json(
          { error: "You are already friends with this user." },
          { status: 409 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "A friend request already exists with this user." },
          { status: 409 }
        );
      }
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        requesterId: userId,
        recipientId: targetUser.id,
        status: "pending",
      },
    });

    return NextResponse.json(friendRequest, { status: 201 });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
