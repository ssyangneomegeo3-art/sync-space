"use client";

import React, { useState } from "react";
import { Trash2, GripVertical, AlertCircle, Calendar, User } from "lucide-react";
import TaskDetailModal from "./TaskDetailModal";
import type { Task, TaskPriority } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";

interface KanbanCardProps {
  task: Task;
  members: MemberWithProfile[];
  workspaceId: string;
  onDelete: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-300", label: "낮음" },
  medium: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300", label: "보통" },
  high: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300", label: "높음" },
  urgent: { bg: "bg-rose-50 dark:bg-rose-950/50", text: "text-rose-700 dark:text-rose-300", label: "긴급" },
};

export default function KanbanCard({
  task,
  members,
  workspaceId,
  onDelete,
  onTaskUpdated,
}: KanbanCardProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task.id, fromBoardId: task.board_id }));
    e.dataTransfer.effectAllowed = "move";
  };

  const priorityMeta = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const assignee = members.find((m) => m.user_id === task.assignee_id);

  // 마감일 포맷팅 및 기한 초과 여부 계산
  let formattedDueDate = "";
  let isOverdue = false;
  if (task.due_date) {
    const due = new Date(task.due_date);
    formattedDueDate = `${due.getMonth() + 1}월 ${due.getDate()}일`;
    isOverdue = due < new Date();
  }

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => setIsModalOpen(true)}
        className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm transition hover:border-indigo-400 hover:shadow active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityMeta.bg} ${priorityMeta.text}`}
          >
            {task.priority === "urgent" && <AlertCircle className="h-3 w-3" />}
            {priorityMeta.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
              title="태스크 삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <GripVertical className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />
          </div>
        </div>

        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 dark:text-zinc-400">
            {task.description}
          </p>
        )}

        {/* 하단 메타 정보 (마감일 + 담당자 아바타) */}
        {(formattedDueDate || assignee) && (
          <div className="mt-1 flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
            {formattedDueDate ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  isOverdue ? "text-red-600 dark:text-red-400" : "text-zinc-400"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {formattedDueDate}
              </span>
            ) : (
              <span />
            )}

            {assignee ? (
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                title={`담당자: ${assignee.profile?.full_name || assignee.profile?.email}`}
              >
                {assignee.profile?.full_name?.substring(0, 1) ||
                  assignee.profile?.email?.substring(0, 1).toUpperCase() ||
                  "U"}
              </div>
            ) : (
              <div className="text-zinc-300 dark:text-zinc-600" title="담당자 미지정">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        )}
      </div>

      <TaskDetailModal
        task={task}
        members={members}
        workspaceId={workspaceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskUpdated={onTaskUpdated}
        onDelete={onDelete}
      />
    </>
  );
}