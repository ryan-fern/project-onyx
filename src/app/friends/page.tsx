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
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Friends</h1>

        {/* Find Friends */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-zinc-50 font-bold tracking-tight mb-1">
            Find Friends
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            Enter a friend&apos;s email address to send them a friend request.
          </p>
          <form onSubmit={handleSendRequest} className="flex gap-3">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={sending || !searchEmail.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap"
            >
              {sending ? "Sending..." : "Send Request"}
            </button>
          </form>
        </div>

        {/* Pending Received Requests */}
        {data.pendingReceived.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
              Friend Requests
              <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                {data.pendingReceived.length}
              </span>
            </h2>
            <div className="space-y-3">
              {data.pendingReceived.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(req.requester.name)}`}
                  >
                    {getInitials(req.requester.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-semibold truncate">
                      {req.requester.name}
                    </p>
                    <p className="text-zinc-500 text-xs truncate">
                      {req.requester.email}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRespondRequest(req.id, "accept")}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, "reject")}
                      className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
              Sent Requests
            </h2>
            <div className="space-y-3">
              {data.pendingSent.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(req.recipient.name)}`}
                  >
                    {getInitials(req.recipient.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-semibold truncate">
                      {req.recipient.name}
                    </p>
                    <p className="text-zinc-500 text-xs truncate">
                      {req.recipient.email}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-xs bg-zinc-800 px-2.5 py-1 rounded-full flex-shrink-0">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Friends */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-zinc-50 font-bold tracking-tight mb-4">
            My Friends
            {data.friends.length > 0 && (
              <span className="ml-2 text-zinc-500 text-sm font-normal">
                ({data.friends.length})
              </span>
            )}
          </h2>

          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : data.friends.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-zinc-400 text-sm">No friends yet.</p>
              <p className="text-zinc-600 text-xs mt-1">
                Send a request above to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.friends.map((friend) => {
                const scoreColor =
                  friend.score >= 80
                    ? "text-green-400"
                    : friend.score >= 50
                      ? "text-yellow-400"
                      : friend.score > 0
                        ? "text-red-400"
                        : "text-zinc-500";

                return (
                  <div
                    key={friend.requestId}
                    className="flex items-center gap-4 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl group"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(friend.name)}`}
                    >
                      {getInitials(friend.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-100 text-sm font-semibold truncate">
                        {friend.name}
                      </p>
                      <p className="text-zinc-500 text-xs truncate">
                        {friend.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              friend.score >= 80
                                ? "bg-green-500"
                                : friend.score >= 50
                                  ? "bg-yellow-500"
                                  : friend.score > 0
                                    ? "bg-red-500"
                                    : "bg-zinc-700"
                            }`}
                            style={{ width: `${friend.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${scoreColor}`}>
                          {friend.score}%
                        </span>
                        <span className="text-zinc-600 text-xs">
                          ({friend.goalsCompleted}/{friend.goalsSet} goals)
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.requestId)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all px-2 py-1 rounded flex-shrink-0"
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
