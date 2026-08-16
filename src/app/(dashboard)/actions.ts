"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceActionResponse {
  success: boolean;
  workspaceId?: string;
  error?: string;
}

export async function createWorkspaceAction(
  formData: FormData
): Promise<WorkspaceActionResponse> {
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { success: false, error: "워크스페이스 이름을 입력해 주세요." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 고유 URL 식별용 slug 생성
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const slug = `${baseSlug || "workspace"}-${randomSuffix}`;

  // 1. 워크스페이스 생성
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name,
      slug,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (wsError || !workspace) {
    return { success: false, error: wsError?.message ?? "워크스페이스 생성 실패" };
  }

  // 2. 워크스페이스 멤버(소유자 권한) 등록
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // 3. 기본 칸반 보드 컬럼 3종 자동 생성
  const defaultBoards = [
    { workspace_id: workspace.id, title: "할 일 (To Do)", position: 0 },
    { workspace_id: workspace.id, title: "진행 중 (In Progress)", position: 1 },
    { workspace_id: workspace.id, title: "완료 (Done)", position: 2 },
  ];

  await supabase.from("boards").insert(defaultBoards);

  revalidatePath("/workspace", "page");
  return { success: true, workspaceId: workspace.id };
}