import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-zinc-100 to-indigo-50/30 p-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <Link href="/" className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          SyncSpace
        </Link>
      </div>

      {children}

      <footer className="mt-8 text-xs text-zinc-400 dark:text-zinc-600">
        © 2026 SyncSpace. Next.js 15 & Supabase Collaboration Engine.
      </footer>
    </div>
  );
}