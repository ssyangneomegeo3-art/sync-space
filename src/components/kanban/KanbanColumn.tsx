"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { createTaskAction } from "@/app/(dashboard)/workspace/[id]/actions";
import type { Board, Task } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";

interface KanbanColumnProps {
  board: Board;
  tasks: Task[];
  members: MemberWithProfile[];
  workspaceId: string;
  onDropTask: (taskId: string, targetBoardId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskCreated: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
}

export default function KanbanColumn({
  board,
  tasks,
  members,
  workspaceId,
  onDropTask,
  onDeleteTask,
  onTaskCreated,
  onTaskUpdated,
}: KanbanColumnProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    try {
      const { taskId } = JSON.parse(data);
      if (taskId) {
        onDropTask(taskId, board.id);
      }
    } catch {
      // JSON 파싱 무시
    }
  };

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("workspaceId", workspaceId);
    formData.append("boardId", board.id);

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as Task["priority"]) || "medium";

    const tempTask: Task = {
      id: crypto.randomUUID(),
      board_id: board.id,
      workspace_id: workspaceId,
      title,
      description,
      priority,
      position: tasks.length,
      assignee_id: null,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onTaskCreated(tempTask);
    setIsAdding(false);

    startTransition(async () => {
      await createTaskAction(formData);
    });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-80 shrink-0 flex-col rounded-2xl border bg-zinc-100/70 p-3.5 transition-colors dark:bg-zinc-900/60 ${
        isOver
          ? "border-indigo-500 bg-indigo-50/30 dark:border-indigo-400 dark:bg-indigo-950/20"
          : "border-zinc-200/80 dark:border-zinc-800"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {board.title}
          </h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="태스크 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            members={members}
            workspaceId={workspaceId}
            onDelete={() => onDeleteTask(task.id)}
            onTaskUpdated={onTaskUpdated}
          />
        ))}

        {tasks.length === 0 && !isAdding && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            카드를 여기로 드래그하세요
          </div>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreateTask}
          className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input
            name="title"
            required
            autoFocus
            placeholder="할 일 제목..."
            disabled={isPending}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:text-zinc-100"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="상세 설명 (선택)..."
            disabled={isPending}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:text-zinc-100"
          />
          <div className="mt-2 flex items-center justify-between">
            <select
              name="priority"
              defaultValue="medium"
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-[11px] text-zinc-700 outline-none dark:border-zinc-700 dark:text-zinc-300"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
              <option value="urgent">긴급</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={isPending}
                className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "추가"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}