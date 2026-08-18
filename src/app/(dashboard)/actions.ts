"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface ActionResponse {
  error?: string;
  success?: boolean;
}

// 모달 컴포넌트 호환용 타입 별칭
export type WorkspaceActionResponse = ActionResponse;

export async function createWorkspaceAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();

  if (!name || !slug) {
    return { error: "워크스페이스 이름과 URL 슬러그를 모두 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "인증 세션이 만료되었습니다. 다시 로그인해 주세요." };
  }

  // 1. 슬러그 중복 확인
  const { data: existingWorkspace } = await (supabase as any)
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existingWorkspace) {
    return { error: "이미 사용 중인 URL 슬러그입니다. 다른 슬러그를 입력해 주세요." };
  }

  // 2. 워크스페이스 생성
  const { data: workspace, error: wsError } = await (supabase as any)
    .from("workspaces")
    .insert({
      name,
      slug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError || !workspace) {
    return { error: wsError?.message || "워크스페이스 생성에 실패했습니다." };
  }

  // 3. 생성자를 owner 멤버로 자동 등록
  await (supabase as any).from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  // 4. 기본 칸반 보드 3개 컬럼 생성
  const defaultColumns = [
    { workspace_id: workspace.id, title: "할 일 (To Do)", position: 0 },
    { workspace_id: workspace.id, title: "진행 중 (In Progress)", position: 1 },
    { workspace_id: workspace.id, title: "완료 (Done)", position: 2 },
  ];

  await (supabase as any).from("boards").insert(defaultColumns);

  revalidatePath("/workspace", "page");
  redirect(`/workspace/${workspace.id}`);
}