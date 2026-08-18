"use client";

import React from "react";
import { Radio, Search, WifiOff } from "lucide-react";
import type { TaskAssigneeFilter, TaskDueFilter, TaskPriorityFilter } from "@/lib/kanban";

export interface PresenceUser {
  user_id: string;
  name: string;
}

interface KanbanToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  priority: TaskPriorityFilter;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  assignee: TaskAssigneeFilter;
  onAssigneeChange: (value: TaskAssigneeFilter) => void;
  due: TaskDueFilter;
  onDueChange: (value: TaskDueFilter) => void;
  onlineUsers: PresenceUser[];
  currentUserId: string;
  realtimeStatus: "connecting" | "live" | "error";
  visibleCount: number;
  totalCount: number;
}

export default function KanbanToolbar({
  query,
  onQueryChange,
  priority,
  onPriorityChange,
  assignee,
  onAssigneeChange,
  due,
  onDueChange,
  onlineUsers,
  currentUserId,
  realtimeStatus,
  visibleCount,
  totalCount,
}: KanbanToolbarProps): React.JSX.Element {
  const uniqueOnline = onlineUsers.filter(
    (user, index, list) => list.findIndex((item) => item.user_id === user.user_id) === index
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="제목 또는 태그 검색"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as TaskPriorityFilter)}
          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">우선순위 전체</option>
          <option value="urgent">긴급</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>

        <select
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value as TaskAssigneeFilter)}
          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">담당자 전체</option>
          <option value="me">내 담당</option>
          <option value="unassigned">미지정</option>
        </select>

        <select
          value={due}
          onChange={(event) => onDueChange(event.target.value as TaskDueFilter)}
          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">마감일 전체</option>
          <option value="overdue">기한 지남</option>
          <option value="soon">7일 이내</option>
        </select>

        <span className="text-[11px] text-zinc-400">
          {visibleCount}/{totalCount}개 표시
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {uniqueOnline.length === 0 ? (
            <span className="text-[11px] text-zinc-400">접속자 확인 중</span>
          ) : (
            <div className="flex items-center">
              <div className="flex -space-x-1.5">
                {uniqueOnline.slice(0, 5).map((user) => (
                  <div
                    key={user.user_id}
                    title={user.user_id === currentUserId ? `${user.name} (나)` : user.name}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:border-zinc-900 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {user.name.substring(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="ml-2 text-[11px] font-medium text-zinc-500">
                {uniqueOnline.length}명 접속 중
              </span>
            </div>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            realtimeStatus === "live"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : realtimeStatus === "error"
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {realtimeStatus === "live" ? (
            <Radio className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {realtimeStatus === "live"
            ? "실시간 연결됨"
            : realtimeStatus === "error"
              ? "연결 실패"
              : "연결 중..."}
        </span>
      </div>
    </div>
  );
}
