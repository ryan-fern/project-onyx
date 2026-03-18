"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";

interface Friend {
  requestId: string;
  id: string;
  name: string;
  email: string;
  score: number;
  goalsSet: number;
  goalsCompleted: number;
}

interface PendingRequest {
  id: string;
  requester: { id: string; name: string; email: string };
  recipient: { id: string; name: string; email: string };
}

interface FriendsData {
  friends: Friend[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingRequest[];
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

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<FriendsData>({
    friends: [],
    pendingReceived: [],
    pendingSent: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("Failed to fetch friends");
      const json: FriendsData = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load friends.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFriends();
    }
  }, [status, fetchFriends]);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    const email = searchEmail.trim();
    if (!email) return;

    setSending(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send request.");
      } else {
        toast.success(`Friend request sent to ${email}!`);
        setSearchEmail("");
        fetchFriends();
      }
    } catch {
      toast.error("Failed to send friend request.");
    } finally {
      setSending(false);
    }
  }

  async function handleRespondRequest(
    requestId: string,
    action: "accept" | "reject"
  ) {
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update request");
      toast.success(action === "accept" ? "Friend added!" : "Request declined.");
      fetchFriends();
    } catch {
      toast.error("Failed to update friend request.");
    }
  }

  async function handleRemoveFriend(requestId: string) {
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      toast.success("Friend removed.");
      fetchFriends();
    } catch {
      toast.error("Failed to remove friend.");
    }
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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-0">
        <h1 className="text-xs tracking-widest text-zinc-50 uppercase font-mono font-bold mb-8">Friends</h1>

        {/* Find Friends */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-none mb-px">
          <div className="px-6 py-4 border-b border-zinc-800">
            <p className="text-xs tracking-widest text-zinc-500 uppercase">Find Friends</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-zinc-500 text-xs mb-4">
              Enter a friend&apos;s email address to send them a friend request.
            </p>
            <form onSubmit={handleSendRequest} className="flex gap-3">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="submit"
                disabled={sending || !searchEmail.trim()}
                className="bg-white text-zinc-950 disabled:bg-zinc-400 disabled:cursor-not-allowed font-semibold px-5 py-2 rounded-sm text-sm transition-colors whitespace-nowrap hover:bg-zinc-200"
              >
                {sending ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>
        </div>

        {/* Pending Received Requests */}
        {data.pendingReceived.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-none mb-px">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
              <p className="text-xs tracking-widest text-zinc-500 uppercase">Friend Requests</p>
              <span className="text-xs border border-zinc-700 text-zinc-400 px-1.5 py-0.5 font-mono">
                {data.pendingReceived.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-800">
              {data.pendingReceived.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-semibold truncate">
                      {req.requester.name}
                    </p>
                    <p className="text-zinc-600 text-xs truncate font-mono">
                      {req.requester.email}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRespondRequest(req.id, "accept")}
                      className="border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, "reject")}
                      className="border border-zinc-700 text-zinc-400 hover:border-zinc-500 text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Sent */}
        {data.pendingSent.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-none mb-px">
            <div className="px-6 py-4 border-b border-zinc-800">
              <p className="text-xs tracking-widest text-zinc-500 uppercase">Sent Requests</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {data.pendingSent.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-semibold truncate">
                      {req.recipient.name}
                    </p>
                    <p className="text-zinc-600 text-xs truncate font-mono">
                      {req.recipient.email}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-xs border border-zinc-800 px-2 py-0.5 rounded-none flex-shrink-0 font-mono uppercase tracking-wide">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Friends */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-none">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <p className="text-xs tracking-widest text-zinc-500 uppercase">My Friends</p>
            {data.friends.length > 0 && (
              <span className="text-zinc-600 text-xs font-mono">({data.friends.length})</span>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-6 text-zinc-500 text-sm font-mono">Loading...</div>
          ) : data.friends.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-zinc-500 text-sm">No friends yet.</p>
              <p className="text-zinc-700 text-xs mt-1">
                Send a request above to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {data.friends.map((friend) => {
                const scoreColor =
                  friend.score >= 80
                    ? "text-emerald-400"
                    : friend.score >= 50
                      ? "text-yellow-400"
                      : friend.score > 0
                        ? "text-red-400"
                        : "text-zinc-500";

                return (
                  <div
                    key={friend.requestId}
                    className="flex items-center gap-4 px-6 py-4 group hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-100 text-sm font-semibold truncate">
                        {friend.name}
                      </p>
                      <p className="text-zinc-600 text-xs truncate font-mono">
                        {friend.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-20 bg-zinc-800 rounded-none h-0.5 overflow-hidden">
                          <div
                            className={`h-0.5 rounded-none ${
                              friend.score >= 80
                                ? "bg-emerald-400"
                                : friend.score >= 50
                                  ? "bg-yellow-500"
                                  : friend.score > 0
                                    ? "bg-red-500"
                                    : "bg-zinc-700"
                            }`}
                            style={{ width: `${friend.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold font-mono ${scoreColor}`}>
                          {friend.score}%
                        </span>
                        <span className="text-zinc-700 text-xs font-mono">
                          ({friend.goalsCompleted}/{friend.goalsSet})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.requestId)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all px-2 py-1 rounded-none border border-transparent hover:border-zinc-700 flex-shrink-0"
                    >
                      Remove
                    </button>
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
