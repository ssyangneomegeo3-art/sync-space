"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Loader2,
  Calendar,
  User,
  AlertCircle,
  Trash2,
  Save,
} from "lucide-react";
import { updateTaskAction } from "@/app/(dashboard)/workspace/[id]/actions";
import type { Task, TaskPriority } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";

interface TaskDetailModalProps {
  task: Task;
  members: MemberWithProfile[];
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onDelete: () => void;
}

export default function TaskDetailModal({
  task,
  members,
  workspaceId,
  isOpen,
  onClose,
  onTaskUpdated,
  onDelete,
}: TaskDetailModalProps): React.JSX.Element | null {
  const [isPending, startTransition] = useTransition();

  // 날짜 및 폼 상태 관리
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    if (task.due_date) {
      try {
        const d = new Date(task.due_date);
        setDueDate(d.toISOString().split("T")[0]);
      } catch {
        setDueDate("");
      }
    } else {
      setDueDate("");
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("taskId", task.id);
    formData.append("workspaceId", workspaceId);

    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as TaskPriority) || "medium";
    const assigneeId = (formData.get("assigneeId") as string) || "none";
    const selectedDueDate = dueDate || null;

    const updatedTask: Task = {
      ...task,
      title,
      description,
      priority,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      due_date: selectedDueDate ? new Date(selectedDueDate).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    onTaskUpdated(updatedTask);
    onClose();

    startTransition(async () => {
      await updateTaskAction(formData);
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
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
              defaultValue={task.title}
              required
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              상세 설명
            </label>
            <textarea
              name="description"
              defaultValue={task.description || ""}
              rows={4}
              placeholder="작업에 대한 세부 내용을 적어주세요..."
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
                우선순위
              </label>
              <select
                name="priority"
                defaultValue={task.priority}
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
                defaultValue={task.assignee_id || "none"}
                disabled={isPending}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="none">미지정</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email?.split("@")[0] || m.user_id}
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
                onChange={(e) => setDueDate(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {
                    // 무시
                  }
                }}
                disabled={isPending}
                className="mt-1.5 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-indigo-500 [color-scheme:light] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:[color-scheme:dark]"
              />
            </div>
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
      </div>
    </div>
  );
}