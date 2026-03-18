import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  score: number;
  goalsSet: number;
  goalsCompleted: number;
  rank: number;
  isCurrentUser: boolean;
}

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

  // Get all accepted friend relationships
  const acceptedRequests = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  // Collect unique participants (user + all friends)
  const participantMap = new Map<
    string,
    { id: string; name: string; email: string }
  >();

  // Always include current user
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (currentUser) {
    participantMap.set(currentUser.id, currentUser);
  }

  for (const req of acceptedRequests) {
    const friend =
      req.requesterId === userId ? req.recipient : req.requester;
    participantMap.set(friend.id, friend);
  }

  // Compute scores for all participants
  const entries = await Promise.all(
    Array.from(participantMap.values()).map(async (user) => {
      const stats = await computeSevenDayScore(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        ...stats,
        isCurrentUser: user.id === userId,
      };
    })
  );

  // Sort descending by score
  entries.sort((a, b) => b.score - a.score);

  // Add rank
  const ranked: LeaderboardEntry[] = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return NextResponse.json(ranked);
}
