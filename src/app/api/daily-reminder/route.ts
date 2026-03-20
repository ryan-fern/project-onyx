import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendDailyReminder } from "@/lib/email";

// Vercel Cron calls this as GET with Authorization: Bearer CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "";

  // Get all users who have at least one active goal
  const users = await prisma.user.findMany({
    where: {
      goals: {
        some: { active: true },
      },
    },
    select: { id: true, name: true, email: true },
  });

  let emailsSent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      await sendDailyReminder(user.email, user.name, appUrl);
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send daily reminder to ${user.email}:`, err);
      errors.push(user.email);
    }
  }

  return NextResponse.json({
    emailsSent,
    totalUsers: users.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
