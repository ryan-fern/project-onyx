"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

interface Goal {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

interface DayBar {
  date: string;
  label: string;
  score: number;
  set: number;
  completed: number;
}

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-green-500"
      : value >= 50
        ? "bg-yellow-500"
        : value > 0
          ? "bg-red-500"
          : "bg-zinc-700";

  return (
    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate] = useState(today);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [addingGoal, setAddingGoal] = useState(false);
  const [weekBars, setWeekBars] = useState<DayBar[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchGoals = useCallback(
    async (date: string) => {
      setLoadingGoals(true);
      try {
        const res = await fetch(`/api/goals?date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch goals");
        const data: Goal[] = await res.json();
        setGoals(data);
      } catch {
        toast.error("Failed to load goals.");
      } finally {
        setLoadingGoals(false);
      }
    },
    []
  );

  const fetchWeekBars = useCallback(async () => {
    const days: DayBar[] = [];
    const fetches = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, "yyyy-MM-dd");
      const label = format(d, "EEE");
      return fetch(`/api/goals?date=${dateStr}`)
        .then((r) => r.json())
        .then((goalsForDay: Goal[]) => {
          const set = goalsForDay.length;
          const completed = goalsForDay.filter((g) => g.completed).length;
          const score = set > 0 ? Math.round((completed / set) * 100) : 0;
          days.push({ date: dateStr, label, score, set, completed });
        })
        .catch(() => {
          days.push({ date: dateStr, label, score: 0, set: 0, completed: 0 });
        });
    });
    await Promise.all(fetches);
    days.sort((a, b) => a.date.localeCompare(b.date));
    setWeekBars(days);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGoals(selectedDate);
      fetchWeekBars();
    }
  }, [status, selectedDate, fetchGoals, fetchWeekBars]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;

    setAddingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: selectedDate }),
      });
      if (!res.ok) throw new Error("Failed to add goal");
      const created: Goal = await res.json();
      setGoals((prev) => [...prev, created]);
      setNewGoalTitle("");
      toast.success("Goal added.");
      fetchWeekBars();
    } catch {
      toast.error("Failed to add goal.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleToggle(goal: Goal) {
    const optimistic = goals.map((g) =>
      g.id === goal.id ? { ...g, completed: !g.completed } : g
    );
    setGoals(optimistic);

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !goal.completed }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      const updated: Goal = await res.json();
      setGoals((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g))
      );
      toast.success(updated.completed ? "Goal completed! 🔥" : "Goal unchecked.");
      fetchWeekBars();
    } catch {
      setGoals(goals); // revert
      toast.error("Failed to update goal.");
    }
  }

  async function handleDelete(goalId: string) {
    const prev = goals;
    setGoals((g) => g.filter((x) => x.id !== goalId));

    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      toast.success("Goal removed.");
      fetchWeekBars();
    } catch {
      setGoals(prev);
      toast.error("Failed to delete goal.");
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const score =
    totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const scoreColor =
    score >= 80
      ? "text-green-400"
      : score >= 50
        ? "text-yellow-400"
        : score > 0
          ? "text-red-400"
          : "text-zinc-500";

  const barColor =
    score >= 80
      ? "bg-green-500"
      : score >= 50
        ? "bg-yellow-500"
        : score > 0
          ? "bg-red-500"
          : "bg-zinc-700";

  const todayLabel = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Date header */}
        <div className="mb-8">
          <p className="text-zinc-500 text-sm mb-1">Today</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            {todayLabel}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: score + goals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lock-In Score card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Lock-In Score</p>
                  <div className={`text-5xl font-bold tracking-tight ${scoreColor}`}>
                    {score}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-300 text-lg font-bold">
                    {completedGoals}
                    <span className="text-zinc-500 font-normal">/{totalGoals}</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5">goals complete</p>
                </div>
              </div>

              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {totalGoals === 0 && (
                <p className="text-zinc-500 text-sm mt-3">
                  No goals set yet — add your first goal below.
                </p>
              )}
            </div>

            {/* Add Goal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
                Add a Goal
              </h2>
              <form onSubmit={handleAddGoal} className="flex gap-3">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="What do you want to accomplish today?"
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={addingGoal || !newGoalTitle.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap"
                >
                  {addingGoal ? "Adding..." : "Add Goal"}
                </button>
              </form>
            </div>

            {/* Goals list */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
                {totalGoals === 0 ? "Goals" : `Goals (${totalGoals})`}
              </h2>

              {loadingGoals ? (
                <div className="text-zinc-500 text-sm py-4 text-center">
                  Loading goals...
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-zinc-400 text-sm">
                    No goals for today yet. Add one above!
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {goals.map((goal) => (
                    <li
                      key={goal.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                        goal.completed
                          ? "bg-green-950/20 border border-green-900/30"
                          : "bg-zinc-950/50 border border-zinc-800/50"
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(goal)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          goal.completed
                            ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            : "border-zinc-600 hover:border-indigo-400"
                        }`}
                      >
                        {goal.completed && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>

                      <span
                        className={`flex-1 text-sm transition-all ${
                          goal.completed
                            ? "line-through text-zinc-500"
                            : "text-zinc-100"
                        }`}
                      >
                        {goal.title}
                      </span>

                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1 rounded"
                        aria-label="Delete goal"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: weekly summary */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
                Last 7 Days
              </h2>

              {weekBars.length === 0 ? (
                <div className="text-zinc-500 text-sm">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {weekBars.map((day) => {
                    const isToday = day.date === today;
                    const barCol =
                      day.score >= 80
                        ? "bg-green-500"
                        : day.score >= 50
                          ? "bg-yellow-500"
                          : day.score > 0
                            ? "bg-red-500"
                            : "bg-zinc-700";

                    return (
                      <div key={day.date} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-medium ${
                              isToday ? "text-indigo-400" : "text-zinc-400"
                            }`}
                          >
                            {day.label}
                            {isToday && (
                              <span className="ml-1 text-zinc-500">(today)</span>
                            )}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {day.set > 0 ? `${day.score}%` : "—"}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${barCol}`}
                            style={{ width: `${day.score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
                7-Day Stats
              </h2>
              {weekBars.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Avg score</span>
                    <span className="text-zinc-50 text-sm font-bold">
                      {weekBars.filter((d) => d.set > 0).length > 0
                        ? Math.round(
                            weekBars
                              .filter((d) => d.set > 0)
                              .reduce((sum, d) => sum + d.score, 0) /
                              weekBars.filter((d) => d.set > 0).length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Active days</span>
                    <span className="text-zinc-50 text-sm font-bold">
                      {weekBars.filter((d) => d.set > 0).length}/7
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Goals done</span>
                    <span className="text-zinc-50 text-sm font-bold">
                      {weekBars.reduce((sum, d) => sum + d.completed, 0)}/
                      {weekBars.reduce((sum, d) => sum + d.set, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
