"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import type { AuthResponse } from "@/app/(auth)/actions";

interface AuthFormProps {
  type: "login" | "signup";
}

export default function AuthForm({ type }: AuthFormProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (type === "login") {
        const res: AuthResponse | undefined = await signInAction(formData);
        if (res?.error) {
          setServerError(res.error);
        }
      } else {
        const res: AuthResponse = await signUpAction(formData);
        if (res.error) {
          setServerError(res.error);
        } else if (res.success && res.message) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        }
      }
    });
  };

  const isLogin = type === "login";

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/80 p-8 shadow-xl backdrop-blur-md transition-all dark:border-zinc-800/80 dark:bg-zinc-900/80">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {isLogin ? "SyncSpace에 로그인" : "새 계정 만들기"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {isLogin
            ? "팀 워크스페이스에 접속하여 협업을 시작하세요."
            : "몇 초 만에 가입하고 실시간 협업을 경험해 보세요."}
        </p>
      </div>

      {serverError && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              이름 / 닉네임
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="홍길동"
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-400"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
          >
            이메일 주소
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="user@example.com"
            disabled={isPending}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-400"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
          >
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            disabled={isPending}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>처리 중...</span>
            </>
          ) : isLogin ? (
            <>
              <LogIn className="h-4 w-4" />
              <span>로그인</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>회원가입 완료</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-zinc-200 pt-5 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        {isLogin ? (
          <p>
            계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              회원가입
            </Link>
          </p>
        ) : (
          <p>
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              로그인
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}