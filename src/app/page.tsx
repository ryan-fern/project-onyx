import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-zinc-800 px-6 py-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-12">
          <span className="font-mono font-bold text-sm tracking-widest text-zinc-50 uppercase">
            LOCK IN
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-zinc-400 hover:text-zinc-50 text-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-white text-zinc-950 text-sm px-4 py-1.5 rounded-sm font-semibold transition-colors hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-zinc-800 text-zinc-500 text-xs px-3 py-1 mb-10">
            <span className="w-1.5 h-1.5 bg-emerald-400 inline-block flex-shrink-0"></span>
            Track daily &nbsp;&bull;&nbsp; Weekly reports &nbsp;&bull;&nbsp; Friend leaderboard
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight text-zinc-50">
            Track your goals.<br />Stay locked in.
          </h1>

          <p className="text-zinc-400 text-base md:text-lg mb-10 max-w-xl leading-relaxed">
            Set daily goals, track your completion rate, and compete with friends on the leaderboard. No excuses. Just results.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-3 mb-20">
            <Link
              href="/signup"
              className="bg-white text-zinc-950 px-6 py-2.5 rounded-sm font-semibold text-sm transition-colors hover:bg-zinc-200 w-full sm:w-auto text-center"
            >
              Get Started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="border border-zinc-700 text-zinc-300 px-6 py-2.5 rounded-sm font-semibold text-sm transition-colors hover:border-zinc-500 hover:text-zinc-100 w-full sm:w-auto text-center"
            >
              Sign In
            </Link>
          </div>

          {/* Feature columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-zinc-800 mb-16">
            <div className="p-6 text-left md:border-r border-zinc-800 border-b md:border-b-0">
              <p className="text-xs tracking-widest text-zinc-500 uppercase mb-3">Daily Goals</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Set what you want to accomplish today. Check them off as you complete them.
              </p>
            </div>

            <div className="p-6 text-left md:border-r border-zinc-800 border-b md:border-b-0">
              <p className="text-xs tracking-widest text-zinc-500 uppercase mb-3">Lock-In Score</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Your score is simple: goals completed divided by goals set. Aim for 100%.
              </p>
            </div>

            <div className="p-6 text-left">
              <p className="text-xs tracking-widest text-zinc-500 uppercase mb-3">Friend Leaderboard</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Add friends and compete on the trailing 7-day leaderboard. Stay on top.
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 text-xs text-zinc-600 font-mono tracking-wide">
            <span>TRACK DAILY</span>
            <span>WEEKLY REPORTS</span>
            <span>FRIEND LEADERBOARD</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-zinc-600 text-xs font-mono">
          <span>LOCK IN TRACKER</span>
          <span>Stay focused. Stay winning.</span>
        </div>
      </footer>
    </div>
  );
}
