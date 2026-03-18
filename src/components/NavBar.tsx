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
      <div className="max-w-5xl mx-auto flex items-center justify-between h-12">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-mono font-bold text-sm tracking-widest text-zinc-50 uppercase hover:text-zinc-300 transition-colors"
        >
          LOCK IN
        </Link>

        {/* Center nav links */}
        <div className="flex items-center gap-0">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-3 text-sm transition-colors border-b-2 ${
                  isActive
                    ? "text-zinc-50 border-zinc-50"
                    : "text-zinc-500 hover:text-zinc-300 border-transparent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: user email + sign out */}
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <span className="text-zinc-600 text-xs hidden sm:inline truncate max-w-[160px] font-mono">
              {session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-zinc-500 hover:text-zinc-200 text-xs transition-colors border border-zinc-800 px-3 py-1.5 rounded-sm hover:border-zinc-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
