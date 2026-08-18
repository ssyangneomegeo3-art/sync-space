"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Loader2,
  Calendar,
  User,
  AlertCircle,
  Trash2,
  Save,
  Bold,
  Italic,
  Heading2,
  List,
  Code,
  Eye,
  Pencil,
  Tag,
  MessageSquare,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createCommentAction,
  deleteCommentAction,
  getTaskCommentsAction,
  updateTaskAction,
} from "@/app/(dashboard)/workspace/[id]/actions";
import type { Task, TaskCommentWithAuthor, TaskPriority } from "@/types/database";
import TaskAttachments from "./TaskAttachments";

const MarkdownPreview = dynamic(() => import("./MarkdownPreview"), {
  ssr: false,
  loading: () => (
    <p className="text-xs text-zinc-400">미리보기를 불러오는 중...</p>
  ),
});

interface TaskDetailModalProps {
  task: Task;
  members: MemberWithProfile[];
  workspaceId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onDelete: () => void;
}

type EditorTab = "write" | "preview";

function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function wrapSelection(
  source: string,
  start: number,
  end: number,
  before: string,
  after: string
): { next: string; cursor: number } {
  const selected = source.slice(start, end) || "텍스트";
  const next =
    source.slice(0, start) + before + selected + after + source.slice(end);
  return { next, cursor: start + before.length + selected.length + after.length };
}

