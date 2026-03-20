"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

interface Player {
  id: string;
  name: string;
  email: string;
  score: number;
  goalsSet: number;
  goalsCompleted: number;
}

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("Failed to fetch players");
      const json: Player[] = await res.json();
      setPlayers(json);
    } catch {
      toast.error("Failed to load community.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPlayers();
    }
  }, [status, fetchPlayers]);

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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-0">
        <h1 className="text-xs tracking-widest text-zinc-50 uppercase font-mono font-bold mb-8">Community</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-none">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <p className="text-xs tracking-widest text-zinc-500 uppercase">All Players</p>
            {players.length > 0 && (
              <span className="text-zinc-600 text-xs font-mono">({players.length})</span>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-6 text-zinc-500 text-sm font-mono">Loading...</div>
          ) : players.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-zinc-500 text-sm">No other players yet.</p>
              <p className="text-zinc-700 text-xs mt-1">
                Invite someone to join and compete.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {players.map((player) => {
                const scoreColor =
                  player.score >= 80
                    ? "text-emerald-400"
                    : player.score >= 50
                      ? "text-yellow-400"
                      : player.score > 0
                        ? "text-red-400"
                        : "text-zinc-500";

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-100 text-sm font-semibold truncate">
                        {player.name}
                      </p>
                      <p className="text-zinc-600 text-xs truncate font-mono">
                        {player.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-20 bg-zinc-800 rounded-none h-0.5 overflow-hidden">
                          <div
                            className={`h-0.5 rounded-none ${
                              player.score >= 80
                                ? "bg-emerald-400"
                                : player.score >= 50
                                  ? "bg-yellow-500"
                                  : player.score > 0
                                    ? "bg-red-500"
                                    : "bg-zinc-700"
                            }`}
                            style={{ width: `${player.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold font-mono ${scoreColor}`}>
                          {player.score}%
                        </span>
                        <span className="text-zinc-700 text-xs font-mono uppercase tracking-wide">
                          7-day
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-lg font-bold font-mono ${scoreColor}`}>
                        {player.score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
