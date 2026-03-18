"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const today = format(new Date(), "yyyy-MM-dd");
  const [goals, setGoals] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  function updateGoal(index: number, value: string) {
    setGoals((prev) => prev.map((g, i) => (i === index ? value : g)));
  }

  function addGoalField() {
    setGoals((prev) => [...prev, ""]);
  }

  function removeGoalField(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validGoals = goals.map((g) => g.trim()).filter(Boolean);

    if (validGoals.length === 0) {
      toast.error("Add at least one goal to get started.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        validGoals.map((title) =>
          fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, date: today }),
          })
        )
      );
      toast.success("Goals set! Time to lock in.");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs tracking-widest text-zinc-500 uppercase font-mono mb-3">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-2">
            Welcome, {firstName}.
          </h1>
          <p className="text-zinc-400 text-sm">
            Set your goals for today and start locking in.
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6">
          <p className="text-xs tracking-widest text-zinc-500 uppercase mb-4">
            Today&apos;s Goals
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-shrink-0 w-4 h-4 border border-zinc-600 rounded-none" />
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    placeholder={
                      index === 0
                        ? "e.g. Complete project proposal"
                        : "Another goal..."
                    }
                    autoFocus={index === goals.length - 1 && index > 0}
                    className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoalField(index)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 flex-shrink-0 text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addGoalField}
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors flex items-center gap-1.5"
            >
              + Add another goal
            </button>

            <button
              type="submit"
              disabled={saving || goals.every((g) => !g.trim())}
              className="w-full bg-white text-zinc-950 disabled:bg-zinc-400 disabled:cursor-not-allowed font-semibold py-2.5 rounded-sm transition-colors text-sm mt-2 hover:bg-zinc-200"
            >
              {saving ? "Saving..." : "Lock In"}
            </button>
          </form>
        </div>

        <button
          onClick={handleSkip}
          className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs mt-4 transition-colors underline underline-offset-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