export default function TaskDetailModal({
  task,
  members,
  workspaceId,
  currentUserId,
  isOpen,
  onClose,
  onTaskUpdated,
  onDelete,
}: TaskDetailModalProps): React.JSX.Element | null {
  const [isPending, startTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();
  const [dueDate, setDueDate] = useState<string>("");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || "none");
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [comments, setComments] = useState<TaskCommentWithAuthor[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentChannelRef = useRef<RealtimeChannel | null>(null);

  const refreshComments = useCallback(async () => {
    const result = await getTaskCommentsAction(task.id);
    setComments(result.comments ?? []);
  }, [task.id]);

  useEffect(() => {
    if (!isOpen) return;

    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setAssigneeId(task.assignee_id || "none");
    setTags(Array.isArray(task.tags) ? task.tags : []);
    setTagInput("");
    setEditorTab("write");
    setCommentDraft("");
    setCommentError(null);

    if (task.due_date) {
      try {
        const date = new Date(task.due_date);
        setDueDate(date.toISOString().split("T")[0]);
      } catch {
        setDueDate("");
      }
    } else {
      setDueDate("");
    }

    void refreshComments();
  }, [task, isOpen, refreshComments]);

  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`task-comments-${task.id}`, {
          config: { broadcast: { self: false } },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_comments",
            filter: `task_id=eq.${task.id}`,
          },
          () => {
            void refreshComments();
          }
        )
        .on("broadcast", { event: "COMMENT_CHANGED" }, () => {
          void refreshComments();
        })
        .subscribe();

      commentChannelRef.current = channel;
    };

    void setup();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
      commentChannelRef.current = null;
    };
  }, [isOpen, task.id, refreshComments]);

  if (!isOpen) return null;

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/^#/, "");
    if (!value) return;
    setTags((prev) => (prev.includes(value) || prev.length >= 12 ? prev : [...prev, value]));
    setTagInput("");
  };

  const applyMarkdown = (before: string, after = "") => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? description.length;
    const end = textarea?.selectionEnd ?? description.length;
    const result = wrapSelection(description, start, end, before, after);
    setDescription(result.next);
    setEditorTab("write");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("title", title.trim());
    formData.set("description", description);
    formData.set("priority", priority);
    formData.set("assigneeId", assigneeId);
    formData.set("dueDate", dueDate);
    formData.set("tags", tags.join(","));
    formData.append("taskId", task.id);
    formData.append("workspaceId", workspaceId);

    const updatedTask: Task = {
      ...task,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      tags,
      updated_at: new Date().toISOString(),
    };

    onTaskUpdated(updatedTask);
    onClose();

    startTransition(async () => {
      await updateTaskAction(formData);
    });
  };

  const handleCreateComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;

    setCommentError(null);
    startCommentTransition(async () => {
      const result = await createCommentAction(task.id, workspaceId, content);
      if (!result.success) {
        setCommentError(result.error || "댓글 작성에 실패했습니다.");
        return;
      }
      setCommentDraft("");
      if (result.comment) {
        setComments((prev) =>
          prev.some((item) => item.id === result.comment!.id)
            ? prev
            : [...prev, result.comment!]
        );
      }
      void commentChannelRef.current?.send({
        type: "broadcast",
        event: "COMMENT_CHANGED",
        payload: { taskId: task.id },
      });
    });
  };

  const handleDeleteComment = (commentId: string) => {
    const previous = comments;
    setComments((prev) => prev.filter((item) => item.id !== commentId));
    startCommentTransition(async () => {
      const result = await deleteCommentAction(commentId, workspaceId);
      if (!result.success) {
        setComments(previous);
        setCommentError(result.error || "댓글 삭제에 실패했습니다.");
        return;
      }
      void commentChannelRef.current?.send({
        type: "broadcast",
        event: "COMMENT_CHANGED",
        payload: { taskId: task.id, commentId },
      });
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            태스크 상세 정보
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              제목
            </label>
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                상세 설명 (마크다운)
              </label>
              <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setEditorTab("write")}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    editorTab === "write"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <Pencil className="h-3 w-3" />
                  작성
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("preview")}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    editorTab === "preview"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  미리보기
                </button>
              </div>
            </div>

            <div className="mt-1.5 overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
              <div className="flex gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  title="제목"
                  onClick={() => applyMarkdown("## ", "")}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Heading2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="굵게"
                  onClick={() => applyMarkdown("**", "**")}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="기울임"
                  onClick={() => applyMarkdown("*", "*")}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="목록"
                  onClick={() => applyMarkdown("- ", "")}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="코드"
                  onClick={() => applyMarkdown("`", "`")}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
              </div>

              {editorTab === "write" ? (
                <textarea
                  ref={textareaRef}
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={7}
                  placeholder={"작업 내용을 마크다운으로 작성하세요.\n예: **중요**, - 할 일, `코드`"}
                  disabled={isPending}
                  className="w-full bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-100"
                />
              ) : (
                <div className="min-h-[10rem] bg-white px-3.5 py-2.5 dark:bg-zinc-950">
                  <MarkdownPreview content={description} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
                우선순위
              </label>
              <select
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                disabled={isPending}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
                <option value="urgent">긴급</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                담당자
              </label>
              <select
                name="assigneeId"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={isPending}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="none">미지정</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name ||
                      member.profile?.email?.split("@")[0] ||
                      member.user_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                마감일
              </label>
              <input
                type="date"
                name="dueDate"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                onClick={(event) => {
                  try {
                    (event.target as HTMLInputElement).showPicker?.();
                  } catch {
                    // 브라우저가 showPicker를 지원하지 않으면 기본 date input을 사용합니다.
                  }
                }}
                disabled={isPending}
                className="mt-1.5 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-indigo-500 [color-scheme:light] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              태그
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                    className="text-indigo-400 hover:text-indigo-700"
                    aria-label={`${tag} 태그 삭제`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(tagInput);
                  }
                  if (event.key === "Backspace" && !tagInput && tags.length > 0) {
                    setTags((prev) => prev.slice(0, -1));
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? "Enter로 태그 추가" : ""}
                disabled={isPending}
                className="min-w-[8rem] flex-1 bg-transparent text-xs outline-none dark:text-zinc-100"
              />
            </div>
            <input type="hidden" name="tags" value={tags.join(",")} />
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="h-4 w-4" />
              <span>삭제</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>저장</span>
              </button>
            </div>
          </div>
        </form>

        <TaskAttachments
          taskId={task.id}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
        />

        <div className="border-t border-zinc-100 p-5 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              댓글 ({comments.length})
            </h3>
          </div>

          <div className="mb-3 max-h-40 space-y-2.5 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-400">아직 댓글이 없습니다. 첫 의견을 남겨 보세요.</p>
            ) : (
              comments.map((comment) => {
                const isMine = comment.author_id === currentUserId;
                const displayName =
                  comment.author?.full_name ||
                  comment.author?.email?.split("@")[0] ||
                  "알 수 없는 사용자";

                return (
                  <div key={comment.id} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {displayName.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                            {displayName}
                          </span>
                          {isMine && (
                            <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              나
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400">
                            {formatCommentTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={isCommentPending}
                        className="rounded p-1 text-zinc-300 hover:text-red-500"
                        title="댓글 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {commentError && (
            <p className="mb-2 text-xs text-red-600 dark:text-red-400">{commentError}</p>
          )}

          <form onSubmit={handleCreateComment} className="flex items-center gap-2">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="댓글을 입력하세요..."
              disabled={isCommentPending}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={isCommentPending || !commentDraft.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isCommentPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              등록
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
