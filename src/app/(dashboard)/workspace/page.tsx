import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LayoutGrid, ArrowRight, Clock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CreateWorkspaceModal from "@/components/dashboard/CreateWorkspaceModal";
import type { Workspace, WorkspaceMember } from "@/types/database";

export const metadata: Metadata = {
  title: "워크스페이스 목록 | SyncSpace",
  description: "내가 참여 중인 실시간 협업 워크스페이스 목록입니다.",
};

interface WorkspaceWithMembership extends Workspace {
  role: string;
}

export default async function WorkspaceListPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. 유저가 소속된 워크스페이스 멤버십 목록 조회
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  let workspaces: WorkspaceWithMembership[] = [];

  if (memberships && memberships.length > 0) {
    const wsIds = memberships.map((m: Pick<WorkspaceMember, "workspace_id" | "role">) => m.workspace_id);
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", wsIds)
      .order("created_at", { ascending: false });

    if (wsData) {
      workspaces = wsData.map((ws: Workspace) => {
        const member = memberships.find((m) => m.workspace_id === ws.id);
        return {
          ...ws,
          role: member?.role || "member",
        };
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            내 워크스페이스
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            참여 중인 협업 공간을 선택하거나 새로운 팀 프로젝트를 생성하세요.
          </p>
        </div>
        <CreateWorkspaceModal />
      </div>

      {workspaces.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            참여 중인 워크스페이스가 없습니다
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            첫 번째 워크스페이스를 만들고 칸반 보드와 실시간 협업을 시작해 보세요.
          </p>
          <div className="mt-6">
            <CreateWorkspaceModal />
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspace/${ws.id}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:border-indigo-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-400"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <Shield className="h-3 w-3" />
                    {ws.role === "owner" ? "소유자" : ws.role === "admin" ? "관리자" : "멤버"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>

                <h3 className="mt-4 text-lg font-bold tracking-tight text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                  {ws.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  /{ws.slug}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 border-t border-zinc-100 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {new Date(ws.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} 생성
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}