import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import KanbanBoardLoader from "@/components/kanban/KanbanBoardLoader";
import InviteMemberModal, {
  type MemberWithProfile,
} from "@/components/kanban/InviteMemberModal";
import { normalizeTask } from "@/lib/kanban";
import type { Board, Task, Workspace, WorkspaceMember, Profile } from "@/types/database";

interface WorkspaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: WorkspaceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workspace } = await (supabase as any)
    .from("workspaces")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: workspace ? `${(workspace as any).name} | SyncSpace 칸반` : "워크스페이스 | SyncSpace",
  };
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. 유저 멤버십 권한 확인
  const { data: member } = await (supabase as any)
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    notFound();
  }

  // 2. 워크스페이스 정보 조회
  const { data: workspace } = await (supabase as any)
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (!workspace) {
    notFound();
  }

  // 3. 참여 중인 전체 멤버 및 프로필 조회
  const { data: rawMembers } = await (supabase as any)
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });

  let membersWithProfiles: MemberWithProfile[] = [];

  if (rawMembers && (rawMembers as any[]).length > 0) {
    const userIds = (rawMembers as any[]).map((m) => m.user_id);
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("*")
      .in("id", userIds);

    membersWithProfiles = (rawMembers as WorkspaceMember[]).map((m) => ({
      ...m,
      profile:
        ((profiles as Profile[])?.find((p) => p.id === m.user_id) as Profile) ||
        null,
    }));
  }

  // 4. 보드 컬럼 조회
  const { data: boards } = await (supabase as any)
    .from("boards")
    .select("*")
    .eq("workspace_id", id)
    .order("position", { ascending: true });

  // 5. 태스크 목록 조회
  const { data: tasks } = await (supabase as any)
    .from("tasks")
    .select("*")
    .eq("workspace_id", id)
    .order("position", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="목록으로 돌아가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {(workspace as Workspace).name}
              </h1>
            </div>
            <p className="text-xs text-zinc-400">/{(workspace as Workspace).slug}</p>
          </div>
        </div>

        <InviteMemberModal
          workspaceId={(workspace as Workspace).id}
          members={membersWithProfiles}
          currentUserId={user.id}
          isOwner={(workspace as Workspace).owner_id === user.id}
        />
      </div>

      <KanbanBoardLoader
        workspaceId={(workspace as Workspace).id}
        currentUserId={user.id}
        currentUserName={
          membersWithProfiles.find((member) => member.user_id === user.id)?.profile
            ?.full_name ||
          user.email?.split("@")[0] ||
          "나"
        }
        initialBoards={(boards as Board[]) || []}
        initialTasks={((tasks as Task[]) || []).map(normalizeTask)}
        members={membersWithProfiles}
      />
    </div>
  );
}