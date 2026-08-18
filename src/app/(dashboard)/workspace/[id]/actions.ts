"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, WorkspaceRole } from "@/types/database";

export interface KanbanActionResponse {
  success: boolean;
  error?: string;
}

export async function createTaskAction(
  formData: FormData
): Promise<KanbanActionResponse> {
  const workspaceId = formData.get("workspaceId") as string;
  const boardId = formData.get("boardId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priority = (formData.get("priority") as TaskPriority) || "medium";

  if (!workspaceId || !boardId || !title) {
    return { success: false, error: "필수 입력값이 누락되었습니다." };
  }

  const supabase = await createClient();

  const { data: existingTasks } = await (supabase as any)
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existingTasks && existingTasks.length > 0
      ? (existingTasks[0] as any).position + 1
      : 0;

  const { error } = await (supabase as any).from("tasks").insert({
    workspace_id: workspaceId,
    board_id: boardId,
    title,
    description,
    priority,
    position: nextPosition,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function updateTaskAction(
  formData: FormData
): Promise<KanbanActionResponse> {
  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priority = (formData.get("priority") as TaskPriority) || "medium";
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const dueDate = (formData.get("dueDate") as string) || null;

  if (!taskId || !workspaceId || !title) {
    return { success: false, error: "필수 입력값이 누락되었습니다." };
  }

  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("tasks")
    .update({
      title,
      description,
      priority,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function moveTaskAction(
  taskId: string,
  targetBoardId: string,
  newPosition: number,
  workspaceId: string
): Promise<KanbanActionResponse> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("tasks")
    .update({
      board_id: targetBoardId,
      position: newPosition,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function deleteTaskAction(
  taskId: string,
  workspaceId: string
): Promise<KanbanActionResponse> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function createBoardAction(
  formData: FormData
): Promise<KanbanActionResponse> {
  const workspaceId = formData.get("workspaceId") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!workspaceId || !title) {
    return { success: false, error: "컬럼 제목을 입력해 주세요." };
  }

  const supabase = await createClient();

  const { data: boards } = await (supabase as any)
    .from("boards")
    .select("position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos =
    boards && boards.length > 0 ? (boards[0] as any).position + 1 : 0;

  const { error } = await (supabase as any).from("boards").insert({
    workspace_id: workspaceId,
    title,
    position: nextPos,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function inviteMemberAction(
  formData: FormData
): Promise<KanbanActionResponse> {
  const workspaceId = formData.get("workspaceId") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = (formData.get("role") as WorkspaceRole) || "member";

  if (!workspaceId || !email) {
    return { success: false, error: "이메일을 입력해 주세요." };
  }

  const supabase = await createClient();

  const { data: targetProfile, error: profileError } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError || !targetProfile) {
    return {
      success: false,
      error: "가입되지 않은 이메일입니다. 초대받을 사용자가 먼저 SyncSpace에 가입되어 있어야 합니다.",
    };
  }

  const { data: existingMember } = await (supabase as any)
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", (targetProfile as any).id)
    .single();

  if (existingMember) {
    return { success: false, error: "이미 이 워크스페이스에 참여 중인 팀원입니다." };
  }

  const { error: insertError } = await (supabase as any)
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: (targetProfile as any).id,
      role,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function updateMemberRoleAction(
  memberId: string,
  newRole: WorkspaceRole,
  workspaceId: string
): Promise<KanbanActionResponse> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("workspace_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function removeMemberAction(
  memberId: string,
  workspaceId: string
): Promise<KanbanActionResponse> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("workspace_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}