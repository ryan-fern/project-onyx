"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, addMonths, subMonths, parseISO, startOfMonth, getDay } from "date-fns";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

interface DayData {
  date: string;
  completed: number;
  total: number;
  score: number | null;
  isFuture: boolean;
}

function scoreToColor(score: number | null, isFuture: boolean): string {
  if (isFuture || score === null) return "bg-zinc-900 border-zinc-800";
  if (score === 0) return "bg-zinc-800 border-zinc-700";
  if (score >= 80) return "bg-emerald-500 border-emerald-400";
  if (score >= 50) return "bg-yellow-500 border-yellow-400";
  return "bg-red-500 border-red-400";
}

function scoreToTextColor(score: number | null, isFuture: boolean): string {
  if (isFuture || score === null) return "text-zinc-700";
  if (score === 0) return "text-zinc-500";
  return "text-zinc-950";
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchMonth = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const monthStr = format(month, "yyyy-MM");
      const res = await fetch(`/api/profile?month=${monthStr}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDays(data.days);
    } catch {
      toast.error("Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchMonth(currentMonth);
  }, [status, currentMonth, fetchMonth]);

  function prevMonth() {
    setCurrentMonth((m) => subMonths(m, 1));
  }

  function nextMonth() {
    const next = addMonths(currentMonth, 1);
    if (next <= new Date()) setCurrentMonth(next);
  }

  const isNextDisabled = addMonths(currentMonth, 1) > new Date();

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono">Loading...</div>
      </div>
    );
  }

  // Offset: how many blank cells before day 1
  const firstDayOfWeek = getDay(startOfMonth(currentMonth)); // 0=Sun

  // Stats for this month
  const activeDays = days.filter((d) => d.score !== null && !d.isFuture);
  const greenDays = activeDays.filter((d) => d.score !== null && d.score >= 80).length;
  const yellowDays = activeDays.filter((d) => d.score !== null && d.score >= 50 && d.score < 80).length;
  const redDays = activeDays.filter((d) => d.score !== null && d.score > 0 && d.score < 50).length;
  const missedDays = activeDays.filter((d) => d.score === 0).length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs tracking-widest text-zinc-500 uppercase font-mono mb-1">Profile</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">{session?.user?.name}</h1>
          <p className="text-zinc-600 text-sm font-mono">{session?.user?.email}</p>
        </div>

        {/* Calendar card */}
        <div className="bg-zinc-900 border border-zinc-800">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <button
              onClick={prevMonth}
              className="text-zinc-400 hover:text-zinc-100 text-sm font-mono transition-colors px-2 py-1 border border-zinc-800 hover:border-zinc-600"
            >
              ←
            </button>
            <span className="text-zinc-50 text-sm font-mono uppercase tracking-widest">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={nextMonth}
              disabled={isNextDisabled}
              className="text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 disabled:cursor-not-allowed text-sm font-mono transition-colors px-2 py-1 border border-zinc-800 hover:border-zinc-600 disabled:border-zinc-900"
            >
              →
            </button>
          </div>

          <div className="p-6">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="text-center text-xs font-mono uppercase tracking-widest text-zinc-600 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="text-center py-12 text-zinc-600 text-sm font-mono">Loading...</div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Blank offset cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const dayNum = parseInt(day.date.split("-")[2]);
                  const isToday = day.date === format(new Date(), "yyyy-MM-dd");
                  const colorClass = scoreToColor(day.score, day.isFuture);
                  const textClass = scoreToTextColor(day.score, day.isFuture);

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`
                        relative aspect-square flex items-center justify-center border text-xs font-mono
                        transition-opacity cursor-default
                        ${colorClass} ${textClass}
                        ${isToday ? "ring-1 ring-white ring-offset-1 ring-offset-zinc-900" : ""}
                      `}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tooltip */}
            <div className="mt-4 h-8 flex items-center">
              {hoveredDay && !hoveredDay.isFuture && hoveredDay.score !== null ? (
                <div className="text-xs font-mono text-zinc-400">
                  <span className="text-zinc-200">{format(parseISO(hoveredDay.date), "MMM d")}</span>
                  {" — "}
                  <span>{hoveredDay.completed}/{hoveredDay.total} goals</span>
                  {" — "}
                  <span className={
                    hoveredDay.score >= 80 ? "text-emerald-400" :
                    hoveredDay.score >= 50 ? "text-yellow-400" :
                    hoveredDay.score > 0 ? "text-red-400" : "text-zinc-500"
                  }>
                    {hoveredDay.score}%
                  </span>
                </div>
              ) : hoveredDay?.isFuture ? (
                <div className="text-xs font-mono text-zinc-600">Future</div>
              ) : (
                <div className="text-xs font-mono text-zinc-700">Hover over a day to see details</div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 px-1">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mr-2">Legend</p>
          {[
            { color: "bg-emerald-500", label: "≥ 80%" },
            { color: "bg-yellow-500", label: "50–79%" },
            { color: "bg-red-500", label: "< 50%" },
            { color: "bg-zinc-800", label: "0%" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 ${color}`} />
              <span className="text-xs font-mono text-zinc-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Monthly stats */}
        {!loading && activeDays.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 mt-4">
            <div className="px-6 py-4 border-b border-zinc-800">
              <p className="text-xs tracking-widest text-zinc-500 uppercase font-mono">
                {format(currentMonth, "MMMM")} Summary
              </p>
            </div>
            <div className="divide-y divide-zinc-800">
              {[
                { label: "Locked in (≥ 80%)", value: greenDays, color: "text-emerald-400" },
                { label: "Solid (50–79%)", value: yellowDays, color: "text-yellow-400" },
                { label: "Weak (< 50%)", value: redDays, color: "text-red-400" },
                { label: "Missed (0%)", value: missedDays, color: "text-zinc-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center px-6 py-3">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
                  <span className={`text-sm font-bold font-mono ${color}`}>{value} {value === 1 ? "day" : "days"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
