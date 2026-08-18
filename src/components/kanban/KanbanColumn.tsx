"use client";

import React, { useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X, Loader2, Pencil, Trash2 } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { createTaskAction } from "@/app/(dashboard)/workspace/[id]/actions";
import { toBoardDndId, toTaskDndId } from "@/lib/kanban";
import type { Board, Task } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";

interface KanbanColumnProps {
  board: Board;
  tasks: Task[];
  members: MemberWithProfile[];
  workspaceId: string;
  currentUserId: string;
  onDeleteTask: (taskId: string) => void;
  onTaskCreated: (task: Task) => void;
  onTaskReplaced: (tempId: string, task: Task) => void;
  onTaskCreateFailed: (tempId: string) => void;
  onTaskUpdated: (task: Task) => void;
  canDeleteColumn: boolean;
  onRenameBoard: (boardId: string, title: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export default function KanbanColumn({
  board,
  tasks,
  members,
  workspaceId,
  currentUserId,
  onDeleteTask,
  onTaskCreated,
  onTaskReplaced,
  onTaskCreateFailed,
  onTaskUpdated,
  canDeleteColumn,
  onRenameBoard,
  onDeleteBoard,
}: KanbanColumnProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(board.title);
  const [isPending, startTransition] = useTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: toBoardDndId(board.id),
  });

  const handleCreateTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("workspaceId", workspaceId);
    formData.append("boardId", board.id);

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as Task["priority"]) || "medium";
    const tempId = `temp-${crypto.randomUUID()}`;

    const tempTask: Task = {
      id: tempId,
      board_id: board.id,
      workspace_id: workspaceId,
      title,
      description,
      priority,
      position: tasks.length,
      assignee_id: null,
      due_date: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onTaskCreated(tempTask);
    setIsAdding(false);
    form.reset();

    startTransition(async () => {
      const result = await createTaskAction(formData);
      if (result.success && result.task) {
        onTaskReplaced(tempId, result.task);
        return;
      }
      onTaskCreateFailed(tempId);
    });
  };

  const handleRename = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === board.title) {
      setIsRenaming(false);
      setDraftTitle(board.title);
      return;
    }
    onRenameBoard(board.id, nextTitle);
    setIsRenaming(false);
  };

  const handleDeleteColumn = () => {
    if (!canDeleteColumn) return;
    const confirmed = window.confirm(
      tasks.length > 0
        ? `"${board.title}" 컬럼과 카드 ${tasks.length}개가 삭제됩니다. 계속할까요?`
        : `"${board.title}" 컬럼을 삭제할까요?`
    );
    if (confirmed) {
      onDeleteBoard(board.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col rounded-2xl border bg-zinc-100/70 p-3.5 transition-colors dark:bg-zinc-900/60 ${
        isOver
          ? "border-indigo-500 bg-indigo-50/30 dark:border-indigo-400 dark:bg-indigo-950/20"
          : "border-zinc-200/80 dark:border-zinc-800"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        {isRenaming ? (
          <form onSubmit={handleRename} className="flex flex-1 items-center gap-1">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              autoFocus
              className="w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-xs font-bold outline-none dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="rounded px-2 py-1 text-[11px] font-semibold text-indigo-600"
            >
              저장
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {board.title}
            </h3>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {tasks.length}
            </span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setDraftTitle(board.title);
              setIsRenaming(true);
            }}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="컬럼 이름 변경"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDeleteColumn}
            disabled={!canDeleteColumn}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-red-400"
            title={canDeleteColumn ? "컬럼 삭제" : "마지막 컬럼은 삭제할 수 없습니다"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="태스크 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SortableContext
        items={tasks.map((task) => toTaskDndId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[6rem] flex-1 flex-col gap-2.5 overflow-y-auto">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              members={members}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
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
      </SortableContext>

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
            placeholder="상세 설명 (마크다운 가능)..."
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
