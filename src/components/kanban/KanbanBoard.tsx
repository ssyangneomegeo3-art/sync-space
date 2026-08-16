"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import { createClient } from "@/lib/supabase/client";
import {
  moveTaskAction,
  createBoardAction,
  deleteTaskAction,
} from "@/app/(dashboard)/workspace/[id]/actions";
import type { Board, Task } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface KanbanBoardProps {
  workspaceId: string;
  initialBoards: Board[];
  initialTasks: Task[];
  members: MemberWithProfile[];
}

export default function KanbanBoard({
  workspaceId,
  initialBoards,
  initialTasks,
  members,
}: KanbanBoardProps): React.JSX.Element {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isPending, startTransition] = useTransition();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // 실시간 웹소켓 이벤트 동기화
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`ws-${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "TASK_MOVED" }, ({ payload }) => {
        const { taskId, targetBoardId } = payload;
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, board_id: targetBoardId } : t))
        );
      })
      .on("broadcast", { event: "TASK_CREATED" }, ({ payload }) => {
        const { task } = payload;
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev;
          return [...prev, task];
        });
      })
      .on("broadcast", { event: "TASK_UPDATED" }, ({ payload }) => {
        const { task } = payload;
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? task : t))
        );
      })
      .on("broadcast", { event: "TASK_DELETED" }, ({ payload }) => {
        const { taskId } = payload;
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const handleDropTask = (taskId: string, targetBoardId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.board_id === targetBoardId) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, board_id: targetBoardId } : t))
    );

    channelRef.current?.send({
      type: "broadcast",
      event: "TASK_MOVED",
      payload: { taskId, targetBoardId },
    });

    startTransition(async () => {
      await moveTaskAction(taskId, targetBoardId, 0, workspaceId);
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    channelRef.current?.send({
      type: "broadcast",
      event: "TASK_DELETED",
      payload: { taskId },
    });

    startTransition(async () => {
      await deleteTaskAction(taskId, workspaceId);
    });
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);

    channelRef.current?.send({
      type: "broadcast",
      event: "TASK_CREATED",
      payload: { task: newTask },
    });
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );

    channelRef.current?.send({
      type: "broadcast",
      event: "TASK_UPDATED",
      payload: { task: updatedTask },
    });
  };

  const handleCreateColumn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("workspaceId", workspaceId);

    startTransition(async () => {
      await createBoardAction(formData);
      setIsAddingColumn(false);
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] items-start gap-5 overflow-x-auto pb-4">
      {boards.map((board) => {
        const boardTasks = tasks
          .filter((t) => t.board_id === board.id)
          .sort((a, b) => a.position - b.position);

        return (
          <KanbanColumn
            key={board.id}
            board={board}
            tasks={boardTasks}
            members={members}
            workspaceId={workspaceId}
            onDropTask={handleDropTask}
            onDeleteTask={handleDeleteTask}
            onTaskCreated={handleTaskCreated}
            onTaskUpdated={handleTaskUpdated}
          />
        );
      })}

      <div className="w-72 shrink-0">
        {isAddingColumn ? (
          <form
            onSubmit={handleCreateColumn}
            className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <input
              name="title"
              required
              autoFocus
              placeholder="새 컬럼 이름..."
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "생성"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 p-4 text-sm font-semibold text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            <Plus className="h-4 w-4" />
            <span>새 컬럼 추가</span>
          </button>
        )}
      </div>
    </div>
  );
}