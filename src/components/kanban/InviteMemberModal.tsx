"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  X,
  Loader2,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/app/(dashboard)/workspace/[id]/actions";
import type { Profile, WorkspaceMember, WorkspaceRole } from "@/types/database";

// export 키워드 추가
export interface MemberWithProfile extends WorkspaceMember {
  profile: Profile | null;
}

interface InviteMemberModalProps {
  workspaceId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  isOwner: boolean;
}

export default function InviteMemberModal({
  workspaceId,
  members,
  currentUserId,
  isOwner,
}: InviteMemberModalProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("workspaceId", workspaceId);

    startTransition(async () => {
      const res = await inviteMemberAction(formData);
      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setStatusMessage({
          type: "success",
          text: "팀원이 워크스페이스에 성공적으로 추가되었습니다!",
        });
        form.reset();
      }
    });
  };

  const handleRoleChange = (memberId: string, newRole: WorkspaceRole) => {
    startTransition(async () => {
      await updateMemberRoleAction(memberId, newRole, workspaceId);
    });
  };

  const handleRemove = (memberId: string) => {
    if (!confirm("정말 이 팀원을 워크스페이스에서 내보내시겠습니까?")) return;

    startTransition(async () => {
      await removeMemberAction(memberId, workspaceId);
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setStatusMessage(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-indigo-400"
      >
        <Users className="h-4 w-4 text-zinc-400" />
        <span>팀원 관리 ({members.length})</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    팀원 초대 및 관리
                  </h2>
                  <p className="text-xs text-zinc-400">
                    이메일로 팀원을 초대하고 역할을 부여하세요.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {statusMessage && (
                <div
                  className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                    statusMessage.type === "error"
                      ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  {statusMessage.type === "error" ? (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  새 팀원 초대하기
                </label>
                <div className="flex gap-2">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="초대할 팀원의 가입 이메일 주소..."
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <select
                    name="role"
                    defaultValue="member"
                    disabled={isPending}
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    <option value="member">멤버</option>
                    <option value="admin">관리자</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    <span>초대</span>
                  </button>
                </div>
              </form>

              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  참여 중인 멤버 ({members.length}명)
                </h3>

                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/50">
                  {members.map((m) => {
                    const isSelf = m.user_id === currentUserId;
                    const isTargetOwner = m.role === "owner";

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {m.profile?.full_name?.substring(0, 1) ||
                              m.profile?.email?.substring(0, 1).toUpperCase() ||
                              "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {m.profile?.full_name || m.profile?.email?.split("@")[0]}
                              </span>
                              {isSelf && (
                                <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  나
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {m.profile?.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isTargetOwner ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              <Shield className="h-3 w-3" />
                              소유자
                            </span>
                          ) : isOwner ? (
                            <select
                              value={m.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  m.id,
                                  e.target.value as WorkspaceRole
                                )
                              }
                              disabled={isPending}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                              <option value="member">멤버</option>
                              <option value="admin">관리자</option>
                            </select>
                          ) : (
                            <span className="text-xs capitalize text-zinc-500">
                              {m.role === "admin" ? "관리자" : "멤버"}
                            </span>
                          )}

                          {isOwner && !isTargetOwner && (
                            <button
                              onClick={() => handleRemove(m.id)}
                              disabled={isPending}
                              className="rounded p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                              title="멤버 내보내기"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}