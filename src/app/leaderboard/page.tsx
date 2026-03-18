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
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const hasFriends = entries.length > 1;

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
              Leaderboard
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs px-2.5 py-1 rounded-full">
                Trailing 7 Days
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            Loading leaderboard...
          </div>
        ) : !hasFriends ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-zinc-300 font-semibold mb-1">
              Add friends to compete!
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              The leaderboard shows you and your friends&apos; trailing 7-day lock-in
              scores. Go add some friends to get the competition going.
            </p>
            <button
              onClick={() => router.push("/friends")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
            >
              Find Friends
            </button>

            {/* Still show current user */}
            {entries.length === 1 && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs mb-3">Your current score</p>
                <LeaderboardRow entry={entries[0]} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {entries.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {session && (
          <p className="text-center text-zinc-600 text-xs mt-6">
            Scores are based on goals completed ÷ goals set over the last 7 days
          </p>
        )}
      </main>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const avatarColor = getAvatarColor(entry.name);
  const scoreColor =
    entry.score >= 80
      ? "text-green-400"
      : entry.score >= 50
        ? "text-yellow-400"
        : entry.score > 0
          ? "text-red-400"
          : "text-zinc-500";

  const barColor =
    entry.score >= 80
      ? "bg-green-500"
      : entry.score >= 50
        ? "bg-yellow-500"
        : entry.score > 0
          ? "bg-red-500"
          : "bg-zinc-700";

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 transition-colors ${
        entry.isCurrentUser
          ? "bg-indigo-950/30 border-l-2 border-l-indigo-500"
          : "hover:bg-zinc-800/30"
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {entry.rank === 1 ? (
          <span className="text-xl">🥇</span>
        ) : entry.rank === 2 ? (
          <span className="text-xl">🥈</span>
        ) : entry.rank === 3 ? (
          <span className="text-xl">🥉</span>
        ) : (
          <span className="text-zinc-500 text-sm font-bold">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor}`}
      >
        {getInitials(entry.name)}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold truncate ${
              entry.isCurrentUser ? "text-indigo-300" : "text-zinc-100"
            }`}
          >
            {entry.name}
          </span>
          {entry.isCurrentUser && (
            <span className="text-indigo-500 text-xs bg-indigo-950 border border-indigo-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
              you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${entry.score}%` }}
            />
          </div>
          <span className="text-zinc-500 text-xs flex-shrink-0">
            {entry.goalsCompleted}/{entry.goalsSet}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className={`text-lg font-bold flex-shrink-0 ${scoreColor}`}>
        {entry.score}%
      </div>
    </div>
  );
}
