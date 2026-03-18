import { Resend } from "resend";

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  goalsSet: number;
  goalsCompleted: number;
  dailyBreakdown: Array<{
    date: string;
    set: number;
    completed: number;
    score: number;
  }>;
  leaderboardPosition: number;
  totalParticipants: number;
}

export async function sendWeeklyReport(
  to: string,
  name: string,
  data: WeeklyReportData
): Promise<void> {
  const scoreColor =
    data.overallScore >= 80
      ? "#22c55e"
      : data.overallScore >= 50
        ? "#eab308"
        : "#ef4444";

  const dailyRowsHtml = data.dailyBreakdown
    .map((day) => {
      const dayScoreColor =
        day.score >= 80
          ? "#22c55e"
          : day.score >= 50
            ? "#eab308"
            : "#ef4444";

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 14px;">${day.date}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #fafafa; text-align: center; font-size: 14px;">${day.set}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #fafafa; text-align: center; font-size: 14px;">${day.completed}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: ${dayScoreColor}; text-align: center; font-size: 14px; font-weight: bold;">${day.score}%</td>
        </tr>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Lock-In Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px; text-align: center;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-size: 32px; padding-right: 8px;">🔒</td>
                  <td style="color: #fafafa; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">Lock In Tracker</td>
                </tr>
              </table>
              <p style="color: #a1a1aa; font-size: 14px; margin: 8px 0 0 0;">Weekly Lock-In Report 🔒</p>
              <p style="color: #71717a; font-size: 13px; margin: 4px 0 0 0;">${data.weekStart} – ${data.weekEnd}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="color: #fafafa; font-size: 16px; margin: 0;">Hey ${name},</p>
              <p style="color: #a1a1aa; font-size: 14px; margin: 8px 0 0 0;">Here's your weekly lock-in summary. Keep pushing.</p>
            </td>
          </tr>

          <!-- Overall Score Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="color: #a1a1aa; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Overall Lock-In Score</p>
                    <p style="color: ${scoreColor}; font-size: 56px; font-weight: bold; margin: 0; line-height: 1;">${data.overallScore}%</p>
                    <p style="color: #71717a; font-size: 14px; margin: 12px 0 0 0;">${data.goalsCompleted} of ${data.goalsSet} goals completed</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Leaderboard Position -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #a1a1aa; font-size: 14px;">Leaderboard Position</td>
                        <td style="text-align: right;">
                          <span style="color: #818cf8; font-size: 18px; font-weight: bold;">#${data.leaderboardPosition}</span>
                          <span style="color: #71717a; font-size: 13px;"> of ${data.totalParticipants}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Daily Breakdown -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 24px 0 24px;">
                    <p style="color: #fafafa; font-size: 15px; font-weight: bold; margin: 0 0 16px 0;">Daily Breakdown</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr style="background-color: #09090b;">
                        <th style="padding: 8px 12px; color: #71717a; font-size: 12px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
                        <th style="padding: 8px 12px; color: #71717a; font-size: 12px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Set</th>
                        <th style="padding: 8px 12px; color: #71717a; font-size: 12px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Done</th>
                        <th style="padding: 8px 12px; color: #71717a; font-size: 12px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Score</th>
                      </tr>
                      ${dailyRowsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-bottom: 32px; text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: bold; padding: 12px 28px; border-radius: 9999px; text-decoration: none;">Open Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #27272a; padding-top: 24px; text-align: center;">
              <p style="color: #52525b; font-size: 12px; margin: 0;">You're receiving this because you have an account on Lock In Tracker.</p>
              <p style="color: #52525b; font-size: 12px; margin: 4px 0 0 0;">To stop receiving these emails, update your notification settings in the app.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@lockintracker.com",
    to,
    subject: `Your Weekly Lock-In Report: ${data.overallScore}% locked in 🔒`,
    html,
  });
}
