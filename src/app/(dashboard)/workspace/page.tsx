import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LayoutGrid, Calendar, ArrowRight, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CreateWorkspaceModal from "@/components/dashboard/CreateWorkspaceModal";
import type { Workspace, WorkspaceMember } from "@/types/database";

export const metadata: Metadata = {
  title: "워크스페이스 목록 | SyncSpace",
  description: "참여 중인 모든 워크스페이스를 확인하고 관리하세요.",
};

export default async function WorkspaceListPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. 유저가 소속된 모든 워크스페이스 멤버십 조회
  const { data: memberships } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  const typedMemberships = (memberships as WorkspaceMember[]) || [];
  const workspaceIds = typedMemberships.map((m) => m.workspace_id);

  // 2. 해당 워크스페이스 정보 조회
  let workspaces: Workspace[] = [];
  if (workspaceIds.length > 0) {
    const { data: wsList } = await (supabase as any)
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .order("created_at", { ascending: false });

    workspaces = (wsList as Workspace[]) || [];
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            내 워크스페이스
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            참여 중인 협업 공간을 선택하거나 새로운 워크스페이스를 만드세요.
          </p>
        </div>
        <CreateWorkspaceModal />
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            소속된 워크스페이스가 없습니다
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            팀원들과 실시간 칸반 협업을 시작하려면 첫 번째 워크스페이스를 생성해 보세요.
          </p>
          <div className="mt-5">
            <CreateWorkspaceModal label="첫 워크스페이스 만들기" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const memberInfo = typedMemberships.find((m) => m.workspace_id === ws.id);
            const isOwner = memberInfo?.role === "owner";

            return (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        isOwner
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {isOwner ? (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          소유자
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3" />
                          멤버
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-zinc-400">/{ws.slug}</span>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                    {ws.name}
                  </h2>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(ws.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <div className="flex items-center gap-0.5 font-medium text-indigo-600 transition group-hover:translate-x-0.5 dark:text-indigo-400">
                    <span>입장</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}