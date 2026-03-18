"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Registration failed. Please try again.");
        return;
      }

      // Auto sign-in after registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Account created but sign-in failed. Please log in.");
        router.push("/login");
      } else {
        toast.success("Account created! Set your first goals.");
        router.push("/onboarding");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="font-mono font-bold text-sm tracking-widest text-zinc-50 uppercase">
              LOCK IN TRACKER
            </span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">Create your account</h1>
          <p className="text-zinc-500 text-sm mt-1">Start tracking. Start winning.</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-500 mb-1.5 tracking-widest uppercase">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-500 mb-1.5 tracking-widest uppercase">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1.5 tracking-widest uppercase">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                minLength={8}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-50 placeholder-zinc-600 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-zinc-950 disabled:bg-zinc-300 disabled:cursor-not-allowed font-semibold py-2.5 rounded-sm transition-colors text-sm mt-2 hover:bg-zinc-200"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-300 hover:text-zinc-50 transition-colors underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
