"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/friends", label: "Friends" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 px-4 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-zinc-50 tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-xl">🔒</span>
          <span className="hidden sm:inline text-sm">Lock In Tracker</span>
        </Link>

        {/* Center nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: user info + sign out */}
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-zinc-400 text-sm hidden sm:inline truncate max-w-[120px]">
              {session.user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
