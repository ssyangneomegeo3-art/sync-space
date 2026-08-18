"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Loader2 } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import KanbanToolbar, { type PresenceUser } from "./KanbanToolbar";
import { createClient } from "@/lib/supabase/client";
import {
  createBoardAction,
  deleteBoardAction,
  deleteTaskAction,
  renameBoardAction,
  reorderTasksAction,
} from "@/app/(dashboard)/workspace/[id]/actions";
import {
  collectPositionUpdates,
  filterKanbanTasks,
  findBoardIdByDnd,
  mergeInsertedTask,
  moveTaskInState,
  normalizeTask,
  parseDndId,
  type TaskAssigneeFilter,
  type TaskDueFilter,
  type TaskPriorityFilter,
} from "@/lib/kanban";
import type { Board, Task } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface KanbanBoardProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  initialBoards: Board[];
  initialTasks: Task[];
  members: MemberWithProfile[];
}

type RealtimeStatus = "connecting" | "live" | "error";

type KanbanEvent = {
  notice?: string;
} & (
  | { kind: "task_upsert"; task: Task }
  | { kind: "task_delete"; taskId: string }
  | { kind: "tasks_replace"; tasks: Task[] }
  | { kind: "board_upsert"; board: Board }
  | { kind: "board_delete"; boardId: string }
);

interface ToastItem {
  id: string;
  text: string;
}

