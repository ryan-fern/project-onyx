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
  active: boolean;
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
      ? "bg-emerald-400"
      : value >= 50
        ? "bg-yellow-500"
        : value > 0
          ? "bg-red-500"
          : "bg-zinc-700";

  return (
    <div className="w-full bg-zinc-800 rounded-none h-1 overflow-hidden">
      <div
        className={`h-1 rounded-none transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const today = format(new Date(), "yyyy-MM-dd");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [addingGoal, setAddingGoal] = useState(false);
  const [weekBars, setWeekBars] = useState<DayBar[]>([]);
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
      fetchGoals();
      fetchWeekBars();
    }
  }, [status, fetchGoals, fetchWeekBars]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;

    setAddingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to add goal");
      setNewGoalTitle("");
      toast.success("Goal added.");
      fetchGoals();
      fetchWeekBars();
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
      fetchWeekBars();
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
      fetchWeekBars();
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

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;
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

  const todayLabel = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Date header */}
        <div className="mb-8">
          <p className="text-xs tracking-widest text-zinc-600 uppercase font-mono mb-1">Today</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">
            {todayLabel}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">
          {/* Left column: score + goals */}
          <div className="lg:col-span-2 space-y-0">
            {/* Lock-In Score card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 mb-px">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">Lock-In Score</p>
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
                  No goals set yet — add your first goal below.
                </p>
              )}
            </div>

            {/* Add Goal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 mb-px">
              <p className="text-xs tracking-widest text-zinc-500 uppercase mb-4">Add a Goal</p>
              <form onSubmit={handleAddGoal} className="flex gap-3">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="What do you want to accomplish every day?"
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
              <div className="px-6 py-4 border-b border-zinc-800">
                <p className="text-xs tracking-widest text-zinc-500 uppercase">
                  {totalGoals === 0 ? "Goals" : `Goals (${totalGoals})`}
                </p>
              </div>

              {loadingGoals ? (
                <div className="text-zinc-600 text-sm py-6 text-center font-mono">
                  Loading goals...
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <p className="text-zinc-500 text-sm">
                    No goals yet. Add a recurring daily goal above.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {goals.map((goal) => (
                    <li
                      key={goal.id}
                      className={`flex items-center gap-3 px-6 py-3 transition-all group ${
                        goal.completed ? "" : "hover:bg-zinc-800/20"
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(goal)}
                        className={`flex-shrink-0 w-4 h-4 border flex items-center justify-center transition-all rounded-none ${
                          goal.completed
                            ? "bg-emerald-400 border-emerald-400"
                            : "border-zinc-600 hover:border-zinc-400"
                        }`}
                      >
                        {goal.completed && (
                          <svg className="w-2.5 h-2.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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

          {/* Right column: weekly summary */}
          <div className="space-y-0 mt-6 lg:mt-0">
            <div className="bg-zinc-900 border border-zinc-800 rounded-none mb-px">
              <div className="px-6 py-4 border-b border-zinc-800">
                <p className="text-xs tracking-widest text-zinc-500 uppercase">Last 7 Days</p>
              </div>

              <div className="p-6">
                {weekBars.length === 0 ? (
                  <div className="text-zinc-600 text-sm font-mono">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    {weekBars.map((day) => {
                      const isToday = day.date === today;
                      const barCol =
                        day.score >= 80
                          ? "bg-emerald-400"
                          : day.score >= 50
                            ? "bg-yellow-500"
                            : day.score > 0
                              ? "bg-red-500"
                              : "bg-zinc-700";

                      return (
                        <div key={day.date} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-mono uppercase tracking-wide ${
                                isToday ? "text-emerald-400" : "text-zinc-500"
                              }`}
                            >
                              {day.label}
                              {isToday && (
                                <span className="ml-1 text-zinc-600 normal-case tracking-normal">(today)</span>
                              )}
                            </span>
                            <span className="text-xs text-zinc-600 font-mono">
                              {day.set > 0 ? `${day.score}%` : "—"}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-none h-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-none transition-all duration-500 ${barCol}`}
                              style={{ width: `${day.score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-none">
              <div className="px-6 py-4 border-b border-zinc-800">
                <p className="text-xs tracking-widest text-zinc-500 uppercase">7-Day Stats</p>
              </div>
              {weekBars.length > 0 && (
                <div className="divide-y divide-zinc-800">
                  <div className="flex justify-between items-center px-6 py-3">
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Avg score</span>
                    <span className="text-zinc-100 text-sm font-bold font-mono">
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
                  <div className="flex justify-between items-center px-6 py-3">
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Active days</span>
                    <span className="text-zinc-100 text-sm font-bold font-mono">
                      {weekBars.filter((d) => d.set > 0).length}/7
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-6 py-3">
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Goals done</span>
                    <span className="text-zinc-100 text-sm font-bold font-mono">
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
