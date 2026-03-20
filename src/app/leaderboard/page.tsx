"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

interface StreakEntry {
  id: string;
  name: string;
  email: string;
  streak: number;
  rank: number;
  isCurrentUser: boolean;
}

interface PercentageEntry {
  id: string;
  name: string;
  email: string;
  score: number;
  locked: boolean;
  daysUntilUnlock: number;
  goalsSet: number;
  goalsCompleted: number;
  rank: number;
  isCurrentUser: boolean;
}

type Tab = "streak" | "percentage";

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("streak");
  const [streakEntries, setStreakEntries] = useState<StreakEntry[]>([]);
  const [pctEntries, setPctEntries] = useState<PercentageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchLeaderboard = useCallback(async (type: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${type}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (type === "streak") setStreakEntries(data);
      else setPctEntries(data);
    } catch {
      toast.error("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchLeaderboard("streak");
    fetchLeaderboard("percentage");
  }, [status, fetchLeaderboard]);

  function handleTabChange(t: Tab) {
    setTab(t);
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xs tracking-widest text-zinc-50 uppercase font-mono font-bold mb-4">
            Leaderboard
          </h1>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => handleTabChange("streak")}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                tab === "streak"
                  ? "border-white text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Streaks
            </button>
            <button
              onClick={() => handleTabChange("percentage")}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                tab === "percentage"
                  ? "border-white text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              % Score
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-500 text-sm font-mono">
            Loading...
          </div>
        ) : tab === "streak" ? (
          <StreakLeaderboard entries={streakEntries} />
        ) : (
          <PercentageLeaderboard entries={pctEntries} currentUserId={session?.user?.id} />
        )}

        <p className="text-zinc-700 text-xs mt-4 font-mono">
          {tab === "streak"
            ? "Streak = consecutive days with 100% of goals completed."
            : "% Score = goals completed / goals set over trailing 7 days. Unlocks after 7 days of use."}
        </p>
      </main>
    </div>
  );
}

function StreakLeaderboard({ entries }: { entries: StreakEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-500 text-sm">
        No data yet.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {entries.map((entry) => {
          const streakColor =
            entry.streak >= 7
              ? "text-emerald-400"
              : entry.streak >= 3
                ? "text-yellow-400"
                : entry.streak > 0
                  ? "text-zinc-100"
                  : "text-zinc-600";

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-6 py-4 ${
                entry.isCurrentUser
                  ? "border-l-2 border-l-emerald-400"
                  : "hover:bg-zinc-800/30"
              }`}
            >
              <div className="w-8 flex-shrink-0">
                <span className="text-zinc-500 text-sm font-mono">#{entry.rank}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold truncate ${entry.isCurrentUser ? "text-emerald-400" : "text-zinc-100"}`}>
                    {entry.name}
                  </span>
                  {entry.isCurrentUser && (
                    <span className="text-zinc-500 text-xs border border-zinc-700 px-1.5 py-0.5 font-mono uppercase tracking-wide flex-shrink-0">
                      you
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 text-xs font-mono mt-0.5">{entry.email}</p>
              </div>

              <div className={`text-right flex-shrink-0 ${streakColor}`}>
                <div className="text-2xl font-bold font-mono">{entry.streak}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">
                  {entry.streak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PercentageLeaderboard({
  entries,
  currentUserId,
}: {
  entries: PercentageEntry[];
  currentUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-500 text-sm">
        No data yet.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {entries.map((entry) => {
          const isCurrentUser = entry.id === currentUserId;

          if (entry.locked) {
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-6 py-4 opacity-50 ${
                  isCurrentUser ? "border-l-2 border-l-zinc-600" : ""
                }`}
              >
                <div className="w-8 flex-shrink-0">
                  <span className="text-zinc-600 text-sm font-mono">—</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500 truncate">{entry.name}</span>
                    {isCurrentUser && (
                      <span className="text-zinc-600 text-xs border border-zinc-700 px-1.5 py-0.5 font-mono uppercase tracking-wide flex-shrink-0">
                        you
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-700 text-xs font-mono mt-0.5">
                    Unlocks in {entry.daysUntilUnlock} {entry.daysUntilUnlock === 1 ? "day" : "days"}
                  </p>
                </div>
                <div className="text-zinc-600 text-xs font-mono uppercase tracking-wide">
                  Locked
                </div>
              </div>
            );
          }

          const scoreColor =
            entry.score >= 80
              ? "text-emerald-400"
              : entry.score >= 50
                ? "text-yellow-400"
                : entry.score > 0
                  ? "text-red-400"
                  : "text-zinc-500";

          const barColor =
            entry.score >= 80
              ? "bg-emerald-400"
              : entry.score >= 50
                ? "bg-yellow-500"
                : entry.score > 0
                  ? "bg-red-500"
                  : "bg-zinc-700";

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-6 py-4 ${
                isCurrentUser
                  ? "border-l-2 border-l-emerald-400"
                  : "hover:bg-zinc-800/30"
              }`}
            >
              <div className="w-8 flex-shrink-0">
                <span className="text-zinc-500 text-sm font-mono">#{entry.rank}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold truncate ${isCurrentUser ? "text-emerald-400" : "text-zinc-100"}`}>
                    {entry.name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-zinc-500 text-xs border border-zinc-700 px-1.5 py-0.5 font-mono uppercase tracking-wide flex-shrink-0">
                      you
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 bg-zinc-800 h-0.5 overflow-hidden">
                    <div
                      className={`h-0.5 transition-all duration-700 ${barColor}`}
                      style={{ width: `${entry.score}%` }}
                    />
                  </div>
                  <span className="text-zinc-600 text-xs flex-shrink-0 font-mono">
                    {entry.goalsCompleted}/{entry.goalsSet}
                  </span>
                </div>
              </div>

              <div className={`text-lg font-bold flex-shrink-0 font-mono ${scoreColor}`}>
                {entry.score}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
