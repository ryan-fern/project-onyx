"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  format,
  addMonths,
  startOfMonth,
  getDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

type GoalFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

interface Goal {
  id: string;
  title: string;
  active: boolean;
  frequency: GoalFrequency;
  completed: boolean;
}

interface CalendarDay {
  date: string;
  completed: number;
  total: number;
  score: number | null;
  isFuture: boolean;
}

const TAB_LABELS: Record<GoalFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const TAB_PLACEHOLDERS: Record<GoalFrequency, string> = {
  DAILY: "What do you want to accomplish every day?",
  WEEKLY: "What do you want to accomplish this week?",
  MONTHLY: "What do you want to accomplish this month?",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const today = format(new Date(), "yyyy-MM-dd");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState<GoalFrequency>("DAILY");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [addingGoal, setAddingGoal] = useState(false);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<CalendarDay | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    try {
      const res = await fetch(`/api/goals?date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch goals");
      const data: Goal[] = await res.json();
      setGoals(data);
    } catch {
      toast.error("Failed to load goals.");
    } finally {
      setLoadingGoals(false);
    }
  }, [today]);

  const fetchCalendar = useCallback(async (month: Date) => {
    setCalendarLoading(true);
    try {
      const res = await fetch(`/api/profile?month=${format(month, "yyyy-MM")}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCalendarDays(data.days);
    } catch {
      // silent — calendar is non-critical
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGoals();
      fetchCalendar(calendarMonth);
    }
  }, [status, fetchGoals, fetchCalendar, calendarMonth]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;

    setAddingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, frequency: activeTab }),
      });
      if (!res.ok) throw new Error("Failed to add goal");
      setNewGoalTitle("");
      toast.success("Goal added.");
      fetchGoals();
      fetchCalendar(calendarMonth);
    } catch {
      toast.error("Failed to add goal.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleToggle(goal: Goal) {
    const newCompleted = !goal.completed;
    const optimistic = goals.map((g) =>
      g.id === goal.id ? { ...g, completed: newCompleted } : g
    );
    setGoals(optimistic);

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, completed: newCompleted }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      toast.success(newCompleted ? "Goal completed!" : "Goal unchecked.");
      fetchCalendar(calendarMonth);
    } catch {
      setGoals(goals); // revert
      toast.error("Failed to update goal.");
    }
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditingTitle(goal.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function handleRename(goalId: string) {
    const trimmed = editingTitle.trim();
    if (!trimmed) { cancelEdit(); return; }
    const prev = goals;
    setGoals((g) => g.map((x) => x.id === goalId ? { ...x, title: trimmed } : x));
    setEditingId(null);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setGoals(prev);
      toast.error("Failed to rename goal.");
    }
  }

  async function handleDelete(goalId: string) {
    const prev = goals;
    setGoals((g) => g.filter((x) => x.id !== goalId));

    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      toast.success("Goal removed.");
      fetchCalendar(calendarMonth);
    } catch {
      setGoals(prev);
      toast.error("Failed to delete goal.");
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono">Loading...</div>
      </div>
    );
  }

  const tabGoals = goals.filter((g) => g.frequency === activeTab);
  const totalGoals = tabGoals.length;
  const completedGoals = tabGoals.filter((g) => g.completed).length;
  const score =
    totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const scoreColor =
    score >= 80
      ? "text-emerald-400"
      : score >= 50
        ? "text-yellow-400"
        : score > 0
          ? "text-red-400"
          : "text-zinc-500";

  const barColor =
    score >= 80
      ? "bg-emerald-400"
      : score >= 50
        ? "bg-yellow-500"
        : score > 0
          ? "bg-red-500"
          : "bg-zinc-700";

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const periodLabel: Record<GoalFrequency, string> = {
    DAILY: format(new Date(), "EEEE, MMMM d"),
    WEEKLY: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`,
    MONTHLY: format(new Date(), "MMMM yyyy"),
  };

  const scoreCardTitle: Record<GoalFrequency, string> = {
    DAILY: "Lock-In Score",
    WEEKLY: "Weekly Progress",
    MONTHLY: "Monthly Progress",
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Frequency tabs */}
        <div className="mb-6 flex items-center gap-1">
          {(["DAILY", "WEEKLY", "MONTHLY"] as GoalFrequency[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors rounded-none ${
                activeTab === tab
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Period label */}
        <div className="mb-8">
          <p className="text-xs tracking-widest text-zinc-600 uppercase font-mono mb-1">
            {activeTab === "DAILY" ? "Today" : activeTab === "WEEKLY" ? "This Week" : "This Month"}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">
            {periodLabel[activeTab]}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">
          {/* Left column: score + goals */}
          <div className="lg:col-span-2 space-y-0">
            {/* Score card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 mb-px">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">
                    {scoreCardTitle[activeTab]}
                  </p>
                  <div className={`text-5xl font-bold tracking-tight ${scoreColor}`}>
                    {score}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-300 text-lg font-bold font-mono">
                    {completedGoals}
                    <span className="text-zinc-600 font-normal">/{totalGoals}</span>
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5 uppercase tracking-wide">goals complete</p>
                </div>
              </div>

              <div className="w-full bg-zinc-800 rounded-none h-1 overflow-hidden">
                <div
                  className={`h-1 rounded-none transition-all duration-700 ${barColor}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {totalGoals === 0 && (
                <p className="text-zinc-600 text-xs mt-3">
                  No {TAB_LABELS[activeTab].toLowerCase()} goals yet — add one below.
                </p>
              )}
            </div>

            {/* Add Goal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 mb-px">
              <p className="text-xs tracking-widest text-zinc-500 uppercase mb-4">
                Add a {TAB_LABELS[activeTab]} Goal
              </p>
              <form onSubmit={handleAddGoal} className="flex gap-3">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder={TAB_PLACEHOLDERS[activeTab]}
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingGoal || !newGoalTitle.trim()}
                  className="bg-white text-zinc-950 disabled:bg-zinc-400 disabled:cursor-not-allowed font-semibold px-5 py-2 rounded-sm text-sm transition-colors whitespace-nowrap hover:bg-zinc-200"
                >
                  {addingGoal ? "Adding..." : "Add Goal"}
                </button>
              </form>
            </div>

            {/* Goals list */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <p className="text-xs tracking-widest text-zinc-500 uppercase">
                  {totalGoals === 0 ? `${TAB_LABELS[activeTab]} Goals` : `${TAB_LABELS[activeTab]} Goals (${totalGoals})`}
                </p>
                {totalGoals > 0 && completedGoals < totalGoals && (
                  <p className="text-xs text-zinc-600 font-mono">
                    Check off each goal to track progress
                  </p>
                )}
              </div>

              {loadingGoals ? (
                <div className="text-zinc-600 text-sm py-6 text-center font-mono">
                  Loading goals...
                </div>
              ) : tabGoals.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <p className="text-zinc-500 text-sm">
                    No {TAB_LABELS[activeTab].toLowerCase()} goals yet. Add one above.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {tabGoals.map((goal) => (
                    <li
                      key={goal.id}
                      className={`flex items-center gap-4 px-6 py-4 transition-all group ${
                        goal.completed ? "" : "hover:bg-zinc-800/20"
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(goal)}
                        aria-label={goal.completed ? "Mark incomplete" : "Mark complete"}
                        className={`flex-shrink-0 w-6 h-6 border-2 flex items-center justify-center transition-all rounded-none ${
                          goal.completed
                            ? "bg-emerald-400 border-emerald-400"
                            : "border-zinc-500 hover:border-zinc-200 hover:bg-zinc-800"
                        }`}
                      >
                        {goal.completed && (
                          <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {editingId === goal.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleRename(goal.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(goal.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 bg-zinc-950 border border-zinc-600 text-zinc-50 rounded-sm px-2 py-0.5 text-sm focus:outline-none focus:border-zinc-400"
                        />
                      ) : (
                        <span
                          className={`flex-1 text-sm transition-all ${
                            goal.completed
                              ? "line-through text-zinc-500"
                              : "text-zinc-100"
                          }`}
                        >
                          {goal.title}
                        </span>
                      )}

                      {editingId !== goal.id && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                          <button
                            onClick={() => startEdit(goal)}
                            className="text-zinc-600 hover:text-zinc-300 text-xs px-1 font-mono"
                            aria-label="Edit goal"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="text-zinc-600 hover:text-red-400 text-sm px-1"
                            aria-label="Delete goal"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: calendar */}
          <div className="mt-6 lg:mt-0">
            <div className="bg-zinc-900 border border-zinc-800">
              {/* Month nav */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <button
                  onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                  className="text-zinc-400 hover:text-zinc-100 text-xs font-mono px-2 py-1 border border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  ←
                </button>
                <span className="text-zinc-300 text-xs font-mono uppercase tracking-widest">
                  {format(calendarMonth, "MMM yyyy")}
                </span>
                <button
                  onClick={() => {
                    const next = addMonths(calendarMonth, 1);
                    if (next <= new Date()) setCalendarMonth(next);
                  }}
                  disabled={addMonths(calendarMonth, 1) > new Date()}
                  className="text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 disabled:cursor-not-allowed text-xs font-mono px-2 py-1 border border-zinc-800 hover:border-zinc-600 disabled:border-zinc-900 transition-colors"
                >
                  →
                </button>
              </div>

              <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center text-zinc-700 text-xs font-mono py-1">{d}</div>
                  ))}
                </div>

                {calendarLoading ? (
                  <div className="text-center py-8 text-zinc-700 text-xs font-mono">Loading...</div>
                ) : (
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: getDay(startOfMonth(calendarMonth)) }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}
                    {calendarDays.map((day) => {
                      const dayNum = parseInt(day.date.split("-")[2]);
                      const isToday = day.date === today;
                      const bg =
                        day.isFuture || day.score === null ? "bg-zinc-900 border-zinc-800" :
                        day.score >= 80 ? "bg-emerald-500 border-emerald-400" :
                        day.score >= 50 ? "bg-yellow-500 border-yellow-400" :
                        day.score > 0  ? "bg-red-500 border-red-400" :
                        "bg-zinc-800 border-zinc-700";
                      const text =
                        day.isFuture || day.score === null ? "text-zinc-700" :
                        day.score === 0 ? "text-zinc-500" : "text-zinc-950";

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`aspect-square flex items-center justify-center border text-xs font-mono cursor-default transition-opacity ${bg} ${text} ${isToday ? "ring-1 ring-white ring-offset-1 ring-offset-zinc-900" : ""}`}
                        >
                          {dayNum}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hover tooltip */}
                <div className="mt-3 h-6 flex items-center">
                  {hoveredDay && !hoveredDay.isFuture && hoveredDay.score !== null ? (
                    <p className="text-xs font-mono text-zinc-400">
                      <span className="text-zinc-200">{format(parseISO(hoveredDay.date), "MMM d")}</span>
                      {" — "}
                      {hoveredDay.completed}/{hoveredDay.total}
                      {" — "}
                      <span className={
                        hoveredDay.score >= 80 ? "text-emerald-400" :
                        hoveredDay.score >= 50 ? "text-yellow-400" :
                        hoveredDay.score > 0 ? "text-red-400" : "text-zinc-500"
                      }>{hoveredDay.score}%</span>
                    </p>
                  ) : (
                    <p className="text-xs font-mono text-zinc-700">Hover a day for details</p>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-800 flex-wrap">
                {[
                  { color: "bg-emerald-500", label: "≥80%" },
                  { color: "bg-yellow-500", label: "50–79%" },
                  { color: "bg-red-500", label: "<50%" },
                  { color: "bg-zinc-800", label: "0%" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 ${color}`} />
                    <span className="text-zinc-600 text-xs font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
