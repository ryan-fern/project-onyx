"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-indigo-600",
  "bg-violet-600",
  "bg-blue-600",
  "bg-pink-600",
  "bg-orange-600",
  "bg-teal-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const data: LeaderboardEntry[] = await res.json();
        setEntries(data);
      } catch {
        toast.error("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono">Loading...</div>
      </div>
    );
  }

  const hasFriends = entries.length > 1;

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-xs tracking-widest text-zinc-50 uppercase font-mono font-bold">
            Leaderboard
          </h1>
          <span className="border border-zinc-700 text-zinc-500 text-xs px-2 py-0.5 font-mono uppercase tracking-wide">
            Trailing 7 Days
          </span>
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-none p-8 text-center text-zinc-500 text-sm font-mono">
            Loading leaderboard...
          </div>
        ) : !hasFriends ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-none p-8">
            <p className="text-zinc-300 font-semibold mb-1">
              Add friends to compete.
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              The leaderboard shows you and your friends&apos; trailing 7-day lock-in
              scores. Add some friends to get the competition going.
            </p>
            <button
              onClick={() => router.push("/friends")}
              className="bg-white text-zinc-950 px-5 py-2 rounded-sm text-sm font-semibold transition-colors hover:bg-zinc-200"
            >
              Find Friends
            </button>

            {/* Still show current user */}
            {entries.length === 1 && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3 font-mono">Your current score</p>
                <LeaderboardRow entry={entries[0]} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {entries.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {session && (
          <p className="text-zinc-700 text-xs mt-6 font-mono">
            Scores are based on goals completed / goals set over the last 7 days
          </p>
        )}
      </main>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
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
      className={`flex items-center gap-4 px-6 py-4 transition-colors ${
        entry.isCurrentUser
          ? "border-l-2 border-l-emerald-400"
          : "hover:bg-zinc-800/30"
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        <span className="text-zinc-500 text-sm font-bold font-mono">#{entry.rank}</span>
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold truncate ${
              entry.isCurrentUser ? "text-emerald-400" : "text-zinc-100"
            }`}
          >
            {entry.name}
          </span>
          {entry.isCurrentUser && (
            <span className="text-zinc-500 text-xs border border-zinc-700 px-1.5 py-0.5 rounded-none flex-shrink-0 font-mono uppercase tracking-wide">
              you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 bg-zinc-800 rounded-none h-0.5 overflow-hidden">
            <div
              className={`h-0.5 rounded-none transition-all duration-700 ${barColor}`}
              style={{ width: `${entry.score}%` }}
            />
          </div>
          <span className="text-zinc-600 text-xs flex-shrink-0 font-mono">
            {entry.goalsCompleted}/{entry.goalsSet}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className={`text-lg font-bold flex-shrink-0 font-mono ${scoreColor}`}>
        {entry.score}%
      </div>
    </div>
  );
}
