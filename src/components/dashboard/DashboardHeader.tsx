"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Sparkles, LogOut, Loader2, User, Moon, Sun } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { useThemeStore } from "@/store/theme-store";
import type { Profile } from "@/types/database";

interface DashboardHeaderProps {
  user: {
    email?: string;
  };
  profile: Profile | null;
}

export default function DashboardHeader({
  user,
  profile,
}: DashboardHeaderProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "사용자";

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        <Link href="/workspace" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            SyncSpace
          </span>
        </Link>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          대시보드
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-2 pr-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {displayName}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {user.email}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-indigo-400"
          title={theme === "dark" ? "라이트 모드" : "다크 모드"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-red-400"
          title="로그아웃"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}