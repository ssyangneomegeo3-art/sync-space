"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { Board, Task } from "@/types/database";
import type { MemberWithProfile } from "./InviteMemberModal";

const KanbanBoard = dynamic(() => import("./KanbanBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
      칸반 보드를 불러오는 중...
    </div>
  ),
});

interface KanbanBoardLoaderProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  initialBoards: Board[];
  initialTasks: Task[];
  members: MemberWithProfile[];
}

export default function KanbanBoardLoader(
  props: KanbanBoardLoaderProps
): React.JSX.Element {
  return <KanbanBoard {...props} />;
}
