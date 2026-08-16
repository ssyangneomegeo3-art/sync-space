import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Users } from "lucide-react";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200/80 px-6 backdrop-blur-md dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">SyncSpace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            무료 시작하기
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Zap className="h-3.5 w-3.5" /> Next.js 15 & Supabase Realtime Engine
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          팀의 모든 생각을{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            실시간으로 동기화
          </span>
          하세요.
        </h1>

        <p className="mt-6 max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          칸반 보드, 문서 협업, 역할 기반 권한 제어까지. SyncSpace에서 지연 없는
          초고속 실시간 팀 협업을 경험해 보세요.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700"
          >
            <span>지금 무료로 시작</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-base font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            기존 워크스페이스 로그인
          </Link>
        </div>

        <div className="mt-20 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-4 font-bold">초저지연 실시간 동기화</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Supabase Realtime 기반으로 보드와 카드 이동이 모든 팀원에게 0.1초 만에 반영됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-4 font-bold">RLS 철통 보안</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              PostgreSQL Row Level Security를 통해 소속된 멤버만 안전하게 데이터를 조회·수정합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-4 font-bold">다중 워크스페이스 관리</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              프로젝트와 팀 단위로 워크스페이스를 분리하고 역할을 배정할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}