export default function KanbanBoard({
  workspaceId,
  currentUserId,
  currentUserName,
  initialBoards,
  initialTasks,
  members,
}: KanbanBoardProps): React.JSX.Element {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [tasks, setTasks] = useState<Task[]>(initialTasks.map(normalizeTask));
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriorityFilter>("all");
  const [assignee, setAssignee] = useState<TaskAssigneeFilter>("all");
  const [due, setDue] = useState<TaskDueFilter>("all");
  const [isPending, startTransition] = useTransition();

  const tasksRef = useRef<Task[]>(tasks);
  const boardsRef = useRef<Board[]>(boards);
  const snapshotRef = useRef<Task[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  useEffect(() => {
    setTasks(initialTasks.map(normalizeTask));
  }, [initialTasks]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const applyTaskPayload = (payload: RealtimePostgresChangesPayload<Task>) => {
      const nextRow = payload.new as Partial<Task>;
      const oldRow = payload.old as Partial<Task>;
      if (nextRow.workspace_id && nextRow.workspace_id !== workspaceId) return;
      if (oldRow.workspace_id && oldRow.workspace_id !== workspaceId) return;

      if (payload.eventType === "INSERT" && nextRow.id) {
        setTasks((prev) => mergeInsertedTask(prev, nextRow as Task));
        return;
      }

      if (payload.eventType === "UPDATE" && nextRow.id) {
        const next = normalizeTask(nextRow as Task);
        setTasks((prev) =>
          prev.map((task) => (task.id === next.id ? { ...task, ...next } : task))
        );
        return;
      }

      if (payload.eventType === "DELETE") {
        const deletedId = oldRow.id;
        if (!deletedId) return;
        setTasks((prev) => prev.filter((task) => task.id !== deletedId));
      }
    };

    const applyBoardPayload = (
      payload: RealtimePostgresChangesPayload<Board>
    ) => {
      const nextRow = payload.new as Partial<Board>;
      const oldRow = payload.old as Partial<Board>;
      if (nextRow.workspace_id && nextRow.workspace_id !== workspaceId) return;
      if (oldRow.workspace_id && oldRow.workspace_id !== workspaceId) return;

      if (payload.eventType === "INSERT" && nextRow.id) {
        const board = nextRow as Board;
        setBoards((prev) =>
          prev.some((item) => item.id === board.id)
            ? prev
            : [...prev, board].sort((a, b) => a.position - b.position)
        );
        return;
      }

      if (payload.eventType === "UPDATE" && nextRow.id) {
        const board = nextRow as Board;
        setBoards((prev) =>
          prev.map((item) => (item.id === board.id ? board : item))
        );
        return;
      }

      if (payload.eventType === "DELETE") {
        const deletedId = oldRow.id;
        if (!deletedId) return;
        setBoards((prev) => prev.filter((item) => item.id !== deletedId));
      }
    };

    const pushToast = (text: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, text }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    };

    const applyBroadcast = ({ payload }: { payload: KanbanEvent }) => {
      if (payload.kind === "task_upsert") {
        setTasks((prev) => mergeInsertedTask(prev, payload.task));
      } else if (payload.kind === "task_delete") {
        setTasks((prev) => prev.filter((task) => task.id !== payload.taskId));
      } else if (payload.kind === "tasks_replace") {
        setTasks(payload.tasks.map(normalizeTask));
      } else if (payload.kind === "board_upsert") {
        setBoards((prev) =>
          prev.some((item) => item.id === payload.board.id)
            ? prev.map((item) =>
                item.id === payload.board.id ? payload.board : item
              )
            : [...prev, payload.board]
        );
      } else if (payload.kind === "board_delete") {
        setBoards((prev) => prev.filter((item) => item.id !== payload.boardId));
        setTasks((prev) => prev.filter((task) => task.board_id !== payload.boardId));
      }

      if (payload.notice) {
        pushToast(payload.notice);
      }
    };

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (cancelled) return;

      channel = supabase.channel(`workspace-kanban-${workspaceId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUserId },
        },
      });

      channel
        .on("broadcast", { event: "KANBAN" }, applyBroadcast)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          applyTaskPayload
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "boards" },
          applyBoardPayload
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState<{ user_id: string; name: string }>() ?? {};
          const people = Object.values(state).flat();
          setOnlineUsers(people);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("live");
            void channel?.track({
              user_id: currentUserId,
              name: currentUserName,
            });
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setRealtimeStatus("error");
          }
        });

      channelRef.current = channel;
    };

    void setup();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [workspaceId, currentUserId, currentUserName]);

  const broadcastKanban = (payload: KanbanEvent) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "KANBAN",
      payload,
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const persistReorder = (before: Task[], after: Task[]) => {
    const updates = collectPositionUpdates(before, after);
    if (updates.length === 0) return;

    broadcastKanban({
      kind: "tasks_replace",
      tasks: after,
      notice: `${currentUserName} 님이 카드를 이동했습니다`,
    });

    startTransition(async () => {
      const result = await reorderTasksAction(workspaceId, updates);
      if (!result.success) {
        setTasks(before);
        broadcastKanban({ kind: "tasks_replace", tasks: before });
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const parsed = parseDndId(String(event.active.id));
    if (!parsed || parsed.type !== "task") return;
    snapshotRef.current = tasksRef.current;
    setActiveTaskId(parsed.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeParsed = parseDndId(String(active.id));
    if (!activeParsed || activeParsed.type !== "task") return;

    const overBoardId = findBoardIdByDnd(
      String(over.id),
      tasksRef.current,
      boardsRef.current
    );
    if (!overBoardId) return;

    const overParsed = parseDndId(String(over.id));
    const overTaskId = overParsed?.type === "task" ? overParsed.id : null;

    setTasks((prev) => {
      const currentBoardId = prev.find((task) => task.id === activeParsed.id)?.board_id;
      if (!currentBoardId || currentBoardId === overBoardId) return prev;
      return moveTaskInState(prev, activeParsed.id, overBoardId, overTaskId);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    const before = snapshotRef.current;
    const current = tasksRef.current;

    if (!over) {
      persistReorder(before, current);
      return;
    }

    const activeParsed = parseDndId(String(active.id));
    const overParsed = parseDndId(String(over.id));
    if (!activeParsed || activeParsed.type !== "task" || !overParsed) {
      persistReorder(before, current);
      return;
    }

    const overBoardId = findBoardIdByDnd(String(over.id), current, boardsRef.current);
    if (!overBoardId) {
      persistReorder(before, current);
      return;
    }

    const next = moveTaskInState(
      current,
      activeParsed.id,
      overBoardId,
      overParsed.type === "task" ? overParsed.id : null
    );
    setTasks(next);
    persistReorder(before, next);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setTasks(snapshotRef.current);
  };

  const handleDeleteTask = (taskId: string) => {
    const previous = tasksRef.current;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    broadcastKanban({
      kind: "task_delete",
      taskId,
      notice: `${currentUserName} 님이 카드를 삭제했습니다`,
    });

    startTransition(async () => {
      const result = await deleteTaskAction(taskId, workspaceId);
      if (!result.success) {
        setTasks(previous);
        broadcastKanban({ kind: "tasks_replace", tasks: previous });
      }
    });
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [...prev, normalizeTask(newTask)]);
  };

  const handleTaskReplaced = (tempId: string, task: Task) => {
    setTasks((prev) => {
      const withoutTemp = prev.filter((item) => item.id !== tempId);
      return mergeInsertedTask(withoutTemp, task);
    });
    broadcastKanban({
      kind: "task_upsert",
      task: normalizeTask(task),
      notice: `${currentUserName} 님이 카드를 추가했습니다`,
    });
  };

  const handleTaskCreateFailed = (tempId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== tempId));
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    const next = normalizeTask(updatedTask);
    setTasks((prev) =>
      prev.map((task) => (task.id === next.id ? { ...task, ...next } : task))
    );
    broadcastKanban({
      kind: "task_upsert",
      task: next,
      notice: `${currentUserName} 님이 카드를 수정했습니다`,
    });
  };

  const handleRenameBoard = (boardId: string, title: string) => {
    const previous = boardsRef.current;
    setBoards((prev) =>
      prev.map((board) => (board.id === boardId ? { ...board, title } : board))
    );

    startTransition(async () => {
      const result = await renameBoardAction(boardId, workspaceId, title);
      if (!result.success) {
        setBoards(previous);
        return;
      }
      if (result.board) {
        broadcastKanban({
          kind: "board_upsert",
          board: result.board,
          notice: `${currentUserName} 님이 컬럼 이름을 바꿨습니다`,
        });
      }
    });
  };

  const handleDeleteBoard = (boardId: string) => {
    if (boardsRef.current.length <= 1) return;
    const previousBoards = boardsRef.current;
    const previousTasks = tasksRef.current;
    setBoards((prev) => prev.filter((board) => board.id !== boardId));
    setTasks((prev) => prev.filter((task) => task.board_id !== boardId));
    broadcastKanban({
      kind: "board_delete",
      boardId,
      notice: `${currentUserName} 님이 컬럼을 삭제했습니다`,
    });

    startTransition(async () => {
      const result = await deleteBoardAction(boardId, workspaceId);
      if (!result.success) {
        setBoards(previousBoards);
        setTasks(previousTasks);
      }
    });
  };

  const handleCreateColumn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("workspaceId", workspaceId);

    startTransition(async () => {
      const result = await createBoardAction(formData);
      if (result.success && result.board) {
        setBoards((prev) =>
          prev.some((board) => board.id === result.board!.id)
            ? prev
            : [...prev, result.board!]
        );
        broadcastKanban({
          kind: "board_upsert",
          board: result.board,
          notice: `${currentUserName} 님이 컬럼을 추가했습니다`,
        });
      }
      setIsAddingColumn(false);
      form.reset();
    });
  };

  const visibleTasks = useMemo(
    () =>
      filterKanbanTasks(tasks, {
        query,
        priority,
        assignee,
        due,
        currentUserId,
      }),
    [tasks, query, priority, assignee, due, currentUserId]
  );

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;

  return (
    <div className="relative flex flex-col gap-3">
      <KanbanToolbar
        query={query}
        onQueryChange={setQuery}
        priority={priority}
        onPriorityChange={setPriority}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        due={due}
        onDueChange={setDue}
        onlineUsers={onlineUsers}
        currentUserId={currentUserId}
        realtimeStatus={realtimeStatus}
        visibleCount={visibleTasks.length}
        totalCount={tasks.length}
      />

      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {toast.text}
          </div>
        ))}
      </div>

      <DndContext
        id={`kanban-${workspaceId}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex h-[calc(100vh-12rem)] items-start gap-5 overflow-x-auto pb-4">
          {boards.map((board) => {
            const boardTasks = visibleTasks
              .filter((task) => task.board_id === board.id)
              .sort((a, b) => a.position - b.position);

            return (
              <KanbanColumn
                key={board.id}
                board={board}
                tasks={boardTasks}
                members={members}
                workspaceId={workspaceId}
                currentUserId={currentUserId}
                onDeleteTask={handleDeleteTask}
                onTaskCreated={handleTaskCreated}
                onTaskReplaced={handleTaskReplaced}
                onTaskCreateFailed={handleTaskCreateFailed}
                onTaskUpdated={handleTaskUpdated}
                canDeleteColumn={boards.length > 1}
                onRenameBoard={handleRenameBoard}
                onDeleteBoard={handleDeleteBoard}
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
                type="button"
                onClick={() => setIsAddingColumn(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 p-4 text-sm font-semibold text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <Plus className="h-4 w-4" />
                <span>새 컬럼 추가</span>
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <KanbanCard
              task={activeTask}
              members={members}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              onDelete={() => undefined}
              onTaskUpdated={() => undefined}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
