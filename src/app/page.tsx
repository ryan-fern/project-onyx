import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span className="font-bold text-lg tracking-tight">Lock In Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-zinc-400 hover:text-zinc-50 text-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-full font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Track daily • Weekly reports • Friend leaderboard
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Stay{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Locked In
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Set daily goals, track your wins, and crush your friends on the
            leaderboard. No excuses. Just results.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full font-semibold text-base transition-colors w-full sm:w-auto"
            >
              Get Started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-8 py-3.5 rounded-full font-semibold text-base transition-colors w-full sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold text-zinc-50 mb-2 tracking-tight">Daily Goals</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Set what you want to accomplish today. Check them off as you crush them.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold text-zinc-50 mb-2 tracking-tight">Lock-In Score</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your score is simple: goals completed ÷ goals set. Aim for 100%.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="font-bold text-zinc-50 mb-2 tracking-tight">Friend Leaderboard</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Add friends and compete on the trailing 7-day leaderboard. Stay on top.
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 text-sm text-zinc-500">
            <span>📅 Track daily</span>
            <span>📧 Weekly reports</span>
            <span>🏆 Friend leaderboard</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6">
        <div className="max-w-5xl mx-auto text-center text-zinc-600 text-xs">
          Lock In Tracker — Stay focused. Stay winning.
        </div>
      </footer>
    </div>
  );
}
