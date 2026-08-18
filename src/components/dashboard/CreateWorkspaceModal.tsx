"use client";

import React, { useActionState, useState } from "react";
import { Plus, X, Loader2, Sparkles } from "lucide-react";
import { createWorkspaceAction, type WorkspaceActionResponse } from "@/app/(dashboard)/actions";

const initialState: WorkspaceActionResponse = {};

export default function CreateWorkspaceModal(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialState
  );

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        <span>새 워크스페이스</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  새 워크스페이스 만들기
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={formAction} className="mt-5 space-y-4">
              {state?.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
                  {state.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  워크스페이스 이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="예: 마케팅 팀 프로젝트"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="slug"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  URL 슬러그 (영문, 숫자, 하이픈)
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs text-zinc-400">
                    /workspace/
                  </span>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    required
                    placeholder="marketing-team"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-24 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-900"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <span>생성하기</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}