import type { Board, Task, TaskPositionUpdate } from "@/types/database";

export const TASK_DND_PREFIX = "task:";
export const BOARD_DND_PREFIX = "board:";

export function toTaskDndId(taskId: string): string {
  return `${TASK_DND_PREFIX}${taskId}`;
}

export function toBoardDndId(boardId: string): string {
  return `${BOARD_DND_PREFIX}${boardId}`;
}

export function parseDndId(
  dndId: string
): { type: "task" | "board"; id: string } | null {
  if (dndId.startsWith(TASK_DND_PREFIX)) {
    return { type: "task", id: dndId.slice(TASK_DND_PREFIX.length) };
  }
  if (dndId.startsWith(BOARD_DND_PREFIX)) {
    return { type: "board", id: dndId.slice(BOARD_DND_PREFIX.length) };
  }
  return null;
}

export function isTempTaskId(taskId: string): boolean {
  return taskId.startsWith("temp-");
}

export function normalizeTask(task: Task): Task {
  return {
    ...task,
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

export function mergeInsertedTask(prev: Task[], incoming: Task): Task[] {
  const task = normalizeTask(incoming);

  if (prev.some((item) => item.id === task.id)) {
    return prev.map((item) => (item.id === task.id ? task : item));
  }

  const withoutMatchingTemp = prev.filter((item) => {
    if (!isTempTaskId(item.id)) return true;
    return !(item.title === task.title && item.board_id === task.board_id);
  });

  return [...withoutMatchingTemp, task];
}

export function reindexBoardTasks(tasks: Task[], boardId: string): Task[] {
  const ordered = tasks
    .filter((task) => task.board_id === boardId)
    .sort((a, b) => a.position - b.position);

  const positionById = new Map(ordered.map((task, index) => [task.id, index]));

  return tasks.map((task) => {
    const nextPosition = positionById.get(task.id);
    if (nextPosition === undefined || task.position === nextPosition) {
      return task;
    }
    return { ...task, position: nextPosition };
  });
}

export function moveTaskInState(
  tasks: Task[],
  activeTaskId: string,
  overBoardId: string,
  overTaskId: string | null
): Task[] {
  const activeTask = tasks.find((task) => task.id === activeTaskId);
  if (!activeTask || !overBoardId) return tasks;

  const sourceBoardId = activeTask.board_id;
  const withoutActive = tasks.filter((task) => task.id !== activeTaskId);

  const targetColumn = withoutActive
    .filter((task) => task.board_id === overBoardId)
    .sort((a, b) => a.position - b.position);

  let insertIndex = targetColumn.length;
  if (overTaskId) {
    const overIndex = targetColumn.findIndex((task) => task.id === overTaskId);
    if (overIndex >= 0) {
      insertIndex = overIndex;
    }
  }

  const movedTask: Task = { ...activeTask, board_id: overBoardId };
  targetColumn.splice(insertIndex, 0, movedTask);

  const reindexedTarget = targetColumn.map((task, index) => ({
    ...task,
    position: index,
  }));

  const others = withoutActive.filter((task) => task.board_id !== overBoardId);
  let next = [...others, ...reindexedTarget];

  if (sourceBoardId !== overBoardId) {
    next = reindexBoardTasks(next, sourceBoardId);
  }

  return next;
}

export function collectPositionUpdates(
  before: Task[],
  after: Task[]
): TaskPositionUpdate[] {
  const beforeMap = new Map(before.map((task) => [task.id, task]));
  const updates: TaskPositionUpdate[] = [];

  for (const task of after) {
    if (isTempTaskId(task.id)) continue;
    const previous = beforeMap.get(task.id);
    if (
      !previous ||
      previous.board_id !== task.board_id ||
      previous.position !== task.position
    ) {
      updates.push({
        id: task.id,
        board_id: task.board_id,
        position: task.position,
      });
    }
  }

  return updates;
}

export function findBoardIdByDnd(
  dndId: string,
  tasks: Task[],
  boards: Board[]
): string | null {
  const parsed = parseDndId(dndId);
  if (!parsed) return null;

  if (parsed.type === "board") {
    return boards.some((board) => board.id === parsed.id) ? parsed.id : null;
  }

  return tasks.find((task) => task.id === parsed.id)?.board_id ?? null;
}

export type TaskPriorityFilter = "all" | Task["priority"];
export type TaskAssigneeFilter = "all" | "me" | "unassigned";
export type TaskDueFilter = "all" | "overdue" | "soon";

export interface TaskFilterInput {
  query: string;
  priority: TaskPriorityFilter;
  assignee: TaskAssigneeFilter;
  due: TaskDueFilter;
  currentUserId: string;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate || isOverdue(dueDate)) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() + 7);
  return due <= limit;
}

export function filterKanbanTasks(
  tasks: Task[],
  filters: TaskFilterInput
): Task[] {
  const query = filters.query.trim().toLowerCase();

  return tasks.filter((task) => {
    if (query) {
      const inTitle = task.title.toLowerCase().includes(query);
      const inTags = (task.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(query)
      );
      if (!inTitle && !inTags) return false;
    }

    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    if (filters.assignee === "me" && task.assignee_id !== filters.currentUserId) {
      return false;
    }
    if (filters.assignee === "unassigned" && task.assignee_id) {
      return false;
    }

    if (filters.due === "overdue" && !isOverdue(task.due_date)) {
      return false;
    }
    if (filters.due === "soon" && !isDueSoon(task.due_date)) {
      return false;
    }

    return true;
  });
}
