"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Board,
  Profile,
  Task,
  TaskComment,
  TaskCommentWithAuthor,
  TaskPositionUpdate,
  TaskPriority,
  TaskAttachment,
  WorkspaceRole,
} from "@/types/database";

export interface KanbanActionResponse {
  success: boolean;
  error?: string;
  task?: Task;
  board?: Board;
  comment?: TaskCommentWithAuthor;
  comments?: TaskCommentWithAuthor[];
  attachment?: TaskAttachment;
  attachments?: TaskAttachment[];
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  const unique = new Set(
    raw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
  );
  return Array.from(unique).slice(0, 12);
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

async function attachCommentAuthors(
  comments: TaskComment[]
): Promise<TaskCommentWithAuthor[]> {
  if (comments.length === 0) return [];

  const supabase = await createClient();
  const authorIds = Array.from(new Set(comments.map((item) => item.author_id)));

  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("*")
    .in("id", authorIds);

  const profileList = (profiles as Profile[]) || [];

  return comments.map((comment) => ({
    ...comment,
    author: profileList.find((profile) => profile.id === comment.author_id) ?? null,
  }));
}

export async function createTaskAction(
  formData: FormData
): Promise<KanbanActionResponse> {
  const workspaceId = formData.get("workspaceId") as string;
  const boardId = formData.get("boardId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priority = (formData.get("priority") as TaskPriority) || "medium";
  const tags = parseTags(formData.get("tags"));

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
      ? (existingTasks[0] as { position: number }).position + 1
      : 0;

  const { data, error } = await (supabase as any)
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      board_id: boardId,
      title,
      description,
      priority,
      tags,
      position: nextPosition,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "태스크 생성에 실패했습니다." };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true, task: normalizeTask(data as Task) };
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
  const tags = parseTags(formData.get("tags"));

  if (!taskId || !workspaceId || !title) {
    return { success: false, error: "필수 입력값이 누락되었습니다." };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("tasks")
    .update({
      title,
      description,
      priority,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return {
    success: true,
    task: data ? normalizeTask(data as Task) : undefined,
  };
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

export async function reorderTasksAction(
  workspaceId: string,
  updates: TaskPositionUpdate[]
): Promise<KanbanActionResponse> {
  if (!workspaceId || updates.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const results = await Promise.all(
    updates.map((item) =>
      (supabase as any)
        .from("tasks")
        .update({
          board_id: item.board_id,
          position: item.position,
          updated_at: now,
        })
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
    )
  );

  const failed = results.find((result: { error?: { message: string } }) => result.error);
  if (failed?.error) {
    return { success: false, error: failed.error.message };
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
    boards && boards.length > 0
      ? (boards[0] as { position: number }).position + 1
      : 0;

  const { data, error } = await (supabase as any)
    .from("boards")
    .insert({
      workspace_id: workspaceId,
      title,
      position: nextPos,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "컬럼 생성에 실패했습니다." };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true, board: data as Board };
}

export async function renameBoardAction(
  boardId: string,
  workspaceId: string,
  title: string
): Promise<KanbanActionResponse> {
  const nextTitle = title.trim();
  if (!boardId || !workspaceId || !nextTitle) {
    return { success: false, error: "컬럼 제목을 입력해 주세요." };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("boards")
    .update({
      title: nextTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boardId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "컬럼 이름 변경에 실패했습니다." };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true, board: data as Board };
}

export async function deleteBoardAction(
  boardId: string,
  workspaceId: string
): Promise<KanbanActionResponse> {
  if (!boardId || !workspaceId) {
    return { success: false, error: "삭제할 컬럼을 찾을 수 없습니다." };
  }

  const supabase = await createClient();

  const { data: boards } = await (supabase as any)
    .from("boards")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (!boards || (boards as { id: string }[]).length <= 1) {
    return { success: false, error: "마지막 컬럼은 삭제할 수 없습니다." };
  }

  await (supabase as any).from("tasks").delete().eq("board_id", boardId);

  const { error } = await (supabase as any)
    .from("boards")
    .delete()
    .eq("id", boardId)
    .eq("workspace_id", workspaceId);

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
      error:
        "가입되지 않은 이메일입니다. 초대받을 사용자가 먼저 SyncSpace에 가입되어 있어야 합니다.",
    };
  }

  const { data: existingMember } = await (supabase as any)
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", (targetProfile as { id: string }).id)
    .single();

  if (existingMember) {
    return { success: false, error: "이미 이 워크스페이스에 참여 중인 팀원입니다." };
  }

  const { error: insertError } = await (supabase as any)
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: (targetProfile as { id: string }).id,
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

export async function getTaskCommentsAction(
  taskId: string
): Promise<KanbanActionResponse> {
  if (!taskId) {
    return { success: false, error: "태스크 ID가 없습니다.", comments: [] };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message, comments: [] };
  }

  const comments = await attachCommentAuthors((data as TaskComment[]) || []);
  return { success: true, comments };
}

export async function createCommentAction(
  taskId: string,
  workspaceId: string,
  content: string
): Promise<KanbanActionResponse> {
  const trimmed = content.trim();

  if (!taskId || !workspaceId || !trimmed) {
    return { success: false, error: "댓글 내용을 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data, error } = await (supabase as any)
    .from("task_comments")
    .insert({
      task_id: taskId,
      workspace_id: workspaceId,
      author_id: user.id,
      content: trimmed,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "댓글 작성에 실패했습니다." };
  }

  const comments = await attachCommentAuthors([data as TaskComment]);
  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true, comment: comments[0] };
}

export async function deleteCommentAction(
  commentId: string,
  workspaceId: string
): Promise<KanbanActionResponse> {
  if (!commentId || !workspaceId) {
    return { success: false, error: "삭제할 댓글을 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { error } = await (supabase as any)
    .from("task_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}

export async function getTaskAttachmentsAction(
  taskId: string
): Promise<KanbanActionResponse> {
  if (!taskId) {
    return { success: false, error: "태스크 ID가 없습니다.", attachments: [] };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, attachments: [] };
  }

  return { success: true, attachments: (data as TaskAttachment[]) || [] };
}

export async function registerAttachmentAction(input: {
  taskId: string;
  workspaceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
}): Promise<KanbanActionResponse> {
  const { taskId, workspaceId, fileName, filePath, fileSize, mimeType } = input;
  if (!taskId || !workspaceId || !fileName || !filePath) {
    return { success: false, error: "파일 정보가 부족합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data, error } = await (supabase as any)
    .from("task_attachments")
    .insert({
      task_id: taskId,
      workspace_id: workspaceId,
      uploaded_by: user.id,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "첨부 등록에 실패했습니다." };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true, attachment: data as TaskAttachment };
}

export async function deleteAttachmentAction(
  attachmentId: string,
  workspaceId: string
): Promise<KanbanActionResponse> {
  if (!attachmentId || !workspaceId) {
    return { success: false, error: "삭제할 파일을 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const { data: row, error: fetchError } = await (supabase as any)
    .from("task_attachments")
    .select("*")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !row) {
    return { success: false, error: "파일을 찾을 수 없습니다." };
  }

  const attachment = row as TaskAttachment;
  await supabase.storage.from("task-files").remove([attachment.file_path]);

  const { error } = await (supabase as any)
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/workspace/${workspaceId}`, "page");
  return { success: true };
}
